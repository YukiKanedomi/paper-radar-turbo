import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "@/styles/editorial.css";
import { usePapers } from "@/lib/data";
import { buildGlossary } from "@/lib/glossary";
import { paperHref } from "@/lib/paper";
import type { PapersData } from "@/types";

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
      </div>
    </div>
  );
}
