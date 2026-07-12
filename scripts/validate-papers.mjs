// data/papers.json の「配信品質ルーブリック＋スキーマ深さ検証」。
// §0「嘘をつかない」と構造の致命違反を ERROR（公開ブロック）、
// 深さルーブリックの未達を WARN（助言・ブロックしない）として報告する。
//
// 使い方:
//   node scripts/validate-papers.mjs            # ERROR があれば exit 1
//   node scripts/validate-papers.mjs --strict   # WARN も失格扱い（exit 1）
//   node scripts/validate-papers.mjs --quiet     # OK 行を省略
//
// prebuild で実行され、自動配信(daily-collect)では build を必須条件にしているため
// ここで ERROR が出ると公開されない＝§0回帰の機械的な番人になる。

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STRICT = process.argv.includes("--strict");
const QUIET = process.argv.includes("--quiet");
// 既定は正本 data/papers.json。テスト等で第1引数にファイルを渡せる。
const fileArg = process.argv.slice(2).find((a) => !a.startsWith("--"));
const file = fileArg ? resolve(fileArg) : resolve(root, "data/papers.json");

const errors = []; // §0・構造の致命違反（公開ブロック）
const warns = []; // 深さルーブリック未達（助言）

const err = (where, msg) => errors.push({ where, msg });
const warn = (where, msg) => warns.push({ where, msg });

const isYmd = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const nonEmpty = (s) => typeof s === "string" && s.trim().length > 0;
const arr = (x) => (Array.isArray(x) ? x : []);

// ---- 読み込み・JSON 妥当性 -------------------------------------------------
let data;
try {
  data = JSON.parse(readFileSync(file, "utf8"));
} catch (e) {
  console.error(`\n✗ JSON として読めません: ${file}\n  ${e.message}\n`);
  process.exit(1);
}

const meta = data.meta;
const papers = arr(data.papers);

// ---- meta -----------------------------------------------------------------
if (!meta || typeof meta !== "object") {
  err("meta", "meta がありません");
} else {
  if (!meta.topics || Object.keys(meta.topics).length === 0)
    err("meta.topics", "トピック定義が空です");
  if (!meta.levelLabels || !meta.levelLabels.easy)
    err("meta.levelLabels", "説明レベルのラベルがありません");
  if (meta.currentIssue && !isYmd(meta.currentIssue))
    err("meta.currentIssue", `日付形式(YYYY-MM-DD)ではありません: ${meta.currentIssue}`);
}
const topicKeys = meta && meta.topics ? Object.keys(meta.topics) : [];

// ---- 各論文：構造・§0（ERROR）＋ 深さルーブリック（WARN） -------------------
const LEVELS = ["easy", "std", "expert"];
const LEVEL_FIELDS = ["tldr", "problem", "method", "result", "limit"];
const seenIds = new Set();

