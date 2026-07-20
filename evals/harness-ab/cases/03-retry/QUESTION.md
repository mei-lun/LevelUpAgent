## 题目：修复异步重试控制流

Case ID: `03-retry`

`retry` 的当前实现会在不该重试时继续，并且尝试次数存在边界错误。请修复它，满足：

- `maxAttempts` 表示包含首次调用在内的总尝试次数；
- 操作成功后立即返回结果；
- `shouldRetry(error, attempt)` 返回 `false` 时立即抛出原始错误；
- 用完尝试次数后抛出最后一次原始错误；
- `delay(attempt, error)` 只在确实还会进行下一次尝试时调用；
- `attempt` 从 1 开始，传给 `shouldRetry` 和 `delay` 的是刚刚失败的尝试编号；
- `maxAttempts` 不是正整数时抛出 `RangeError`；
- 保持导出函数签名，不修改测试文件或添加依赖。
