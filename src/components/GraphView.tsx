import { useEffect, useMemo, useRef, useState } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  forceX,
  forceY,
  type Simulation,
} from "d3-force";
import { Link } from "react-router-dom";
import type { GraphEdge, GraphNode } from "@/lib/graph-build";
import type { GraphCategory } from "@/lib/glossary-graph";
import { paperHref } from "@/lib/paper";

interface Props {
  nodes: GraphNode[];
  curated: GraphEdge[];
  co: GraphEdge[];
  categories: GraphCategory[];
}

const nodeR = (n: GraphNode) => 9 + Math.min(n.degree, 8) * 1.15 + Math.min(n.papers.length, 3) * 1.3;
const endId = (e: string | GraphNode) => (typeof e === "object" ? e.id : e);
const endXY = (e: string | GraphNode, map: Map<string, GraphNode>) =>
  (typeof e === "object" ? e : map.get(e)) as GraphNode;

export default function GraphView({ nodes, curated, co, categories }: Props) {
  const [showCo, setShowCo] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [view, setView] = useState({ k: 1, tx: 0, ty: 0 });
  const [, setTick] = useState(0);
  const simRef = useRef<Simulation<GraphNode, GraphEdge> | null>(null);
  const drag = useRef<
    | { type: "pan"; sx: number; sy: number; tx: number; ty: number; moved: boolean }
    | { type: "node"; node: GraphNode; sx: number; sy: number; moved: boolean }
    | null
  >(null);

  const catCenter = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    const R = 210;
    categories.forEach((c, i) => {
      const a = (i / categories.length) * Math.PI * 2 - Math.PI / 2;
      m.set(c.key, { x: Math.cos(a) * R, y: Math.sin(a) * R });
    });
    return m;
  }, [categories]);

  // シミュレーション用の作業ノード／リンク（位置を保持）
  const simNodes = useMemo(() => nodes.map((n) => ({ ...n })), [nodes]);
  const simLinks = useMemo(
    () => [...curated, ...co].map((e) => ({ ...e })),
    [curated, co],
  );
  const nodeMap = useMemo(() => {
    const m = new Map<string, GraphNode>();
    simNodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [simNodes]);

  // ライブで揺れて落ち着く力学シミュレーション
  useEffect(() => {
    const sim = forceSimulation(simNodes)
      .force(
        "link",
        forceLink<GraphNode, GraphEdge>(simLinks)
          .id((d) => d.id)
          .distance((l) => (l.kind === "curated" ? 80 : 130))
          .strength((l) => (l.kind === "curated" ? 0.5 : 0.04)),
      )
      .force("charge", forceManyBody().strength(-320))
      .force("collide", forceCollide<GraphNode>((d) => nodeR(d) + 12))
      .force("x", forceX<GraphNode>((d) => catCenter.get(d.catKey)?.x ?? 0).strength(0.1))
      .force("y", forceY<GraphNode>((d) => catCenter.get(d.catKey)?.y ?? 0).strength(0.1))
      .alpha(1)
      .alphaDecay(0.035)
      .on("tick", () => setTick((t) => t + 1));
    simRef.current = sim;
    return () => {
      sim.stop();
    };
  }, [simNodes, simLinks, catCenter]);

  const neighbors = useMemo(() => {
    const focus = selected ?? hovered;
    if (!focus) return null;
    const s = new Set<string>([focus]);
    for (const e of [...curated, ...co]) {
      if (endId(e.source) === focus) s.add(endId(e.target));
      if (endId(e.target) === focus) s.add(endId(e.source));
    }
    return s;
  }, [selected, hovered, curated, co]);

  // 固定 viewBox（成長に合わせて大きさを決め、揺れてもジッタしない）
  const half = 280 + Math.sqrt(nodes.length) * 16;
  const viewBox = `${-half} ${-half * 0.9} ${half * 2} ${half * 1.8}`;

  // カテゴリのクラスタ背景＋見出し（毎フレーム＝現在位置から重心を計算）
  const clusters = categories
    .map((c) => {
      const pts = c.terms.map((t) => nodeMap.get(t)).filter((n) => n && n.x != null) as GraphNode[];
      if (pts.length < 2) return null;
      const cx = pts.reduce((s, p) => s + p.x!, 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p.y!, 0) / pts.length;
      const r = Math.max(...pts.map((p) => Math.hypot(p.x! - cx, p.y! - cy))) + 46;
      return { key: c.key, label: c.label, color: c.color, cx, cy, r };
    })
    .filter(Boolean) as { key: string; label: string; color: string; cx: number; cy: number; r: number }[];

  function edgePath(a: GraphNode, b: GraphNode, rT: number) {
    const ax = a.x ?? 0, ay = a.y ?? 0, bx0 = b.x ?? 0, by0 = b.y ?? 0;
    const dx = bx0 - ax, dy = by0 - ay;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const bx = bx0 - ux * (rT + 6), by = by0 - uy * (rT + 6);
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    const off = len * 0.13;
    return `M ${ax} ${ay} Q ${mx - uy * off} ${my + ux * off} ${bx} ${by}`;
  }

  function onWheel(e: React.WheelEvent) {
    const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setView((v) => ({ ...v, k: Math.min(3.2, Math.max(0.4, v.k * f)) }));
  }
  function svgPoint(e: React.PointerEvent) {
    const r = (e.currentTarget as SVGElement).getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function toGraph(px: number, py: number, e: React.PointerEvent) {
    // 画面座標→グラフ座標（viewBox + pan/zoom を反映）
    const svg = (e.currentTarget as Element).closest("svg") as SVGElement;
    const r = svg.getBoundingClientRect();
    const vb = half; // x 半幅
    const scaleX = (half * 2) / r.width;
    const gx = (px - view.tx) / view.k * scaleX - vb;
    const gy = (py - view.ty) / view.k * scaleX - half * 0.9;
    return { gx, gy };
  }
  function onPointerDownBg(e: React.PointerEvent) {
    const p = svgPoint(e);
    drag.current = { type: "pan", sx: p.x, sy: p.y, tx: view.tx, ty: view.ty, moved: false };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }
  function onPointerDownNode(e: React.PointerEvent, n: GraphNode) {
    e.stopPropagation();
    const p = svgPoint(e);
    drag.current = { type: "node", node: n, sx: p.x, sy: p.y, moved: false };
    simRef.current?.alphaTarget(0.25).restart();
    n.fx = n.x;
    n.fy = n.y;
    (e.currentTarget.closest("svg") as Element)?.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const p = svgPoint(e);
    d.moved = true;
    if (d.type === "pan") {
      setView((v) => ({ ...v, tx: d.tx + (p.x - d.sx), ty: d.ty + (p.y - d.sy) }));
    } else {
      const { gx, gy } = toGraph(p.x, p.y, e);
      d.node.fx = gx;
      d.node.fy = gy;
    }
  }
  function onPointerUp() {
    const d = drag.current;
    if (d?.type === "node") {
      d.node.fx = null;
      d.node.fy = null;
      simRef.current?.alphaTarget(0);
    }
    drag.current = null;
  }

  const sel = selected ? nodeMap.get(selected) : null;
  const dim = (id: string) => neighbors !== null && !neighbors.has(id);
  const showNodeLabel = (n: GraphNode) =>
    n.degree >= 4 || view.k >= 1.2 || (neighbors?.has(n.id) ?? false);
  const showEdgeLabel = view.k >= 1.05 || neighbors !== null;
  const showClusterLabel = view.k < 1.7;

  return (
    <div className="graph">
      <div className="graph-legend">
        {categories.map((c) => (
          <span key={c.key} className="lg">
            <span className="dot" style={{ background: c.color }} />
            {c.label}
          </span>
        ))}
        <label className="lg toggle">
          <input type="checkbox" checked={showCo} onChange={(e) => setShowCo(e.target.checked)} />
          共起も表示
        </label>
      </div>

      <div className="graph-stage-wrap">
        <svg
          className="graph-svg"
          viewBox={viewBox}
          onWheel={onWheel}
          onPointerDown={onPointerDownBg}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={() => setSelected(null)}
        >
          <defs>
            <marker id="arrow" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0,0 L7,3 L0,6 z" fill="#9aa0a6" />
            </marker>
          </defs>
          <g className="graph-stage" transform={`translate(${view.tx} ${view.ty}) scale(${view.k})`}>
            {/* クラスタ背景＋見出し */}
            {clusters.map((h) => (
              <g key={h.key}>
                <circle cx={h.cx} cy={h.cy} r={h.r} fill={h.color} opacity={0.06} />
                {showClusterLabel && (
                  <text
                    className="cluster-label"
                    x={h.cx}
                    y={h.cy - h.r + 16}
                    textAnchor="middle"
                    fill={h.color}
                  >
                    {h.label}
                  </text>
                )}
              </g>
            ))}

            {/* 共起エッジ（薄・曲線・太さ＝同居回数） */}
            {showCo &&
              co.map((e, i) => {
                const a = endXY(e.source, nodeMap), b = endXY(e.target, nodeMap);
                if (!a || !b) return null;
                return (
                  <path
                    key={`co${i}`}
                    d={edgePath(a, b, nodeR(b))}
                    fill="none"
                    stroke="#cdc8bc"
                    strokeWidth={0.5 + Math.min(e.weight ?? 1, 4) * 0.3}
                    strokeDasharray="3 3"
                    opacity={neighbors ? 0.1 : 0.4}
                  />
                );
              })}

            {/* 手キュレーション・エッジ（曲線＋矢印＋ラベル） */}
            {curated.map((e, i) => {
              const a = endXY(e.source, nodeMap), b = endXY(e.target, nodeMap);
              if (!a || !b) return null;
              const active = !neighbors || (neighbors.has(a.id) && neighbors.has(b.id));
              return (
                <g key={`cu${i}`} opacity={active ? 1 : 0.1}>
                  <path d={edgePath(a, b, nodeR(b))} fill="none" stroke="#9aa0a6" strokeWidth={1.5} markerEnd="url(#arrow)" />
                  {e.label && showEdgeLabel && (
                    <text className="edge-label" x={((a.x ?? 0) + (b.x ?? 0)) / 2} y={((a.y ?? 0) + (b.y ?? 0)) / 2 - 3} textAnchor="middle">
                      {e.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* ノード */}
            {simNodes.map((n) => {
              const r = nodeR(n);
              const isSel = selected === n.id;
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x ?? 0} ${n.y ?? 0})`}
                  opacity={dim(n.id) ? 0.16 : 1}
                  style={{ cursor: "pointer" }}
                  onPointerDown={(e) => onPointerDownNode(e, n)}
                  onPointerEnter={() => setHovered(n.id)}
                  onPointerLeave={() => setHovered((h) => (h === n.id ? null : h))}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!drag.current?.moved) setSelected(n.id);
                  }}
                >
                  <circle r={r * 1.7} fill={n.color} opacity={0.16} />
                  {isSel && <circle r={r + 6} fill="none" stroke={n.color} strokeWidth={2} opacity={0.55} />}
                  <circle r={r} fill={n.color} stroke="#fff" strokeWidth={1.6} />
                  {showNodeLabel(n) && (
                    <text className="node-label" y={r + 12} textAnchor="middle">
                      {n.id}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        <div className="graph-ctrls">
          <button onClick={() => setView((v) => ({ ...v, k: Math.min(3.2, v.k * 1.2) }))} aria-label="拡大">＋</button>
          <button onClick={() => setView((v) => ({ ...v, k: Math.max(0.4, v.k / 1.2) }))} aria-label="縮小">－</button>
          <button onClick={() => setView({ k: 1, tx: 0, ty: 0 })} aria-label="全体表示">⤢</button>
        </div>
      </div>

      <div className="graph-hint">タップで関係・ドラッグで移動・引きで全体／寄せて詳細</div>

      {sel && (
        <div className="graph-panel">
          <div className="gp-head">
            <span className="gp-term">{sel.id}</span>
            <button onClick={() => setSelected(null)} aria-label="閉じる">×</button>
          </div>
          <div className="gp-def">{sel.def}</div>
          <div className="gp-refs">
            {sel.papers.map((pp) => (
              <Link key={pp.id} className="gref" to={paperHref(pp.id)}>
                {pp.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
