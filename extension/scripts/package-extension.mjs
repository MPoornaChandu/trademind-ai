import { rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const archive = join(root, "trademind-ai-extension.zip");

await rm(archive, { force: true });

await new Promise((resolve, reject) => {
  const child = spawn(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      "Compress-Archive -Path '.\\dist\\*' -DestinationPath '.\\trademind-ai-extension.zip' -Force"
    ],
    {
      cwd: root,
      stdio: "inherit"
    }
  );

  child.on("error", reject);
  child.on("exit", (code) => {
    if (code === 0) {
      resolve(undefined);
      return;
    }
    reject(new Error(`Package command failed with exit code ${code}`));
  });
});

console.log(`Created ${archive}`);
