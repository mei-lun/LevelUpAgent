import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const cases = [
  "01-ttl-cache",
  "02-query-builder",
  "03-retry",
  "04-diagnose-reservation",
  "05-security-review",
  "06-invoice-scope",
];
const legacyFirst = new Set(["01-ttl-cache", "03-retry", "05-security-review"]);
const entries = [];

for (const caseId of cases) {
  const order = legacyFirst.has(caseId)
    ? [["legacy", 1], ["codex", 1], ["codex", 2], ["legacy", 2]]
    : [["codex", 1], ["legacy", 1], ["legacy", 2], ["codex", 2]];
  for (const [arm, repeat] of order) {
    const result = spawnSync(process.execPath, [
      path.join(scriptDir, "prepare-run.mjs"), caseId, arm, String(repeat),
    ], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    if (result.status !== 0) {
      process.stdout.write(result.stdout ?? "");
      process.stderr.write(result.stderr ?? "");
      process.exit(result.status ?? 1);
    }
    const runId = `${caseId}__${arm}__r${repeat}`;
    entries.push({ caseId, arm, repeat, runId, workspace: `runs/${runId}` });
    process.stdout.write(result.stdout ?? "");
  }
}

mkdirSync(path.join(root, "runs"), { recursive: true });
const board = [
  "# Harness A/B 运行板",
  "",
  "按顺序执行。`legacy` 使用 `Run-Legacy-Eval.cmd`，`codex` 使用 `Run-Codex-Eval.cmd`。每项完成后把 `[ ]` 改成 `[x]`。",
  "",
  "| 完成 | Case | Arm | Repeat | Workspace |",
  "| --- | --- | --- | ---: | --- |",
  ...entries.map(({ caseId, arm, repeat, workspace }) => `| [ ] | ${caseId} | ${arm} | ${repeat} | ${workspace} |`),
  "",
  "收集命令：",
  "",
  "```bash",
  "node evals/harness-ab/scripts/collect-run.mjs <workspace> --input-tokens N --output-tokens N --duration-ms N --rounds N",
  "```",
  "",
].join("\n");
writeFileSync(path.join(root, "runs", "RUN_BOARD.md"), board, "utf8");
console.log(`Prepared ${entries.length} isolated workspaces.`);
console.log(`Run board: ${path.join(root, "runs", "RUN_BOARD.md")}`);
