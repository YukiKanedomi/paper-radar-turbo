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

const nodeR = (n: GraphNode) => 9 + Math.min(n.papers.length, 4) * 2.5;

export default function GraphView({ nodes, curated, co, categories }: Props) {
  const [showCo, setShowCo] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState({ k: 1, tx: 0, ty: 0 });
  const drag = useRef<
    | { type: "pan"; sx: number; sy: number; tx: number; ty: number }
    | { type: "node"; id: string; sx: number; sy: number; ox: number; oy: number }
    | null
  >(null);

  // カテゴリのクラスタ中心
  const catCenter = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    const R = 190;
    categories.forEach((c, i) => {
      const a = (i / categories.length) * Math.PI * 2 - Math.PI / 2;
      m.set(c.key, { x: Math.cos(a) * R, y: Math.sin(a) * R });
    });
    return m;
  }, [categories]);

  // レイアウトを一度だけ計算（決定論的）
  const layout = useMemo(() => {
    const ns = nodes.map((n) => ({ ...n }));
    const links = [...curated, ...co].map((e) => ({ ...e }));
    const sim = forceSimulation(ns as any)
      .force(
        "link",
        forceLink(links as any)
          .id((d: any) => d.id)
          .distance((l: any) => (l.kind === "curated" ? 72 : 120))
          .strength((l: any) => (l.kind === "curated" ? 0.5 : 0.05)),
      )
      .force("charge", forceManyBody().strength(-270))
      .force("collide", forceCollide(34))
      .force("x", forceX((d: any) => catCenter.get(d.catKey)?.x ?? 0).strength(0.09))
      .force("y", forceY((d: any) => catCenter.get(d.catKey)?.y ?? 0).strength(0.09))
      .stop();
    for (let i = 0; i < 420; i++) sim.tick();
    const pos: Record<string, { x: number; y: number }> = {};
    ns.forEach((n: any) => (pos[n.id] = { x: n.x, y: n.y }));
    return pos;
  }, [nodes, curated, co, catCenter]);

  const [pos, setPos] = useState(layout);

  // ハイライト：選択ノードと隣接
  const neighbors = useMemo(() => {
    if (!selected) return null;
    const s = new Set<string>([selected]);
    for (const e of [...curated, ...co]) {
      if (e.source === selected) s.add(e.target as string);
      if (e.target === selected) s.add(e.source as string);
    }
    return s;
  }, [selected, curated, co]);

  const bounds = useMemo(() => {
    const xs = Object.values(pos).map((p) => p.x);
    const ys = Object.values(pos).map((p) => p.y);
    const pad = 60;
    return {
      minX: Math.min(...xs) - pad,
      minY: Math.min(...ys) - pad,
      w: Math.max(...xs) - Math.min(...xs) + pad * 2,
      h: Math.max(...ys) - Math.min(...ys) + pad * 2,
    };
  }, [pos]);

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setView((v) => ({ ...v, k: Math.min(3, Math.max(0.4, v.k * f)) }));
  }
  function svgPoint(e: React.PointerEvent) {
    const r = (e.currentTarget as SVGElement).getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function onPointerDownBg(e: React.PointerEvent) {
    const p = svgPoint(e);
    drag.current = { type: "pan", sx: p.x, sy: p.y, tx: view.tx, ty: view.ty };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }
  function onPointerDownNode(e: React.PointerEvent, id: string) {
    e.stopPropagation();
    const p = svgPoint(e);
    drag.current = { type: "node", id, sx: p.x, sy: p.y, ox: pos[id].x, oy: pos[id].y };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const p = svgPoint(e);
    if (d.type === "pan") {
      setView((v) => ({ ...v, tx: d.tx + (p.x - d.sx), ty: d.ty + (p.y - d.sy) }));
    } else {
      const nx = d.ox + (p.x - d.sx) / view.k;
      const ny = d.oy + (p.y - d.sy) / view.k;
      setPos((prev) => ({ ...prev, [d.id]: { x: nx, y: ny } }));
    }
  }
  function onPointerUp() {
    drag.current = null;
  }

  const sel = selected ? nodes.find((n) => n.id === selected) : null;
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
          <input
            type="checkbox"
            checked={showCo}
            onChange={(e) => setShowCo(e.target.checked)}
          />
          共起も表示
        </label>
      </div>

      <svg
        className="graph-svg"
        viewBox={`${bounds.minX} ${bounds.minY} ${bounds.w} ${bounds.h}`}
        onWheel={onWheel}
        onPointerDown={onPointerDownBg}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={() => setSelected(null)}
      >
        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.k})`}>
          {/* 共起エッジ（薄） */}
          {showCo &&
            co.map((e, i) => {
              const a = pos[e.source as string];
              const b = pos[e.target as string];
              if (!a || !b) return null;
              return (
                <line
                  key={`co${i}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="#c9c4b8"
                  strokeWidth={0.6}
                  strokeDasharray="3 3"
                  opacity={neighbors ? 0.15 : 0.4}
                />
              );
            })}
          {/* 手キュレーション・エッジ */}
          {curated.map((e, i) => {
            const a = pos[e.source as string];
            const b = pos[e.target as string];
            if (!a || !b) return null;
            const active =
              !neighbors ||
              (neighbors.has(e.source as string) && neighbors.has(e.target as string));
            return (
              <g key={`cu${i}`} opacity={active ? 1 : 0.12}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#9aa0a6" strokeWidth={1.3} />
                {e.label && (
                  <text
                    x={(a.x + b.x) / 2}
                    y={(a.y + b.y) / 2 - 2}
                    fontSize={8}
                    fill="#6c7078"
                    textAnchor="middle"
                  >
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
                opacity={dim(n.id) ? 0.22 : 1}
                style={{ cursor: "pointer" }}
                onPointerDown={(e) => onPointerDownNode(e, n.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(n.id);
                }}
              >
                <circle
                  r={r}
                  fill={n.color}
                  stroke={isSel ? "#1d2127" : "#fff"}
                  strokeWidth={isSel ? 2.5 : 1.2}
                />
                <text
                  y={r + 11}
                  fontSize={10}
                  fill="#1d2127"
                  textAnchor="middle"
                  style={{ pointerEvents: "none" }}
                >
                  {n.id}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="graph-hint">タップで関係を表示・ドラッグで移動・ホイールで拡大</div>

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
            {sel.papers.map((p) => (
              <Link key={p.id} className="gref" to={paperHref(p.id)}>
                {p.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
