import type { PapersData } from "@/types";
import type { GlossaryEntry } from "@/lib/glossary";
import { CATEGORIES, CURATED_EDGES, categoryOf } from "@/lib/glossary-graph";

export interface GraphNode {
  id: string; // term
  def: string;
  papers: GlossaryEntry["papers"];
  catKey: string;
  color: string;
  // d3-force が書き込む
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
  kind: "curated" | "co"; // 手キュレーション / 共起（自動）
}

const FALLBACK = { key: "other", color: "#6c7078" };

export function buildGraph(entries: GlossaryEntry[], data: PapersData) {
  const nodes: GraphNode[] = entries.map((e) => {
    const c = categoryOf(e.term);
    return {
      id: e.term,
      def: e.def,
      papers: e.papers,
      catKey: c?.key ?? FALLBACK.key,
      color: c?.color ?? FALLBACK.color,
    };
  });
  const nodeIds = new Set(nodes.map((n) => n.id));

  const seen = new Set<string>();
  const key = (a: string, b: string) => [a, b].sort().join("");

  // 手キュレーション・エッジ（両端がノードに存在するもの）
  const curated: GraphEdge[] = [];
  for (const e of CURATED_EDGES) {
    if (nodeIds.has(e.from) && nodeIds.has(e.to)) {
      curated.push({ source: e.from, target: e.to, label: e.label, kind: "curated" });
      seen.add(key(e.from, e.to));
    }
  }

  // 自動エッジ（同じ論文に出た用語どうし＝共起）。手キュレーション済みは除外。
  const co: GraphEdge[] = [];
  for (const p of data.papers) {
    const terms = (p.terms ?? []).map((t) => t.term).filter((t) => nodeIds.has(t));
    for (let i = 0; i < terms.length; i++) {
      for (let j = i + 1; j < terms.length; j++) {
        const k = key(terms[i], terms[j]);
        if (seen.has(k)) continue;
        seen.add(k);
        co.push({ source: terms[i], target: terms[j], kind: "co" });
      }
    }
  }

  return { nodes, curated, co, categories: CATEGORIES };
}
