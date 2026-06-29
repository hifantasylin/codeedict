#!/usr/bin/env node
/**
 * AI码律 State Machine MCP Server — Node.js 版本
 * 替代 check.py，提供更稳定的 MCP 协议支持
 *
 * 用法（MCP 模式）：node check.js
 * CLI 模式：node check.js <command> <args>
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// ══════════════════════════════════════════════════════════
//  Workspace 探测
// ══════════════════════════════════════════════════════════

function _detectWorkspace() {
    const configPath = process.env.CODEEDICT_CONFIG || path.join(os.homedir(), '.codeedict', 'codeedict-config.json');
    if (!fs.existsSync(configPath)) {
        throw new Error(`配置文件不存在: ${configPath}\n请先安装 AI码律`);
    }
    const raw = fs.readFileSync(configPath, 'utf-8').replace(/^\uFEFF/, '');
    const config = JSON.parse(raw);
    if (!config.workspacePath) {
        throw new Error(`配置文件中缺少 workspacePath: ${configPath}`);
    }
    if (!fs.existsSync(config.workspacePath)) {
        throw new Error(`workspace 目录不存在: ${config.workspacePath}\n请在配置文件中设置正确的路径`);
    }
    return config.workspacePath;
}

const WORKSPACE = _detectWorkspace();
const PROJECTS_DIR = path.join(WORKSPACE, 'projects');
const TASK_STATES_DIR = path.join(os.homedir(), '.codeedict', 'tasks');

if (!fs.existsSync(TASK_STATES_DIR)) fs.mkdirSync(TASK_STATES_DIR, { recursive: true });

// ══════════════════════════════════════════════════════════
//  状态定义
// ══════════════════════════════════════════════════════════

const Stage = {
    Clarify:   'clarify',
    Proposal:  'proposal',
    Review:    'review',
    Analyze:   'analyze',
    Code:      'code',
    Commit:    'commit',
    Archive:   'archive',
    Cancelled: 'cancelled',
};

const STAGE_TRANSITIONS = {
    [Stage.Clarify]:   new Set([Stage.Proposal, Stage.Review, Stage.Analyze, Stage.Cancelled]),
    [Stage.Proposal]:  new Set([Stage.Review, Stage.Analyze, Stage.Cancelled]),
    [Stage.Review]:    new Set([Stage.Analyze, Stage.Code, Stage.Archive, Stage.Cancelled]),
    [Stage.Analyze]:   new Set([Stage.Review, Stage.Cancelled]),
    [Stage.Code]:      new Set([Stage.Commit, Stage.Analyze, Stage.Cancelled]),
    [Stage.Commit]:    new Set([Stage.Archive, Stage.Cancelled]),
    [Stage.Archive]:   new Set(),
    [Stage.Cancelled]: new Set(),
};

const HARD_CHECKPOINTS = new Set([Stage.Commit]);
const WRITE_ALLOWED_STAGES = new Set([Stage.Code]);

// ══════════════════════════════════════════════════════════
//  状态读写
// ══════════════════════════════════════════════════════════

function _loadState(taskId) {
    const newPath = path.join(TASK_STATES_DIR, `${taskId}.json`);
    if (fs.existsSync(newPath)) return JSON.parse(fs.readFileSync(newPath, 'utf-8').replace(/^\uFEFF/, ''));
    const oldPath = path.join(WORKSPACE, 'states', `${taskId}.json`);
    if (fs.existsSync(oldPath)) return JSON.parse(fs.readFileSync(oldPath, 'utf-8').replace(/^\uFEFF/, ''));
    return null;
}

function _saveState(taskId, state) {
    const filePath = path.join(TASK_STATES_DIR, `${taskId}.json`);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf-8');
}

function _projectIdFromTask(taskId) {
    const m = taskId.match(/-[BFAR]\d{2}-/);
    if (m) return taskId.substring(0, m.index);
    return taskId.split('-')[0];
}

function _readProposal(taskId) {
    const projectId = _projectIdFromTask(taskId);
    const proposalPath = path.join(PROJECTS_DIR, projectId, 'proposals', `${taskId}.md`);
    if (fs.existsSync(proposalPath)) return fs.readFileSync(proposalPath, 'utf-8');
    return null;
}

// ══════════════════════════════════════════════════════════
//  命令实现
// ══════════════════════════════════════════════════════════

function _ok(data) { return { ...data, allowed: true }; }
function _block(reason) { return { allowed: false, blocked: reason }; }

function cmdInit(taskId, proposalPath = '', initialStage = '', projectId = '') {
    // 项目就绪门禁：传了 project_id 则检查项目 workspace 是否已初始化
    if (projectId) {
        const projectDir = path.join(PROJECTS_DIR, projectId);
        const projectJson = path.join(projectDir, 'project.json');
        if (!fs.existsSync(projectJson)) {
            return { allowed: false, blocked: 'project_not_initialized', project_id: projectId, project_dir: projectDir,
                message: `项目 ${projectId} 尚未初始化，workspace 数据目录不存在。请先执行项目初始化。`,
                hint: '运行项目初始化流程：探测工具链 + 扫描架构惯例 + 创建 workspace 目录骨架' };
        }
    }
    const stage = Object.values(Stage).includes(initialStage) ? initialStage : Stage.Clarify;
    const now = Math.floor(Date.now() / 1000);
    const state = { task_id: taskId, stage, workflow: '', checkpoints: {}, created_at: now, updated_at: now, proposal_path: proposalPath };
    _saveState(taskId, state);
    return _ok({ task_id: taskId, stage, message: `任务 ${taskId} 已创建，当前阶段 ${stage}` });
}

function cmdStage(taskId, newStage) {
    if (!Object.values(Stage).includes(newStage)) return _block(`无效阶段: ${newStage}`);
    const state = _loadState(taskId);
    if (!state) return _block(`任务 ${taskId} 不存在，请先 init`);
    const oldStage = state.stage;
    // 硬卡点检查
    if (oldStage && HARD_CHECKPOINTS.has(oldStage)) {
        const cpKey = `${oldStage}_approved`;
        if (!state.checkpoints?.[cpKey]) return _block(`硬卡点 ${oldStage} 尚未批准，请先 approve ${taskId} ${oldStage}`);
    }
    // Review 出口守卫
    if (oldStage === Stage.Review && newStage !== Stage.Analyze && newStage !== Stage.Cancelled) {
        const cps = state.checkpoints || {};
        if (cps.review_result === 'rejected') return _block(`审查官已驳回，请先 stage ${taskId} analyze 补充完善`);
        if (!cps.review_audited) return _block('Review 阶段：审查官尚未审核通过，请先 reviewed');
        if (!cps.review_approved) return _block('审查官已通过 ✅。等待用户确认：approve <task-id> review');
    }
    // 白名单校验
    if (oldStage && STAGE_TRANSITIONS[oldStage] && !STAGE_TRANSITIONS[oldStage].has(newStage)) {
        return _block(`非法流转: ${oldStage} -> ${newStage}`);
    }
    const now = Math.floor(Date.now() / 1000);
    state.stage = newStage;
    state.updated_at = now;
    if (!state.created_at) state.created_at = now;
    _saveState(taskId, state);
    const roleMap = { clarify: 'clarifier.md', proposal: 'clarifier.md', review: 'proposal-reviewer.md', analyze: 'investigator.md', code: 'coder.md', commit: 'code-reviewer.md', archive: 'reflector.md' };
    const out = _ok({ task_id: taskId, old_stage: oldStage || 'N/A', new_stage: newStage, role: roleMap[newStage] || '' });
    if (HARD_CHECKPOINTS.has(newStage)) out.checkpoint = newStage;
    return out;
}

function cmdApprove(taskId, checkpoint) {
    const state = _loadState(taskId);
    if (!state) return _block(`任务 ${taskId} 不存在`);
    state.checkpoints = state.checkpoints || {};
    state.checkpoints[`${checkpoint}_approved`] = true;
    state.updated_at = Math.floor(Date.now() / 1000);
    _saveState(taskId, state);
    return _ok({ task_id: taskId, checkpoint, message: `${checkpoint} 卡点已批准` });
}

function cmdReviewed(taskId) {
    const state = _loadState(taskId);
    if (!state) return _block(`任务 ${taskId} 不存在`);
    if (state.stage !== Stage.Review) return _block(`当前阶段 ${state.stage}，reviewed 仅在 review 阶段有效`);
    state.checkpoints = state.checkpoints || {};
    state.checkpoints.review_audited = true;
    state.checkpoints.review_result = 'approved';
    state.updated_at = Math.floor(Date.now() / 1000);
    _saveState(taskId, state);
    return _ok({ task_id: taskId, message: '审查官审核通过 ✅，等待用户确认', next: `用户说'通过'后调用 approve ${taskId} review` });
}

function cmdRejected(taskId, reason = '') {
    const state = _loadState(taskId);
    if (!state) return _block(`任务 ${taskId} 不存在`);
    if (state.stage !== Stage.Review) return _block(`当前阶段 ${state.stage}，rejected 仅在 review 阶段有效`);
    state.checkpoints = state.checkpoints || {};
    const rejectCount = (state.checkpoints.review_reject_count || 0) + 1;
    state.checkpoints.review_reject_count = rejectCount;
    state.checkpoints.review_result = 'rejected';
    state.checkpoints.review_reject_reason = reason || '(未提供原因)';
    state.checkpoints.review_audited = false;
    state.updated_at = Math.floor(Date.now() / 1000);
    _saveState(taskId, state);
    return _ok({ task_id: taskId, message: `审查官驳回 ❌ (第${rejectCount}次)`, reason: reason || '未提供', next: '分析师补充完善后 → stage review → 审查官重新审核', reject_count: rejectCount });
}

function cmdStatus(taskId) {
    const state = _loadState(taskId);
    if (!state) return { error: `任务 ${taskId} 不存在` };
    return { task_id: state.task_id, stage: state.stage, checkpoints: state.checkpoints || {}, updated_at: state.updated_at };
}

function cmdTransitions(currentStage = '') {
    if (currentStage) {
        if (!STAGE_TRANSITIONS[currentStage]) return { error: `未知阶段: ${currentStage}` };
        return { stage: currentStage, allowed: [...STAGE_TRANSITIONS[currentStage]] };
    }
    const out = {};
    for (const [s, targets] of Object.entries(STAGE_TRANSITIONS)) {
        out[s] = targets.size ? [...targets] : [];
    }
    return out;
}

function cmdCheckEntry(taskId, newStage) {
    if (!Object.values(Stage).includes(newStage)) return _block(`无效阶段: ${newStage}`);
    const state = _loadState(taskId);
    if (!state) return _block(`任务 ${taskId} 不存在，请先 init`);
    if (newStage === Stage.Code) {
        const projectId = _projectIdFromTask(taskId);
        const proposalPath = path.join(PROJECTS_DIR, projectId, 'proposals', `${taskId}.md`);
        if (!fs.existsSync(proposalPath)) return _block(`缺少方案文件: ${proposalPath}\nCode 模式需要先完成 Review 阶段生成方案文档`);
        const cps = state.checkpoints || {};
        if (!cps.review_approved) return _block(`Review 硬卡点尚未批准，请先 approve ${taskId} review`);
    }
    return _ok({ task_id: taskId, new_stage: newStage, message: '允许进入' });
}

function cmdWrite(taskId, filePath) {
    const state = _loadState(taskId);
    if (!state) return _block(`任务 ${taskId} 不存在，请先 init`);
    const current = state.stage;
    if (!WRITE_ALLOWED_STAGES.has(current)) return _block(`当前阶段 ${current}，不允许写文件`);
    return _ok({ task_id: taskId, file: filePath, stage: current, message: '允许写入' });
}

function cmdWait(seconds) {
    const sec = Math.max(1, Math.min(30, parseInt(seconds) || 5));
    try {
        if (os.platform() === 'win32') {
            execSync(`powershell -Command "Start-Sleep -Seconds ${sec}"`, { stdio: 'ignore', timeout: sec * 1000 + 2000 });
        } else {
            execSync(`sleep ${sec}`, { stdio: 'ignore', timeout: sec * 1000 + 2000 });
        }
    } catch (e) { /* 超时不阻塞主线 */ }
    return _ok({ waited: sec, message: `等待 ${sec}s 完成` });
}

