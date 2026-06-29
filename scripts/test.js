#!/usr/bin/env node
/**
 * AI码律 状态机单元测试
 * 用法：node scripts/test.js
 * 每次改 check.js 后必须跑一次
 */

const path = require('path');
const os = require('os');
const fs = require('fs');

const TMP = path.join(os.tmpdir(), 'codeedict-test-' + Date.now());
process.env.CODEEDICT_CONFIG = path.join(TMP, 'codeedict-config.json');

// 创建临时 workspace
fs.mkdirSync(TMP, { recursive: true });
fs.writeFileSync(process.env.CODEEDICT_CONFIG, JSON.stringify({ workspacePath: TMP }), 'utf-8');

// 加载 check.js
const { cmdInit, cmdStage, cmdWrite, cmdStatus, cmdTransitions, Stage } = require('../check.js');

let passed = 0;
let failed = 0;

function assert(condition, label) {
    if (condition) { console.log(`  ✅ ${label}`); passed++; }
    else { console.error(`  ❌ ${label}`); failed++; }
}

function assertEqual(actual, expected, label) {
    if (JSON.stringify(actual) === JSON.stringify(expected)) {
        console.log(`  ✅ ${label}`); passed++;
    } else {
        console.error(`  ❌ ${label}`);
        console.error(`     expected: ${JSON.stringify(expected)}`);
        console.error(`     actual:   ${JSON.stringify(actual)}`);
        failed++;
    }
}

// ═══════════════════════════════════════════
// 测试 1：init 不传 project_id（向后兼容）
// ═══════════════════════════════════════════
console.log('\n📋 1. codeedict_init 向后兼容');
const r1 = cmdInit('testproj-C01-no-project');
assert(r1.allowed === true, '不传 project_id → 允许创建');

// ═══════════════════════════════════════════
// 测试 2：init 传 project_id，项目未初始化 → 拒绝
// ═══════════════════════════════════════════
console.log('\n📋 2. codeedict_init 项目就绪门禁（未初始化）');
const r2 = cmdInit('testproj-C02-blocked', '', '', 'testproj');
assert(r2.allowed === false, '未初始化项目 → allowed=false');
assertEqual(r2.blocked, 'project_not_initialized', 'blocked=project_not_initialized');
assert(!!r2.hint, '返回 hint 字段');

// ═══════════════════════════════════════════
// 测试 3：初始化项目后 init 成功
// ═══════════════════════════════════════════
console.log('\n📋 3. codeedict_init 项目就绪门禁（已初始化）');
const projectDir = path.join(TMP, 'projects', 'testproj');
fs.mkdirSync(projectDir, { recursive: true });
fs.writeFileSync(path.join(projectDir, 'project.json'), JSON.stringify({ projectId: 'testproj' }), 'utf-8');
const r3 = cmdInit('testproj-C03-ok', '', '', 'testproj');
assert(r3.allowed === true, '已初始化 + project_id → 允许创建');

// ═══════════════════════════════════════════
// 测试 4：stage 正常流转（走 review 中间站）
// ═══════════════════════════════════════════
console.log('\n📋 4. cmdStage 正常流转');
const TASK = 'testproj-C04-stage';
cmdInit(TASK, '', 'analyze');
// analyze → review（允许）
const r4a = cmdStage(TASK, Stage.Review);
assert(r4a.allowed === true, 'analyze → review 允许');
// 模拟 review 通过
const s4 = cmdStatus(TASK);
const statePath4 = path.join(os.homedir(), '.codeedict', 'tasks', TASK + '.json');
const state4 = JSON.parse(fs.readFileSync(statePath4, 'utf-8'));
state4.checkpoints = { review_audited: true, review_approved: true };
fs.writeFileSync(statePath4, JSON.stringify(state4));
// review → code（允许）
const r4b = cmdStage(TASK, Stage.Code);
assert(r4b.allowed === true, 'review → code 允许');
assertEqual(r4b.new_stage, 'code', 'new_stage=code');

// ═══════════════════════════════════════════
// 测试 5：stage 非法流转拒绝
// ═══════════════════════════════════════════
console.log('\n📋 5. cmdStage 非法流转拒绝');
const r5 = cmdStage(TASK, Stage.Clarify);
assert(r5.allowed === false, 'code → clarify 被拒绝');

// ═══════════════════════════════════════════
// 测试 6：codeedict_write 校验
// ═══════════════════════════════════════════
console.log('\n📋 6. cmdWrite 阶段校验');
const r6 = cmdWrite(TASK, '/some/file.kt');
assert(r6.allowed === true, 'code 阶段允许写');

const r6b = cmdWrite('testproj-C01-no-project', '/file.kt'); // analyze 阶段
assert(r6b.allowed === false, 'analyze 阶段拒绝写');

// ═══════════════════════════════════════════
// 测试 7：status 查询
// ═══════════════════════════════════════════
console.log('\n📋 7. cmdStatus 状态查询');
const r7 = cmdStatus(TASK);
assert(r7.stage === 'code', '当前阶段为 code');

// ═══════════════════════════════════════════
// 测试 8：transitions 查询
// ═══════════════════════════════════════════
console.log('\n📋 8. cmdTransitions 流转白名单');
const r8 = cmdTransitions('code');
assert(r8.allowed && r8.allowed.includes('commit'), 'code → commit 在白名单');
assert(!r8.allowed.includes('clarify'), 'code → clarify 不在白名单');

// ═══════════════════════════════════════════
// 测试 9：init 空 project_id 照样过（不检查）
// ═══════════════════════════════════════════
console.log('\n📋 9. project_id=空字符串 → 不检查（不传就不拦）');
const r9 = cmdInit('testproj-C09-empty', '', '', '');
assert(r9.allowed === true, '空 project_id → 直接允许');

// ═══════════════════════════════════════════
// 结果
// ═══════════════════════════════════════════
console.log(`\n${'═'.repeat(50)}`);
console.log(`结果：${passed} 通过 / ${failed} 失败`);
if (failed > 0) process.exitCode = 1;

// 清理
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`🧹 临时目录已清理: ${TMP}`);
