import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import "@/styles/editorial.css";
import { usePapers } from "@/lib/data";
import type { Paper, PapersData } from "@/types";
import { paperHref, streamLabel, shortMeta } from "@/lib/paper";
import { useFavorites, useRead } from "@/lib/prefs";

export default function Home() {
  const state = usePapers();

  if (state.status === "loading")
    return <div className="state-msg">読み込み中…</div>;
  if (state.status === "error")
    return (
      <div className="state-msg">
        データを読み込めませんでした（{state.message}）。
      </div>
    );

  return <HomeView data={state.data} />;
}

function HomeView({ data }: { data: PapersData }) {
  const { meta, papers } = data;
  const topicKeys = Object.keys(meta.topics);
  const multiTopic = topicKeys.length > 1;

  // 「今日の配信」＝最新 dateAdded の号
  const latestDate = useMemo(
    () => papers.reduce((m, p) => (p.dateAdded > m ? p.dateAdded : m), ""),
    [papers],
  );
  const todays = papers.filter((p) => p.dateAdded === latestDate);

  const { isRead } = useRead();
  const { isFav } = useFavorites();

  // アーカイブ検索/フィルタ
  const [q, setQ] = useState("");
  const [flt, setFlt] = useState<"all" | string>("all");
  const [favOnly, setFavOnly] = useState(false);
  const ql = q.trim().toLowerCase();
  const archive = papers.filter((p) => {
    const okTopic = flt === "all" || p.topic === flt;
    const hay = `${p.title} ${p.authors} ${p.venue}`.toLowerCase();
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
            {latestDate} 号 — 各トピック {todays.length} 件
          </div>
          <h2>本日のピックアップ</h2>
          {todays.length === 0 ? (
            <p className="tag" style={{ paddingBottom: 12 }}>
              まだ配信はありません。
            </p>
          ) : (
            topicKeys
              .map((k) => ({ k, items: todays.filter((p) => p.topic === k) }))
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
                <div className="ct">{p.title}</div>
                <div className="cm">
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
      <div className="pt">{p.title}</div>
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
