# Commit Message 格式规范

## 格式 A（无 Jira）

```
<type>: <简短中文描述>
```

type: fix | feat | refactor | docs | chore

示例：
```
fix: 修复登录按钮点击无响应，UI 回调缺主线程切换
```

## 格式 B（有 Jira）

```
[<BracketType>] <简短中文描述>
JiraID: <issue-id>
Description: <简短中文描述>
Root Cause: <根因或 NA>
Solution: <方案或 NA>
Test Step: <测试步骤或 NA>
```

BracketType 映射：feat→[Feature], fix→[BugFix], refactor→[Refactor], docs→[Docs], chore→[Chore]
