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
const easeInOutCubic = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

interface View {
  k: number;
  tx: number;
  ty: number;
}

export default function GraphView({ nodes, curated, co, categories }: Props) {
  const [showCo, setShowCo] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [view, setView] = useState<View>({ k: 1, tx: 0, ty: 0 });
  const [expanded, setExpanded] = useState(false);
  // スプレッディング・アクティベーション：時間差で広がる発光集合
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());
  const [, setTick] = useState(0);
  const simRef = useRef<Simulation<GraphNode, GraphEdge> | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const rafRef = useRef<number | null>(null);
  const waveTimers = useRef<number[]>([]);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
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
  // ドラッグの慣性用：直近のグラフ座標と速度
  const lastDragPt = useRef<{ x: number; y: number } | null>(null);
  const flingVel = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });

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

  // 隣接（手キュレーション＋共起の両方）
  const adj = useMemo(() => {
    const m = new Map<string, Set<string>>();
    const link = (a: string, b: string) => {
      if (!m.has(a)) m.set(a, new Set());
      m.get(a)!.add(b);
    };
    for (const e of [...curated, ...co]) {
      const s = endId(e.source), t = endId(e.target);
      link(s, t);
      link(t, s);
    }
    return m;
  }, [curated, co]);

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

  // アンマウント時に進行中のアニメ・タイマを掃除
  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      waveTimers.current.forEach((id) => clearTimeout(id));
    },
    [],
  );

  // 選択時：選んだ語から関係を伝って時間差で発光が広がる
  useEffect(() => {
    waveTimers.current.forEach((id) => clearTimeout(id));
    waveTimers.current = [];
    if (!selected) {
      setActiveIds(new Set());
      return;
    }
    // BFS で hop ごとの層を作る
    const layers: string[][] = [[selected]];
    const seen = new Set<string>([selected]);
    let frontier = [selected];
    for (let depth = 0; frontier.length && depth < 6; depth++) {
      const next: string[] = [];
      for (const id of frontier)
        for (const nb of adj.get(id) ?? [])
          if (!seen.has(nb)) {
            seen.add(nb);
            next.push(nb);
          }
      if (next.length) layers.push(next);
      frontier = next;
    }
    if (prefersReduced()) {
      setActiveIds(new Set(seen));
      return;
    }
    setActiveIds(new Set([selected]));
    layers.slice(1).forEach((layer, i) => {
      const id = window.setTimeout(() => {
        setActiveIds((prev) => {
          const s = new Set(prev);
          layer.forEach((x) => s.add(x));
          return s;
        });
      }, (i + 1) * 115);
      waveTimers.current.push(id);
    });
  }, [selected, adj]);

  const hoverNeighbors = useMemo(() => {
    if (!hovered) return null;
    const s = new Set<string>([hovered]);
    for (const nb of adj.get(hovered) ?? []) s.add(nb);
    return s;
  }, [hovered, adj]);

  // 現在の強調集合（選択＝波／ホバー＝1ホップ）
  const focusSet = selected ? activeIds : hoverNeighbors;
  const hasFocus = focusSet !== null && focusSet.size > 0;
  const inFocus = (id: string) => !hasFocus || focusSet!.has(id);
  const dim = (id: string) => hasFocus && !focusSet!.has(id);

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
  // view を滑らかに補間（reduce-motion は即時）
  function animateView(to: View, dur = 420) {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const from = { ...viewRef.current };
    if (prefersReduced() || dur <= 0) {
      setView(to);
      return;
    }
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = easeInOutCubic(p);
      setView({
        k: from.k + (to.k - from.k) * e,
        tx: from.tx + (to.tx - from.tx) * e,
        ty: from.ty + (to.ty - from.ty) * e,
      });
      rafRef.current = p < 1 ? requestAnimationFrame(step) : null;
    };
    rafRef.current = requestAnimationFrame(step);
  }
  // ある点（ユーザー座標）を中心に倍率 f でズーム（target を返す）
  function zoomTarget(ux: number, uy: number, f: number, v: View): View {
    const k2 = clampK(v.k * f);
    const ratio = k2 / v.k;
    return { k: k2, tx: ux - ratio * (ux - v.tx), ty: uy - ratio * (uy - v.ty) };
  }

  function onWheel(e: React.WheelEvent) {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const u = userPt(e.clientX, e.clientY);
    setView((v) => zoomTarget(u.x, u.y, e.deltaY < 0 ? 1.12 : 1 / 1.12, v));
  }
  function zoomButton(f: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const u = userPt(r.left + r.width / 2, r.top + r.height / 2);
    animateView(zoomTarget(u.x, u.y, f, viewRef.current), 320);
  }
  function resetView() {
    animateView({ k: 1, tx: 0, ty: 0 }, 480);
  }

  function beginPinch() {
    drag.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
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
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
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
    lastDragPt.current = null;
    flingVel.current = { vx: 0, vy: 0 };
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
      const gx = (u.x - v.tx) / v.k;
      const gy = (u.y - v.ty) / v.k;
      if (lastDragPt.current) {
        flingVel.current = { vx: gx - lastDragPt.current.x, vy: gy - lastDragPt.current.y };
      }
      lastDragPt.current = { x: gx, y: gy };
      d.node.fx = gx;
      d.node.fy = gy;
    }
  }
  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    const d = drag.current;
    if (d?.type === "node") {
      d.node.fx = null;
      d.node.fy = null;
      // 慣性：離した瞬間の速度を与え、自然に流れて落ち着く
      if (!prefersReduced() && (Math.abs(flingVel.current.vx) > 0.4 || Math.abs(flingVel.current.vy) > 0.4)) {
        const clampV = (x: number) => Math.max(-26, Math.min(26, x * 5));
        d.node.vx = clampV(flingVel.current.vx);
        d.node.vy = clampV(flingVel.current.vy);
        simRef.current?.alphaTarget(0.12).restart();
        window.setTimeout(() => simRef.current?.alphaTarget(0), 520);
      } else {
        simRef.current?.alphaTarget(0);
      }
      lastDragPt.current = null;
      flingVel.current = { vx: 0, vy: 0 };
    }
    // 背景の素早い2連タップ＝その点へ寄ってズーム
    if (d?.type === "pan" && !movedRef.current && pointers.current.size === 0) {
      const now = performance.now();
      const prev = lastTap.current;
      if (prev && now - prev.t < 320 && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 30) {
        const u = userPt(e.clientX, e.clientY);
        animateView(zoomTarget(u.x, u.y, 1.9, viewRef.current), 360);
        lastTap.current = null;
        suppressClick.current = true;
      } else {
        lastTap.current = { t: now, x: e.clientX, y: e.clientY };
      }
    }
    if (pointers.current.size === 0) drag.current = null;
  }

  const sel = selected ? nodeMap.get(selected) : null;
  const showNodeLabel = (n: GraphNode) =>
    n.degree >= 4 || view.k >= 1.2 || (hasFocus && focusSet!.has(n.id));
  const showEdgeLabel = view.k >= 1.05 || hasFocus;
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
            if (suppressClick.current) {
              suppressClick.current = false;
              return;
            }
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
                const lit = inFocus(a.id) && inFocus(b.id);
                return (
                  <path
                    key={`co${i}`}
                    d={edgePath(a, b, nodeR(b))}
                    fill="none"
                    stroke="#cdc8bc"
                    strokeWidth={0.5 + Math.min(e.weight ?? 1, 4) * 0.3}
                    strokeDasharray="3 3"
                    opacity={!hasFocus ? 0.4 : lit ? 0.5 : 0.06}
                    style={{ transition: "opacity .3s ease" }}
                  />
                );
              })}

            {/* 手キュレーション・エッジ（曲線＋矢印＋ラベル） */}
            {curated.map((e, i) => {
              const a = endXY(e.source, nodeMap), b = endXY(e.target, nodeMap);
              if (!a || !b) return null;
              const active = inFocus(a.id) && inFocus(b.id);
              const d = edgePath(a, b, nodeR(b));
              return (
                <g key={`cu${i}`} opacity={active ? 1 : 0.1} style={{ transition: "opacity .3s ease" }}>
                  <path d={d} fill="none" stroke="#9aa0a6" strokeWidth={1.5} markerEnd="url(#arrow)" />
                  {/* 選択中：関係の向きに沿って一筋の光が流れる（コメット） */}
                  {active && hasFocus && (
                    <path
                      className="edge-flow"
                      d={d}
                      fill="none"
                      stroke="#1a5e54"
                      strokeWidth={2.2}
                      pathLength={1}
                      style={{ animationDelay: `${-((i * 0.37) % 2.2).toFixed(2)}s` }}
                    />
                  )}
                  {e.label && showEdgeLabel && (
                    <text className="edge-label" x={((a.x ?? 0) + (b.x ?? 0)) / 2} y={((a.y ?? 0) + (b.y ?? 0)) / 2 - 3} textAnchor="middle">
                      {e.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* ノード */}
            {simNodes.map((n, i) => {
              const r = nodeR(n);
              const isSel = selected === n.id;
              const pulsing = selected != null && activeIds.has(n.id);
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x ?? 0} ${n.y ?? 0})`}
                  opacity={dim(n.id) ? 0.16 : 1}
                  style={{ cursor: "pointer", transition: "opacity .25s ease" }}
                  onPointerDown={(e) => onPointerDownNode(e, n)}
                  onPointerEnter={() => setHovered(n.id)}
                  onPointerLeave={() => setHovered((h) => (h === n.id ? null : h))}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!movedRef.current) setSelected(n.id);
                  }}
                >
                  {/* タップしやすい不可視の当たり判定（静止） */}
                  <circle r={Math.max(r * 1.8, 28)} fill="transparent" />
                  {/* 待機の微呼吸：中身だけを desync で呼吸させる */}
                  <g className="node-breathe" style={{ animationDelay: `${-((i * 0.53) % 4).toFixed(2)}s` }}>
                    {/* 発光が伝わってきた瞬間のパルス（一度だけ再生） */}
                    {pulsing && <circle className="node-pulse" r={r} fill="none" stroke={n.color} strokeWidth={2.2} />}
                    <circle r={r * 1.7} fill={n.color} opacity={0.16} />
                    {isSel && <circle r={r + 6} fill="none" stroke={n.color} strokeWidth={2} opacity={0.55} />}
                    <circle r={r} fill={n.color} stroke="#fff" strokeWidth={1.6} />
                  </g>
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
          <button onClick={resetView} aria-label="全体表示">
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
