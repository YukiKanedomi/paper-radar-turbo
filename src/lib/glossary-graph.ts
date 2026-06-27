// 用語の関係マップ（手キュレーション部分）。
// カテゴリ（テーマ分類）と、意味的なエッジ（関係）を定義。
// これに加えて「同じ論文に出た用語どうし」の自動エッジ（共起）をランタイムで合成する。
// term 名は data/papers.json の terms[].term と完全一致させること。

export interface GraphCategory {
  key: string;
  label: string;
  color: string;
  terms: string[];
}

export interface CuratedEdge {
  from: string;
  to: string;
  label?: string;
}

export const CATEGORIES: GraphCategory[] = [
  {
    key: "instability",
    label: "不安定現象",
    color: "#b4451f",
    terms: ["サージ", "回転失速", "B パラメータ"],
  },
  {
    key: "loss",
    label: "損失機構",
    color: "#1a5e54",
    terms: [
      "エントロピー生成",
      "エントロピー損失係数",
      "全圧損失係数",
      "翼型損失",
      "混合損失",
      "端壁（二次流れ）損失",
      "翼端漏れ",
      "境界層",
    ],
  },
  {
    key: "flow",
    label: "流れ要素・装置",
    color: "#4a6fa5",
    terms: ["遠心圧縮機", "多段軸流圧縮機", "放射ディフューザ", "入射角", "せん断層"],
  },
  {
    key: "method",
    label: "数値解析・手法",
    color: "#7a6a9b",
    terms: ["CFD", "LES", "サロゲートモデル", "CNN", "次元削減", "転移学習", "不確かさ"],
  },
];

export const CURATED_EDGES: CuratedEdge[] = [
  { from: "サージ", to: "回転失速", label: "両不安定" },
  { from: "B パラメータ", to: "サージ", label: "支配" },
  { from: "B パラメータ", to: "回転失速", label: "支配" },
  { from: "翼端漏れ", to: "入射角", label: "悪化" },
  { from: "エントロピー生成", to: "エントロピー損失係数", label: "定義" },
  { from: "エントロピー損失係数", to: "全圧損失係数", label: "関係" },
  { from: "境界層", to: "翼型損失", label: "起源" },
  { from: "境界層", to: "せん断層" },
  { from: "翼型損失", to: "エントロピー生成", label: "損失" },
  { from: "端壁（二次流れ）損失", to: "エントロピー生成", label: "損失" },
  { from: "翼端漏れ", to: "エントロピー生成", label: "損失" },
  { from: "混合損失", to: "エントロピー生成", label: "損失" },
  { from: "CFD", to: "LES", label: "一種" },
  { from: "CFD", to: "サロゲートモデル", label: "代替" },
  { from: "サロゲートモデル", to: "CNN", label: "実装" },
  { from: "サロゲートモデル", to: "次元削減" },
  { from: "サロゲートモデル", to: "転移学習" },
  { from: "サロゲートモデル", to: "不確かさ" },
  { from: "遠心圧縮機", to: "サージ", label: "発生" },
  { from: "遠心圧縮機", to: "回転失速", label: "発生" },
  { from: "せん断層", to: "回転失速", label: "渦誘起" },
  { from: "多段軸流圧縮機", to: "サロゲートモデル", label: "対象" },
];

const CAT_OF = new Map<string, GraphCategory>();
for (const c of CATEGORIES) for (const t of c.terms) CAT_OF.set(t, c);

export function categoryOf(term: string): GraphCategory | undefined {
  return CAT_OF.get(term);
}
