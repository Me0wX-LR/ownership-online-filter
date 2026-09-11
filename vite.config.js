import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.join(rootDir, "playground"),
  publicDir: false,
  plugins: [
    {
      name: "foundry-globals",
      transform(code, id) {
        if (!id.endsWith("scripts/module.mjs")) return null;
        return {
          code: `const { game, Hooks, foundry, ui, jQuery } = globalThis;\n${code}`,
          map: null
        };
      }
    }
  ],
  server: {
    host: "0.0.0.0",
    port: 43147,
    strictPort: true,
    fs: {
      allow: [rootDir]
    }
  },
  preview: {
    host: "0.0.0.0",
    port: 43147,
    strictPort: true
  },
  build: {
    outDir: path.join(rootDir, "dist"),
    emptyOutDir: true
  }
});
