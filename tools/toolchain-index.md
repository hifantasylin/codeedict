# 工具链 — 按需探测，写入 project-context.md

AI码律 不硬编码任何语言或框架命令。工具链在项目初始化时探测并写入 `<rootPath>/project-context.md` 的「工具链」章节。

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

3. 写入 project-context.md 工具链章节:

## 工具链
| 命令 | 用途 |
|------|------|
| npm run build | 构建 |
| npm test | 测试 |
| eslint src/ | Lint |
| docker build -t app . | 部署 |
```

## 使用时加载

Agent（coder/tester）进入 Code 阶段时读 `<rootPath>/project-context.md` → 「工具链」章节 → 获取编译/测试/Lint/部署命令。

## 多命令项目

如果一个项目有多个子项目（如 monorepo），工具链命令可以包含 `cd subdir && ...` 前缀。
