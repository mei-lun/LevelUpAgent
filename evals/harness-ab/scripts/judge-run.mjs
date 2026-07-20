import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const runDir = path.resolve(process.argv[2] ?? "");
const runId = path.basename(runDir);
const caseId = runId.split("__")[0];
const hiddenTest = path.join(root, "judge", "hidden-tests", `${caseId}.test.mjs`);

if (!runDir || !existsSync(runDir) || !existsSync(hiddenTest)) {
  console.error("Usage: node judge-run.mjs <prepared-run-directory>");
  process.exit(2);
}

const result = spawnSync(process.execPath, ["--test", hiddenTest], {
  cwd: root,
  encoding: "utf8",
  env: { ...process.env, CASE_WORKSPACE: runDir, NO_COLOR: "1", FORCE_COLOR: "0" },
  timeout: 120_000,
});

console.log(result.stdout);
if (result.stderr) console.error(result.stderr);
console.log(`Hidden test exit code: ${result.status}`);
process.exitCode = result.status ?? 1;
