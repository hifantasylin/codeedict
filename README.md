# AI码律 (Codeedict)

面向超级个体的标准化开发工作流。项目通过 `projects.json` 统一登记，每个项目独立持有自己的架构地图、方案文档、归档索引——切项目不丢知识。

AI 是副驾驶，AI码律 是仪表盘——状态、记录、检查点、代码健康，全靠它。任何语言、任何项目通用。

## 快速开始

### 安装

告诉 AI：`请安装 AI码律/Codeedict`

支持 **Cursor** / **CodeBuddy** / **VS Code (GitHub Copilot)** 三平台。安装后选择 **Codeedict** agent 即可使用。

### 使用

```
# 初始化项目（首次使用）
初始化 my-app

# 修 bug / 加功能（直接进 Analyze，不需 Clarify）
登录页点了没反应

# 新功能需求（直接进 Analyze，不需 Clarify）
登录页面添加微信登录

# 代码分析（只读，不写代码）
帮我分析下启动流程

# 需求模糊/有个想法（进 Clarify 多轮追问梳理需求）
我想做一个夜间模式

# 续跑 / 周报
继续 my-app-B01-xxx
周报

# 单独审查已有的文档或代码
审查 docs/proposals/xxx.md
```

> 规则：**修/改/加/bug/fix/crash/不工作/实现/开发/新增/feat/优化/重构** → 直接进 Analyze。**梳理/整理思路/有个想法/不太成熟/讨论** → 进 Clarify。

## 功能亮点

**项目登记制 + 文档沉淀** — 通过 `projects.json` 统一登记项目，每个项目独立持有自己的架构地图、方案文档、归档索引。全局 `~/.codeedict/` 只存项目登记簿和共享审查清单。切项目不丢知识，重复问题自动检索历史方案。

**三角度方案审查** — 方案产出后审查官从三个根本问题对立审查：**目标对齐**（方向对不对）、**成本合理**（划不划算）、**健康影响**（代码干不干净）。代码级别的健康审查由可维护性/正确性/安全合规三组点检清单驱动，检查结果结构化可复现。不再有重叠的"风险""长期收益""异常路径"。

**项目健康评分** — 每次归档自动评估项目健康状况，按可维护性 40% + 正确性 40% + 安全合规 20% 加权打分。分数写入 `project-context.md` 顶部，趋势标记一目了然（↑↓—）。首次分数为基线，后续自动对比。

**审查官驳回内循环** — 方案驳回不惊动状态机，analyst 修正后重新审查，最多 2 轮。健康影响 ⚠️ 不驳回（有条件通过），因为这类问题编码阶段可自动补，不必打回改方案。

**编码任务拆解 + 断续恢复** — 编码阶段先将提案拆成可独立执行的任务，表格追踪状态。中断后 `继续 <id>` 秒级恢复。

**双审查官质量门** — 方案审查官审方向，代码审查官审落地。偏离分三层裁决：执行层直接放行，内循环层审查官自行裁决（接受或驳回 coder 修正），只有方向性变更才上升用户。多数偏离在后台消化，用户只在真正需要拍板的决策点被打扰。

**自动路由 + 意图感知** — "登录页闪退"直接进 Analyze（修 bug），"分析下启动性能"进 Analyze（只读），"加个夜间模式"进 Clarify（需求模糊），"审查 xxx"进 review 入口。

**规范刷新** — `刷新规范 <projectId>` 重新扫描项目源码，更新 `project-context.md` 中的架构惯例和依赖图。

## 工作流

### Code 模式（改代码）

入口规则：需求明确（修/改/加/实现）→ 直接进 Analyze；需求模糊（梳理/有个想法）→ 先进 Clarify 追问。

```
 Analyze         │   Review        │    Code        │   Commit       │   Archive
─────────────────│─────────────────│────────────────│────────────────│───────────────
 分析师           │   方案审查官      │   程序员        │   代码审查官     │   主 Agent
                 │                  │                │                │
  ┌ 根因定位      │   ┌ 三角度审查    │   ┌ 拆任务      │   ┌ 偏离裁决    │   ┌ 登记索引
  ├ 设计方案      │   ├ 通过/驳回     │   ├ 编码        │   ├ 自试验证    │   ├ 规范提炼
  ├ 历史检索      │   │  ├ 驳回→🔴    │   ├ 编译        │   ├ 完成度对账  │   ├ 健康评分
  ▼              │   │  │ 内循环分析   │   ├ 自测        │   │  ├ ✅ commit│   └ 指标记录
 [AGENT:         │   │  └ 通过→🟢     │   ▼            │   │  ├ 🔴 内循环│
  COMPLETED]      │   ▼              │ [AGENT:        │   │  │ 修正编码  │
 → 主 Agent      │  ⚠️ 等待用户      │  COMPLETED]     │   │  └ 👤 方向   │
   切阶段         │   批准 ───────────► → 主 Agent     │   │    变更     │
                 │                   │   切阶段        │   ▼            │
                 │                   │                 │ [AGENT:        │
                 │                   │                 │  COMPLETED]    │
                 │                   │                 │ → git commit   │
                 │                   │                 │    (主 Agent)   │
                 │                   ▼                 │                │
                 │                   [AGENT:COMPLETED]  │                │
                 │                   [MODE:lightweight  │                │
                 │                    |normal|report]   │                │
                 │                   → 主 Agent 读标记  │                │
                 │                     做路由          │                │
```

其中「等待用户批准」的分支规则：

