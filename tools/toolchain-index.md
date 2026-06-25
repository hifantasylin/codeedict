# 工具链 — 按需探测，按项目存储

AI码律 不硬编码任何语言或框架命令。工具链在项目初始化时探测并写入 project.json。

## 初始化时探测逻辑

```
1. 扫描项目根目录下的标志文件:

   文件                  → type           → 默认编译命令
   package.json          → node           → npm run build
   tsconfig.json         → typescript     → npx tsc --noEmit
   requirements.txt      → python         → pip install -e .
   pyproject.toml        → python         → poetry install
   pom.xml               → java-maven     → mvn compile
   build.gradle(.kts)    → java-gradle    → ./gradlew build
   go.mod                → go             → go build ./...
   Cargo.toml            → rust           → cargo build
   Makefile              → make           → make build
   Dockerfile            → docker         → docker build

2. 提取具体命令:
   - package.json → 读 scripts 字段，有 "build" 就用 npm run build
   - build.gradle → 检查是否有 gradlew wrapper
   - 询问用户补充: "检测到 XXX 项目，编译命令是 YYY 吗？部署方式是？"

3. 写入 project.json:
   - toolchain.build:  编译/构建命令
   - toolchain.watch:  开发模式热重载命令
   - toolchain.deploy: 部署命令
   - toolchain.lint:   Lint 命令
   - toolchain.test:   测试命令
   - toolchain.debug:  调试日志/断点命令
```

## 使用时加载

AI 进入 Code 阶段时读 `workspace/projects/<projectId>/project.json` → `toolchain` 字段 → 获取编译/部署/Lint/测试命令。

## 用户手动配置

初始化后，用户可直接编辑 project.json 中的 toolchain 字段来调整命令。

## 多命令项目

如果一个项目有多个子项目（如 monorepo），toolchain 命令可以包含 `cd subdir && ...` 前缀，或询问用户拆分。
