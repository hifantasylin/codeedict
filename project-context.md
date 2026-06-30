# 项目架构地图 — codeedict

> AI码律 自身的架构惯例。改这个项目时，codelist、analyst、coder、reviewer 都应先读此文件。

## 技术栈

| 项 | 选型 | 理由 |
|----|------|------|
| 语言 | Node.js（check.js）+ Markdown（模板） | MCP Server 需跨平台，Markdown 模板天然可读 |
| 框架 | 无框架，纯脚本 | 项目本质是 CLI 工具 + 模板集合 |
| 构建 | `node scripts/build.js` | 模板编译 + 占位符替换 + 拷贝到部署目录 |
| 测试 | `node scripts/test.js` | 状态机单元测试 15 项 |

## 项目结构

```
codeedict/
├── agent-templates/        ← 🔒 核心：6 个 Agent Markdown 模板
│   ├── codeedict.md        ← 主调度 Agent（路由、状态机、入口）
│   ├── codeedict-analyst.md
│   ├── codeedict-coder.md
│   ├── codeedict-tester.md
│   ├── codeedict-code-reviewer.md
│   └── codeedict-proposal-reviewer.md
├── ide/                    ← IDE 特定配置（每个 agent 的 tools/权限/model）
│   ├── codebuddy.json
│   └── vscode.json
├── scripts/                ← 构建+测试脚本
│   ├── build.js            ← 模板→部署目录 + 占位符替换
│   └── test.js             ← 状态机单元测试
├── templates/              ← 复制到 workspace 的项目骨架
│   ├── project-context.md  ← 给用户项目的架构模板（含测试体系章节）
│   ├── project.json        ← 工具链配置模板
│   ├── proposal-bugfix.md
│   ├── proposal-feature.md
│   └── ...
├── tools/                  ← ⚠️ 参考文档，非 Agent 读取
│   ├── self-test.md
│   ├── toolchain-index.md
│   └── workspace-model.md
├── check.js                ← 🔒 MCP 状态机 Server
├── install.md              ← AI 安装指南（首次安装时读取）
└── README.md
```

## 命名规则

| 类型 | 规则 | 示例 |
|------|------|------|
| Agent 模板 | `codeedict-<role>.md`，小写连字符 | `codeedict-coder.md` |
| IDE 配置 | `<platform>.json` | `codebuddy.json` |
| 脚本 | camelCase `.js` | `build.js`, `test.js` |
| 模板文件 | 小写连字符 `.md` | `project-context.md`, `pending-issues.md` |
| MCP 工具 | `codeedict_<action>`，snake_case | `codeedict_stage`, `codeedict_write` |
| 完成标记 | `[UPPERCASE:value]` | `[AGENT:COMPLETED]`, `[TEST:incremental-passed]` |

## 架构分层

| 层 | 职责 | 禁止 |
|----|------|------|
| Agent 模板 (`agent-templates/`) | 定义每个 Agent 的行为协议 | 不可硬编码路径（用 `{{PLACEHOLDER}}`） |
| IDE 配置 (`ide/`) | 注册 Agent + 工具权限 + 模型 | 不定义 Agent 行为逻辑（行为在模板里） |
| 构建脚本 (`scripts/build.js`) | 占位符替换 + 拷贝到部署目录 | 不修改模板内容本身 |
| 状态机 (`check.js`) | 阶段流转校验 + 写保护 + MCP 接口 | 不包含 Agent 调度逻辑 |
| 项目骨架 (`templates/`) | 给用户项目用的默认文件 | 不被 Agent 读取 |

## 关键约束

### 模板编写规则

| # | 约束 | 说明 |
|---|------|------|
| 1 | 子 Agent **绝不**调用 `codeedict_stage` | 阶段切换只有主 Agent 能做 |
| 2 | 子 Agent 开工第一件事：`codeedict_status` 校验阶段 | 不匹配则 `[AGENT:REJECTED:expected=...]` |
| 3 | 修改模板后**必须**跑 `node scripts/build.js` | 否则部署目录的 Agent 不会更新 |
| 4 | 模板中用 `{{PLACEHOLDER}}` 不硬编码 | `{{CONFIG_PATH}}`, `{{AGENT_DIR}}`, `{{EDIT_CMD}}`, `{{READ_CMD}}` |
| 5 | 主 Agent **只读结构化标记做路由**，不读 proposal 正文 | 标记如 `[MODE:*]`, `[TEST:*]` |
| 6 | coder/tester 写文件前**必须**调用 `codeedict_write` | 校验当前是否在 `code` 阶段 |
| 7 | `project-context.md` 模板章节可增不可删 | 已有章节被多 Agent 引用 |

### 部署目录

| 平台 | 路径 |
|------|------|
| CodeBuddy | `~/.codebuddy/agents/codeedict/` |
| VS Code | `%APPDATA%\Code\User\agents\codeedict\` |

### 完成标记协议

| 标记 | 来源 | 含义 |
|------|------|------|
| `[AGENT:COMPLETED]` | 任意子 Agent | 成功 |
| `[AGENT:COMPLETED][MODE:lightweight\|normal\|report]` | proposal-reviewer | 编码模式 |
| `[AGENT:COMPLETED][BUILD:passed]` | coder | 编译通过 |
| `[AGENT:COMPLETED][TEST:incremental-passed\|full-passed\|no-framework]` | tester | 测试通过 |
| `[AGENT:REJECTED:deviation]` | code-reviewer | 偏离驳回 |
| `[AGENT:REJECTED:test-failure]` | tester | 测试失败 |
| `[AGENT:REJECTED:review]` | proposal-reviewer | 方案驳回 |
| `[AGENT:REJECTED:TIMEOUT:compile-failure]` | coder | 编译超限 |

## 边界标记

| 标记 | 模块/文件 | 原因 |
|------|----------|------|
| 🔒 | `agent-templates/codeedict.md` | 主 Agent，路由逻辑影响全流程 |
| 🔒 | `check.js` | MCP 状态机，阶段流转核心 |
| 🔒 | `agent-templates/codeedict-coder.md` | 编码行为影响代码质量 |
| 🔒 | `agent-templates/codeedict-tester.md` | 测试行为影响质量验证 |
| ⚠️ | `agent-templates/codeedict-code-reviewer.md` | 审查逻辑影响质量门禁 |
| ⚠️ | `ide/*.json` | 工具权限变更可能影响安全 |
| ✅ | `templates/*.md`（非 project-context） | 项目骨架模板，低频变更 |
| ✅ | `tools/*.md` | 参考文档，不影响运行时 |
| ✅ | `scripts/test.js` | 测试脚本，不影响生产 |
| ✅ | `README.md` | 说明文档 |

## 修改影响面速查

| 改什么 | 跑什么 | 备注 |
|--------|--------|------|
| 任何 `agent-templates/*.md` | `node scripts/build.js` | 必须重建部署 |
| `check.js` | `node scripts/test.js` | 15 项单元测试 |
| `ide/*.json` | `node scripts/build.js` | 工具/权限变更 |
| `templates/project-context.md` | `node scripts/build.js` | 会影响用户项目初始化 |
| `templates/*.md`（其他） | `node scripts/build.js` | 会拷贝到部署目录 |

## 反模式 / 教训

| 症状 | 错误 | 正确做法 |
|------|------|----------|
| Agent 在项目目录下新建 `workspace/` | Agent 模板里有 `workspace/projects/...` 路径，但没有告诉 Agent 怎么解析 | **每个读/写 workspace 的 Agent 模板必修含「路径解析」段**：读 `{{CONFIG_PATH}}` → 取 `workspacePath` → 拼接实际路径 |
