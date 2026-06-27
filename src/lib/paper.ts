import type { Paper } from "@/types";

// ハッシュルーティング用に id（doi:.../arxiv:... を含む）を安全化
export function paperHref(id: string): string {
  return `/paper/${encodeURIComponent(id)}`;
}

export function streamLabel(stream: Paper["stream"]): string {
  return stream === "classic" ? "定番" : "最新";
}

// §0 厳守：OA でなければ「抄録ベース」と明記。捏造しない。
export function oaLabel(oa: boolean): string {
  return oa ? "OA・全文" : "抄録ベース";
}

// ホームのリスト/カードのメタ行（著者・年・媒体など、空は出さない）
export function shortMeta(p: Paper): string {
  return [p.authors, p.year ? String(p.year) : "", p.venue]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(" · ");
}

// 原文リンク：DOI > url > pdfUrl の優先。無ければ null（リンクを出さない）
export function sourceUrl(p: Paper): string | null {
  if (p.doi?.trim()) return `https://doi.org/${p.doi.trim()}`;
  if (p.url?.trim()) return p.url.trim();
  if (p.pdfUrl?.trim()) return p.pdfUrl.trim();
  return null;
}
