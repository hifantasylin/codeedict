# Codeedict 状态机自测模板

每次重大改动后，按此模板跑至少两个场景：一个纯分析、一个代码变更。

## 测试场景：______________（如"解决xxxbug"）

路径：______________（如 clarify → analyze → review → code → commit → archive）

### 逐步骤跟踪

| # | 阶段 | 谁 | 动作 | 标记 | ✅ |
|---|------|-----|------|------|:--:|
| 1 | | | | | |
| 2 | | | | | |

### 校验清单

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

### 发现的问题

| # | 问题 | 修复 |
|---|------|------|
| | | |

---

## 快速复检命令

改动后只需重跑这两个场景：

```
场景 A：纯分析（如"分析下xx功能"）
  路径：analyze → review → Archive
  关键：MODE:report 不进 Code

场景 B：代码变更（如"解决xxxbug"）  
  路径：analyze → review → code → commit → Archive
  关键：MODE:normal/lightweight → Code → 内循环
```
