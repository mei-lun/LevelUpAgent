# 单次运行检查表

## 运行前

- [ ] 使用 `prepare-run.mjs` 创建了全新工作区。
- [ ] 模型完整 ID、Provider、协议与其他组一致。
- [ ] 选择 Agent 模式和 Full 权限。
- [ ] Provider failover、Task Compiler、MCP、Skills、全局 Instructions 均已关闭。
- [ ] 新建了空会话，没有复制任何历史答案。
- [ ] 只附加本次工作区里的 `TASK.md`。

## 发送

用户消息必须完全一致：

```text
请完成附件中的评测任务。
```

- [ ] 没有发送补充提示或解释。
- [ ] 没有在中途提供人工建议。
- [ ] 没有因为模型表现不好而提前重跑。

## 结束后

- [ ] 没有要求模型补救或修改最终回答。
- [ ] 记录了是否达到回合或时间限制。
- [ ] 执行了 `collect-run.mjs`，包括失败运行。
- [ ] 保留 run 目录和 submission JSON。
