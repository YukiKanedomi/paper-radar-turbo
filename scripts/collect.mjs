// /collect 収集ハーネス（候補取得まで）。
// topics.json のキーワードで arXiv（最新・OA全文）と OpenAlex（被引用上位・OA判定・cited_by_count）を引き、
// 候補を staging に出力する。要約（levels等）は §0 厳守で別途 Claude が忠実に作成する。
//
// 堅牢化（2026-06-28）：
//   A. arXiv は語OR＋段階的緩和（完全フレーズで少なければ語ORへ、なお少なければカテゴリ縛りを外す）。
//   B. OpenAlex はキーワード毎に title_and_abstract.search で分野を絞って統合（被引用ノイズ排除・504回避）。
//   E. API 失敗/504/429 はリトライ。片方が空でも候補が枯れにくいよう広げる。
// 選定（C：classicもOA優先）とフォールバック（D：保留時に次点）は SKILL.md 側のルール。
//
// 使い方:  node scripts/collect.mjs [--topic turbo] [--out <path>]
//   既定出力: scripts/.collect-candidates.json（gitignore 済み）
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const getArg = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const topicFilter = getArg("--topic", null);
const outPath = resolve(root, getArg("--out", "scripts/.collect-candidates.json"));

const topicsCfg = JSON.parse(readFileSync(resolve(root, "topics.json"), "utf8"));

const UA = "paper-radar-turbo/0.1 (mailto:kanedomi918@gmail.com)";
const ARXIV_MIN = 6; // これ未満なら緩和して取り直す
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 失敗/504/429 をリトライ（指数バックオフ・軽め）
async function fetchRetry(url, { tries = 3, baseDelay = 800 } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (res.ok) return res;
      // 504/429/5xx は待って再試行、それ以外は即返す（呼び出し側で判定）
      if (![429, 500, 502, 503, 504].includes(res.status)) return res;
      last = new Error(`HTTP ${res.status}`);
    } catch (e) {
      last = e;
    }
    await sleep(baseDelay * (i + 1));
  }
  throw last ?? new Error("fetch failed");
}

// 分野ガード：タイトルが流体・ターボ機械の語を含むものだけを on-topic とみなす。
// OpenAlex の被引用ソートは桁違いの他分野（医学・生物等）を上位に上げてしまうため、
// API の調子に依らずクライアント側でノイズを除去する。
const CORE = /compress|turbine|turbomachin|turbo[\s-]?machin|\bstall\b|\bsurge\b|\bblade|\brotor|stator|cascade|aerodynam|aerofoil|airfoil|\bvane\b|endwall|tip[\s-]?leakage|tip[\s-]?clearance|secondary[\s-]?flow|boundary[\s-]?layer|shock|\bwake\b|flutter|aeroelast|impeller|diffuser|nozzle|\baxial\b|centrifugal|\bfan\b|propuls|cavitat|\bpump\b|inducer|film[\s-]?cooling/i;
const onTopic = (p) => CORE.test(`${p.title ?? ""} ${p.venue ?? ""}`);

// キーワード群から arXiv 用の有意な単語集合を作る（ストップワード除去）
const STOP = new Set(["of", "the", "in", "and", "for", "a", "to", "on", "with", "by"]);
function salientWords(keywords) {
  const set = new Set();
  for (const k of keywords)
    for (const w of k.toLowerCase().split(/\s+/))
      if (w.length >= 3 && !STOP.has(w)) set.add(w);
  return [...set];
}

// 日替わりローテーション：毎日別の部分集合を検索し、数日でキーワード全体を一巡させる。
// （先頭固定 slice だと後半の語が一度も検索されず、配信が代わり映えしなくなるため）
// 日付起点の決定的な選び方＝同じ日に再実行しても同じ語（配信ノートの記録と一致する）。
function rotateDaily(keywords, n, offset = 0) {
  const day = Math.floor(Date.now() / 86400000);
  const start = (day * n + offset) % keywords.length;
  return Array.from({ length: Math.min(n, keywords.length) }, (_, i) => keywords[(start + i) % keywords.length]);
}

// ---- arXiv（最新・全文OA）。段階的に緩めて取りこぼしを防ぐ ----
function parseArxiv(xml) {
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
  return entries.map((e) => {
    const pick = (re) => (e.match(re)?.[1] ?? "").trim().replace(/\s+/g, " ");
    const idUrl = pick(/<id>([\s\S]*?)<\/id>/);
    const arxivId = idUrl.replace(/^https?:\/\/arxiv\.org\/abs\//, "").replace(/v\d+$/, "");
    const authors = [...e.matchAll(/<name>([\s\S]*?)<\/name>/g)].map((a) => a[1].trim());
    const pdf = e.match(/<link[^>]*title="pdf"[^>]*href="([^"]+)"/)?.[1] ?? `https://arxiv.org/pdf/${arxivId}`;
    return {
      source: "arxiv",
      stream: "latest",
      oa: true,
      id: `arxiv:${arxivId}`,
      title: pick(/<title>([\s\S]*?)<\/title>/),
      authors: authors.join(", "),
      year: Number(pick(/<published>(\d{4})/)),
      published: pick(/<published>([\s\S]*?)<\/published>/),
      venue: "arXiv (preprint)",
      url: idUrl,
      pdfUrl: pdf,
      abstract: pick(/<summary>([\s\S]*?)<\/summary>/),
    };
  });
}