for (let i = 0; i < papers.length; i++) {
  const p = papers[i];
  const tag = p && p.id ? p.id : `papers[${i}]`;
  const W = (m) => warn(tag, m);
  const E = (m) => err(tag, m);

  // --- 構造・§0（ERROR）---
  if (!nonEmpty(p.id)) E("id がありません");
  else if (seenIds.has(p.id)) E(`id が重複しています: ${p.id}`);
  else seenIds.add(p.id);

  if (!topicKeys.includes(p.topic))
    E(`topic がトピック定義に無い: "${p.topic}"（${topicKeys.join("/")} のいずれか）`);
  if (!["classic", "latest"].includes(p.stream))
    E(`stream が不正: "${p.stream}"（classic|latest）`);
  if (!["arxiv", "openalex", "semanticscholar"].includes(p.source))
    E(`source が不正: "${p.source}"`);
  if (typeof p.oa !== "boolean") E("oa は真偽値が必須");
  if (!nonEmpty(p.title)) E("title が空");
  if (!nonEmpty(p.authors)) E("authors が空");
  if (typeof p.year !== "number") E("year が数値でない");

  // levels：3段階×5項目すべて非空（§0：説明レベルの中核）
  if (!p.levels || typeof p.levels !== "object") {
    E("levels がありません");
  } else {
    for (const lv of LEVELS) {
      const block = p.levels[lv];
      if (!block || typeof block !== "object") {
        E(`levels.${lv} がありません`);
        continue;
      }
      for (const f of LEVEL_FIELDS) {
        if (!nonEmpty(block[f])) E(`levels.${lv}.${f} が空`);
      }
    }
  }

  // figures：type 妥当性＋実図ライセンス（§0の核）
  for (let j = 0; j < arr(p.figures).length; j++) {
    const f = p.figures[j];
    const ft = `figures[${j}]`;
    if (!["original", "concept"].includes(f.type))
      E(`${ft}.type が不正: "${f.type}"（original|concept）`);
    if (f.type === "original") {
      // 実図は CC-BY/CC0/PD のときだけ。出典・ライセンスの明記が必須（§7）
      if (!nonEmpty(f.credit)) E(`${ft} は実図(original)。credit（出典・ライセンス）が必須`);
      if (!nonEmpty(f.creditUrl)) E(`${ft} は実図(original)。creditUrl が必須`);
    }
    if (f.type === "concept") {
      // 概念図は「模式・実データではない」と明記（§0）
      const cap = `${f.caption ?? ""} ${f.note ?? ""}`;
      if (!/模式|概念|イメージ|実データではない|実データでは無い/.test(cap))
        W(`${ft} 概念図のキャプションに「模式/概念図/実データではない」の明記が見当たりません`);
    }
  }

  // citationCount：あるなら正の数（概数として扱う・不明なら省略が正）
  if (p.citationCount !== undefined) {
    if (typeof p.citationCount !== "number" || !Number.isFinite(p.citationCount) || p.citationCount <= 0)
      E(`citationCount は正の数か省略: ${p.citationCount}`);
  }

  if (p.issue !== undefined && !isYmd(p.issue))
    E(`issue の日付形式(YYYY-MM-DD)が不正: ${p.issue}`);
  if (p.dateAdded !== undefined && !isYmd(p.dateAdded))
    W(`dateAdded の日付形式(YYYY-MM-DD)が不正: ${p.dateAdded}`);

  // --- 深さルーブリック（WARN・ブロックしない）---
  // OA全文と抄録ベースで基準を分ける。抄録ベース(非OA)は「抄録で誠実に書ける範囲」の軽い基準のみ。
  // related/deepDive/numbers/多めの用語は本文の裏取りが要る＝抄録だと盛りに繋がるので“咎めない”（ハイブリッド設計を尊重）。
  const isCurrent = meta && p.issue && p.issue === meta.currentIssue;
  const scope = isCurrent ? "今号" : "アーカイブ";
  if (arr(p.figures).length === 0) W(`[${scope}] 図がありません（概念図でも可）`);
  if (arr(p.trivia).length < 1) W(`[${scope}] trivia（豆知識）がありません`);

  if (p.oa === true) {
    // OA全文＝読み応えを上積みできる。用語多め・related・deepDive・引用・章立てを目標に。
    if (arr(p.terms).length < 6) W(`[${scope}] 用語が少なめ（${arr(p.terms).length}/目標6+）`);
    if (arr(p.related).length < 1) W(`[${scope}] related（関連論文）がありません`);
    if (arr(p.deepDive).length < 1) W(`[${scope}] deepDive（深掘り）がありません`);
    if (arr(p.numbers).length < 1) W(`[${scope}] numbers（数値カード）がありません`);
    // 逐語不可（崩れたOCR等）は引用しない正当な例外があるため WARN に留める。
    if (arr(p.quotes).length < 2)
      W(`[${scope}] OA全文だが quotes（原文引用）が ${arr(p.quotes).length}/目標2+（逐語不可の出典なら引用しないのが正）`);
    if (arr(p.sections).length < 1)
      W(`[${scope}] OA全文だが sections（章立てウォークスルー）がありません`);
  } else {
    // 抄録ベース(非OA)＝意図的に控えめでよい。最低限：用語数語・概念図1枚。抄録外を足さないことが最優先。
    if (arr(p.terms).length < 3)
      W(`[${scope}] 抄録ベース：用語が少なめ（${arr(p.terms).length}/目安3+。抄録内で無理なく）`);
    if (arr(p.figures).length === 0)
      W(`[${scope}] 抄録ベース：せめて概念図1枚で理解を助けたい`);
  }
}

