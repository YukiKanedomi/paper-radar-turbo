import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import "@/styles/editorial.css";
import { usePapers } from "@/lib/data";
import type { Leveled, Paper, PapersData } from "@/types";
import {
  paperHref,
  streamOrSpecialLabel,
  shortMeta,
  displayTitle,
  originalTitle,
  cardHook,
  readingMinutes,
} from "@/lib/paper";
import { useFavorites, useRead } from "@/lib/prefs";

// アーカイブの並び順（配信日＝dateAdded / 論文の発表年＝year）
type SortKey = "added-desc" | "added-asc" | "year-desc" | "year-asc";
const SORTS: Record<SortKey, { label: string; cmp: (a: Paper, b: Paper) => number }> = {
  "added-desc": { label: "配信が新しい順", cmp: (a, b) => b.dateAdded.localeCompare(a.dateAdded) },
  "added-asc": { label: "配信が古い順", cmp: (a, b) => a.dateAdded.localeCompare(b.dateAdded) },
  "year-desc": { label: "発表年が新しい順", cmp: (a, b) => (b.year || 0) - (a.year || 0) },
  "year-asc": { label: "発表年が古い順", cmp: (a, b) => (a.year || 0) - (b.year || 0) },
};

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

  // 配信停止の見える化：最終配信から2日以上あいたら控えめに知らせる
  const staleDays = useMemo(() => {
    if (!latestIssue) return 0;
    const d = new Date(`${latestIssue}T00:00:00`);
    if (Number.isNaN(d.getTime())) return 0;
    return Math.floor((Date.now() - d.getTime()) / 864e5);
  }, [latestIssue]);

  const { isRead } = useRead();
  const { isFav } = useFavorites();

  // 足あと（蓄積の統計）
  const stats = useMemo(() => {
    const years = papers.map((p) => p.year).filter((y) => y > 0);
    const decades = new Map<number, number>();
    for (const y of years) {
      const d = Math.floor(y / 10) * 10;
      decades.set(d, (decades.get(d) ?? 0) + 1);
    }
    const dMin = Math.min(...decades.keys());
    const dMax = Math.max(...decades.keys());
    const bars: { decade: number; count: number }[] = [];
    for (let d = dMin; d <= dMax; d += 10)
      bars.push({ decade: d, count: decades.get(d) ?? 0 });
    return {
      total: papers.length,
      oa: papers.filter((p) => p.oa).length,
      yMin: years.length ? Math.min(...years) : 0,
      yMax: years.length ? Math.max(...years) : 0,
      bars,
      barMax: Math.max(1, ...bars.map((b) => b.count)),
    };
  }, [papers]);
  const readCount = papers.filter((p) => isRead(p.id)).length;
  const readPct = papers.length
    ? Math.round((readCount / papers.length) * 100)
    : 0;

  // アーカイブ検索/フィルタ/並び順
  const [q, setQ] = useState("");
  const [flt, setFlt] = useState<"all" | string>("all");
  const [favOnly, setFavOnly] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("added-desc");
  // コンパクト表示（1行リスト）。localStorage に記憶
  const [compact, setCompact] = useState(
    () => localStorage.getItem("pr:compact") === "1",
  );
  const toggleCompact = () =>
    setCompact((v) => {
      localStorage.setItem("pr:compact", v ? "0" : "1");
      return !v;
    });
  // 内容検索用の索引（タイトル・著者に加え、要約・フック・用語・豆知識・深掘り・章立て・引用まで）
  const searchIndex = useMemo(() => {
    const flat = (v?: Leveled) =>
      !v ? "" : typeof v === "string" ? v : Object.values(v).join(" ");
    const m = new Map<string, string>();
    for (const p of papers) {
      const parts: string[] = [
        p.titleJa ?? "",
        p.title,
        p.authors,
        p.venue,
        p.doi,
        p.hook ?? "",
      ];
      for (const lv of Object.values(p.levels))
        parts.push(lv.tldr, lv.problem, lv.method, lv.result, lv.limit);
      p.terms?.forEach((t) => parts.push(t.term, t.def));
      p.trivia?.forEach((t) => parts.push(t.label, flat(t.text)));
      p.deepDive?.forEach((d) => parts.push(d.title, flat(d.body)));
      p.numbers?.forEach((n) => parts.push(n.v, n.l));
      p.sections?.forEach((s) => parts.push(s.heading, flat(s.body)));
      p.quotes?.forEach((qt) => parts.push(qt.text, qt.textJa ?? ""));
      m.set(p.id, parts.join(" ").toLowerCase());
    }
    return m;
  }, [papers]);

  const ql = q.trim().toLowerCase();
  const archive = papers
    .filter((p) => {
      const okTopic = flt === "all" || p.topic === flt;
      const okQ = !ql || (searchIndex.get(p.id) ?? "").includes(ql);
      const okFav = !favOnly || isFav(p.id);
      const okUnread = !unreadOnly || !isRead(p.id);
      return okTopic && okQ && okFav && okUnread;
    })
    .sort(SORTS[sort].cmp);

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
            {latestIssue} 号 — 各トピック{" "}
            {Math.round(todays.length / Math.max(1, new Set(todays.map((p) => p.topic)).size))} 件
          </div>
          {staleDays >= 2 && (
            <div className="stale-note">
              最終配信から {staleDays} 日あいています。自動配信が止まっていないか、PC側のタスク（スケジューラ）の確認をおすすめします。
            </div>
          )}
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

        {/* 足あと（蓄積の統計） */}
        <div className="sec">足あと</div>
        <div className="stats">
          <div className="st-tiles">
            <div className="st">
              <div className="v">{stats.total}</div>
              <div className="l">配信論文</div>
            </div>
            <div className="st">
              <div className="v">{readCount}</div>
              <div className="l">既読 · {readPct}%</div>
            </div>
            <div className="st">
              <div className="v">{stats.oa}</div>
              <div className="l">OA全文</div>
            </div>
            <div className="st">
              <div className="v">
                {stats.yMin}–{stats.yMax}
              </div>
              <div className="l">発表年レンジ</div>
            </div>
          </div>
          <div className="st-decades">
            {stats.bars.map((b) => (
              <div className="db" key={b.decade} title={`${b.decade}年代: ${b.count}本`}>
                <div className="db-bar-wrap">
                  <div
                    className="db-bar"
                    style={{ height: `${6 + Math.round((34 * b.count) / stats.barMax)}px` }}
                  />
                </div>
                <div className="db-l">'{String(b.decade).slice(2)}</div>
              </div>
            ))}
            <div className="st-cap">年代ごとの配信数</div>
          </div>
        </div>

        {/* アーカイブ */}
        <div className="sec">
          アーカイブ<span className="sec-count">{archive.length} 件</span>
        </div>
        <input
          className="search"
          placeholder="タイトル・著者・内容で検索（用語・要約の中身もヒット）"
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
          <span
            className={`f${unreadOnly ? " on" : ""}`}
            onClick={() => setUnreadOnly((v) => !v)}
          >
            未読のみ
          </span>
        </div>
        <div className="filters sort-row">
          <span className="sort-label">並び順</span>
          {(Object.keys(SORTS) as SortKey[]).map((k) => (
            <span
              key={k}
              className={`f${sort === k ? " on" : ""}`}
              onClick={() => setSort(k)}
            >
              {SORTS[k].label}
            </span>
          ))}
          <span
            className={`f compact-toggle${compact ? " on" : ""}`}
            onClick={toggleCompact}
          >
            コンパクト表示
          </span>
        </div>
        <div className={`cards${compact ? " compact" : ""}`}>
          {archive.length === 0 ? (
            <div className="empty">該当なし</div>
          ) : compact ? (
            archive.map((p) => (
              <Link
                key={p.id}
                className={`crow${isRead(p.id) ? " read" : ""}`}
                to={paperHref(p.id)}
              >
                <span
                  className={`crow-dot${isRead(p.id) ? "" : " unread"}`}
                  aria-label={isRead(p.id) ? "既読" : "未読"}
                />
                <span className="crow-tp">{meta.topics[p.topic] ?? p.topic}</span>
                <span className="crow-t">{displayTitle(p)}</span>
                {isFav(p.id) && (
                  <Star size={12} className="fav-star crow-star" fill="currentColor" />
                )}
                <span className="crow-y">{p.year || ""}</span>
              </Link>
            ))
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
                {cardHook(p) && <div className="chook">{cardHook(p)}</div>}
                <div className="cm">
                  <span className={`oa-mark${p.oa ? "" : " abs"}`}>
                    {p.oa ? "OA全文" : "抄録ベース"}
                  </span>
                  {" · "}
                  {[shortMeta(p), streamOrSpecialLabel(p), `約${readingMinutes(p)}分`]
                    .filter(Boolean)
                    .join(" · ")}
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
  const chipClass = p.special ? "c-special" : p.stream === "classic" ? "c-def" : "c-new";
  return (
    <Link className={`pl${read ? " read" : ""}`} to={paperHref(p.id)}>
      <div className="pt">{displayTitle(p)}</div>
      {originalTitle(p) && <div className="pt-orig">{originalTitle(p)}</div>}
      {cardHook(p) && <div className="pt-hook">{cardHook(p)}</div>}
      <div className="pm">
        <span className={`chip2 ${chipClass}`}>{streamOrSpecialLabel(p)}</span>
        <span className="chip2 c-oa">{p.oa ? "OA" : "抄録"}</span>
        {[p.authors, p.year ? String(p.year) : "", `約${readingMinutes(p)}分`]
          .filter(Boolean)
          .join(" · ")}
        {read && <span className="read-tag">既読</span>}
        {fav && <Star size={12} className="fav-star" fill="currentColor" />}
      </div>
    </Link>
  );
}
