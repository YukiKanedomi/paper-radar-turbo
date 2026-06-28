// data/*.json（正本・/collect が書く）を public/data/ へ同期する。
// dev/build の前に自動実行（package.json の predev/prebuild）。
import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const destDir = resolve(root, "public/data");
mkdirSync(destDir, { recursive: true });

// papers.json は必須、issues-log.json（配信ノート）は任意（無ければスキップ）
const files = [
  { name: "papers.json", required: true },
  { name: "issues-log.json", required: false },
];

for (const f of files) {
  const src = resolve(root, "data", f.name);
  if (!existsSync(src)) {
    if (f.required) {
      console.error(`[sync-data] 正本が見つかりません: ${src}`);
      process.exit(1);
    }
    continue;
  }
  copyFileSync(src, resolve(destDir, f.name));
  console.log(`[sync-data] data/${f.name} -> public/data/${f.name}`);
}
