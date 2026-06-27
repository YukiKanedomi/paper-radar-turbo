import type { Paper } from "@/types";

// ハッシュルーティング用に id（doi:.../arxiv:... を含む）を安全化
export function paperHref(id: string): string {
  return `/paper/${encodeURIComponent(id)}`;
}

export function streamLabel(stream: Paper["stream"]): string {
  return stream === "classic" ? "定番" : "最新";
}

// 表示タイトルは和訳を主に。和訳が無ければ原題そのまま。
export function displayTitle(p: Paper): string {
  return p.titleJa?.trim() || p.title;
}

// 副題＝英語原題（和訳があり、原題と異なる時だけ返す。無ければ null）
export function originalTitle(p: Paper): string | null {
  const ja = p.titleJa?.trim();
  if (ja && ja !== p.title.trim()) return p.title;
  return null;
}

// 被引用の概数表示（信頼できる数がある時のみ。§0：不明なら出さない）
export function citationText(p: Paper): string | null {
  if (typeof p.citationCount === "number" && p.citationCount > 0) {
    return `被引用 ~${p.citationCount.toLocaleString()}`;
  }
  return null;
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
