# AI码律（Codeedict） 安装

AI 根据当前操作系统和已安装的 AI 编辑器自行选择对应方式执行。

## 前提

- 已安装 Node.js（用于运行 `check.js` MCP Server）

## 步骤

### 1. 检测平台

AI自行判断当前使用的 AI 编辑器，无需询问用户：

| 编辑器 | 标识 |
|--------|------|
| CodeBuddy | IDE 名称含 `CodeBuddy` |
| VS Code (GitHub Copilot) | IDE 名称含 `VS Code` 或 `Code` |

### 2. 构建并安装

执行构建命令（自动完成 agent 构建 + 拷贝运行时文件 + 清理旧残留）：

| 平台 | 命令 |
|------|------|
| CodeBuddy | `node scripts/build.js codebuddy` |
| VS Code | `node scripts/build.js vscode` |

构建产物输出到：

| 平台 | 构建目录 |
|------|----------|
| CodeBuddy | `~/.codebuddy/agents/codeedict/` |
| VS Code | `%APPDATA%\Code\User\agents\codeedict\` |

构建命令会自动完成：构建 agent 文件、拷贝 `check.js`、拷贝 `templates/`、拷贝 `tools/`、清理旧残留文件。

### 3. 写入 MCP 配置

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

### 5. 创建配置和 workspace

- 询问用户 workspace 存放路径，确认后创建目录及 `projects/` 子目录
- 写入 `~/.codeedict/codeedict-config.json`（双平台统一路径）：

```json
{
  "workspacePath": "<用户确认的路径>",
  "projectsRoot": ""
}
```

### 6. 验证并告知用户

验证文件齐全后告知：安装完成。CodeBuddy 用户在聊天框左下角选择 Codeedict 开始使用；VS Code 用户在 Copilot Chat 中选择 Codeedict agent。

安装完成。CodeBuddy 用户在聊天框左下角选择 Codeedict 开始使用；VS Code 用户在 Copilot Chat 中选择 Codeedict agent。
