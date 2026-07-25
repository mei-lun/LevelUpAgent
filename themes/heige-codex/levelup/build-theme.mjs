import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "levelup");
const manifest = JSON.parse(await readFile(resolve(source, "manifest.json"), "utf8"));
const css = await readFile(resolve(source, "theme.css"), "utf8");
const layout = JSON.parse(await readFile(resolve(source, "layout.json"), "utf8"));
const scope = `html[data-levelup-theme="${manifest.id}"]`;

if (!css.includes(scope)) throw new Error(`Theme CSS must contain ${scope}`);
if (/__ASSET_[A-Z0-9_]+__/.test(css)) throw new Error("Theme CSS contains an unresolved asset placeholder");
if (/(?:@import|javascript:|expression\(|-moz-binding|behavior:|https?:|url\(\/\/)/i.test(css)) {
  throw new Error("Theme CSS contains a forbidden remote or executable construct");
}

const packageJson = manifest.layoutFile
  ? { ...manifest, css }
  : manifest.schemaVersion === 2
    ? { ...manifest, layout, css }
    : { ...manifest, css };
const output = resolve(root, "heige-codex.levelup-theme");
await mkdir(dirname(output), { recursive: true });
if (manifest.layoutFile) {
  await writeFile(resolve(root, manifest.layoutFile), `${JSON.stringify(layout)}\n`, "utf8");
}
await writeFile(output, `${JSON.stringify(packageJson)}\n`, "utf8");
console.log(`Built ${output}`);
