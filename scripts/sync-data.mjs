// data/papers.json（正本・/collect が書く）を public/data/ へ同期する。
// dev/build の前に自動実行（package.json の predev/prebuild）。
import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "data/papers.json");
const destDir = resolve(root, "public/data");
const dest = resolve(destDir, "papers.json");

if (!existsSync(src)) {
  console.error(`[sync-data] 正本が見つかりません: ${src}`);
  process.exit(1);
}
mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`[sync-data] data/papers.json -> public/data/papers.json`);
