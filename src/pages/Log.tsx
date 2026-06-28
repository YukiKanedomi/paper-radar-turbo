import { useMemo } from "react";
import { Link } from "react-router-dom";
import "@/styles/editorial.css";
import { useIssuesLog } from "@/lib/data";
import { paperHref } from "@/lib/paper";
import type { IssueLog, SearchLog } from "@/types";

// 配信ノート：号ごとの「検索・選定のやさしい記録」＋編集後記（人間味のある一個人の感想）。
export default function Log() {
  const state = useIssuesLog();
  if (state.status === "loading")
    return <div className="state-msg">読み込み中…</div>;
  if (state.status === "error")
    return (
      <div className="state-msg">
        配信ノートを読み込めませんでした（{state.message}）。
      </div>
    );

  return <LogView entries={state.data.entries} />;
}

function LogView({ entries }: { entries: IssueLog[] }) {
  // 日付の新しい順に整える
  const sorted = useMemo(
    () => [...entries].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [entries],
  );
  const pubCount = sorted.filter((e) => e.status === "published").length;

  return (
    <div className="log-page">
      <div className="wrap">
        <div className="top">
          <Link to="/">← 論文レーダー</Link>
          <span>
            {sorted.length} 回 ・ 配信 {pubCount} 回
          </span>
        </div>
        <div className="kick">Editor's Note</div>
        <h1>配信ノート</h1>
        <div className="tag">
          どんな言葉で探して、なぜその論文を選んだのか。お休みした日はその理由も。
          編集の舞台裏を、そのまま正直に綴っています。
        </div>

        {sorted.length === 0 ? (
          <div className="empty">まだノートはありません。</div>
        ) : (
          <div className="notes">
            {sorted.map((e) => (
              <NoteCard key={e.date} e={e} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NoteCard({ e }: { e: IssueLog }) {
  const skipped = e.status === "skipped";
  return (
    <article className={`note${skipped ? " skipped" : ""}`}>
      <header className="note-head">
        <time className="note-date">{e.date}</time>
        <span className={`note-badge${skipped ? " off" : ""}`}>
          {skipped ? "お休み" : "配信"}
        </span>
      </header>
      <h2 className="note-title">{e.headline}</h2>
      <p className="note-intro">{e.intro}</p>

      {e.picked && e.picked.length > 0 && (
        <div className="note-picks">
          <div className="note-sub">選んだ論文</div>
          {e.picked.map((p, i) => (
            <div className="note-pick" key={i}>
              <div className="np-title">
                {p.id ? (
                  <Link to={paperHref(p.id)}>{p.title} →</Link>
                ) : (
                  p.title
                )}
              </div>
              <div className="np-why">{p.why}</div>
            </div>
          ))}
        </div>
      )}

      {e.aside && e.aside.length > 0 && (
        <div className="note-aside">
          <div className="note-sub">選定の舞台裏</div>
          {e.aside.map((a, i) => (
            <div className="note-asideItem" key={i}>
              <div className="na-title">{a.title}</div>
              <div className="na-note">{a.note}</div>
            </div>
          ))}
        </div>
      )}

      {e.afterword && <p className="note-afterword">{e.afterword}</p>}

      {e.searchLog && <SearchRecord log={e.searchLog} />}
    </article>
  );
}

// 検索の記録（展開式・既定は閉じる）。どんな語で・どのサイトで・何件ヒットしたか。
function SearchRecord({ log }: { log: SearchLog }) {
  return (
    <details className="note-search">
      <summary>検索の記録を見る</summary>
      <div className="ns-body">
        {log.sources.map((s, i) => (
          <div className="ns-src" key={i}>
            <div className="ns-head">
              <span className="ns-name">{s.name}</span>
              {s.scope && <span className="ns-scope">{s.scope}</span>}
              {typeof s.hits === "number" && (
                <span className="ns-hits">{s.hits} 件ヒット</span>
              )}
            </div>
            <div className="ns-terms">
              {s.terms.map((t, j) => (
                <code className="ns-term" key={j}>
                  {t}
                </code>
              ))}
            </div>
            {s.note && <div className="ns-note">{s.note}</div>}
          </div>
        ))}
        {log.note && <div className="ns-foot">{log.note}</div>}
      </div>
    </details>
  );
}
