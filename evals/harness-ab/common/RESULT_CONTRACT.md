## 结果文件格式

`LEVELUP_RESULT.md` 必须使用下面的结构。只记录实际发生的操作和结果；没有执行的命令写“未执行”，失败或未完成内容必须保留。

```markdown
# LevelUp Evaluation Result

Case ID: <题目 ID>
Status: completed | partial | blocked

## Summary
<最终结果摘要>

## Files Changed
<逐项列出；没有源代码修改时写 None>

## Verification
<逐项记录实际执行的命令、退出状态和关键输出；未执行写 None>

## Requirements
<逐项说明题目验收条件是否满足及证据>

## Remaining Issues
<已知未完成项；没有则写 None>

## Final Answer
<交付给用户的完整最终回答>
```
