# AI码律（Codeedict） 安装

AI 根据当前操作系统和已安装的 AI 编辑器自行选择对应方式执行。

## 前提

- 已安装 Node.js（用于运行 `check.js` MCP Server）

## 步骤

### 1. 检测平台

AI自行判断当前使用的 AI 编辑器，无需询问用户：

| 编辑器 | 标识 |
|--------|------|
| Cursor | IDE 名称含 `Cursor` |
| CodeBuddy | IDE 名称含 `CodeBuddy` |
| VS Code (GitHub Copilot) | IDE 名称含 `VS Code` 或 `Code`（且不含 `Cursor`） |

### 2. 构建并安装

执行构建命令（自动完成 agent 构建 + 拷贝运行时文件 + 清理旧残留）：

| 平台 | 命令 |
|------|------|
| Cursor | `node scripts/build.js cursor` |
| CodeBuddy | `node scripts/build.js codebuddy` |
| VS Code | `node scripts/build.js vscode` |

构建产物输出到：

| 平台 | 构建目录 |
|------|----------|
| Cursor | Skill：`~/.cursor/skills/codeedict/`（含 `SKILL.md`、`check.js`、`templates/`、`tools/`）<br>Subagent：`~/.cursor/agents/codeedict-*.md` |
| CodeBuddy | `~/.codebuddy/agents/codeedict/` |
| VS Code | `%APPDATA%\Code\User\agents\codeedict\` |

构建命令会自动完成：构建 agent 文件、拷贝 `check.js`、拷贝 `templates/`、拷贝 `tools/`、清理旧残留文件、**把审查清单安装到 `~/.codeedict/knowledge/`**。

> `~/.codeedict/knowledge/` 是 coder / reviewer 读清单的实际路径（不是构建目录下的 `templates/knowledge/`）。构建时会覆盖同名文件、保留用户自建的其它清单，因此**升级只需重跑构建命令**。

### 3. 写入 MCP 配置

**Cursor**：写入 `~/.cursor/mcp.json`（如不存在则新建）：

```json
{
  "mcpServers": {
    "codeedict-gate": {
      "command": "node",
      "args": ["<build-dir>/check.js"]
    }
  }
}
```

> Cursor 的 `<build-dir>` 为 `~/.cursor/skills/codeedict`（Windows：`%USERPROFILE%\.cursor\skills\codeedict`）。

**CodeBuddy**：写入 `~/.codebuddy/mcp.json`（如不存在则新建）：

```json
{
  "mcpServers": {
    "codeedict-gate": {
      "command": "node",
      "args": ["<build-dir>/check.js"]
    }
  }
}
```

**VS Code**：写入 `%APPDATA%\Code\User\mcp.json`（如不存在则新建）：

```json
{
  "servers": {
    "codeedict-gate": {
      "type": "stdio",
      "command": "node",
      "args": ["<build-dir>/check.js"]
    }
  }
}
```

> `<build-dir>` 替换为实际的构建目录绝对路径。

### 4. 自定义模型（可选，仅 CodeBuddy）

询问用户：是否使用自己的 DeepSeek API Key？（说明：用自己的 Key 不消耗 CodeBuddy Credits，按量计费 ¥1/百万 token）

如果用户提供 Key，写入 `~/.codebuddy/models.json`：

```json
{
  "models": [
    {
      "id": "deepseek-v4-pro-mine",
      "name": "DeepSeek V4 Pro (自有)",
      "vendor": "DeepSeek",
      "url": "https://api.deepseek.com/v1/chat/completions",
      "apiKey": "<用户提供的 Key>",
      "maxInputTokens": 1000000,
      "maxOutputTokens": 384000,
      "supportsToolCall": true,
      "supportsImages": false,
      "relatedModels": {
        "lite": "deepseek-v4-flash-mine",
        "reasoning": "deepseek-v4-pro-mine"
      }
    },
    {
      "id": "deepseek-v4-flash-mine",
      "name": "DeepSeek V4 Flash (自有)",
      "vendor": "DeepSeek",
      "url": "https://api.deepseek.com/v1/chat/completions",
      "apiKey": "<用户提供的 Key>",
      "maxInputTokens": 1000000,
      "maxOutputTokens": 384000,
      "supportsToolCall": true,
      "supportsImages": false
    }
  ]
}
```

### 5. 验证并告知用户

**必做：验证 MCP 服务是否正常。** 执行 `node <build-dir>/check.js transitions analyze`（应返回 JSON 含 `"allowed"` 字段），确保无报错。如果报错（如 BOM 导致的 JSON 解析失败），修复后重试。

**同时检查清单目录**：`ls ~/.codeedict/knowledge/` 应列出 8 个 `.md`（`general-dev.md`、`correctness.md`、`maintainability.md`、`reliability.md`、`security.md`、`performance.md`、`android.md`、`rust-dev.md`）。缺失说明构建未完成，重跑构建命令。

验证通过后告知：

| 平台 | 使用方式 |
|------|----------|
| Cursor | 安装完成。在聊天中 `@codeedict` 或描述修 bug/加功能等需求即可触发；子 Agent 由主 Skill 通过 Task 工具委派 |
| CodeBuddy | 安装完成。在聊天框左下角选择 Codeedict 开始使用 |
| VS Code | 安装完成。在 Copilot Chat 中选择 Codeedict agent |

Cursor 用户修改 MCP 配置后需重载窗口（Developer: Reload Window）使 MCP 生效。

## 附：写入边界（无需操作，供了解）

安装本身只写这些位置：

| 位置 | 内容 |
|------|------|
| `~/.codebuddy/agents/codeedict/`（或对应平台目录） | agent 定义、`check.js`、`templates/`、`tools/` |
| `~/.codebuddy/mcp.json` | `codeedict-gate` 服务配置 |
| `~/.codeedict/knowledge/` | 审查清单 |
| `~/.codeedict/projects.json` | 首次初始化项目时创建 |

**不写项目仓库里的任何文件**。后续在项目里初始化时：

- 开发过程文档只落在 `<rootPath>/.codeedict/`
- 忽略写在 `<git-dir>/info/exclude`（**不改项目 `.gitignore`**），只在本机生效，`git status` 不会多出无关改动
- 不向源码目录写 `MODULE.md` 一类的模块级文档