// ---- 配信構成（currentIssue）：SPEC §7 ------------------------------------
if (meta && meta.currentIssue) {
  // 特別号（special）は「各トピック2件固定」の日次不変条件の対象外（ユーザー指定の別枠）
  const todays = papers.filter((p) => p.issue === meta.currentIssue && !p.special);
  if (todays.length === 0) {
    err("currentIssue", `currentIssue=${meta.currentIssue} に該当する論文がありません`);
  }
  for (const k of topicKeys) {
    const g = todays.filter((p) => p.topic === k);
    if (g.length === 0) continue; // そのトピックは今号に無い（運用上あり得る）
    if (g.length !== 2)
      err(`currentIssue/${k}`, `今号のトピック「${meta.topics[k]}」が ${g.length} 件（各トピック2件固定）`);
    if (!g.some((p) => p.oa === true))
      err(`currentIssue/${k}`, `今号のトピック「${meta.topics[k]}」に OA全文が1件もありません（必ず1件OA）`);
    const cl = g.filter((p) => p.stream === "classic").length;
    const la = g.filter((p) => p.stream === "latest").length;
    if (!(cl === 1 && la === 1))
      warn(`currentIssue/${k}`, `定番＋最新の構成が崩れています（classic=${cl}, latest=${la}）`);
  }
}

// ---- 配信ノート（issues-log.json・任意） ----------------------------------
const logFile = resolve(root, "data/issues-log.json");
if (existsSync(logFile)) {
  let log;
  try {
    log = JSON.parse(readFileSync(logFile, "utf8"));
  } catch (e) {
    err("issues-log.json", `JSON として読めません: ${e.message}`);
    log = null;
  }
  if (log) {
    const entries = arr(log.entries);
    const seenDates = new Set();
    const knownIds = new Set(papers.map((p) => p.id));
    for (let i = 0; i < entries.length; i++) {
      const en = entries[i];
      const tag = `issues-log[${en?.date ?? i}]`;
      if (!isYmd(en.date)) err(tag, `date の形式(YYYY-MM-DD)が不正: ${en.date}`);
      else if (seenDates.has(en.date)) err(tag, `date が重複: ${en.date}`);
      else seenDates.add(en.date);
      if (!["published", "skipped"].includes(en.status))
        err(tag, `status が不正: "${en.status}"（published|skipped）`);
      if (!nonEmpty(en.headline)) err(tag, "headline が空");
      if (!nonEmpty(en.intro)) err(tag, "intro が空");
      for (const p of arr(en.picked)) {
        if (!nonEmpty(p.title) || !nonEmpty(p.why))
          err(tag, "picked の各項目は title と why が必須");
        if (p.id && !knownIds.has(p.id))
          warn(tag, `picked.id が papers.json に無い（リンク切れ）: ${p.id}`);
      }
      if (en.status === "published" && arr(en.picked).length === 0)
        warn(tag, "published なのに picked が空");
      if (en.searchLog) {
        const ss = arr(en.searchLog.sources);
        if (ss.length === 0) warn(tag, "searchLog.sources が空");
        for (const s of ss) {
          if (!nonEmpty(s.name)) err(tag, "searchLog の各 source は name 必須");
          if (arr(s.terms).length === 0)
            warn(tag, `searchLog（${s.name}）に検索語(terms)がありません`);
          if (s.hits !== undefined && (typeof s.hits !== "number" || s.hits < 0))
            err(tag, `searchLog（${s.name}）の hits は0以上の数: ${s.hits}`);
        }
      }
    }
  }
}

