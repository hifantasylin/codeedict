# 性能审查清单

> 审查官可在审查报告中引用这些模式 ID，如 `> ✅ PERF-01 已覆盖`。

| ID | 检查项 | 说明 |
|----|--------|------|
| PERF-01 | 主线程阻塞 | 是否有 IO、网络、DB 操作在主线程执行 |
| PERF-02 | N+1 查询 | 循环内是否逐条查 DB/网络而非批量 |
| PERF-03 | 内存泄漏 | Dialog/DialogFragment 是否在 onDestroy 前 dismiss；静态持有 Activity/Fragment 引用 |
| PERF-04 | 重复计算 | 同一值在循环/高频回调中重复计算，未缓存 |
| PERF-05 | 过度绘制 | 新增 View 是否有不必要的嵌套层级 |
| PERF-06 | Bitmap 占用 | 大图是否做了缩放/采样；是否在不需要时 recycle |
| PERF-07 | 不必要的对象创建 | 循环内 new Object；频繁 GC 触发点 |

## 审查引用方式

审查报告中：
```
## 性能评估
| ID | 检查项 | 结论 |
|----|--------|:---:|
| PERF-01 | 主线程阻塞 | ✅ 已覆盖 — DB 操作在 IO 线程 |
| PERF-03 | 内存泄漏 | 🆕 新发现 — Dialog 未在 onDestroy 前 dismiss |
```