| MODE | 是否等待 | 后续 |
|------|---------|------|
| `report` | 不等待 | 自动进入 Archive（纯文档） |
| `lightweight` | 不等待 | 自动进入 Code（主 Agent 直接编码） |
| `normal` | **等待用户批准** | 展示方案摘要 → 用户确认 → 委派 coder 编码 |
| `[REVIEW:unresolved]` | 不等待 | 展示未解决问题清单 → 自动放行进入 Code |

### Clarify 入口（需求梳理）

仅用于需求模糊场景。主 Agent 轻量交互式调度（多轮追问，不委派子 agent）：

1. 以需求梳理者人格逐轮追问（3–5 轮），覆盖：做什么、谁用、场景、边界、技术约束
2. 写需求文档 `docs/requirements/<taskId>-req.md`
3. 切到 `analyze` 阶段，委派 analyst 继续

### 三角度审查

| 角度 | 审什么 | 裁定 |
|------|--------|:---:|
| 🎯 目标对齐 | 方案解决的根因与问题描述一致？是否擅自扩大范围？ | ✅ ❌ |
| ⚖️ 成本合理 | 改动量与问题严重度匹配？有无更简单方案？影响面可控？ | ✅ ⚠️ ❌ |
| 🧹 健康影响 | 可维护性/正确性/安全合规（MNT/COR/SEC 点检清单驱动） | ✅ ⚠️ ❌ |

**裁定规则**：
- 三个 ✅ → 通过
- 任一 ❌ → 驳回内循环（analyst 修正 → 再审查，最多 2 轮）
- 健康影响 ⚠️ → 有条件通过（不驳回，编码阶段自动补测试/修复）
- 成本合理 ⚠️ → 建议优化（驳回讨论）
- 目标对齐 ⚠️ → 讨论（驳回修正根因分析）

审查官可单独通过 `review` 入口审查已有文档（不含状态机流转）。

## 架构

### 项目目录

```
codeedict/
├── agent-templates/        ← 6 个 Agent Markdown 模板
│   ├── codeedict.md        ← 主调度 Agent（路由、状态机、入口）
│   ├── codeedict-analyst.md
│   ├── codeedict-coder.md
│   ├── codeedict-tester.md
│   ├── codeedict-code-reviewer.md
│   └── codeedict-proposal-reviewer.md
├── ide/                    ← 各平台 Agent 配置（tools/权限/model）
│   ├── codebuddy.json
│   ├── vscode.json
│   └── cursor.json
├── scripts/                ← 构建 + 测试脚本
│   ├── build.js            ← 模板→部署目录 + 占位符替换
│   ├── test.js             ← 状态机单元测试
│   └── test-build.js       ← 构建产物验证
├── templates/              ← 项目模板骨架
│   ├── project-context.md  ← 架构模板（含工具链 + 健康评分）
│   ├── proposal.md         ← 方案模板索引
│   ├── proposal-bugfix.md  ← Bug 修复方案模板
│   ├── proposal-feature.md ← 新功能方案模板
│   ├── weekly-report.md    ← 周报模板
│   ├── commit-format.md    ← 提交信息模板
│   ├── archive-index.md    ← 归档索引表格
│   ├── projects.json       ← 项目登记簿模板
│   ├── pending-issues.md   ← 待处理问题看板
│   └── knowledge/          ← 审查点检清单
│       ├── maintainability.md
│       ├── correctness.md
│       ├── security.md
│       ├── performance.md
│       └── reliability.md
├── tools/                  ← 参考文档
│   ├── self-test.md
│   ├── toolchain-index.md
│   └── workspace-model.md
├── check.js                ← MCP 状态机 Server
├── install.md              ← AI 安装指南
├── .gitignore
├── LICENSE
└── README.md
```

### 项目运行时目录

```
<projectRoot>/
├── project-context.md      架构地图 + 工具链 + 健康评分
├── .codeedict/             agent 执行态（gitignored）
│   ├── tasks/              编码拆解清单
│   ├── task-tracker.md     活跃任务看板
│   ├── pending-issues.md   待处理问题
│   └── states/             MCP 状态机文件
└── docs/                   项目知识库（git 管理）
    ├── proposals/          方案文档
    ├── analysis/           分析报告
    ├── requirements/       需求澄清
    └── archive.md          归档索引

~/.codeedict/               全局状态
├── projects.json           项目登记簿
├── metrics.md              效率指标
└── knowledge/              审查模式库
```

## 设计原则

**多 Agent 协作 + 完成汇报协议** — 主 Agent 只做意图路由、委派子 agent、状态切换，**绝不直接写代码或读 proposal 正文做技术判断**。子 Agent 开工校验状态、完工输出结构化标记（`[AGENT:COMPLETED]` / `[AGENT:REJECTED:reason]`）。阶段流转由主 Agent 统一管理，子 Agent 绝不自行切换。

**内循环不惊动状态机** — 方案审查驳回修正、编码偏离修正、测试失败修正，都属于当前阶段内循环，不产生新状态节点。状态机只管阶段间硬卡点（如 review → code 必须用户批准）。

**审查者和执行者分离** — 程序员只管按 proposal 编码，不主动发现偏离。所有偏离由代码审查官在对账时统一发现和裁决，不自判自案。

**零硬编码工具链** — 项目类型、编译命令、部署方式全部自动探测后写入 `project-context.md`，跨语言跨框架通用。

## 对比

| vs | 优势 |
|----|------|
| 纯 prompt 工作流 | 状态机硬约束保证 AI 不跳阶段，审查官独立裁决不靠 AI 自觉 |
| spec-driven 模式 | 不过早冻结实现方案，编码中允许调整，只在方向改变时用户介入 |
| agentic coding | 不靠 AI 自主判断完成度，每一步产出经审查官对账 |
