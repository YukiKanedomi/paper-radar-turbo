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
import { Maximize2, Minimize2, Plus, Minus, Scan } from "lucide-react";
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

const K_MIN = 0.35;
const K_MAX = 3.4;
const clampK = (k: number) => Math.min(K_MAX, Math.max(K_MIN, k));

export default function GraphView({ nodes, curated, co, categories }: Props) {
  const [showCo, setShowCo] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [view, setView] = useState({ k: 1, tx: 0, ty: 0 });
  const [expanded, setExpanded] = useState(false);
  const [, setTick] = useState(0);
  const simRef = useRef<Simulation<GraphNode, GraphEdge> | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  // アクティブな指（pointerId→クライアント座標）
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const movedRef = useRef(false);
  const drag = useRef<
    | { type: "pan"; sux: number; suy: number; tx: number; ty: number }
    | { type: "node"; node: GraphNode }
    | null
  >(null);
  // ピンチ開始時の基準（ユーザー座標系）
  const pinch = useRef<
    | { startDist: number; startK: number; startTx: number; startTy: number; mx: number; my: number }
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

  // 全画面の間は背面ページのスクロールを止める
  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [expanded]);

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

  // 画面（クライアント）座標 → SVG ユーザー座標（viewBox 空間・preserveAspectRatio 込み）
  function userPt(clientX: number, clientY: number) {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const u = pt.matrixTransform(ctm.inverse());
    return { x: u.x, y: u.y };
  }
  // ある点（ユーザー座標）を中心に倍率 f でズーム
  function zoomAround(ux: number, uy: number, f: number) {
    setView((v) => {
      const k2 = clampK(v.k * f);
      const ratio = k2 / v.k;
      return { k: k2, tx: ux - ratio * (ux - v.tx), ty: uy - ratio * (uy - v.ty) };
    });
  }

  function onWheel(e: React.WheelEvent) {
    const u = userPt(e.clientX, e.clientY);
    zoomAround(u.x, u.y, e.deltaY < 0 ? 1.12 : 1 / 1.12);
  }
  function zoomButton(f: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const u = userPt(r.left + r.width / 2, r.top + r.height / 2);
    zoomAround(u.x, u.y, f);
  }

  function beginPinch() {
    drag.current = null;
    const pts = [...pointers.current.values()];
    if (pts.length < 2) return;
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    const mid = userPt((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
    const v = viewRef.current;
    pinch.current = { startDist: dist, startK: v.k, startTx: v.tx, startTy: v.ty, mx: mid.x, my: mid.y };
  }

  function onPointerDownBg(e: React.PointerEvent) {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    movedRef.current = false;
    if (pointers.current.size >= 2) {
      beginPinch();
      return;
    }
    const u = userPt(e.clientX, e.clientY);
    drag.current = { type: "pan", sux: u.x, suy: u.y, tx: view.tx, ty: view.ty };
  }
  function onPointerDownNode(e: React.PointerEvent, n: GraphNode) {
    e.stopPropagation();
    (e.currentTarget.closest("svg") as Element)?.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    movedRef.current = false;
    if (pointers.current.size >= 2) {
      beginPinch();
      return;
    }
    simRef.current?.alphaTarget(0.25).restart();
    n.fx = n.x;
    n.fy = n.y;
    drag.current = { type: "node", node: n };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (pointers.current.has(e.pointerId))
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // 2本指：ピンチズーム＋中点パン
    if (pinch.current && pointers.current.size >= 2) {
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = userPt((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
      const p = pinch.current;
      const k2 = clampK(p.startK * (dist / (p.startDist || 1)));
      const gx = (p.mx - p.startTx) / p.startK;
      const gy = (p.my - p.startTy) / p.startK;
      setView({ k: k2, tx: mid.x - k2 * gx, ty: mid.y - k2 * gy });
      movedRef.current = true;
      return;
    }

    const d = drag.current;
    if (!d) return;
    movedRef.current = true;
    const u = userPt(e.clientX, e.clientY);
    if (d.type === "pan") {
      setView((v) => ({ ...v, tx: d.tx + (u.x - d.sux), ty: d.ty + (u.y - d.suy) }));
    } else {
      const v = viewRef.current;
      d.node.fx = (u.x - v.tx) / v.k;
      d.node.fy = (u.y - v.ty) / v.k;
    }
  }
  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    const d = drag.current;
    if (d?.type === "node") {
      d.node.fx = null;
      d.node.fy = null;
      simRef.current?.alphaTarget(0);
    }
    if (pointers.current.size === 0) drag.current = null;
  }

  const sel = selected ? nodeMap.get(selected) : null;
  const dim = (id: string) => neighbors !== null && !neighbors.has(id);
  const showNodeLabel = (n: GraphNode) =>
    n.degree >= 4 || view.k >= 1.2 || (neighbors?.has(n.id) ?? false);
  const showEdgeLabel = view.k >= 1.05 || neighbors !== null;
  const showClusterLabel = view.k < 1.7;

  return (
    <div className={`graph${expanded ? " expanded" : ""}`}>
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
          ref={svgRef}
          className="graph-svg"
          viewBox={viewBox}
          onWheel={onWheel}
          onPointerDown={onPointerDownBg}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClick={() => {
            if (movedRef.current) {
              movedRef.current = false;
              return;
            }
            setSelected(null);
          }}
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
                    if (!movedRef.current) setSelected(n.id);
                  }}
                >
                  {/* タップしやすい不可視の当たり判定 */}
                  <circle r={Math.max(r * 1.8, 28)} fill="transparent" />
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
          <button onClick={() => setExpanded((v) => !v)} aria-label={expanded ? "全画面を閉じる" : "全画面で開く"}>
            {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button onClick={() => zoomButton(1.25)} aria-label="拡大">
            <Plus size={16} />
          </button>
          <button onClick={() => zoomButton(1 / 1.25)} aria-label="縮小">
            <Minus size={16} />
          </button>
          <button onClick={() => setView({ k: 1, tx: 0, ty: 0 })} aria-label="全体表示">
            <Scan size={16} />
          </button>
        </div>
      </div>

      <div className="graph-hint">
        2本指でズーム／1本指で移動・タップで詳細・関係{expanded ? "" : "（右下のボタンで全画面）"}
      </div>

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
