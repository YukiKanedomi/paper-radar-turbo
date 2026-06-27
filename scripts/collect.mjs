// /collect 収集ハーネス（候補取得まで）。
// topics.json のキーワードで arXiv（最新・OA全文）と OpenAlex（被引用上位・OA判定・cited_by_count）を引き、
// 候補を staging に出力する。要約（levels等）は §0 厳守で別途 Claude が忠実に作成する。
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

// ---- arXiv（最新・全文OA）----
async function fetchArxiv(keywords, max = 12) {
  // 代表キーワードを OR で（タイトル/抄録）。流体カテゴリに限定。
  const terms = keywords.slice(0, 6).map((k) => `all:%22${encodeURIComponent(k)}%22`);
  const q = `%28${terms.join("+OR+")}%29+AND+cat:physics.flu-dyn`;
  const url = `http://export.arxiv.org/api/query?search_query=${q}&sortBy=submittedDate&sortOrder=descending&start=0&max_results=${max}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`arXiv HTTP ${res.status}`);
  const xml = await res.text();
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
  return entries.map((e) => {
    const pick = (re) => (e.match(re)?.[1] ?? "").trim().replace(/\s+/g, " ");
    const idUrl = pick(/<id>([\s\S]*?)<\/id>/);
    const arxivId = idUrl.replace(/^https?:\/\/arxiv\.org\/abs\//, "").replace(/v\d+$/, "");
    const authors = [...e.matchAll(/<name>([\s\S]*?)<\/name>/g)].map((a) => a[1].trim());
    const pdf = (e.match(/<link[^>]*title="pdf"[^>]*href="([^"]+)"/)?.[1] ?? `https://arxiv.org/pdf/${arxivId}`);
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

// ---- OpenAlex（被引用上位・OA判定・cited_by_count）----
async function fetchOpenAlex(query, max = 10) {
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&sort=cited_by_count:desc&per-page=${max}&mailto=kanedomi918@gmail.com`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`OpenAlex HTTP ${res.status}`);
  const json = await res.json();
  return (json.results ?? []).map((w) => ({
    source: "openalex",
    stream: "classic",
    oa: !!w.open_access?.is_oa,
    oaUrl: w.open_access?.oa_url ?? "",
    id: w.doi ? `doi:${w.doi.replace(/^https?:\/\/doi\.org\//, "")}` : `openalex:${w.id.split("/").pop()}`,
    title: w.title ??w.display_name ?? "",
    authors: (w.authorships ?? []).slice(0, 5).map((a) => a.author?.display_name).filter(Boolean).join(", "),
    year: w.publication_year,
    venue: w.primary_location?.source?.display_name ?? "",
    doi: (w.doi ?? "").replace(/^https?:\/\/doi\.org\//, ""),
    citationCount: w.cited_by_count ?? 0,
  }));
}

const out = { generatedFor: topicFilter ?? "all", topics: [] };
for (const t of topicsCfg.topics) {
  if (topicFilter && t.key !== topicFilter) continue;
  const oaQuery = t.keywords.slice(0, 3).join(" ");
  console.log(`\n=== topic: ${t.key} (${t.label}) ===`);
  const [arxiv, openalex] = await Promise.all([
    fetchArxiv(t.keywords).catch((e) => (console.error("arXiv失敗:", e.message), [])),
    fetchOpenAlex(oaQuery).catch((e) => (console.error("OpenAlex失敗:", e.message), [])),
  ]);
  console.log(`arXiv 最新OA候補: ${arxiv.length} 件`);
  arxiv.slice(0, 8).forEach((p, i) =>
    console.log(`  [A${i}] ${p.published?.slice(0, 10)}  ${p.title}`),
  );
  console.log(`OpenAlex 被引用上位候補: ${openalex.length} 件`);
  openalex.slice(0, 8).forEach((p, i) =>
    console.log(`  [O${i}] cite=${p.citationCount} oa=${p.oa} ${p.year}  ${p.title}`),
  );
  out.topics.push({ key: t.key, label: t.label, arxiv, openalex });
}

writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
console.log(`\n→ 候補を書き出し: ${outPath}`);
