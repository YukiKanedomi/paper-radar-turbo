import type { PapersData } from "@/types";
import { displayTitle } from "@/lib/paper";

export interface GlossaryPaperRef {
  id: string;
  title: string;
  topic: string;
}

export interface GlossaryEntry {
  term: string;
  def: string; // 代表定義（最も長いものを採用）
  papers: GlossaryPaperRef[]; // この用語が登場する論文
}

// 全論文の terms[] を横断集約・重複統合。出る論文を紐づける。
export function buildGlossary(data: PapersData): GlossaryEntry[] {
  const map = new Map<string, GlossaryEntry>();
  for (const p of data.papers) {
    for (const t of p.terms ?? []) {
      const key = t.term.trim();
      if (!key) continue;
      let e = map.get(key);
      if (!e) {
        e = { term: key, def: t.def, papers: [] };
        map.set(key, e);
      }
      if (t.def && t.def.length > e.def.length) e.def = t.def; // 最長の定義を採用
      if (!e.papers.some((x) => x.id === p.id)) {
        e.papers.push({ id: p.id, title: displayTitle(p), topic: p.topic });
      }
    }
  }
  // 横断（複数論文に出る）用語を上に、次に五十音/アルファベット順
  return [...map.values()].sort(
    (a, b) =>
      b.papers.length - a.papers.length || a.term.localeCompare(b.term, "ja"),
  );
}
