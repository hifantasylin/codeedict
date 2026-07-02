# AI码律 工作空间模型

Codeedict 使用两级存储：全局 `~/.codeedict/` + 项目目录。

## 全局目录 `~/.codeedict/`

路径固定，无需配置。所有跨项目共享的 agent 状态存这里。

```
~/.codeedict/
├── projects.json                        ← 项目登记簿（projectId → rootPath）
├── metrics.md                           ← 跨项目效率指标
└── knowledge/                           ← 审查模式库（用户编辑）
    ├── security.md
    ├── performance.md
    └── reliability.md
```

| 文件 | 职责 | 读写方 |
|------|------|--------|
| `projects.json` | projectId → {name, path} 映射。check.js 启动时加载到内存缓存，agent 通过此文件定位项目根路径 | 主 Agent 初始化时写入，check.js 只读 |
| `metrics.md` | 任务效率指标（日期/类型/阶段数/驳回次数/模式） | 主 Agent (Archive) 追加 |
| `knowledge/*.md` | 审查模式库（安全/性能/可靠性清单） | 审查官只读引用，用户手动编辑 |

## 项目根目录 `<projectRoot>/`

项目特有的文件回归项目内。按 git 策略分为两类：

```
<projectRoot>/
├── project-context.md                 ← git ✅  架构地图 + 工具链
├── .codeedict/                        ← git ❌（.gitignore 一行）
│   ├── tasks/<taskId>-tasks.md
│   ├── task-tracker.md
│   ├── pending-issues.md
│   └── states/<taskId>.json
├── docs/                              ← git ✅  项目知识库
│   ├── proposals/<taskId>.md
│   ├── analysis/<taskId>-analysis.md
│   ├── requirements/<taskId>-req.md
│   └── archive.md
└── src/ ...
```

### git 提交部分（项目知识资产）

| 路径 | 职责 | 读写方 |
|------|------|--------|
| `project-context.md` | 项目全部上下文：技术栈、项目结构、工具链、可复用组件、命名规则、架构分层、边界标记、测试体系、依赖关系图、反模式、设计约束 | 主 Agent 写入（初始化+新项目引导+Archive+刷新），Analyst/Code-reviewer/Tester 只读 |
| `docs/proposals/<taskId>.md` | 六段式方案文档 | 主 Agent (Clarify) / Analyst 写入，Coder/Reviewer/Proposal-Reviewer 只读 |
| `docs/analysis/<taskId>-analysis.md` | 结构化分析报告 | Analyst 写入，Proposal-Reviewer 只读 |
| `docs/requirements/<taskId>-req.md` | 需求澄清文档 | 主 Agent (Clarify) 写入，Analyst 只读 |
| `docs/archive.md` | 已归档任务索引（不搬运文件，只记索引行） | 主 Agent 追加 |

### git 忽略部分（agent 执行态，高频变化）

| 路径 | 职责 | 读写方 |
|------|------|--------|
| `.codeedict/tasks/<taskId>-tasks.md` | 编码任务拆解清单 | Coder 写入，Code-Reviewer 只读 |
| `.codeedict/task-tracker.md` | 项目活跃任务看板 | Coder 更新 |
| `.codeedict/pending-issues.md` | 项目待处理问题（含架构合规、技术债等） | 主 Agent 写入（初始化扫描+Archive提炼），Code-Reviewer 可追加 |
| `.codeedict/states/<taskId>.json` | MCP 状态机任务状态 | check.js 读写，agent 不直接访问 |

## 路径解析

Agent 和 check.js 通过 `projects.json` 实现项目路径定位：

### Agent 端

- **全局路径**：直接 `~/.codeedict/<相对路径>`（硬编码）
- **项目内路径**：通过 `projectId` 查 `~/.codeedict/projects.json` → 拿到 `rootPath` → 拼接 `<rootPath>/project-context.md`、`<rootPath>/docs/...` 等

### check.js 端

启动时一次性加载 `projects.json` 到内存 Map。后续所有 MCP 调用通过 `_getRootPath(projectId)` 获取项目路径，零 I/O。

```js
// 示例
const root = _getRootPath(projectId);
// → const statesDir = path.join(root, '.codeedict', 'states');
// → const proposalPath = path.join(root, 'docs', 'proposals', `${taskId}.md`);
```
