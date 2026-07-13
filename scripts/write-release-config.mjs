import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateUpdaterEndpoint } from "./release-config-lib.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pubkey = process.env.TAURI_UPDATER_PUBKEY?.trim();
const endpoint = process.env.TAURI_UPDATER_ENDPOINT?.trim();
const privateKey = process.env.TAURI_SIGNING_PRIVATE_KEY?.trim();
const privateKeyPassword = process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD?.trim();

if (!pubkey || !endpoint || !privateKey || !privateKeyPassword) {
  throw new Error("Release requires the updater public key, endpoint, encrypted private key, and private-key password");
}
validateUpdaterEndpoint(endpoint);

const config = {
  bundle: { createUpdaterArtifacts: true },
  plugins: {
    updater: {
      pubkey,
      endpoints: [endpoint],
      windows: { installMode: "passive" },
    },
  },
};

const destination = resolve(root, "src-tauri", "tauri.release.conf.json");
await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, `${JSON.stringify(config, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
console.log("Prepared Windows release config with signed updater artifacts");
