import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const manifest = JSON.parse(await readFile(join(dist, "manifest.json"), "utf8"));
const requiredFiles = ["manifest.json", "background.js", "contentScript.js", "popup.html", "sidepanel.html", "sidepanel.js", "styles.css"];
const files = new Set(await readdir(dist));

for (const file of requiredFiles) {
  if (!files.has(file)) {
    throw new Error(`Missing built file: ${file}`);
  }
}

if (manifest.manifest_version !== 3) {
  throw new Error("Manifest must use version 3.");
}

if (manifest.action?.default_popup !== "popup.html") {
  throw new Error("Manifest action.default_popup must be popup.html.");
}

if (!files.has(manifest.action.default_popup)) {
  throw new Error("Manifest action.default_popup points to a missing file.");
}

if (!manifest.permissions.includes("sidePanel") || !manifest.permissions.includes("storage")) {
  throw new Error("Manifest is missing required sidePanel or storage permission.");
}

for (const htmlFile of ["popup.html", "sidepanel.html"]) {
  const html = await readFile(join(dist, htmlFile), "utf8");
  const scriptMatches = [...html.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/g)];
  if (scriptMatches.length === 0) {
    throw new Error(`${htmlFile} must reference a JavaScript file.`);
  }

  for (const match of scriptMatches) {
    const scriptPath = match[1]?.replace(/^\.\//, "");
    if (!scriptPath || !files.has(scriptPath)) {
      throw new Error(`${htmlFile} references missing script: ${match[1] ?? "unknown"}`);
    }
  }
}

const textTargets = await Promise.all(requiredFiles.map((file) => readFile(join(dist, file), "utf8")));
const combined = textTargets.join("\n").toLowerCase();
const requiredBackend = "https://trademind-ai-backend-uw1j.onrender.com";
const requiredLocalBackend = "http://localhost:8000";
const requiredDisclaimer = "educational analysis only. not financial advice. no broker execution or real-money trading is included.";
const banned = ["must buy", "must sell", "guaranteed profit", "100% profit", "sure shot", "risk-free", "will definitely", "no risk"];

if (!combined.includes(requiredBackend)) {
  throw new Error("Extension default backend URL is missing.");
}

if (!combined.includes(requiredLocalBackend)) {
  throw new Error("Extension local backend URL is missing.");
}

if (!combined.includes(requiredDisclaimer)) {
  throw new Error("Required educational disclaimer is missing.");
}

const hits = banned.filter((phrase) => combined.includes(phrase));
if (hits.length > 0) {
  throw new Error(`Banned user-facing phrase found: ${hits.join(", ")}`);
}

for (const jsFile of [...files].filter((file) => file.endsWith(".js"))) {
  const js = await readFile(join(dist, jsFile), "utf8");
  const importMatches = [...js.matchAll(/from\s+["'](\.[^"']+)["']/g)];
  for (const match of importMatches) {
    const importPath = match[1];
    if (!importPath?.endsWith(".js")) {
      throw new Error(`${jsFile} contains an extensionless browser module import: ${importPath}`);
    }

    const importFile = importPath.replace(/^\.\//, "");
    if (!files.has(importFile)) {
      throw new Error(`${jsFile} imports missing file: ${importPath}`);
    }
  }
}

console.log("Extension validation passed.");
