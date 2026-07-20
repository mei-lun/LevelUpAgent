import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const workspace = process.env.CASE_WORKSPACE;

test("diagnosis result identifies reservation cleanup gap", async () => {
  const result = await readFile(path.join(workspace, "LEVELUP_RESULT.md"), "utf8");
  assert.match(result, /reserve|预留/i);
  assert.match(result, /release|释放|回滚/i);
  assert.match(result, /payment|支付/i);
  assert.match(result, /catch|finally|异常|失败/i);
});
