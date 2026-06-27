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
  levels: Record<Level, LevelText>;
  equations: Equation[];
  figures: Figure[];
  numbers: NumberCard[];
  terms: Term[];
  trivia: Trivia[];
  related: Related[];
  deepDive?: DeepDive[];
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
