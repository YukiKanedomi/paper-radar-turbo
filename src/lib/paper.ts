import type { Leveled, Level, Paper } from "@/types";

// 文字列ならそのまま、レベル別オブジェクトなら現在のレベルの文章を返す
export function resolveLeveled(v: Leveled, level: Level): string {
  return typeof v === "string" ? v : v[level];
}

// ハッシュルーティング用に id（doi:.../arxiv:... を含む）を安全化
export function paperHref(id: string): string {
  return `/paper/${encodeURIComponent(id)}`;
}

export function streamLabel(stream: Paper["stream"]): string {
  return stream === "classic" ? "定番" : "最新";
}

// 特別号なら「特別号」、通常は定番/最新。バッジのラベルに使う（§: 特別号は stream を出さない）
export function streamOrSpecialLabel(p: Paper): string {
  return p.special ? "特別号" : streamLabel(p.stream);
}

// 読了時間の目安（分）。標準レベルの本文＋用語・豆知識・深掘り・引用・章立てを
// 日本語の平均的な読速 500字/分 で換算（あくまで目安）。
export function readingMinutes(p: Paper): number {
  let chars = 0;
  const add = (s?: string) => {
    if (s) chars += s.length;
  };
  const lv = p.levels?.std;
  if (lv) [lv.tldr, lv.problem, lv.method, lv.result, lv.limit].forEach(add);
  p.terms?.forEach((t) => {
    add(t.term);
    add(t.def);
  });
  p.trivia?.forEach((t) => add(resolveLeveled(t.text, "std")));
  p.deepDive?.forEach((d) => add(resolveLeveled(d.body, "std")));
  p.quotes?.forEach((q) => add(q.textJa ?? q.text));
  p.sections?.forEach((s) => {
    add(s.heading);
    add(resolveLeveled(s.body, "std"));
  });
  p.numbers?.forEach((n) => {
    add(n.v);
    add(n.l);
  });
  p.equations?.forEach((e) => add(e.caption));
  return Math.max(1, Math.round(chars / 500));
}

// カード用の一言フック：hook があればそれ、無ければ easy の tldr の先頭文（長すぎれば省略）。
// 自前の要約（忠実性チェック済み）由来なので §0 上の新リスクはない。
export function cardHook(p: Paper): string {
  const h = p.hook?.trim();
  if (h) return h;
  const first = (p.levels?.easy?.tldr ?? "").split("。")[0]?.trim() ?? "";
  if (!first) return "";
  return first.length > 90 ? `${first.slice(0, 90)}…` : `${first}。`;
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
