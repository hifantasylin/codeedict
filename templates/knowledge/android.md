# Android 编码规范审查清单

> Android 项目专用。检测到项目中存在 `build.gradle` / `build.gradle.kts` / `AndroidManifest.xml` 时，coder 和 reviewer 应读取此文件并逐项遵守/核对。
>
> 审查官可在审查报告中引用这些模式 ID，如 `> ✅ AND-02 已覆盖`。

## 稳定性

| ID | 检查项 | 级别 | 说明 |
|----|--------|:---:|------|
| AND-01 | 异常捕获粒度 | 强制 | 禁止捕获通用 `Exception` 或 `Throwable`，否则会掩盖 `ClassCastException` 等未预料的运行时异常 |
| AND-02 | 空 catch 块 | 强制 | 捕获异常必须处理：向上抛出、优雅降级，或在注释中给出明确的忽略理由 |
| AND-03 | 隐式 Intent 安全跳转 | 强制 | 隐式 Intent 跳转前必须通过 `resolveActivity` 检查，防止 `ActivityNotFoundException` |
| AND-04 | BroadcastReceiver 成对注册/注销 | 强制 | Activity/Fragment 中动态注册的 BroadcastReceiver 必须成对调用 `registerReceiver`/`unregisterReceiver` |
| AND-05 | Adapter getView 显式设置属性 | 强制 | 因 item 复用机制，所有子控件属性必须显式设置（即使为 null 或透明也必须明确 set） |
| AND-06 | Service 禁止耗时操作 | 强制 | `onStartCommand`/`onBind` 中禁止执行耗时操作，应使用 `IntentService` 或异步机制 |
| AND-07 | BroadcastReceiver 禁止耗时操作 | 强制 | `onReceive` 中禁止执行耗时操作，如有耗时任务应创建 IntentService 完成 |
| AND-08 | Application 禁止缓存数据 | 强制 | 禁止在 Application 对象中缓存数据，组件间数据共享应使用 Intent 或持久化机制 |
| AND-09 | 非 UI 线程操作 View | 强制 | 禁止在非 UI 线程操作 View |
| AND-10 | 布局层级 | 强制 | 避免 ViewGroup 多重嵌套，使用 `RelativeLayout` 替代 `LinearLayout` 嵌套；使用 `Merge`/`ViewStub` 优化 |
| AND-11 | 过度绘制 | 强制 | 禁止多次设置相同背景导致过度绘制，不需要显示的布局及时隐藏 |
| AND-12 | onPause 耗时操作 | 强制 | Activity 的 `onPause` 中不做耗时操作，否则阻塞下一个 Activity 的 `onCreate` |
| AND-13 | 文本/尺寸单位 | 强制 | 文本大小使用 `sp`，View 尺寸使用 `dp` |
| AND-14 | Kotlin 空安全 | 推荐 | 使用 Kotlin 空安全特性避免 NPE，优先使用不可空类型 |
| AND-15 | DialogFragment | 推荐 | 使用 `DialogFragment` 替代 `Dialog`/`AlertDialog`，便于随 Activity 生命周期管理 |
| AND-16 | onDestroy 释放资源 | 推荐 | 避免在 `onDestroy` 中释放资源，应在 `onPause`/`onStop` 配合 `isFinishing()` 处理 |
| AND-17 | LocalBroadcastManager | 推荐 | 应用内广播优先使用 `LocalBroadcastManager`，安全性更好、效率更高 |
| AND-18 | FragmentTransaction 提交时机 | 推荐 | `commit()` 应在 `onPostResume` 或 `onResumeFragments` 内调用，不使用 `commitAllowingStateLoss()` |
| AND-19 | 内存泄漏防护 | 推荐 | 及时释放不再使用的对象，可使用 `WeakReference`/`SoftReference` 管理缓存对象 |
| AND-20 | 对象重用 | 推荐 | 避免创建过多短暂对象，尽量重用，减少 GC 压力 |
| AND-21 | 图片目录规范 | 推荐 | 大分辨率图片（单维度超 1000）统一放 `xxhdpi` 目录 |

## 性能

