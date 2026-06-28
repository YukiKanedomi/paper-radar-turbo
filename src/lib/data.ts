import { useEffect, useState } from "react";
import type { PapersData, IssuesLogData } from "@/types";

// GitHub Pages サブパス配信対策：必ず BASE_URL 起点で取得（絶対パス /... は404）
const DATA_URL = `${import.meta.env.BASE_URL}data/papers.json`;
const LOG_URL = `${import.meta.env.BASE_URL}data/issues-log.json`;

export type DataState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: PapersData };

// 汎用：JSON を取得して loading/error/ready を返す小フック
function useJson<T>(url: string) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; data: T }
  >({ status: "loading" });

  useEffect(() => {
    let alive = true;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<T>;
      })
      .then((data) => {
        if (alive) setState({ status: "ready", data });
      })
      .catch((e: unknown) => {
        if (alive)
          setState({
            status: "error",
            message: e instanceof Error ? e.message : "読み込みに失敗しました",
          });
      });
    return () => {
      alive = false;
    };
  }, [url]);

  return state;
}

export function usePapers(): DataState {
  return useJson<PapersData>(DATA_URL);
}

export function useIssuesLog() {
  return useJson<IssuesLogData>(LOG_URL);
}
