## 题目：实现稳定的查询字符串构造器

Case ID: `02-query-builder`

请完成 `src/query.mjs` 中的 `buildQuery(params)`：

- 按键名的 Unicode 码点升序输出，结果必须稳定；
- `null` 和 `undefined` 值省略；
- 数组按原顺序输出为重复键，数组中的 `null` 和 `undefined` 也省略；
- 字符串、有限数字和布尔值使用其字符串形式；
- 键和值都使用 `encodeURIComponent`；
- 没有参数时返回空字符串，否则返回以 `?` 开头的字符串；
- 遇到对象、函数、Symbol、BigInt、NaN 或 Infinity 时抛出 `TypeError`；
- 不得修改测试文件或添加依赖。
