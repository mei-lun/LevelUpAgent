# Eval 环境

## 已构建版本

两个可执行文件来自同一个最新源码工作树 `feature/prompt_optimize`、提交 `fd5b75d3abfbe9e7428b3c892d8a849e2823a320` 加上当前未提交 Harness 改动。它们使用不同 application identifier，因此数据库和会话互不共享。

| 组别 | 可执行文件 | Prompt | Application identifier | SHA-256 |
| --- | --- | --- | --- | --- |
| Codex | `apps/LevelUpAgent-Eval-Codex-Patched.exe` | 当前 Harness，编译期 Legacy 开关关闭 | `com.levelup.agent.eval.codex` | `a0ecd5496f74d878673fa571e1d4b5a6288238672d67b9f8a935ba6c1bfdf40d` |
| Legacy | `apps/LevelUpAgent-Eval-Legacy-Patched.exe` | 改造前原始系统提示词 | `com.levelup.agent.eval.legacy` | `50f61b248d11b675b34fedfd8c3c02bbe791d6736bdc123fc3b80bb054a01e88` |

直接双击对应的 `Run-*.cmd` 启动器。启动器已指向修复后的 `*-Patched.exe`。首次启动两个版本都要分别配置相同 Provider、模型和 API Key；这是因为它们使用独立应用数据目录。

## 一键准备题目

在项目根目录执行：

```bash
node evals/harness-ab/scripts/prepare-suite.mjs
```

它会创建 24 个独立工作区和运行板：

```text
evals/harness-ab/runs/RUN_BOARD.md
```

不要把 `evals/harness-ab/judge/` 复制到任何 LevelUp 工作区。私有测试必须留在评测者侧。

## 单次操作

1. 按运行板选择对应的 Eval 应用。
2. 在 LevelUp 中把该行 workspace 设置为唯一工作区。
3. 附加 workspace 下的 `TASK.md`。
4. 只发送 `请完成附件中的评测任务。`。
5. 结束后确认生成 `LEVELUP_RESULT.md`。
6. 在项目根目录运行收集命令：

   ```bash
   node evals/harness-ab/scripts/collect-run.mjs evals/harness-ab/runs/<run-id> --input-tokens N --output-tokens N --duration-ms N --rounds N
   ```

## 两组设置

两组都设置为 Agent、Full 权限、同一个 GPT-5.6 模型和同一个协议。两组都关闭 Task Compiler、Provider failover、MCP、Skills 和全局 Instructions。Codex 组显式选择 Codex；Legacy 组不需要选择 Harness，编译期已经固定为旧提示词。

## 构建复现

当前 Eval 二进制由以下方式构建，构建产物复制到 `apps/`：

```text
LEVELUP_EVAL_BUILD=1 CARGO_TARGET_DIR=D:\Github-Poj\LevelUpAgent-eval-target pnpm tauri build --no-bundle --config evals/harness-ab/config/tauri.eval.codex.json
LEVELUP_EVAL_BUILD=1 LEVELUP_EVAL_LEGACY_PROMPT=1 CARGO_TARGET_DIR=D:\Github-Poj\LevelUpAgent-eval-target pnpm tauri build --no-bundle --config evals/harness-ab/config/tauri.eval.legacy.json
```
