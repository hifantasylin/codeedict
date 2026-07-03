#!/usr/bin/env node
/**
 * 构建产物验证（Cursor 平台）
 * 用法：node scripts/test-build.js [platform]
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const platform = process.argv[2] || 'cursor';
let passed = 0;
let failed = 0;

function assert(condition, label) {
    if (condition) {
        console.log(`  ✅ ${label}`);
        passed++;
    } else {
        console.error(`  ❌ ${label}`);
        failed++;
    }
}

function fileExists(p) {
    return fs.existsSync(p);
}

function readFile(p) {
    return fs.readFileSync(p, 'utf-8');
}

console.log(`\n📦 验证 ${platform} 构建产物`);

if (platform === 'cursor') {
    const skillDir = path.join(os.homedir(), '.cursor', 'skills', 'codeedict');
    const agentsDir = path.join(os.homedir(), '.cursor', 'agents');
    const skillPath = path.join(skillDir, 'SKILL.md');
    const checkPath = path.join(skillDir, 'check.js');

    assert(fileExists(skillPath), 'SKILL.md 存在');
    assert(fileExists(checkPath), 'check.js 存在');
    assert(fileExists(path.join(skillDir, 'templates')), 'templates/ 存在');
    assert(fileExists(path.join(skillDir, 'tools')), 'tools/ 存在');

    const subAgents = [
        'codeedict-analyst.md',
        'codeedict-coder.md',
        'codeedict-tester.md',
        'codeedict-proposal-reviewer.md',
        'codeedict-code-reviewer.md',
    ];
    for (const name of subAgents) {
        assert(fileExists(path.join(agentsDir, name)), `subagent ${name} 存在`);
    }

    const skillContent = fileExists(skillPath) ? readFile(skillPath) : '';
    assert(skillContent.includes('CallMcpTool'), 'SKILL.md 使用 CallMcpTool');
    assert(skillContent.includes('Task'), 'SKILL.md 含 Task 委派说明');
    assert(!skillContent.includes('mcp_call_tool'), 'SKILL.md 不含 CodeBuddy MCP 语法');

    const coderPath = path.join(agentsDir, 'codeedict-coder.md');
    if (fileExists(coderPath)) {
        const coderContent = readFile(coderPath);
        assert(coderContent.includes('StrReplace'), 'coder 使用 StrReplace');
        assert(coderContent.includes('Read'), 'coder 使用 Read');
    }

    if (fileExists(checkPath)) {
        try {
            const help = execSync(`node "${checkPath}" transitions analyze`, { encoding: 'utf-8' });
            assert(help.includes('"allowed"'), 'check.js CLI 正常');
        } catch (e) {
            assert(false, `check.js CLI 失败: ${e.message}`);
        }
    }
} else {
    const out = {
        codebuddy: path.join(os.homedir(), '.codebuddy', 'agents', 'codeedict'),
        vscode: path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'agents', 'codeedict'),
    }[platform];

    if (!out) {
        console.error(`未知平台: ${platform}`);
        process.exit(1);
    }

    assert(fileExists(out), `构建目录存在: ${out}`);
    assert(fileExists(path.join(out, 'check.js')), 'check.js 存在');
    assert(fileExists(path.join(out, 'templates')), 'templates/ 存在');
}

console.log(`\n📊 构建验证: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
