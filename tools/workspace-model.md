# AI码律 工作空间模型

路径：`<workspace-path>`（由 `~/.codeedict/codeedict-config.json` 中的 `workspacePath` 指定）

## 目录结构

```
<workspace-path>/
├── projects.md                          ← 项目登记簿（所有项目索引）
├── pending-issues.md                    ← 全局待处理问题
├── projects/
│   └── <projectId>/
│       ├── project.json                 ← 工具链 + 项目摘要
│       ├── project-patterns.md          ← 架构惯例（命名/分层/复用规则/反模式）
│       ├── task-tracker.md              ← 本项目活跃任务
│       ├── pending-issues.md            ← 本项目待处理问题
│       ├── proposals/                   ← 方案文档（六段格式）
│       │   └── <taskId>.md
│       ├── docs/                        ← 分析报告、调试记录
│       │   └── <taskId>-analysis.md
│       ├── tasks/                       ← 编码任务拆解清单
│       │   └── <taskId>-tasks.md
│       └── archive/                     ← 归档索引
│           └── index.md
├── metrics.md                           ← 任务指标（Archive 自动追加）
├── logs/                                ← 调试日志
└── knowledge/                           ← 审查模式库
    ├── index.md
    ├── security.md
    ├── performance.md
    └── reliability.md
```

## 各目录/文件职责

| 路径 | 职责 | 读写方 |
|------|------|--------|
| `projects.md` | 全局项目登记，含项目ID、路径、描述 | 主 Agent 读写 |
| `pending-issues.md` | 全局待处理问题 | 主 Agent 读写 |
| `project.json` | 工具链配置（编译、Lint、部署命令） | Coder/ Analyst 只读 |
| `project-patterns.md` | 项目架构惯例（命名/分层/复用规则/反模式） | 主 Agent 写入（初始化+Archive+刷新），Analyst/Code-Reviewer 只读 |
| `pending-issues.md` | 项目待处理问题（含架构合规、技术债等类型） | 主 Agent 写入（初始化扫描+Archive提炼），Code-Reviewer 可追加 |
| `task-tracker.md` | 项目活跃任务列表 | Coder 更新 |
| `proposals/<taskId>.md` | 六段式方案文档（只读不可改） | 主 Agent（Clarify 阶段）/ Analyst 写入，Coder/Reviewer 只读 |
| `docs/<taskId>-analysis.md` | 结构化分析报告 | Analyst 写入，Proposal-Reviewer 只读 |
| `tasks/<taskId>-tasks.md` | 编码任务拆解清单 | Coder 写入，Code-Reviewer 只读 |
| `archive/index.md` | 已归档任务索引（不搬运文件，只记索引行） | 主 Agent 追加 |
| `docs/<taskId>-requirements.md` | 需求澄清文档 | 主 Agent（Clarify 阶段）写入，Analyst 只读 |
| `metrics.md` | 任务效率指标（日期/类型/阶段数/驳回次数/模式） | 主 Agent（Archive 阶段）追加 |
| `knowledge/*.md` | 审查模式库（安全/性能/可靠性清单） | 审查官只读引用，用户手动编辑 |
