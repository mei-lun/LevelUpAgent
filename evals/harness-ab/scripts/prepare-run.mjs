import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const [caseId, arm, repeatText] = process.argv.slice(2);
const repeat = Number(repeatText);
const allowedArms = new Set(["legacy", "codex", "generic"]);

if (!/^[a-z0-9-]+$/.test(caseId ?? "") || !allowedArms.has(arm) || !Number.isInteger(repeat) || repeat < 1) {
  console.error("Usage: node prepare-run.mjs <case-id> <legacy|codex|generic> <repeat-number>");
  process.exit(2);
}

const caseDir = path.join(root, "cases", caseId);
const workspaceTemplate = path.join(caseDir, "workspace");
const configPath = path.join(caseDir, "case.json");
if (!existsSync(workspaceTemplate) || !existsSync(configPath)) {
  console.error(`Unknown or incomplete case: ${caseId}`);
  process.exit(2);
}

const config = JSON.parse(readFileSync(configPath, "utf8"));
if (config.id !== caseId) {
  throw new Error(`case.json id mismatch: expected ${caseId}, found ${config.id}`);
}

const runId = `${caseId}__${arm}__r${repeat}`;
const runDir = path.join(root, "runs", runId);
if (existsSync(runDir)) {
  console.error(`Run already exists and will not be overwritten: ${runDir}`);
  process.exit(2);
}

mkdirSync(path.dirname(runDir), { recursive: true });
cpSync(workspaceTemplate, runDir, { recursive: true });

const task = [
  readFileSync(path.join(root, "common", "PROMPT_HEADER.md"), "utf8").trim(),
  readFileSync(path.join(caseDir, "QUESTION.md"), "utf8").trim(),
  readFileSync(path.join(root, "common", "RESULT_CONTRACT.md"), "utf8").trim(),
].join("\n\n");
writeFileSync(path.join(runDir, "TASK.md"), `${task}\n`, "utf8");

execFileSync("git", ["init", "-q"], { cwd: runDir });
execFileSync("git", ["config", "user.name", "LevelUp Eval"], { cwd: runDir });
execFileSync("git", ["config", "user.email", "eval@local.invalid"], { cwd: runDir });
execFileSync("git", ["add", "--all"], { cwd: runDir });
execFileSync("git", ["commit", "-q", "-m", "Evaluation baseline"], { cwd: runDir });

if (config.dirtyOverlay) {
  const overlay = path.join(caseDir, config.dirtyOverlay);
  if (!existsSync(overlay)) throw new Error(`Missing dirty overlay: ${overlay}`);
  cpSync(overlay, runDir, { recursive: true, force: true });
}

const manifest = {
  schemaVersion: 1,
  runId,
  caseId,
  arm,
  repeat,
  createdAt: new Date().toISOString(),
  taskSha256: sha256(readFileSync(path.join(runDir, "TASK.md"))),
  gitHead: execFileSync("git", ["rev-parse", "HEAD"], { cwd: runDir, encoding: "utf8" }).trim(),
  initialGitStatus: execFileSync("git", ["status", "--short", "--untracked-files=all"], { cwd: runDir, encoding: "utf8" }),
  files: snapshotFiles(runDir),
};
mkdirSync(path.join(root, "manifests"), { recursive: true });
writeFileSync(
  path.join(root, "manifests", `${runId}.json`),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

console.log(`Run prepared: ${runId}`);
console.log(`Workspace: ${runDir}`);
console.log("Attach TASK.md and send exactly: 请完成附件中的评测任务。");

function snapshotFiles(directory) {
  const result = {};
  walk(directory, "", result);
  return result;
}

function walk(directory, relative, result) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!relative && entry.name === ".git") continue;
    const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
    const child = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(child, childRelative, result);
    } else if (entry.isFile()) {
      result[childRelative] = {
        bytes: statSync(child).size,
        sha256: sha256(readFileSync(child)),
      };
    }
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
