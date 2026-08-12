# Rust 开发总纲

> Rust 项目专属开发铁律。检测到 Cargo.toml 时写入「适用审查清单」，coder/reviewer 按 ID 遵守/对账。

## 所有权与借用

| ID | 规则 | 级别 | 说明 |
|----|------|:---:|------|
| RUST-DEV-01 | 优先引用而非 clone | 强制 | 函数参数优先 `&T` / `&mut T`，只在需要独立所有权时才 `clone()`。禁止无差别 `clone()` 绕过借用检查 |
| RUST-DEV-02 | 生命周期标注最小化 | 推荐 | 只标注编译器无法推断的生命周期。能用 `'_` 省略就不显式命名 |
| RUST-DEV-03 | 避免不必要的 Rc/RefCell | 推荐 | 单线程用标准借用，多线程用 Arc/Mutex。Rc/RefCell 只在单线程共享可变状态且无法用借用表达时使用 |

## 错误处理

| ID | 规则 | 级别 | 说明 |
|----|------|:---:|------|
| RUST-DEV-04 | 禁止 panic 路径 | 强制 | 禁止 `unwrap()` / `expect()` 在库代码（library crate）中使用。二进制 crate（main.rs）可用 expect 处理不可恢复错误，但必须附说明注释 |
| RUST-DEV-05 | 库用 thiserror，应用用 anyhow | 强制 | library crate 用 `thiserror` 定义明确的错误枚举；binary crate 可用 `anyhow::Result` 简化传播。库代码禁止用 anyhow 作为公开 API 返回类型 |
| RUST-DEV-06 | 禁止静默吞错误 | 强制 | 禁止 `let _ = fallible_fn()` 静默丢弃 Result。如果确实不需要结果，用 `.ok()` 或显式注释说明原因 |
| RUST-DEV-07 | Result 类型明确 | 推荐 | 每个 crate 定义自己的 `Error` 枚举，不直接暴露上游依赖的错误类型（用 `#[from]` 转换） |

## 异步与并发

| ID | 规则 | 级别 | 说明 |
|----|------|:---:|------|
| RUST-DEV-08 | 全链路 async，零 block_in_place | 强制 | trait 方法如果在 tokio runtime 上下文调用，必须是 `async fn`。禁止 `block_in_place(|| rt.block_on(...))` 桥接同步/异步 |
| RUST-DEV-09 | 同步 IO 走 spawn_blocking | 强制 | 同步阻塞操作（rusqlite、文件 IO）用 `tokio::task::spawn_blocking`，不用 `block_in_place` |
| RUST-DEV-10 | task 边界加 catch_unwind | 强制 | 所有 tokio spawn task（LLM 调用、工具执行、定时任务）必须用 `catch_unwind` 包裹，panic 不传播到进程 |
| RUST-DEV-11 | async trait 用 #[async_trait] | 强制 | 异步 trait 统一用 `#[async_trait]` 宏，不手写 Pin<Box<dyn Future>> |
| RUST-DEV-12 | channel 背压用 send().await | 强制 | 禁止 `blocking_send()` 在 async context 中使用，一律 `send().await` 自然背压 |
| RUST-DEV-13 | 生产/转发解耦用 join! | 强制 | 事件生产与消费必须在 `tokio::join!` 中两个独立 future 并发，禁止同一个 `select!` 交叉驱动 |

## 项目结构

| ID | 规则 | 级别 | 说明 |
|----|------|:---:|------|
| RUST-DEV-14 | workspace member 判定 | 强制 | 独立 crate 满足 GEN-DEV-01 的 ≥2 项条件才提升为 workspace member。不满足则保持为 crate 内子模块 |
| RUST-DEV-15 | feature-gating 最小化 | 推荐 | 每个 feature flag 对应一个可独立关闭的功能维度。不按"后端类型"建 feature（如 feature = "postgres"），改用编译时 feature 控制可选依赖 |
| RUST-DEV-16 | 模块文件组织 | 强制 | `mod.rs` 只做 re-export 和模块级文档，实现放独立文件。避免单个 `mod.rs` 超 200 行 |

## 命名

| ID | 规则 | 级别 | 说明 |
|----|------|:---:|------|
| RUST-DEV-17 | snake_case 模块/函数/变量 | 强制 | 对齐 Rust 惯例：`snake_case` 文件名、函数名、变量名 |
| RUST-DEV-18 | CamelCase 类型/trait | 强制 | struct/enum/trait 用 `CamelCase` |
| RUST-DEV-19 | SCREAMING_SNAKE_CASE 常量 | 强制 | `const` / `static` 用 `SCREAMING_SNAKE_CASE` |
| RUST-DEV-20 | Cargo 命名 | 推荐 | crate name 用 `kebab-case`（Cargo.toml），对应 lib name 用 `snake_case`（自动转换） |

## Panic 防护

| ID | 规则 | 级别 | 说明 |
|----|------|:---:|------|
| RUST-DEV-21 | 禁止索引越界 | 强制 | 对 `&str` 禁止用字节索引 `text[..n]` 截断（多字节字符会 panic），用 `chars().take(n)` |
| RUST-DEV-22 | 禁止 unwrap 在库代码 | 强制 | 同 RUST-DEV-04，但专指 `unwrap()` 调用。库代码中每个 unwrap 都必须有充分理由并注释 |
| RUST-DEV-23 | Debug 不含敏感字段 | 强制 | 含密钥/凭证/token 的结构体禁止 `#[derive(Debug)]`，手动实现 Debug 排除敏感字段 |

## 审查引用方式

审查报告中：

```
## Rust 开发规范

| ID | 检查项 | 级别 | 结论 |
|----|--------|:---:|:---:|
| RUST-DEV-04 | 禁止 panic | 强制 | ✅ 已覆盖 — 无 unwrap/expect |
| RUST-DEV-08 | 全链路 async | 强制 | 🆕 新发现 — store.rs:45 block_in_place |
```
