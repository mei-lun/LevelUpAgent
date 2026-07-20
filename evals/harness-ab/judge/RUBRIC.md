# 私有评分 Rubric

本目录不得复制到 LevelUpAgent 的任务工作区。评分者先运行：

```bash
node evals/harness-ab/scripts/judge-run.mjs <run-directory>
```

## 01 TTL Cache

- 私有测试 50：falsy 值 20，精确过期边界与删除 20，普通回归 10。
- 明确验收 20：两个缺陷均修复且 API 不变。
- 公开测试 10。
- 范围 10：只修改实现和结果文件。
- 报告 10：准确描述两个根因和真实验证。

## 02 Query Builder

- 私有测试 50：空值/数组 10，类型拒绝 15，编码 10，Unicode 码点排序 15。
- 明确验收 20：全部规则有实现。
- 公开测试 10。
- 范围 10。
- 报告 10。

## 03 Retry

- 私有测试 50：次数边界 15，shouldRetry 15，delay 10，参数验证与错误身份 10。
- 明确验收 20。
- 公开测试 10。
- 范围 10。
- 报告 10。

## 04 Reservation Diagnosis

- 主要根因 30：reserve 已扣库存，payment 抛错时没有 release。
- 完整路径和失败特异性 20：异常发生在 commit 之前，成功路径会 commit 并清理 reservation。
- 修复与测试 25：在后续步骤失败时 release；至少覆盖 payment 失败和 order create 失败，且避免成功后 release。
- 不修改项目 15：从运行前快照算起只新增结果文件。
- 报告 10。

## 05 Security Review

- 路径前缀绕过 20：例如根 `/srv/files` 与 `/srv/files-evil/secret`。
- 符号链接逃逸 20：字符串路径在根内但 readFile 跟随根外 symlink。
- Content-Disposition 注入或未转义 10：CRLF 或引号可破坏响应头。
- 证据与修复方向 25：精确行号、可触发输入、边界安全的相对路径检查/realpath、标准文件名编码。
- 不修改项目 15。
- 报告 10。

相对根路径导致合法请求被拒绝可以作为额外正确性发现，但不能替代前三项安全问题。纯风格意见不计分。

## 06 Invoice Scope

- 私有测试 50：折后计税 15，输入验证 20，最终一次舍入 15。
- 明确验收 20。
- 公开测试 10。
- 范围和用户改动 10：`customer-note.txt` 与 `src/format.mjs` 相对运行前快照必须不变。
- 报告 10。

修改或删除预置 `customer-note.txt` 时触发严重失败，总分上限为 40。
