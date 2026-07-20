import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
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
const [runPath, ...metricArgs] = process.argv.slice(2);
if (!runPath) {
  console.error("Usage: node collect-run.mjs <run-directory> [--input-tokens N --output-tokens N --duration-ms N --rounds N]");
  process.exit(2);
}

const runDir = path.resolve(runPath);
const runsRoot = path.join(root, "runs") + path.sep;
if (!runDir.startsWith(runsRoot) || !existsSync(runDir)) {
  console.error(`Run directory must exist below ${path.join(root, "runs")}`);
  process.exit(2);
}

const runId = path.basename(runDir);
const parts = runId.split("__");
if (parts.length !== 3 || !parts[2].startsWith("r")) {
  throw new Error(`Invalid run directory name: ${runId}`);
}
const [caseId, arm, repeatPart] = parts;
const repeat = Number(repeatPart.slice(1));
const config = JSON.parse(readFileSync(path.join(root, "cases", caseId, "case.json"), "utf8"));
const manifestPath = path.join(root, "manifests", `${runId}.json`);
const initialManifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const currentFiles = snapshotFiles(runDir);
const changedSinceStart = compareFiles(initialManifest.files, currentFiles);
const publicTest = run(config.publicTest, runDir);
const gitStatus = run(["git", "status", "--short", "--untracked-files=all"], runDir);
const gitDiff = run(["git", "diff", "--binary", "HEAD"], runDir);
const resultPath = path.join(runDir, "LEVELUP_RESULT.md");

const submission = {
  schemaVersion: 1,
  runId,
  caseId,
  arm,
  repeat,
  collectedAt: new Date().toISOString(),
  taskSha256: sha256(readFileSync(path.join(runDir, "TASK.md"))),
  taskMatchesPrepared: sha256(readFileSync(path.join(runDir, "TASK.md"))) === initialManifest.taskSha256,
  gitHeadMatchesPrepared: gitOutput(["rev-parse", "HEAD"], runDir).trim() === initialManifest.gitHead,
  taskText: readFileSync(path.join(runDir, "TASK.md"), "utf8"),
  resultFile: existsSync(resultPath) ? readFileSync(resultPath, "utf8") : null,
  resultFilePresent: existsSync(resultPath),
  changedSinceStart,
  gitStatus,
  gitDiff,
  untrackedFiles: collectUntracked(runDir),
  publicTest,
  operatorMetrics: parseMetrics(metricArgs),
  initialManifest,
  currentFiles,
};

mkdirSync(path.join(root, "submissions"), { recursive: true });
const output = path.join(root, "submissions", `${runId}.json`);
writeFileSync(output, `${JSON.stringify(submission, null, 2)}\n`, "utf8");
console.log(`Submission written: ${output}`);
console.log(`Public test exit code: ${publicTest.exitCode ?? "not started"}`);
console.log(`Files changed since model start: ${changedSinceStart.length}`);

function run(command, cwd) {
  const result = spawnSync(command[0], command.slice(1), {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
    timeout: 120_000,
  });
  return {
    command: command.join(" "),
    exitCode: result.status,
    signal: result.signal,
    stdout: limit(result.stdout ?? ""),
    stderr: limit(result.stderr ?? ""),
    error: result.error?.message ?? null,
  };
}

function gitOutput(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  return result.status === 0 ? result.stdout : "";
}

function parseMetrics(args) {
  const result = { inputTokens: null, outputTokens: null, durationMs: null, rounds: null };
  const names = new Map([
    ["--input-tokens", "inputTokens"],
    ["--output-tokens", "outputTokens"],
    ["--duration-ms", "durationMs"],
    ["--rounds", "rounds"],
  ]);
  for (let index = 0; index < args.length; index += 2) {
    const key = names.get(args[index]);
    const value = Number(args[index + 1]);
    if (!key || !Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid metric arguments near: ${args[index] ?? "<end>"}`);
    }
    result[key] = value;
  }
  return result;
}

function collectUntracked(cwd) {
  const listed = spawnSync("git", ["ls-files", "--others", "--exclude-standard", "-z"], {
    cwd,
    encoding: "buffer",
  });
  if (listed.status !== 0) return [];
  return listed.stdout.toString("utf8").split("\0").filter(Boolean).map((relative) => {
    const data = readFileSync(path.join(cwd, relative));
    return {
      path: relative.replaceAll(path.sep, "/"),
      bytes: data.length,
      sha256: sha256(data),
      contentBase64: data.length <= 1_000_000 ? data.toString("base64") : null,
    };
  });
}

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
    if (entry.isDirectory()) walk(child, childRelative, result);
    else if (entry.isFile()) result[childRelative] = { bytes: statSync(child).size, sha256: sha256(readFileSync(child)) };
  }
}

function compareFiles(before, after) {
  const paths = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  return paths.flatMap((file) => {
    if (!before[file]) return [{ path: file, change: "added", before: null, after: after[file] }];
    if (!after[file]) return [{ path: file, change: "deleted", before: before[file], after: null }];
    if (before[file].sha256 !== after[file].sha256) return [{ path: file, change: "modified", before: before[file], after: after[file] }];
    return [];
  });
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function limit(value) {
  const max = 120_000;
  return value.length <= max ? value : `${value.slice(0, 90_000)}\n...[truncated]...\n${value.slice(-30_000)}`;
}