// ---- 用語マップ（src/lib/glossary-graph.ts）の整合性 ------------------------
// 自動配信が用語マップを更新する際の番人：
//   ERROR: 分類のタイポ（papers.json に無い term）／複数カテゴリへの重複分類／
//          意味エッジの端点不在／表記ゆれ（括弧違い等の同概念が別ノードに分裂）
//   WARN : 今号の論文で分類済み用語が少ない（分類のサボり検知）
// 第1引数でテスト用ファイルを検証している時は正本前提の本検査をスキップする。
const ggFile = resolve(root, "src/lib/glossary-graph.ts");
if (!fileArg && existsSync(ggFile)) {
  try {
    const { transformSync } = await import("esbuild");
    const js = transformSync(readFileSync(ggFile, "utf8"), { loader: "ts", format: "esm" }).code;
    const mod = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
    const CATEGORIES = arr(mod.CATEGORIES);
    const CURATED_EDGES = arr(mod.CURATED_EDGES);

    const paperTerms = new Set();
    for (const p of papers) for (const t of arr(p.terms)) if (nonEmpty(t.term)) paperTerms.add(t.term.trim());

    // 分類：タイポ（実在しない term）と重複分類
    const classified = new Set();
    for (const c of CATEGORIES) {
      for (const t of arr(c.terms)) {
        if (classified.has(t))
          err("glossary-graph", `term が複数カテゴリに重複分類されています: 「${t}」`);
        classified.add(t);
        if (!paperTerms.has(t))
          err("glossary-graph", `分類された term が papers.json に存在しません（タイポ/リネーム漏れ）: 「${t}」（カテゴリ: ${c.label}）`);
      }
    }

    // 意味エッジ：端点の実在（不在エッジは buildGraph で黙って落ちる＝気づけないため機械検出）
    for (const e of CURATED_EDGES) {
      for (const end of [e.from, e.to]) {
        if (!paperTerms.has(end))
          err("glossary-graph", `意味エッジの端点が papers.json に存在しません: 「${end}」（${e.from} → ${e.to}）`);
      }
    }

    // 表記ゆれ：末尾の括弧書き（英語併記等）を除いた基本形が同じ別表記＝同概念のノード分裂
    const baseOf = (t) => t.replace(/\s*[（(][^（()）]*[)）]\s*$/, "").trim();
    const byBase = new Map();
    for (const t of paperTerms) {
      const b = baseOf(t);
      if (!byBase.has(b)) byBase.set(b, []);
      byBase.get(b).push(t);
    }
    for (const [b, ts] of byBase) {
      if (ts.length > 1)
        err("glossary-graph", `表記ゆれの疑い（同概念が別ノードに分裂）: ${ts.map((t) => `「${t}」`).join(" と ")}。同一表記に統一するか、別概念なら区別が付く名前に`);
    }

    // 今号の分類サボり検知：主要語の分類（1論文2〜4語目安）が守られているか
    if (meta && meta.currentIssue) {
      for (const p of papers.filter((x) => x.issue === meta.currentIssue)) {
        const n = arr(p.terms).filter((t) => nonEmpty(t.term) && classified.has(t.term.trim())).length;
        if (n < 2)
          warn(p.id, `[今号] glossary-graph に分類済みの用語が ${n} 語（目安2+。固有名詞以外の主要語を CATEGORIES に分類する）`);
      }
    }
  } catch (e) {
    err("glossary-graph", `読み込み/変換に失敗: ${e.message}`);
  }
}

// ---- レポート --------------------------------------------------------------
const line = (x) => `  • [${x.where}] ${x.msg}`;
console.log(`\npapers-radar 配信品質チェック — ${papers.length}本 / currentIssue=${meta?.currentIssue ?? "(なし)"}`);

if (errors.length) {
  console.log(`\n✗ ERROR（§0・構造／公開ブロック） ${errors.length}件`);
  errors.forEach((x) => console.log(line(x)));
}
if (warns.length) {
  console.log(`\n△ WARN（深さルーブリック／助言） ${warns.length}件`);
  warns.forEach((x) => console.log(line(x)));
}
if (!errors.length && !warns.length && !QUIET) {
  console.log("\n✓ ERROR/WARN ともになし。配信品質ルーブリックを満たしています。");
}

const fail = errors.length > 0 || (STRICT && warns.length > 0);
console.log(
  fail
    ? `\n→ 失格（${STRICT ? "strict: ERROR/WARN" : "ERROR"} あり）。公開を見送ってください。\n`
    : `\n→ 合格（ERROR なし${warns.length ? `・WARN ${warns.length}件は助言` : ""}）。\n`,
);
process.exit(fail ? 1 : 0);
