import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const staticFiles = [
  ["manifest.json", "manifest.json"],
  ["popup.html", "popup.html"],
  ["sidepanel.html", "sidepanel.html"],
  ["src/styles.css", "styles.css"]
];

await mkdir(join(root, "dist"), { recursive: true });

for (const [from, to] of staticFiles) {
  await copyFile(join(root, from), join(root, "dist", to));
}
