import path from "node:path";
import { readFile } from "node:fs/promises";

export async function loadDownload(root, requestedName) {
  const candidate = path.resolve(root, requestedName);
  if (!candidate.startsWith(root)) {
    throw new Error("File is outside the download root");
  }
  const body = await readFile(candidate);
  return {
    body,
    headers: {
      "content-disposition": `attachment; filename="${requestedName}"`,
      "content-type": "application/octet-stream",
    },
  };
}
