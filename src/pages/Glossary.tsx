import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "@/styles/editorial.css";
import { usePapers } from "@/lib/data";
import { buildGlossary } from "@/lib/glossary";
import { buildGraph } from "@/lib/graph-build";
import { paperHref } from "@/lib/paper";
import type { PapersData } from "@/types";

// 関係グラフ（d3-force）は重いのでタブを開いた時だけ読み込む
const GraphView = lazy(() => import("@/components/GraphView"));

export default function Glossary() {
  const state = usePapers();
  if (state.status === "loading")
    return <div className="state-msg">読み込み中…</div>;
  if (state.status === "error")
    return (
      <div className="state-msg">
        データを読み込めませんでした（{state.message}）。
      </div>
    );
  return <GlossaryView data={state.data} />;
}

function GlossaryView({ data }: { data: PapersData }) {
  const entries = useMemo(() => buildGlossary(data), [data]);
  const graph = useMemo(() => buildGraph(entries, data), [entries, data]);
  const [tab, setTab] = useState<"list" | "graph">("graph");
  const [q, setQ] = useState("");
  const ql = q.trim().toLowerCase();
  const list = entries.filter(
    (e) => !ql || (e.term + " " + e.def).toLowerCase().includes(ql),
  );
  const crossCount = entries.filter((e) => e.papers.length > 1).length;

  return (
    <div className="glossary-page">
      <div className="wrap">
        <div className="top">
          <Link to="/">← 論文レーダー</Link>
          <span>
            {entries.length} 語 ・ 横断 {crossCount} 語
          </span>
        </div>
        <div className="kick">Glossary</div>
        <h1>用語集</h1>
        <div className="tag">
          これまでに収集した全論文の用語を横断でまとめています。複数の論文に登場する語は上に。
        </div>

        <div className="gtabs">
          <button
            className={`gtab${tab === "graph" ? " on" : ""}`}
            onClick={() => setTab("graph")}
          >
            関係マップ
          </button>
          <button
            className={`gtab${tab === "list" ? " on" : ""}`}
            onClick={() => setTab("list")}
          >
            一覧
          </button>
        </div>

        {tab === "graph" ? (
          <Suspense fallback={<div className="empty">関係マップを読み込み中…</div>}>
            <GraphView
              nodes={graph.nodes}
              curated={graph.curated}
              co={graph.co}
              categories={graph.categories}
            />
          </Suspense>
        ) : (
          <>
            <input
              className="search"
              placeholder="用語・定義で検索"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {list.length === 0 ? (
          <div className="empty">該当なし</div>
        ) : (
          <div className="glist">
            {list.map((e) => (
              <div className="gentry" key={e.term}>
                <div className="gterm">
                  {e.term}
                  {e.papers.length > 1 && (
                    <span className="gcross">横断 {e.papers.length}</span>
                  )}
                </div>
                <div className="gdef">{e.def}</div>
                <div className="grefs">
                  {e.papers.map((p) => (
                    <Link key={p.id} className="gref" to={paperHref(p.id)}>
                      {p.title}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