async function arxivQuery(searchExpr, max = 14) {
  const url = `http://export.arxiv.org/api/query?search_query=${searchExpr}&sortBy=submittedDate&sortOrder=descending&start=0&max_results=${max}`;
  const res = await fetchRetry(url);
  if (!res.ok) throw new Error(`arXiv HTTP ${res.status}`);
  return parseArxiv(await res.text());
}

async function fetchArxiv(keywords, max = 14) {
  const phrases = keywords.map((k) => `all:%22${encodeURIComponent(k)}%22`);
  const words = salientWords(keywords).map((w) => `all:${encodeURIComponent(w)}`);
  const FLU = "+AND+cat:physics.flu-dyn";

  // 段階1：完全フレーズOR＋flu-dyn（精度重視）
  let out = await arxivQuery(`%28${phrases.join("+OR+")}%29${FLU}`, max).catch(() => []);
  // 段階2：語OR＋flu-dyn（少なければ緩める）
  if (out.length < ARXIV_MIN) {
    const more = await arxivQuery(`%28${words.join("+OR+")}%29${FLU}`, max).catch(() => []);
    out = dedupeById([...out, ...more]);
  }
  // 段階3：語OR・カテゴリ縛りなし（flu-dyn 未クロスリストの turbo 論文も拾う）
  if (out.length < ARXIV_MIN) {
    const more = await arxivQuery(`%28${words.join("+OR+")}%29`, max).catch(() => []);
    out = dedupeById([...out, ...more]);
  }
  // 分野ガード（on-topic 優先）。ただし枯渇させない：on-topic が少なければ元の順を保つ。
  const focused = out.filter(onTopic);
  return (focused.length >= 3 ? focused : out).slice(0, max);
}

