import { useMemo, useRef, useState } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  forceX,
  forceY,
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

const nodeR = (n: GraphNode) => 10 + Math.min(n.papers.length, 4) * 2.6;

export default function GraphView({ nodes, curated, co, categories }: Props) {
  const [showCo, setShowCo] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [view, setView] = useState({ k: 1, tx: 0, ty: 0 });
  const drag = useRef<
    | { type: "pan"; sx: number; sy: number; tx: number; ty: number; moved: boolean }
    | { type: "node"; id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean }
    | null
  >(null);

  const nodeById = useMemo(() => {
    const m = new Map<string, GraphNode>();
    nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [nodes]);

  const catCenter = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    const R = 200;
    categories.forEach((c, i) => {
      const a = (i / categories.length) * Math.PI * 2 - Math.PI / 2;
      m.set(c.key, { x: Math.cos(a) * R, y: Math.sin(a) * R });
    });
    return m;
  }, [categories]);

  const layout = useMemo(() => {
    const ns = nodes.map((n) => ({ ...n }));
    const links = [...curated, ...co].map((e) => ({ ...e }));
    const sim = forceSimulation(ns as any)
      .force(
        "link",
        forceLink(links as any)
          .id((d: any) => d.id)
          .distance((l: any) => (l.kind === "curated" ? 78 : 130))
          .strength((l: any) => (l.kind === "curated" ? 0.5 : 0.04)),
      )
      .force("charge", forceManyBody().strength(-300))
      .force("collide", forceCollide(36))
      .force("x", forceX((d: any) => catCenter.get(d.catKey)?.x ?? 0).strength(0.1))
      .force("y", forceY((d: any) => catCenter.get(d.catKey)?.y ?? 0).strength(0.1))
      .stop();
    for (let i = 0; i < 440; i++) sim.tick();
    const pos: Record<string, { x: number; y: number }> = {};
    ns.forEach((n: any) => (pos[n.id] = { x: n.x, y: n.y }));
    return pos;
  }, [nodes, curated, co, catCenter]);

  const [pos, setPos] = useState(layout);

  const neighbors = useMemo(() => {
    const focus = selected ?? hovered;
    if (!focus) return null;
    const s = new Set<string>([focus]);
    for (const e of [...curated, ...co]) {
      if (e.source === focus) s.add(e.target as string);
      if (e.target === focus) s.add(e.source as string);
    }
    return s;
  }, [selected, hovered, curated, co]);

  const bounds = useMemo(() => {
    const xs = Object.values(pos).map((p) => p.x);
    const ys = Object.values(pos).map((p) => p.y);
    const pad = 70;
    return {
      minX: Math.min(...xs) - pad,
      minY: Math.min(...ys) - pad,
      w: Math.max(...xs) - Math.min(...xs) + pad * 2,
      h: Math.max(...ys) - Math.min(...ys) + pad * 2,
    };
  }, [pos]);

  // カテゴリのクラスタ背景（ソフトな領域）
  const halos = useMemo(() => {
    return categories
      .map((c) => {
        const pts = c.terms.map((t) => pos[t]).filter(Boolean) as { x: number; y: number }[];
        if (pts.length < 2) return null;
        const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
        const r = Math.max(...pts.map((p) => Math.hypot(p.x - cx, p.y - cy))) + 42;
        return { key: c.key, color: c.color, cx, cy, r };
      })
      .filter(Boolean) as { key: string; color: string; cx: number; cy: number; r: number }[];
  }, [categories, pos]);

  function edgePath(a: { x: number; y: number }, b: { x: number; y: number }, rT: number) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const bx = b.x - ux * (rT + 6);
    const by = b.y - uy * (rT + 6);
    const mx = (a.x + bx) / 2;
    const my = (a.y + by) / 2;
    const off = len * 0.13;
    return `M ${a.x} ${a.y} Q ${mx - uy * off} ${my + ux * off} ${bx} ${by}`;
  }

  function onWheel(e: React.WheelEvent) {
    const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setView((v) => ({ ...v, k: Math.min(3, Math.max(0.4, v.k * f)) }));
  }
  function svgPoint(e: React.PointerEvent) {
    const r = (e.currentTarget as SVGElement).getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function onPointerDownBg(e: React.PointerEvent) {
    const p = svgPoint(e);
    drag.current = { type: "pan", sx: p.x, sy: p.y, tx: view.tx, ty: view.ty, moved: false };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }
  function onPointerDownNode(e: React.PointerEvent, id: string) {
    e.stopPropagation();
    const p = svgPoint(e);
    drag.current = { type: "node", id, sx: p.x, sy: p.y, ox: pos[id].x, oy: pos[id].y, moved: false };
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
      setPos((prev) => ({
        ...prev,
        [d.id]: { x: d.ox + (p.x - d.sx) / view.k, y: d.oy + (p.y - d.sy) / view.k },
      }));
    }
  }
  function onPointerUp() {
    drag.current = null;
  }

  const sel = selected ? nodeById.get(selected) : null;
  const dim = (id: string) => neighbors !== null && !neighbors.has(id);

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
          viewBox={`${bounds.minX} ${bounds.minY} ${bounds.w} ${bounds.h}`}
          onWheel={onWheel}
          onPointerDown={onPointerDownBg}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={() => setSelected(null)}
        >
          <defs>
            <marker
              id="arrow"
              markerWidth="9"
              markerHeight="9"
              refX="7"
              refY="3"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path d="M0,0 L7,3 L0,6 z" fill="#9aa0a6" />
            </marker>
          </defs>
          <g
            className="graph-stage"
            transform={`translate(${view.tx} ${view.ty}) scale(${view.k})`}
          >
            {/* クラスタ背景 */}
            {halos.map((h) => (
              <circle key={h.key} cx={h.cx} cy={h.cy} r={h.r} fill={h.color} opacity={0.06} />
            ))}

            {/* 共起エッジ（薄・曲線） */}
            {showCo &&
              co.map((e, i) => {
                const a = pos[e.source as string];
                const b = pos[e.target as string];
                const tn = nodeById.get(e.target as string);
                if (!a || !b || !tn) return null;
                return (
                  <path
                    key={`co${i}`}
                    d={edgePath(a, b, nodeR(tn))}
                    fill="none"
                    stroke="#cdc8bc"
                    strokeWidth={0.7}
                    strokeDasharray="3 3"
                    opacity={neighbors ? 0.12 : 0.45}
                  />
                );
              })}

            {/* 手キュレーション・エッジ（曲線＋矢印＋ラベル） */}
            {curated.map((e, i) => {
              const a = pos[e.source as string];
              const b = pos[e.target as string];
              const tn = nodeById.get(e.target as string);
              if (!a || !b || !tn) return null;
              const active =
                !neighbors ||
                (neighbors.has(e.source as string) && neighbors.has(e.target as string));
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              return (
                <g key={`cu${i}`} opacity={active ? 1 : 0.1}>
                  <path
                    d={edgePath(a, b, nodeR(tn))}
                    fill="none"
                    stroke="#9aa0a6"
                    strokeWidth={1.4}
                    markerEnd="url(#arrow)"
                  />
                  {e.label && (
                    <text className="edge-label" x={mx} y={my - 3} textAnchor="middle">
                      {e.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* ノード */}
            {nodes.map((n) => {
              const p = pos[n.id];
              if (!p) return null;
              const r = nodeR(n);
              const isSel = selected === n.id;
              return (
                <g
                  key={n.id}
                  transform={`translate(${p.x} ${p.y})`}
                  opacity={dim(n.id) ? 0.18 : 1}
                  style={{ cursor: "pointer" }}
                  onPointerDown={(e) => onPointerDownNode(e, n.id)}
                  onPointerEnter={() => setHovered(n.id)}
                  onPointerLeave={() => setHovered((h) => (h === n.id ? null : h))}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!drag.current?.moved) setSelected(n.id);
                  }}
                >
                  {isSel && <circle r={r + 6} fill="none" stroke={n.color} strokeWidth={2} opacity={0.5} />}
                  <circle r={r} fill={n.color} stroke="#fff" strokeWidth={1.6} />
                  <text className="node-label" y={r + 12} textAnchor="middle">
                    {n.id}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        <div className="graph-ctrls">
          <button onClick={() => setView((v) => ({ ...v, k: Math.min(3, v.k * 1.2) }))} aria-label="拡大">
            ＋
          </button>
          <button onClick={() => setView((v) => ({ ...v, k: Math.max(0.4, v.k / 1.2) }))} aria-label="縮小">
            －
          </button>
          <button onClick={() => setView({ k: 1, tx: 0, ty: 0 })} aria-label="全体表示">
            ⤢
          </button>
        </div>
      </div>

      <div className="graph-hint">タップで関係・ドラッグで移動・ホイール/ボタンで拡大</div>

      {sel && (
        <div className="graph-panel">
          <div className="gp-head">
            <span className="gp-term">{sel.id}</span>
            <button onClick={() => setSelected(null)} aria-label="閉じる">
              ×
            </button>
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
