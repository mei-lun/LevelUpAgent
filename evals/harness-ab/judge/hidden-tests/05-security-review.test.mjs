import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const workspace = process.env.CASE_WORKSPACE;

test("review result covers the three principal security classes", async () => {
  const result = await readFile(path.join(workspace, "LEVELUP_RESULT.md"), "utf8");
  assert.match(result, /startsWith|prefix|前缀/i);
  assert.match(result, /symlink|symbolic link|符号链接|realpath/i);
  assert.match(result, /content-disposition|header|响应头|CRLF/i);
});