| ID | 检查项 | 级别 | 说明 |
|----|--------|:---:|------|
| AND-22 | R8 完整模式 | 强制 | 启用 R8 完整模式（`fullMode = true`），可提升冷启动速度、降低 ANR |
| AND-23 | 主线程协程 | 推荐 | 使用 Kotlin 协程处理异步任务，避免主线程阻塞，Service 多并发使用 IntentService |
| AND-24 | 基准配置文件 | 推荐 | 采用 Baseline Profiles 将 JIT 编译步骤移至开发阶段 |
| AND-25 | 启动配置文件 | 推荐 | 采用 Startup Profiles 优化 DEX 文件布局 |
| AND-26 | 性能测试 | 推荐 | 使用 Macrobenchmark 编写启动/滚动等核心场景性能测试 |
| AND-27 | Perfetto 分析 | 推荐 | 使用 Perfetto 分析系统级性能问题（CPU 调度、Binder 调用、帧耗时） |
| AND-28 | 低端设备测试 | 推荐 | 使用低端设备做动态性能测试，放大问题更容易定位 |

## 安全

| ID | 检查项 | 级别 | 说明 |
|----|--------|:---:|------|
| AND-29 | 内部存储文件权限 | 强制 | 内部存储文件默认仅本应用可访问，禁止使用废弃的 `MODE_WORLD_READABLE`/`MODE_WORLD_WRITEABLE` |
| AND-30 | 外部存储限制 | 强制 | 外部存储仅存储非敏感信息，禁止在外部存储存放可执行文件/类文件 |
| AND-31 | 敏感数据加密 | 推荐 | 敏感数据使用加密存储，密码须使用哈希函数存储 |
| AND-32 | ContentProvider 导出 | 强制 | ContentProvider 不导出时必须设置 `android:exported=false` |
| AND-33 | Service 显式 Intent | 推荐 | 总是使用显式 Intent 启动或绑定 Service，不为 Service 声明 IntentFilter |
| AND-34 | HTTPS 强制 | 强制 | 服务器支持 HTTPS 时必须使用 HTTPS（`HttpsURLConnection`） |
| AND-35 | 禁止 localhost IPC | 强制 | 禁止使用 localhost 端口处理敏感 IPC，应使用 Service 等 Android IPC 机制 |
| AND-36 | ContentProvider 参数化查询 | 推荐 | 使用参数化查询方法（`query`/`update`/`delete`）访问 ContentProvider，防止 SQL 注入 |
| AND-37 | 权限最小化 | 推荐 | 尽量减少应用请求的权限数量，不创建"危险"保护级别的新权限 |
| AND-38 | 输入验证 | 强制 | 严格验证所有外部来源输入数据（用户输入、网络数据、文件等），防止注入攻击 |
| AND-39 | 第三方库 | 推荐 | 优先使用社区声誉良好的库（参考 Play SDK Index） |
| AND-40 | 依赖更新 | 强制 | 定期更新依赖库到最新版本，修复已知安全漏洞 |
| AND-41 | R8 Keep 规则具体化 | 推荐 | Keep 规则应尽可能具体，避免包级别通配符 `-keep class com.example.pkg.** { *; }` |
| AND-42 | R8 注解标记 | 推荐 | 在源码中使用注解标记需保留的元素，Keep 规则直接定位注解 |
| AND-43 | R8 避免反转运算符 | 推荐 | 避免在 Keep 规则中使用反转运算符 `!` |

## 约束级别说明

| 级别 | 含义 |
|:---:|------|
| 强制 | **必须遵守**。违反此规则将导致代码审查驳回或健康影响 ❌ |
| 推荐 | **建议遵守**。违反此规则将标记为健康影响 ⚠️，建议修正但不阻塞 |

## 审查引用方式

审查报告中：

```
## Android 稳定性

| ID | 检查项 | 级别 | 结论 |
|----|--------|:---:|:---:|
| AND-01 | 异常捕获粒度 | 强制 | ✅ 已覆盖 — 使用具体异常类型捕获 |
| AND-05 | Adapter getView 显式设置 | 强制 | 🆕 新发现 — ListAdapter 中 item 属性未显式设置，滑动可能错乱 |
| AND-14 | Kotlin 空安全 | 推荐 | ✅ 已覆盖 — 使用不可空类型 |
```
