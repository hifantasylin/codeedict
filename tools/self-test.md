# Codeedict 状态机自测模板

每次重大改动后，先跑 `node scripts/test.js`（自动化状态机单元测试），再按此模板跑至少两个场景：一个纯分析、一个代码变更。

## 🔧 自动化测试（必须跑）

```
node scripts/test.js    # 状态机单元测试（15 项，含项目就绪门禁）
```

## 🧪 手动集成测试场景

## 校验清单

| 检查项 | ✅ |
|--------|:--:|
| 所有 `codeedict_stage` 由主 Agent 调用，子 Agent 从未调用 | |
| 每个子 Agent 开工第一件事是 `codeedict_status` 校验阶段 | |
| 阶段不匹配时子 Agent 输出 `[AGENT:REJECTED:expected=...]` | |
| COMPLETED 标记格式正确（含键值扩展如 `[MODE:*]` / `[TEST:*]`） | |
| REJECTED 细分标记正确（review / deviation / user-decision / TIMEOUT / stage） | |
| 驳回内循环**不展示给用户**（静默直到通过） | |
| 偏离内循环：切回 code → 重新委派 coder → 切回 commit → 重新审查 | |
| 内循环 2 次兜底上升用户 | |
| 纯分析（MODE:report）不进 Code，直接 Archive | |
| 代码变更（MODE:lightweight/normal）审批后进 Code | |
| 轻量模式主 Agent 直接编码，普通模式委派 coder | |
| 用户硬卡点（👤批准 / 💾确认）不可合并不可跳过 | |
| 子 Agent 无标记 → 告知用户保持阶段，不自动重试 | |
| 编译/测试超限 → `REJECTED:TIMEOUT`，不切换阶段 | |
| proposal-reviewer 的 `codeedict_reviewed`/`rejected` 与完成标记一一对应 | |

## 🏗️ 架构规范新增校验（A 组）

| 检查项 | ✅ |
|--------|:--:|
| 新项目直接修 bug → codeedict_init 自动门禁拒绝 → 主 Agent 自动 Init → 重试成功 | |
| Analyst 开案第一步读了 `project-patterns.md` | |
| Proposal bugfix/feature 模板含"复用评估"和"备选方案"段 | |
| Code-reviewer 在偏离裁决前执行了"架构一致性检查" | |
| 违反 project-patterns.md 强制规则的代码 → 审查官内循环驳回 | |
| Archive 第4步：AI 发现新惯例 → 展示 → 用户 Y/n 确认 → 追加到 patterns | |
| `刷新规范 <projectId>` 重新扫描 → 对比差异 → 同步 pending-issues | |

## 发现的问题

| # | 问题 | 修复 |
|---|------|------|
| | | |

---

## 快速复检命令

改动后只需重跑：

```
# 自动化（必须）
node scripts/test.js

# 手动场景
场景 A：纯分析（如"分析下xx功能"）
  路径：analyze → review → Archive
  关键：MODE:report 不进 Code

场景 B：代码变更（如"解决xxxbug"）  
  路径：analyze → review → code → commit → Archive
  关键：MODE:normal/lightweight → Code → 内循环 → Archive 规范提炼

场景 C：新项目懒初始化（如在新项目说"登录闪退"）
  路径：codeedict_init(project_id=xx) → blocked → Init → codeedict_init 重试
  关键：全程自动，用户只看到一行 "📍 正在初始化..."