// ══════════════════════════════════════════════════════════
//  MCP Server（JSON-RPC over stdio）
// ══════════════════════════════════════════════════════════

const MCP_TOOLS = [
    {
        name: 'codeedict_stage',
        description: 'AI码律 阶段流转：校验白名单 + 硬卡点守卫。new_stage 可选值: clarify/proposal/review/analyze/code/commit/archive/cancelled',
        inputSchema: { type: 'object', properties: { task_id: { type: 'string' }, new_stage: { type: 'string' } }, required: ['task_id', 'new_stage'] },
    },
    {
        name: 'codeedict_write',
        description: '写文件前置校验：检查当前阶段是否允许写入。',
        inputSchema: { type: 'object', properties: { task_id: { type: 'string' }, file_path: { type: 'string' } }, required: ['task_id', 'file_path'] },
    },
    {
        name: 'codeedict_status',
        description: '查询 task 当前阶段和 checkpoints。',
        inputSchema: { type: 'object', properties: { task_id: { type: 'string' } }, required: ['task_id'] },
    },
    {
        name: 'codeedict_check_entry',
        description: '进入阶段守卫检查：Code 入口需 proposal 存在 + review 审批通过。',
        inputSchema: { type: 'object', properties: { task_id: { type: 'string' }, new_stage: { type: 'string' } }, required: ['task_id', 'new_stage'] },
    },
    {
        name: 'codeedict_transitions',
        description: '查询当前阶段允许流转的目标阶段列表。',
        inputSchema: { type: 'object', properties: { current_stage: { type: 'string' } } },
    },
    {
        name: 'codeedict_reviewed',
        description: '审查官审核通过标记。',
        inputSchema: { type: 'object', properties: { task_id: { type: 'string' } }, required: ['task_id'] },
    },
    {
        name: 'codeedict_rejected',
        description: '审查官驳回标记。',
        inputSchema: { type: 'object', properties: { task_id: { type: 'string' }, reason: { type: 'string' } }, required: ['task_id'] },
    },
    {
        name: 'codeedict_approve',
        description: '用户批准硬卡点。',
        inputSchema: { type: 'object', properties: { task_id: { type: 'string' }, checkpoint: { type: 'string' } }, required: ['task_id', 'checkpoint'] },
    },
    {
        name: 'codeedict_init',
        description: '初始化新任务，创建状态文件。可指定初始阶段（默认 clarify，分析类任务应传 analyze）。传 project_id 会先检查项目 workspace 是否就绪，未就绪则返回 blocked=project_not_initialized 拒绝创建。',
        inputSchema: { type: 'object', properties: { task_id: { type: 'string', description: '任务 ID，格式 projectId-B/F/R/A编号-简短描述' }, proposal_path: { type: 'string', description: '可选，proposal 文件路径' }, initial_stage: { type: 'string', description: '可选，初始阶段。分析类任务传 analyze，修改类任务默认 clarify' }, project_id: { type: 'string', description: '可选。传入后强制检查项目 workspace 是否已初始化（project.json 是否存在），未就绪则拒绝创建任务' } }, required: ['task_id'] },
    },
    {
        name: 'codeedict_wait',
        description: '阻塞等待指定秒数（1-30s，默认5s）。用于"延迟批准"模式：展示方案后调用此工具等待，期间用户可输入驳回，超时则自动继续。',
        inputSchema: { type: 'object', properties: { seconds: { type: 'number', description: '等待秒数，1-30，默认5' } } },
    },
];

