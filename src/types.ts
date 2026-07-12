// data/papers.json のデータモデル（CLAUDE.md §3）

export type Stream = "classic" | "latest";
export type Level = "easy" | "std" | "expert";

export interface LevelText {
  tldr: string;
  problem: string;
  method: string;
  result: string;
  limit: string;
}

export interface Equation {
  tex: string;
  caption: string;
}

export interface Figure {
  type: "original" | "concept";
  src: string; // インラインSVG文字列 / http(s)URL / BASE_URL相対パス（public配下）
  caption: string;
  note?: string; // 図解説（任意）：この図が「何を示すか」の出典に忠実な補足。OAで実図を複数載せる号で活用。
  // 実図（original）は再利用可能ライセンス（CC-BY/CC0/PD）の時のみ。出典・ライセンスを必ず明記。
  credit?: string; // 例: "出典: 著者ら, J. Foo 2020（CC BY 4.0）"
  creditUrl?: string;
}

export interface NumberCard {
  v: string;
  l: string;
}

export interface Term {
  term: string;
  def: string;
}

// 文字列＝全レベル共通／オブジェクト＝説明レベルごとに文章を変える
export type Leveled = string | Record<Level, string>;

export interface Trivia {
  label: string;
  text: Leveled;
}

export interface Related {
  tag: string;
  title: string;
  url: string;
}

// 深掘りアコーディオン（任意・出典がある時だけ）。body は説明レベルで文章を変えられる。
export interface DeepDive {
  title: string;
  body: Leveled;
}

// 原文の直接引用（OA全文の号で活用・§0：原文をそのまま引く＝捏造ゼロ）。
// text は原文（英語論文ならそのまま）、textJa は忠実な和訳、where は出典箇所（例「本文 §3」「Abstract」）。
export interface Quote {
  text: string;
  textJa?: string;
  where?: string;
}

// 章立てウォークスルー（OA全文の号で活用）。論文の節構成を出典に忠実に1段落ずつ要約。
// body は説明レベルで文章を変えられる（Leveled）。
export interface SectionSummary {
  heading: string;
  body: Leveled;
}

export interface Paper {
  id: string;
  topic: string;
  stream: Stream;
  source: "arxiv" | "openalex" | "semanticscholar";
  oa: boolean;
  title: string;
  titleJa?: string; // 英語論文の忠実な和訳タイトル（無ければ title をそのまま表示）
  authors: string;
  year: number;
  venue: string;
  doi: string;
  url: string;
  pdfUrl: string;
  citationNote: string;
  citationCount?: number; // OpenAlex cited_by_count（概数・信頼できる時のみ表示。不明なら省略）
  issue?: string; // 配信号（YYYY-MM-DD）。dateAdded とは別。currentIssue と一致するものが「今日の配信」
  special?: boolean; // 特別号（ユーザー指定の論文を深く紹介）。true のとき「特別号」バッジを出し、定番/最新ラベルは出さない
  hook?: string; // カード用の一言フック（タイトルと重複しない中身の見どころ・1文）。無ければ levels.easy.tldr の先頭文で代用
  levels: Record<Level, LevelText>;
  equations: Equation[];
  figures: Figure[];
  numbers: NumberCard[];
  terms: Term[];
  trivia: Trivia[];
  related: Related[];
  deepDive?: DeepDive[];
  quotes?: Quote[]; // 原文の直接引用（OA全文の号）。§0：原文をそのまま引く
  sections?: SectionSummary[]; // 章立てウォークスルー（OA全文の号）。節ごとに忠実要約
  dateAdded: string;
  status: string;
  seed?: boolean;
}

export interface Meta {
  app: string;
  title: string;
  topics: Record<string, string>;
  levelLabels: Record<Level, string>;
  lastUpdated: string;
  currentIssue?: string; // 最新の配信号（YYYY-MM-DD）。ホーム「今日の配信」の対象
  note?: string;
}

export interface PapersData {
  meta: Meta;
  papers: Paper[];
}

// ---- 配信ノート（issues-log.json）----
// 号ごとの「検索・選定のやさしい記録」＋編集後記（人間味のある一個人の感想）。
// §0：事実は正確に・感想は主観として書く（事実の捏造はしない）。なりすましはしない（"編集担当より"の一人称）。
export interface LogPick {
  id?: string; // papers.json の論文 id（あれば詳細ページへリンク）
  title: string;
  why: string; // なぜ選んだか（やさしく）
}
export interface LogAside {
  title: string;
  note: string; // 見送り・保留・スキップのやさしい理由
}
// 検索の記録（展開式で表示・既定は閉じる）。§0：実際に検索した語・サイト・件数のみ。捏造しない。
export interface SearchSource {
  name: string; // 例 "arXiv" / "OpenAlex"
  scope?: string; // 例 "physics.flu-dyn カテゴリ" / "被引用数の多い順"
  terms: string[]; // 検索語
  hits?: number; // ヒット件数（分かる時のみ。不明なら省略）
  note?: string; // 結果のやさしい補足
}
export interface SearchLog {
  sources: SearchSource[];
  note?: string; // 全体の補足（件数未記録の断り等）
}

export interface IssueLog {
  date: string; // YYYY-MM-DD（配信を試みた日）
  status: "published" | "skipped";
  headline: string; // やさしい見出し
  intro: string; // 検索・選定のやさしい説明
  picked?: LogPick[]; // 選んだ論文（公開時）
  aside?: LogAside[]; // 見送り・保留・スキップの内訳
  afterword?: string; // 編集後記＝親しみのある一個人の感想（一人称・主観）。専門家ではないが配信から得た気づきを共有
  searchLog?: SearchLog; // 検索の記録（展開式・どんな語でどのサイト・何件）
}
export interface IssuesLogData {
  entries: IssueLog[]; // 新しい号が配列の前（降順）でも後でも可。表示側で日付降順に整える
}
