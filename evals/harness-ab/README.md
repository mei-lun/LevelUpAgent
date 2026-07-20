# LevelUp Harness A/B 小型评测包

本目录用于比较同一个 GPT-5.6 模型在 LevelUpAgent 中使用旧版提示词与使用 Codex Harness 时的实际问题解决能力。

这是一套低成本 Pilot：6 个微型任务，每个任务在 A、B 两组各运行 2 次，共 24 次。每个任务通常应在 3 到 10 分钟内完成。Pilot 可以发现明显退化或明显增益，但不能替代更大规模的正式评测。

## 实验组

| 组别 | 配置 | 含义 |
| --- | --- | --- |
| `legacy` | 改造前构建，提交 `fd5b75d3abfbe9e7428b3c892d8a849e2823a320` | 主基线：没有新 Prompt Harness 层 |
| `codex` | 当前 Harness 构建，显式选择 Codex，Task Compiler 关闭 | 主实验组 |
| `generic` | 当前 Harness 构建，显式选择 LevelUp Generic | 可选消融组，不代表“无 Harness” |

主结论只比较 `codex - legacy`。如果暂时只有一个当前构建，可以先比较 `codex - generic`，但报告必须称为“Codex Profile 相对 Generic Profile”，不能称为“有 Harness 相对无 Harness”。

`prepare-run.mjs` 的 arm 参数只负责给运行编号和记录标签，**不会替你切换客户端构建或 Harness 设置**。操作者必须确认 `legacy` 使用旧构建，`codex` 使用当前构建并显式选中 Codex。

## 准备两个客户端构建

Legacy 基线建议从单独 worktree 启动，避免改动当前 Harness 工作树：

```bash
git worktree add ../LevelUpAgent-legacy fd5b75d3abfbe9e7428b3c892d8a849e2823a320
```

推荐使用 `apps/` 下的两个 Eval 可执行文件：它们来自同一份最新源码，只在编译期切换系统提示词，并使用不同的 Tauri application identifier。`LevelUpAgent-Eval-Codex-Patched.exe` 是实验组，`LevelUpAgent-Eval-Legacy-Patched.exe` 是基线组。首次启动两者都需要分别配置同一个 Provider 和 API Key。

如果需要从 Git 重建旧版参考程序，再使用 `../LevelUpAgent-legacy` worktree；它不是主实验所需的运行方式。

两个构建可以顺序运行并使用同一个 Provider 配置，但不要让一个构建打开另一个构建尚未结束的会话。每次运行仍使用本评测包生成的独立工作区。

## 固定条件

所有运行必须使用相同的：

- GPT-5.6 具体模型 ID、Provider 和协议；
- Agent 模式、Full 权限；
- 12 轮工具上限和相同上下文限制；
- 已启用工具、Skills、MCP 和全局 Instructions；
- 网络条件和依赖环境。

建议评测期间关闭 Provider failover、Task Compiler、MCP、Skills 和全局 Instructions。不要在任何一组中添加额外提示词。除 `TASK.md` 外，不要向模型发送解释或提醒。

## 快速开始

环境要求：Node.js 20+ 和 Git。

1. 准备一次独立运行：

   ```bash
   node evals/harness-ab/scripts/prepare-run.mjs 01-ttl-cache legacy 1
   ```

2. 脚本会输出工作区路径，例如：

   ```text
   evals/harness-ab/runs/01-ttl-cache__legacy__r1
   ```

3. 在 LevelUpAgent 中把这个目录选为唯一工作区，把其中的 `TASK.md` 作为附件发送。用户消息固定为：

   ```text
   请完成附件中的评测任务。
   ```

4. 不要追加指导、批准建议或纠错。等待模型结束，并确认工作区里出现 `LEVELUP_RESULT.md`。

5. 在 LevelUpAgent 外运行证据收集：

   ```bash
   node evals/harness-ab/scripts/collect-run.mjs evals/harness-ab/runs/01-ttl-cache__legacy__r1
   ```

   如果界面中可以读取本次会话的累计指标，可以同时记录：

   ```bash
   node evals/harness-ab/scripts/collect-run.mjs evals/harness-ab/runs/01-ttl-cache__legacy__r1 --input-tokens 1234 --output-tokens 456 --duration-ms 32000 --rounds 4
   ```

6. 收集结果会写入 `evals/harness-ab/submissions/`。评分时提供对应的 `TASK.md` 和 submission JSON；如果仍保留 run 目录，还可以执行私有测试复核代码。

## 运行顺序

为减少服务状态和时间漂移，按以下顺序交错运行：

| 题号 | 顺序 |
| --- | --- |
| 01、03、05 | legacy r1 -> codex r1 -> codex r2 -> legacy r2 |
| 02、04、06 | codex r1 -> legacy r1 -> legacy r2 -> codex r2 |

每次都必须由 `prepare-run.mjs` 创建新工作区。禁止复用会话、复制前一次答案或把前一次测试反馈交给下一次运行。

## 交付给评分者

每次运行只需要交付：

- `TASK.md`；
- `submissions/<run-id>.json`；
- 如果可用，保留原始 run 目录用于重新执行私有测试。

完整实验规程和评分方法见 [TEST_PLAN.md](./TEST_PLAN.md)，逐次检查表见 [RUN_CHECKLIST.md](./RUN_CHECKLIST.md)，汇总时使用 [SCORECARD_TEMPLATE.md](./SCORECARD_TEMPLATE.md)。

当前已经构建好的两个 Eval 应用和隔离数据目录说明见 [ENVIRONMENT.md](./ENVIRONMENT.md)。要一次性生成全部 24 个工作区，执行：

```bash
node evals/harness-ab/scripts/prepare-suite.mjs
```