function runMcp() {
    const tools = new Map(MCP_TOOLS.map(t => [t.name, t]));
    const stdin = process.stdin;
    stdin.setEncoding('utf-8');
    let buffer = '';
    stdin.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop(); // 保留最后一个不完整的行
        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const msg = JSON.parse(line);
                handleMcpMessage(msg);
            } catch (e) {
                // 忽略解析错误
            }
        }
    });
    stdin.on('end', () => process.exit(0));
}

function handleMcpMessage(msg) {
    const method = msg.method;
    const reqId = msg.id;
    if (method === 'initialize') {
        sendMcp({ jsonrpc: '2.0', id: reqId, result: { protocolVersion: '2024-11-05', serverInfo: { name: 'codeedict-gate', version: '1.0' }, capabilities: { tools: {} } } });
    } else if (method === 'tools/list') {
        sendMcp({ jsonrpc: '2.0', id: reqId, result: { tools: MCP_TOOLS } });
    } else if (method === 'tools/call') {
        const params = msg.params || {};
        const toolName = params.name;
        const toolArgs = params.arguments || {};
        const taskId = toolArgs.task_id || '';
        let result;
        try {
            if (toolName === 'codeedict_stage') result = cmdStage(taskId, toolArgs.new_stage);
            else if (toolName === 'codeedict_write') result = cmdWrite(taskId, toolArgs.file_path);
            else if (toolName === 'codeedict_status') result = cmdStatus(taskId);
            else if (toolName === 'codeedict_check_entry') result = cmdCheckEntry(taskId, toolArgs.new_stage);
            else if (toolName === 'codeedict_transitions') result = cmdTransitions(toolArgs.current_stage);
            else if (toolName === 'codeedict_reviewed') result = cmdReviewed(taskId);
            else if (toolName === 'codeedict_rejected') result = cmdRejected(taskId, toolArgs.reason);
            else if (toolName === 'codeedict_approve') result = cmdApprove(taskId, toolArgs.checkpoint);
            else if (toolName === 'codeedict_init') result = cmdInit(taskId, toolArgs.proposal_path || '', toolArgs.initial_stage || '', toolArgs.project_id || '');
            else if (toolName === 'codeedict_wait') result = cmdWait(toolArgs.seconds || 5);
            else result = { error: `unknown tool: ${toolName}` };
        } catch (e) {
            result = { error: e.message };
        }
        sendMcp({ jsonrpc: '2.0', id: reqId, result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] } });
    } else if (method === 'notifications/initialized') {
        // 不需要回复
    } else {
        sendMcp({ jsonrpc: '2.0', id: reqId, error: { code: -32601, message: `unknown method: ${method}` } });
    }
}

