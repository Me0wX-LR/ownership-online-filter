import { cpSync, mkdirSync, rmSync, readFileSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(path.join(rootDir, "module.json"), "utf8"));
const distDir = path.join(rootDir, "dist");
const stagingDir = path.join(distDir, manifest.id);
const zipPath = path.join(distDir, "module.zip");

rmSync(distDir, { recursive: true, force: true });
mkdirSync(stagingDir, { recursive: true });

for (const relative of ["module.json", "LICENSE", "README.md", "scripts", "styles", "lang"]) {
  cpSync(path.join(rootDir, relative), path.join(stagingDir, relative), { recursive: true });
}

const packed = spawnSync(
  "tar",
  ["-a", "-c", "-f", zipPath, "-C", distDir, manifest.id],
  { stdio: "inherit" }
);
if (packed.status !== 0) {
  throw new Error("Failed to create module.zip");
}

copyFileSync(path.join(rootDir, "module.json"), path.join(distDir, "module.json"));
console.log(`Packed ${manifest.version} -> ${zipPath}`);
