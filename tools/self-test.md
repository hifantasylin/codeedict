# Codeedict 状态机自测模板

每次重大改动后，先跑 `node scripts/test.js`（自动化状态机单元测试），再按此模板跑至少两个场景：一个纯分析、一个代码变更。

## 🔧 自动化测试（必须跑）

```
node scripts/test.js    # 状态机单元测试（15 项，含项目就绪门禁）
```

## 🎯 最小复检矩阵

> 只改了一个 agent/文件？查此表只跑对应场景。

| 改了什么 | 必须跑 | 可选跑 |
|----------|:---:|:---:|
| `check.js`（状态机） | `scripts/test.js` | — |
| `codeedict.md`（主 Agent） | A + B + C | — |
| `codeedict-analyst.md` | A (+ B 如果有 proposal) | — |
| `codeedict-coder.md` | B | — |
| `codeedict-tester.md` | B | — |
| `codeedict-code-reviewer.md` | B | — |
| `codeedict-proposal-reviewer.md` | A + B | — |
| proposal 模板 | B | — |
| `self-test.md` / `test.js` | `scripts/test.js` | — |
| `project-context.md`（模板） | D（Init + Archive） | — |
| `workspace-model.md` | D（文件路径验证） | — |

## 🧪 手动集成测试场景

## 校验清单

| 检查项 | ✅ |
|--------|:--:|
| 所有 `codeedict_stage` 由主 Agent 调用，子 Agent 从未调用 | |
| 每个子 Agent 开工第一件事是 `codeedict_status` 校验阶段 | |
| 阶段不匹配时子 Agent 输出 `[AGENT:REJECTED:expected=...]` | |
| COMPLETED 标记格式正确（`[MODE:*]` 来自 proposal-reviewer，`[TEST:*]` 来自 tester） | |
| REJECTED 细分标记正确（review / deviation / TIMEOUT / stage） | |
| 驳回内循环**不展示给用户**（静默直到通过） | |
| 偏离内循环：切回 code → 委派 coder → 委派 tester → 切回 commit → 重新审查 | |
| 偏离修正不走 lightweight，强制 coder+tester 流水线 | |
| 内循环 3 次驳回 → reviewer 自动裁决（接受或回滚） | |
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
| Init 扫描惯例 → 自动写入 → 仅告知摘要（不需用户确认） | |
| 新项目 AI 诊断 → 自动写入建议 → 仅告知（不需用户确认） | |
| Analyst 开案第一步读了 `project-context.md` | |
| Proposal bugfix/feature 模板含"复用评估"和"备选方案"段 | |
| Code-reviewer 在偏离裁决前执行了"架构一致性检查" | |
| 违反 project-context.md 强制规则的代码 → 审查官内循环驳回 | |
| Archive 第4步：AI 发现新惯例 → 自动追加 → 告知用户 | |
| `刷新规范 <projectId>` → 自动保存差异 → 告知变更摘要 | |

## 🆕 依赖图 + 反模式生长新增校验（D 组）

### Init 阶段

| 检查项 | ✅ |
|--------|:--:|
| Init 步骤 5 扫描了全项目 `import/require/include` → 生成双向边表写入 `project-context.md` 依赖关系图 | |
| 扫描后判定项目文件量 → 新项目（各章节全空）→ 自动进入 AI 诊断式对话 | |
| 已有项目（代码充足）→ 正常扫描惯例，不触发诊断对话 | |

### 新项目 AI 诊断式对话

| 检查项 | ✅ |
|--------|:--:|
| 第一轮：一口气问 4 个问题（项目做什么 / 谁用多少人 / 个人还是团队 / 已有技术选型） | |
| 第二轮：AI 基于回答输出 7 维度建议（技术栈/结构/分层/命名/组件/约束/边界），每项附理由 | |
| 第二轮产出覆盖 `project-context.md` 全部 9 章节（含新增的技术栈、项目结构、边界标记） | |
| 第三轮：一口气展示 → 用户一句话确认 → 写入，不逐项追问 | |
| 工具链命令写入 `project-context.md`「工具链」章节，不再单独 `project.json` | |

### Analyst 三层探查

| 检查项 | ✅ |
|--------|:--:|
| Analyst 步骤 1 读了 `project-context.md` → 包含边界标记（🔒/✅/⚠️）和依赖关系图 | |
| 步骤 6 第一层：从依赖图查出波及文件清单（不再纯手动搜全项目） | |
| 步骤 6 第二层：变更涉及函数/类/export → 在波及文件中搜索符号名 → 列出具体行号 | |
| 步骤 6 第三层：变更涉及 enum/常量/interface → 全项目搜索引用位置 | |
| 步骤 6 第四层：手动兜底确认 + 同类问题扫描 | |

### Code-reviewer 依赖验证 + 反模式匹配

| 检查项 | ✅ |
|--------|:--:|
| 步骤 0 架构一致性检查 → 含"依赖验证"四检查项（签名/删除/异步/枚举） | |
| 步骤 0 架构一致性检查 → 含"反模式自动匹配"（读反模式表 → 语义匹配 → 命中驳回） | |
| 反模式命中 → 标记 `⚠️ 已知反模式：[<来源任务>] <错误模式>` → 内循环驳回 | |
| 反模式未命中 → 正常继续 | |

### Archive 反模式提取

| 检查项 | ✅ |
|--------|:--:|
| bugfix 类任务 Archive → 步骤 4b 触发反模式提取（从 proposal 根因+方案段提取） | |
| feature 类任务 Archive → 步骤 4b 跳过（不提取） | |
| 提取的反模式追加到 `project-context.md` 反模式表（症状关键词 / 错误模式 / 正确做法 / 来源任务 ID，共 4 列） | |
| 同一 bug 模式不会重复追加（去重判断） | |

### Archive 依赖图增量更新

| 检查项 | ✅ |
|--------|:--:|
| 代码变更后 Archive 步骤 4c → 收集本次变更文件列表 → 重扫 import | |
| 与 `project-context.md` 依赖关系图 diff → 追加新边、移除废弃边 | |
| 不重扫全项目（增量，仅变更文件） | |
| `刷新规范 <projectId>` 触发全量重建（覆盖增量累积误差） | |

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
  路径：analyze → review → code(coder→tester) → commit → Archive
  关键：coder 编译通过 → tester 增量/全量测试 → reviewer 审查（含测试覆盖率）→ 内循环含 tester

场景 C：新项目懒初始化（如在新项目说"登录闪退"）
  路径：codeedict_init(project_id=xx) → blocked → Init → codeedict_init 重试
  关键：全程自动，用户只看到一行 "📍 正在初始化..."

场景 D：新项目 AI 诊断式引导（如空项目 Init）
  路径：Init 步骤 5 → 判定新项目 → 第一轮 4 问 → 第二轮 AI 建议 7 维度 → 第三轮确认落盘
  关键：不逐项问技术栈；AI 主动推荐带理由；工具链写入 project-context.md

场景 E：依赖图闭环（如修 loading bug）
  路径：Init（已生成依赖图）→ Analyst 步骤 6 三层探查 → Code-reviewer 依赖验证 + 反模式匹配 → Archive 反模式提取 + 依赖图增量更新
  关键：改 A 自动查出 B C D；同类错误下次自动拦截