function sendMcp(data) {
    process.stdout.write(JSON.stringify(data) + '\n');
}

// ══════════════════════════════════════════════════════════
//  导出（供测试使用）
// ══════════════════════════════════════════════════════════

module.exports = { cmdInit, cmdStage, cmdWrite, cmdStatus, cmdCheckEntry, cmdTransitions, cmdApprove, cmdReviewed, cmdRejected, cmdWait, Stage, WORKSPACE, PROJECTS_DIR, TASK_STATES_DIR };

// ══════════════════════════════════════════════════════════
//  CLI 入口
// ══════════════════════════════════════════════════════════

if (require.main === module) {
    const args = process.argv.slice(2);
    // 无参数或第一个参数是 mcp → 启动 MCP Server（MCP 模式是默认模式）
    if (args.length === 0 || args[0] === 'mcp') {
        runMcp();
    } else if (args.length < 2) {
        console.log(JSON.stringify({ usage: [
            'node check.js init        <task-id> [proposal-path]',
            'node check.js stage       <task-id> <new-stage>',
            'node check.js write       <task-id> <file-path>',
            'node check.js status      <task-id>',
            'node check.js approve     <task-id> <checkpoint>',
            'node check.js reviewed    <task-id>',
            'node check.js rejected    <task-id> [reason]',
            'node check.js transitions [<current-stage>]',
            'node check.js check-entry <task-id> <new-stage>',
        ] }));
        process.exit(0);
    } else {
        const cmd = args[0];
        const taskId = args[1] || '';
        let result;
        if (cmd === 'init') result = cmdInit(taskId, args[2] || '', args[3] || '', args[4] || '');
        else if (cmd === 'stage' && args.length >= 3) result = cmdStage(taskId, args[2]);
        else if (cmd === 'write' && args.length >= 3) result = cmdWrite(taskId, args[2]);
        else if (cmd === 'status') result = cmdStatus(taskId);
        else if (cmd === 'approve' && args.length >= 3) result = cmdApprove(taskId, args[2]);
        else if (cmd === 'reviewed') result = cmdReviewed(taskId);
        else if (cmd === 'rejected') result = cmdRejected(taskId, args[2] || '');
        else if (cmd === 'transitions') result = cmdTransitions(taskId || '');
        else if (cmd === 'check-entry' && args.length >= 3) result = cmdCheckEntry(taskId, args[2]);
        else { result = { error: `未知命令: ${cmd}` }; }
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.allowed === false ? 1 : 0);
    }
}
