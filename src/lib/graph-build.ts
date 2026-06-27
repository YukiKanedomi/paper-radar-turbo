import type { PapersData } from "@/types";
import type { GlossaryEntry } from "@/lib/glossary";
import { CATEGORIES, CURATED_EDGES, categoryOf } from "@/lib/glossary-graph";

export interface GraphNode {
  id: string; // term
  def: string;
  papers: GlossaryEntry["papers"];
  catKey: string;
  color: string;
  degree: number; // 次数（重要度＝ノード大きさに使う）
  // d3-force が書き込む
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
  kind: "curated" | "co"; // 手キュレーション / 共起（自動）
  weight?: number; // 共起：同居回数（エッジ太さに使う）
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
      degree: 0,
    };
  });
  const nodeIds = new Set(nodes.map((n) => n.id));
  const key = (a: string, b: string) => [a, b].sort().join("");

  // 手キュレーション・エッジ（両端がノードに存在するもの）
  const curatedKeys = new Set<string>();
  const curated: GraphEdge[] = [];
  for (const e of CURATED_EDGES) {
    if (nodeIds.has(e.from) && nodeIds.has(e.to)) {
      curated.push({ source: e.from, target: e.to, label: e.label, kind: "curated" });
      curatedKeys.add(key(e.from, e.to));
    }
  }

  // 自動エッジ（共起）。手キュレーション済みは除外し、同居回数を weight に集計。
  const coCount = new Map<string, { a: string; b: string; n: number }>();
  for (const p of data.papers) {
    const terms = [
      ...new Set((p.terms ?? []).map((t) => t.term).filter((t) => nodeIds.has(t))),
    ];
    for (let i = 0; i < terms.length; i++) {
      for (let j = i + 1; j < terms.length; j++) {
        const k = key(terms[i], terms[j]);
        if (curatedKeys.has(k)) continue;
        const cur = coCount.get(k);
        if (cur) cur.n++;
        else coCount.set(k, { a: terms[i], b: terms[j], n: 1 });
      }
    }
  }
  const co: GraphEdge[] = [...coCount.values()].map((c) => ({
    source: c.a,
    target: c.b,
    kind: "co" as const,
    weight: c.n,
  }));

  // 次数（重要度＝ノード大きさ）
  const deg = new Map<string, number>();
  for (const e of [...curated, ...co]) {
    deg.set(e.source, (deg.get(e.source) ?? 0) + 1);
    deg.set(e.target, (deg.get(e.target) ?? 0) + 1);
  }
  for (const n of nodes) n.degree = deg.get(n.id) ?? 0;

  return { nodes, curated, co, categories: CATEGORIES };
}
