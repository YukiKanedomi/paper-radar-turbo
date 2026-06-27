import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Star } from "lucide-react";
import "@/styles/editorial.css";
import { usePapers } from "@/lib/data";
import type { Level, Paper, Term } from "@/types";
import {
  streamLabel,
  oaLabel,
  sourceUrl,
  displayTitle,
  originalTitle,
  citationText,
  resolveLeveled,
} from "@/lib/paper";
import { useFavorites, useRead } from "@/lib/prefs";

// KaTeX は重い。式を持つ論文を開いた時だけ読み込む（種データは式ゼロ＝休眠）。
const Equation = lazy(() => import("@/components/Equation"));

const LEVEL_BY_NUM: Record<number, Level> = { 1: "easy", 2: "std", 3: "expert" };

export default function Detail() {
  const state = usePapers();
  const { id } = useParams();
  const decodedId = id ? decodeURIComponent(id) : "";

  if (state.status === "loading")
    return <div className="state-msg">読み込み中…</div>;
  if (state.status === "error")
    return (
      <div className="state-msg">
        データを読み込めませんでした（{state.message}）。
      </div>
    );

  const paper = state.data.papers.find((p) => p.id === decodedId);
  const topicLabel = paper ? state.data.meta.topics[paper.topic] ?? paper.topic : "";
  const levelLabels = state.data.meta.levelLabels;

  if (!paper)
    return (
      <div className="state-msg">
        論文が見つかりませんでした。
        <br />
        <Link to="/" style={{ color: "var(--accent)", fontWeight: 700 }}>
          ← 論文レーダーへ戻る
        </Link>
      </div>
    );

  return (
    <DetailView paper={paper} topicLabel={topicLabel} levelLabels={levelLabels} />
  );
}

interface PopState {
  term: string;
  def: string;
  left: number;
  top: number;
  above: boolean;
}

