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
  src: string;
  caption: string;
}

export interface NumberCard {
  v: string;
  l: string;
}

export interface Term {
  term: string;
  def: string;
}

export interface Trivia {
  label: string;
  text: string;
}

export interface Related {
  tag: string;
  title: string;
  url: string;
}

// 深掘りアコーディオン（任意・出典がある時だけ）。種データには無いので未表示。
export interface DeepDive {
  title: string;
  body: string;
}

export interface Paper {
  id: string;
  topic: string;
  stream: Stream;
  source: "arxiv" | "openalex" | "semanticscholar";
  oa: boolean;
  title: string;
  authors: string;
  year: number;
  venue: string;
  doi: string;
  url: string;
  pdfUrl: string;
  citationNote: string;
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
  note?: string;
}

export interface PapersData {
  meta: Meta;
  papers: Paper[];
}
