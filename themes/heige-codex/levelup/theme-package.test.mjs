import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const file = resolve(root, "heige-codex.levelup-theme");
const packageJson = JSON.parse(await readFile(file, "utf8"));
const scope = `html[data-levelup-theme="${packageJson.id}"]`;

if (packageJson.id !== "heige-codex") throw new Error("Unexpected package ID");
if (packageJson.schemaVersion !== 2 || packageJson.layout !== "standard" || packageJson.layoutFile !== "codex.layout.json") throw new Error("The package must use the compatible Codex companion layout");
const companion = JSON.parse(await readFile(resolve(root, packageJson.layoutFile), "utf8"));
if (companion.id !== "codex" || companion.root?.className?.[0] !== "codex-layout") throw new Error("The Codex companion layout is missing");
if (!packageJson.css.includes(scope)) throw new Error("The package CSS is not scoped");
if (!packageJson.css.includes("@media (prefers-color-scheme: dark)")) throw new Error("The package does not provide an OS dark-mode variant");
if (/(?:@import|javascript:|expression\(|-moz-binding|behavior:|https?:|url\(\/\/)/i.test(packageJson.css)) {
  throw new Error("The package contains a forbidden CSS construct");
}
if (/__ASSET_[A-Z0-9_]+__/.test(packageJson.css)) throw new Error("Unresolved asset placeholder");
if (Buffer.byteLength(JSON.stringify(packageJson), "utf8") > 12 * 1024 * 1024) throw new Error("Package is too large");
console.log("Theme package checks passed");
