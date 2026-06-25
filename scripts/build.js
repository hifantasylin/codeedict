#!/usr/bin/env node
/**
 * AI码律 Agent 构建脚本
 * 用法: node scripts/build.js [platform]
 *   platform: codebuddy | vscode | all (默认)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATES_DIR = path.join(ROOT, 'agent-templates');
const IDE_DIR = path.join(ROOT, 'ide');

const PLATFORM_OUTPUTS = {
    codebuddy: {
        dir: path.join(os.homedir(), '.codebuddy', 'agents', 'codeedict'),
        ext: '.md',
    },
    vscode: {
        dir: path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'agents', 'codeedict'),
        ext: '.agent.md',
    },
};

function loadConfig(platform) {
    const configPath = path.join(IDE_DIR, `${platform}.json`);
    if (!fs.existsSync(configPath)) {
        throw new Error(`平台配置不存在: ${configPath}`);
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

function loadTemplate(agentName) {
    const templatePath = path.join(TEMPLATES_DIR, `${agentName}.md`);
    if (!fs.existsSync(templatePath)) {
        throw new Error(`模板不存在: ${templatePath}`);
    }
    return fs.readFileSync(templatePath, 'utf-8');
}

function replacePlaceholders(content, placeholders) {
    let result = content;
    for (const [key, value] of Object.entries(placeholders)) {
        result = result.split(key).join(value);
    }
    return result;
}

function serializeFrontmatter(fields, platform) {
    // CodeBuddy: tools as space-comma list
    // VS Code: arrays in YAML bracket format
    const lines = ['---'];
    for (const [key, value] of Object.entries(fields)) {
        if (Array.isArray(value)) {
            if (platform === 'codebuddy') {
                lines.push(`${key}: ${value.join(', ')}`);
            } else {
                lines.push(`${key}: [${value.map(v => `'${v}'`).join(', ')}]`);
            }
        } else if (typeof value === 'boolean') {
            lines.push(`${key}: ${value}`);
        } else {
            lines.push(`${key}: ${value}`);
        }
    }
    lines.push('---');
    return lines.join('\n');
}

function buildAgent(agentName, config, platform, outputDir, ext) {
    const body = loadTemplate(agentName);
    const replacedBody = replacePlaceholders(body, config.placeholders || {});
    const agentCfg = config.agents[agentName];
    if (!agentCfg) {
        throw new Error(`配置中未找到 agent: ${agentName}`);
    }
    const frontmatter = serializeFrontmatter(agentCfg, platform);
    const output = frontmatter + '\n\n' + replacedBody;

    const outPath = path.join(outputDir, `${agentName}${ext}`);
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outPath, output, 'utf-8');
    console.log(`  ✅ ${outPath}`);
}

function copyDir(src, dst) {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const dstPath = path.join(dst, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, dstPath);
        } else {
            fs.copyFileSync(srcPath, dstPath);
        }
    }
}

function cleanOldFiles(outputDir) {
    // 清理 templates/ 中的旧文件（不在当前源码中的）
    const tmplDir = path.join(outputDir, 'templates');
    if (fs.existsSync(tmplDir)) {
        const sourceTmplDir = path.join(ROOT, 'templates');
        const validFiles = new Set(fs.existsSync(sourceTmplDir) ? fs.readdirSync(sourceTmplDir) : []);
        for (const f of fs.readdirSync(tmplDir)) {
            if (!validFiles.has(f)) {
                fs.unlinkSync(path.join(tmplDir, f));
                console.log(`  🗑️  清理旧模板: ${f}`);
            }
        }
    }
    // 清理根目录旧文件（不在 agent 列表中的 .md 文件）
    const config = loadConfig(platform);
    const agentNames = new Set(Object.keys(config.agents));
    for (const f of fs.readdirSync(outputDir)) {
        if (f.endsWith('.md') && !agentNames.has(f.replace(/\.md$/, '')) && f !== 'codeedict.md') {
            // 保留主 agent
        }
    }
}

function build(platform) {
    const config = loadConfig(platform);
    const out = PLATFORM_OUTPUTS[platform];
    const agentNames = Object.keys(config.agents);

    console.log(`\n🔨 构建 ${platform} (${agentNames.length} agents) → ${out.dir}`);

    // 1. 构建 agent 文件
    for (const name of agentNames) {
        buildAgent(name, config, platform, out.dir, out.ext);
    }

    // 2. 拷贝 check.js
    const checkSrc = path.join(ROOT, 'check.js');
    const checkDst = path.join(out.dir, 'check.js');
    fs.copyFileSync(checkSrc, checkDst);
    console.log(`  ✅ ${checkDst}`);

    // 3. 拷贝 templates/
    const tmplSrc = path.join(ROOT, 'templates');
    const tmplDst = path.join(out.dir, 'templates');
    copyDir(tmplSrc, tmplDst);
    console.log(`  ✅ ${tmplDst}/`);

    // 4. 拷贝 tools/*.md
    const toolsSrc = path.join(ROOT, 'tools');
    const toolsDst = path.join(out.dir, 'tools');
    copyDir(toolsSrc, toolsDst);
    console.log(`  ✅ ${toolsDst}/`);

    // 5. 清理旧残留
    cleanOldFiles(out.dir);

    console.log(`✅ ${platform} 构建完成`);
}

// Main
const args = process.argv.slice(2);
const platform = args[0] || 'all';

if (platform === 'all') {
    build('codebuddy');
    build('vscode');
} else if (PLATFORM_OUTPUTS[platform]) {
    build(platform);
} else {
    console.error(`未知平台: ${platform}\n可用: ${Object.keys(PLATFORM_OUTPUTS).join(', ')}, all`);
    process.exit(1);
}
