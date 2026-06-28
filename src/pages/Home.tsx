import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import "@/styles/editorial.css";
import { usePapers } from "@/lib/data";
import type { Paper, PapersData } from "@/types";
import {
  paperHref,
  streamLabel,
  shortMeta,
  displayTitle,
  originalTitle,
} from "@/lib/paper";
import { useFavorites, useRead } from "@/lib/prefs";

export default function Home() {
  const state = usePapers();

  if (state.status === "loading") return <HomeSkeleton />;
  if (state.status === "error")
    return (
      <div className="state-msg">
        データを読み込めませんでした（{state.message}）。
      </div>
    );

  return <HomeView data={state.data} />;
}

function HomeSkeleton() {
  return (
    <div className="home-page" aria-hidden>
      <div className="wrap">
        <div className="skel skel-brand" />
        <div className="skel skel-title" />
        <div className="skel skel-tag" />
        <div className="skel skel-feat" />
        {[0, 1].map((i) => (
          <div className="skel-row" key={i}>
            <div className="skel skel-line w70" />
            <div className="skel skel-line w40" />
          </div>
        ))}
      </div>
    </div>
  );
}

function HomeView({ data }: { data: PapersData }) {
  const { meta, papers } = data;
  const topicKeys = Object.keys(meta.topics);
  const multiTopic = topicKeys.length > 1;

  // 「今日の配信」＝最新の配信号（meta.currentIssue）。無ければ最新 issue にフォールバック
  const latestIssue = useMemo(() => {
    if (meta.currentIssue) return meta.currentIssue;
    return papers.reduce((m, p) => (p.issue && p.issue > m ? p.issue : m), "");
  }, [meta.currentIssue, papers]);
  const todays = papers.filter((p) => p.issue && p.issue === latestIssue);

  const { isRead } = useRead();
  const { isFav } = useFavorites();

  // アーカイブ検索/フィルタ
  const [q, setQ] = useState("");
  const [flt, setFlt] = useState<"all" | string>("all");
  const [favOnly, setFavOnly] = useState(false);
  const ql = q.trim().toLowerCase();
  const archive = papers.filter((p) => {
    const okTopic = flt === "all" || p.topic === flt;
    const hay = `${p.titleJa ?? ""} ${p.title} ${p.authors} ${p.venue}`.toLowerCase();
    const okQ = !ql || hay.includes(ql);
    const okFav = !favOnly || isFav(p.id);
    return okTopic && okQ && okFav;
  });

  return (
    <div className="home-page">
      <div className="wrap">
        <div className="brand">Paper Radar</div>
        <h1>論文レーダー</h1>
        <div className="tag">気になる論文を、やさしく・きれいに届ける</div>

        {/* 今日の配信 */}
        <div className="sec">今日の配信</div>
        <div className="today">
          <div className="date">
            {latestIssue} 号 — 各トピック {todays.length} 件
          </div>
          <h2>本日のピックアップ</h2>
          {todays.length === 0 ? (
            <p className="tag" style={{ paddingBottom: 12 }}>
              まだ配信はありません。
            </p>
          ) : (
            topicKeys
              .map((k) => ({
                k,
                // 定番（classic）を先、最新（latest）を後（モック準拠）
                items: todays
                  .filter((p) => p.topic === k)
                  .sort(
                    (a, b) =>
                      (a.stream === "classic" ? 0 : 1) -
                      (b.stream === "classic" ? 0 : 1),
                  ),
              }))
              .filter((g) => g.items.length > 0)
              .map((g) => (
                <div key={g.k}>
                  <div className="tg">{meta.topics[g.k]}</div>
                  {g.items.map((p) => (
                    <DeliveryRow key={p.id} p={p} read={isRead(p.id)} fav={isFav(p.id)} />
                  ))}
                </div>
              ))
          )}
        </div>

        {/* 用語集への導線（目立つフィーチャーカード） */}
        <Link to="/glossary" className="glossfeat">
          <svg className="gf-motif" viewBox="0 0 64 64" aria-hidden="true">
            <g stroke="var(--accent)" strokeWidth="1.4" fill="none" opacity="0.55">
              <line x1="14" y1="20" x2="32" y2="32" />
              <line x1="50" y1="16" x2="32" y2="32" />
              <line x1="18" y1="48" x2="32" y2="32" />
              <line x1="48" y1="46" x2="32" y2="32" />
              <line x1="14" y1="20" x2="18" y2="48" />
            </g>
            <g fill="var(--accent)">
              <circle cx="32" cy="32" r="6" />
              <circle cx="14" cy="20" r="3.4" />
              <circle cx="50" cy="16" r="3.4" />
              <circle cx="18" cy="48" r="3.4" />
              <circle cx="48" cy="46" r="3.4" />
            </g>
          </svg>
          <div className="gf-body">
            <div className="gf-k">用語の関係マップ</div>
            <div className="gf-t">専門用語を、図でつなぐ</div>
            <div className="gf-d">
              失速・サージ・二次流れ・損失… 配信に出てきた語を、関係マップと用語集で深掘り。
            </div>
            <span className="gf-cta">関係マップを開く →</span>
          </div>
        </Link>

        {/* 配信ノートへの控えめな導線 */}
        <Link to="/log" className="lognote-link">
          <span className="ln-k">配信ノート</span>
          <span className="ln-t">
            どんな言葉で探し、なぜ選んだか。お休みした日の理由も、正直に。
          </span>
          <span className="ln-cta">読む →</span>
        </Link>

        {/* アーカイブ */}
        <div className="sec">アーカイブ</div>
        <input
          className="search"
          placeholder="タイトル・著者で検索"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="filters">
          {multiTopic && (
            <>
              <span
                className={`f${flt === "all" ? " on" : ""}`}
                onClick={() => setFlt("all")}
              >
                すべて
              </span>
              {topicKeys.map((k) => (
                <span
                  key={k}
                  className={`f${flt === k ? " on" : ""}`}
                  onClick={() => setFlt(k)}
                >
                  {meta.topics[k]}
                </span>
              ))}
            </>
          )}
          <span
            className={`f${favOnly ? " on" : ""}`}
            onClick={() => setFavOnly((v) => !v)}
          >
            ★ お気に入り
          </span>
        </div>
        <div className="cards">
          {archive.length === 0 ? (
            <div className="empty">該当なし</div>
          ) : (
            archive.map((p) => (
              <Link
                key={p.id}
                className={`card${isRead(p.id) ? " read" : ""}`}
                to={paperHref(p.id)}
              >
                <div className="tp">
                  {meta.topics[p.topic] ?? p.topic}
                  {isFav(p.id) && (
                    <Star size={13} className="fav-star" fill="currentColor" />
                  )}
                  {isRead(p.id) && <span className="read-tag">既読</span>}
                </div>
                <div className="ct">{displayTitle(p)}</div>
                {originalTitle(p) && <div className="ct-orig">{originalTitle(p)}</div>}
                <div className="cm">
                  <span className={`oa-mark${p.oa ? "" : " abs"}`}>
                    {p.oa ? "OA全文" : "抄録ベース"}
                  </span>
                  {" · "}
                  {[shortMeta(p), streamLabel(p.stream)].filter(Boolean).join(" · ")}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function DeliveryRow({ p, read, fav }: { p: Paper; read: boolean; fav: boolean }) {
  const chipClass = p.stream === "classic" ? "c-def" : "c-new";
  return (
    <Link className={`pl${read ? " read" : ""}`} to={paperHref(p.id)}>
      <div className="pt">{displayTitle(p)}</div>
      {originalTitle(p) && <div className="pt-orig">{originalTitle(p)}</div>}
      <div className="pm">
        <span className={`chip2 ${chipClass}`}>{streamLabel(p.stream)}</span>
        <span className="chip2 c-oa">{p.oa ? "OA" : "抄録"}</span>
        {[p.authors, p.year ? String(p.year) : ""].filter(Boolean).join(" · ")}
        {read && <span className="read-tag">既読</span>}
        {fav && <Star size={12} className="fav-star" fill="currentColor" />}
      </div>
    </Link>
  );
}