// ---- OpenAlex。分野を絞ってキーワード毎に取得→統合。OA/非OA(抄録)を両方残す ----
// stream は「役割（最新/定番）」で決める＝ソースやOA性とは独立（最新でも抄録、定番でもOAがあり得る）。
function mapOpenAlex(w, stream) {
  return {
    source: "openalex",
    stream,
    oa: !!w.open_access?.is_oa,
    oaUrl: w.open_access?.oa_url ?? "",
    id: w.doi ? `doi:${w.doi.replace(/^https?:\/\/doi\.org\//, "")}` : `openalex:${w.id.split("/").pop()}`,
    title: w.title ?? w.display_name ?? "",
    authors: (w.authorships ?? []).slice(0, 5).map((a) => a.author?.display_name).filter(Boolean).join(", "),
    year: w.publication_year,
    venue: w.primary_location?.source?.display_name ?? "",
    doi: (w.doi ?? "").replace(/^https?:\/\/doi\.org\//, ""),
    citationCount: w.cited_by_count ?? 0,
    pdfUrl: w.open_access?.oa_url ?? "",
    abstract: "", // 本文/抄録は別途エージェントが取得（ここではメタのみ）
  };
}

async function openAlexSearch(phrase, { sort, fromDate, stream, perPage = 6 }) {
  // title/abstract に語が含まれるものに限定（分野ノイズを排除）＋論文種別＝article。
  // 狭いクエリにすることで 504（broad query）も避けられる。
  let filter = `title_and_abstract.search:${encodeURIComponent(phrase)},type:article`;
  if (fromDate) filter += `,from_publication_date:${fromDate}`;
  const url = `https://api.openalex.org/works?filter=${filter}&sort=${sort}&per-page=${perPage}&mailto=kanedomi918@gmail.com`;
  const res = await fetchRetry(url);
  if (!res.ok) throw new Error(`OpenAlex HTTP ${res.status}`);
  const json = await res.json();
  return (json.results ?? []).map((w) => mapOpenAlex(w, stream));
}

// 定番候補：被引用の多い順（OA/非OA 混在）
async function fetchOpenAlexClassic(keywords, take = 14) {
  const picks = keywords;
  const lists = [];
  for (const k of picks) {
    try {
      lists.push(await openAlexSearch(k, { sort: "cited_by_count:desc", stream: "classic" }));
    } catch (e) {
      console.error(`OpenAlex(定番)失敗(${k}):`, e.message);
    }
    await sleep(200);
  }
  const merged = dedupeById(lists.flat()).filter(onTopic);
  merged.sort((a, b) => (b.citationCount ?? 0) - (a.citationCount ?? 0));
  return merged.slice(0, take);
}

// 最新候補：発行日の新しい順（OA/非OA 混在＝有料ジャーナルの新着も拾う）。直近数年に限定。
async function fetchOpenAlexRecent(keywords, take = 10) {
  const yearFloor = new Date().getFullYear() - 3;
  const fromDate = `${yearFloor}-01-01`;
  const picks = keywords;
  const lists = [];
  for (const k of picks) {
    try {
      lists.push(
        await openAlexSearch(k, { sort: "publication_date:desc", fromDate, stream: "latest", perPage: 4 }),
      );
    } catch (e) {
      console.error(`OpenAlex(最新)失敗(${k}):`, e.message);
    }
    await sleep(200);
  }
  const merged = dedupeById(lists.flat()).filter(onTopic);
  merged.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  return merged.slice(0, take);
}

function dedupeById(list) {
  const seen = new Set();
  const out = [];
  for (const p of list) {
    if (!p || !p.id || seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

const balance = (list) => {
  const oa = list.filter((p) => p.oa).length;
  return `OA ${oa} / 抄録 ${list.length - oa}`;
};

const out = { generatedFor: topicFilter ?? "all", topics: [] };
for (const t of topicsCfg.topics) {
  if (topicFilter && t.key !== topicFilter) continue;
  console.log(`\n=== topic: ${t.key} (${t.label}) ===`);
  // 検索語は日替わりローテーション（最新枠6語・定番枠8語。定番はオフセットをずらし同日でも別領域を探す）
  const kwLatest = rotateDaily(t.keywords, 6);
  const kwClassic = rotateDaily(t.keywords, 8, Math.floor(t.keywords.length / 2));
  console.log(`本日の検索語（最新枠）: ${kwLatest.join(" / ")}`);
  console.log(`本日の検索語（定番枠）: ${kwClassic.join(" / ")}`);
  // 3系統を取得：arXiv(最新OA)・OpenAlex新着(最新・OA/抄録)・OpenAlex被引用(定番・OA/抄録)
  const [arxiv, oaRecent, oaClassic] = await Promise.all([
    fetchArxiv(kwLatest).catch((e) => (console.error("arXiv失敗:", e.message), [])),
    fetchOpenAlexRecent(kwLatest).catch((e) => (console.error("OpenAlex新着失敗:", e.message), [])),
    fetchOpenAlexClassic(kwClassic).catch((e) => (console.error("OpenAlex被引用失敗:", e.message), [])),
  ]);

  // 枠は「役割」で束ねる：最新 = arXiv + OpenAlex新着（OA/抄録 混在）、定番 = OpenAlex被引用（OA/抄録 混在）
  const latest = dedupeById([...arxiv, ...oaRecent]);
  const classic = oaClassic;

  console.log(`最新枠 latest: ${latest.length} 件（${balance(latest)}）  [arXiv + OpenAlex新着]`);
  latest.slice(0, 8).forEach((p, i) =>
    console.log(`  [L${i}] oa=${p.oa} ${p.year ?? p.published?.slice(0, 4) ?? "?"} ${p.source}  ${p.title}`),
  );
  console.log(`定番枠 classic: ${classic.length} 件（${balance(classic)}）  [OpenAlex 被引用上位]`);
  classic.slice(0, 8).forEach((p, i) =>
    console.log(`  [C${i}] cite=${p.citationCount} oa=${p.oa} ${p.year}  ${p.title}`),
  );

  // バランスの注意喚起（最新/定番それぞれ OA も抄録も拾えているか）
  const oaTotal = latest.filter((p) => p.oa).length + classic.filter((p) => p.oa).length;
  if (latest.length === 0) console.log("  ⚠ 最新枠が0件。キーワード/期間を見直す。");
  if (classic.length === 0) console.log("  ⚠ 定番枠が0件。キーワードを見直す。");
  if (oaTotal === 0) console.log("  ⚠ 全体でOAが0件。最低1件OAの条件を満たせない可能性。");
  console.log(
    "  ※ 枠(最新/定番)とOA性は独立。最新で抄録・定番でOAも歓迎。最低1件OAを満たしつつ、OA/抄録をバランスよく。",
  );

  // searchTerms＝実際に使った検索語（配信ノート searchLog にはこれを記録する＝§0）
  out.topics.push({ key: t.key, label: t.label, searchTerms: { latest: kwLatest, classic: kwClassic }, latest, classic });
}

writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
console.log(`\n→ 候補を書き出し: ${outPath}`);