function DetailView({
  paper: p,
  topicLabel,
  levelLabels,
}: {
  paper: Paper;
  topicLabel: string;
  levelLabels: Record<Level, string>;
}) {
  const [num, setNum] = useState(2);
  const [pop, setPop] = useState<PopState | null>(null);
  const levelKey = LEVEL_BY_NUM[num];
  const lv = p.levels[levelKey];
  const src = sourceUrl(p);

  // 豆知識・深掘りは「数」でなく「文章」を説明レベルで変える（resolveLeveled）
  const trivia = p.trivia;
  const deepDive = p.deepDive ?? [];
  // OA全文の号の上積み（出典に忠実な時だけデータが入る）
  const quotes = p.quotes ?? [];
  const sections = p.sections ?? [];

  const { markRead } = useRead();
  const { isFav, toggleFav } = useFavorites();
  // 詳細を開いたら既読に
  useEffect(() => {
    markRead(p.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.id]);
  const fav = isFav(p.id);

  // 用語クリック → 固定ポップアップ（モックの #pop 相当）
  function onTerm(e: React.MouseEvent, t: Term) {
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const left = Math.max(10, Math.min(r.left, window.innerWidth - 300));
    const above = r.top > 140;
    setPop({
      term: t.term,
      def: t.def,
      left,
      top: above ? r.top - 8 : r.bottom + 8,
      above,
    });
  }

  // 本文テキスト内の既知用語を自動で点線リンク化（出典のtermsに基づく・捏造しない）
  const renderTerms = useMemo(() => {
    // 空の term は indexOf("")===0 で無限ループになるため除外
    const sorted = [...p.terms]
      .filter((t) => t.term.trim().length > 0)
      .sort((a, b) => b.term.length - a.term.length);
    return (text: string, kp: string) => {
      if (!sorted.length) return text;
      const nodes: React.ReactNode[] = [];
      let rest = text;
      let i = 0;
      while (rest.length) {
        let best: { idx: number; t: Term } | null = null;
        for (const t of sorted) {
          const idx = rest.indexOf(t.term);
          if (idx >= 0 && (best === null || idx < best.idx)) best = { idx, t };
        }
        if (!best) {
          nodes.push(rest);
          break;
        }
        if (best.idx > 0) nodes.push(rest.slice(0, best.idx));
        const bt = best.t;
        nodes.push(
          <span
            className="term"
            key={`${kp}-${i++}`}
            onClick={(e) => onTerm(e, bt)}
          >
            {bt.term}
          </span>,
        );
        rest = rest.slice(best.idx + bt.term.length);
      }
      return nodes;
    };
  }, [p.terms]);

  const dropcap = lv.tldr.trim().charAt(0);

  return (
    <div className="detail-page" onClick={() => setPop(null)}>
      {pop && (
        <div
          className="term-pop"
          style={{
            left: pop.left,
            top: pop.top,
            transform: pop.above ? "translateY(-100%)" : undefined,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <b>{pop.term}</b>
          <br />
          {pop.def}
        </div>
      )}

      <div className="wrap">
        <div className="top">
          <Link to="/">← 論文レーダー</Link>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span>{p.dateAdded} 配信</span>
            <button
              type="button"
              className={`fav-btn${fav ? " on" : ""}`}
              aria-pressed={fav}
              aria-label={fav ? "お気に入りから外す" : "お気に入りに追加"}
              onClick={() => toggleFav(p.id)}
            >
              <Star size={16} fill={fav ? "currentColor" : "none"} />
              お気に入り
            </button>
          </div>
        </div>

        <div className="kick">
          {streamLabel(p.stream)}論文 — {topicLabel}
        </div>
        <h1>{displayTitle(p)}</h1>
        {originalTitle(p) && <div className="h1-orig">{originalTitle(p)}</div>}
        <div className="meta">
          <b>{p.authors}</b>
          {p.venue ? ` · ${p.venue}` : ""}
          {p.year ? ` · ${p.year}` : ""}
          {citationText(p) ? ` · ${citationText(p)}` : ""}
          {p.doi ? ` · DOI:${p.doi}` : ""}
        </div>
        <div className="badges">
          <span className={`bd ${p.stream === "classic" ? "fill" : "line"}`}>
            {streamLabel(p.stream)}
          </span>
          <span className="bd line">{oaLabel(p.oa)}</span>
          <span className="bd">{topicLabel}</span>
        </div>

        {/* 説明レベル slider */}
        <div className="lvl">
          <span className="lab">説明レベル</span>
          <span className="ends">{levelLabels.easy}</span>
          <input
            type="range"
            min={1}
            max={3}
            value={num}
            onChange={(e) => setNum(Number(e.target.value))}
          />
          <span className="ends">{levelLabels.expert}</span>
          <span className="now">{levelLabels[levelKey]}</span>
        </div>

        {/* リード（tldr）＋ドロップキャップ */}
        <p className="lead">
          <span className="dc">{dropcap}</span>
          {renderTerms(lv.tldr, "tldr")}
        </p>

        <div className="sec">何が問題だったか</div>
        <p>{renderTerms(lv.problem, "problem")}</p>

        <div className="sec">手法</div>
        <p>{renderTerms(lv.method, "method")}</p>

        {/* 式（KaTeX で描画。出典の equations がある時だけ。空なら出さない） */}
        {p.equations.length > 0 && (
          <Suspense fallback={null}>
            {p.equations.map((eq, idx) => (
              <Equation key={`eq-${idx}`} tex={eq.tex} caption={eq.caption} />
            ))}
          </Suspense>
        )}

        {/* 図（出典の figures がある時だけ。conceptは『模式』とキャプション明記前提）。
            実図(original)は CC/PD ライセンスのみ・credit 必須（§0/§7） */}
        {p.figures.map((fig, idx) => (
          <Figure key={`fig-${idx}`} fig={fig} />
        ))}

        {/* 原文より（直接引用・OA全文の号だけ）。§0：原文をそのまま引く＝捏造ゼロ */}
        {quotes.length > 0 && (
          <>
            <div className="sec">原文より</div>
            {quotes.map((q, idx) => (
              <blockquote className="pq" key={`q-${idx}`}>
                <p className="pq-orig">“{q.text}”</p>
                {q.textJa && <p className="pq-ja">{q.textJa}</p>}
                {q.where && <cite className="pq-src">— {q.where}</cite>}
              </blockquote>
            ))}
          </>
        )}

        {p.numbers.length > 0 && (
          <>
            <div className="sec">主要な結果</div>
            <div className="nums">
              {p.numbers.map((n, idx) => (
                <div className="num" key={`num-${idx}`}>
                  <div className="v">{n.v}</div>
                  <div className="l">{n.l}</div>
                </div>
              ))}
            </div>
            <p>{renderTerms(lv.result, "result")}</p>
          </>
        )}
        {p.numbers.length === 0 && (
          <>
            <div className="sec">主要な結果</div>
            <p>{renderTerms(lv.result, "result")}</p>
          </>
        )}

        {/* 章立てウォークスルー（OA全文の号だけ・節ごとに忠実要約・説明レベル追従） */}
        {sections.length > 0 && (
          <>
            <div className="sec">章立てで読む</div>
            <div className="walk">
              {sections.map((s, idx) => (
                <div className="wk" key={`wk-${idx}`}>
                  <div className="wk-h">{s.heading}</div>
                  <p className="wk-b">
                    {renderTerms(resolveLeveled(s.body, levelKey), `wk-${idx}`)}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 深掘りアコーディオン（出典がある時だけ・説明レベルで増減） */}
        {deepDive.map((d, idx) => (
          <details className="acc" key={`dd-${idx}`}>
            <summary>{d.title}</summary>
            <div className="body">{resolveLeveled(d.body, levelKey)}</div>
          </details>
        ))}

        {trivia.length > 0 && (
          <>
            <div className="sec">豆知識</div>
            {trivia.map((t, idx) => (
              <div className="triv" key={`triv-${idx}`}>
                <div className="t">{t.label}</div>
                {resolveLeveled(t.text, levelKey)}
              </div>
            ))}
          </>
        )}

        <div className="sec">限界</div>
        <p>{renderTerms(lv.limit, "limit")}</p>

        {p.related.length > 0 && (
          <>
            <div className="sec">関連論文</div>
            <div className="rel">
              {p.related.map((r, idx) =>
                r.url ? (
                  <a key={`rel-${idx}`} href={r.url} target="_blank" rel="noreferrer">
                    <span className="tag">{r.tag}</span>
                    {r.title}
                  </a>
                ) : (
                  <a key={`rel-${idx}`} style={{ cursor: "default" }}>
                    <span className="tag">{r.tag}</span>
                    {r.title}
                  </a>
                ),
              )}
            </div>
          </>
        )}

        {p.terms.length > 0 && (
          <>
            <div className="sec">用語集</div>
            <div className="gloss">
              {p.terms.map((t, idx) => (
                <div className="g" key={`gl-${idx}`}>
                  <b>{t.term}</b>：{t.def}
                </div>
              ))}
            </div>
          </>
        )}

        {src ? (
          <a className="orig" href={src} target="_blank" rel="noreferrer">
            原文を開く →
          </a>
        ) : (
          <div className="orig" style={{ background: "var(--mut)", cursor: "default" }}>
            原文リンク準備中
          </div>
        )}
      </div>
    </div>
  );
}

function Figure({ fig }: { fig: import("@/types").Figure }) {
  const src = fig.src.trim();
  const isSvg = src.startsWith("<svg");
  // ローカル public 配下は BASE_URL 起点、http(s) はそのまま
  const imgSrc = /^https?:\/\//.test(src) ? src : `${import.meta.env.BASE_URL}${src}`;
  return (
    <div className="fig">
      {isSvg ? (
        <div dangerouslySetInnerHTML={{ __html: src }} />
      ) : (
        <img src={imgSrc} alt={fig.caption} loading="lazy" />
      )}
      <div className="cap">{fig.caption}</div>
      {fig.note && <div className="fig-note">{fig.note}</div>}
      {fig.credit && (
        <div className="credit">
          {fig.creditUrl ? (
            <a href={fig.creditUrl} target="_blank" rel="noreferrer">
              {fig.credit}
            </a>
          ) : (
            fig.credit
          )}
        </div>
      )}
    </div>
  );
}
