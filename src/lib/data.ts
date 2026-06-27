import { useEffect, useState } from "react";
import type { PapersData } from "@/types";

// GitHub Pages サブパス配信対策：必ず BASE_URL 起点で取得（絶対パス /... は404）
const DATA_URL = `${import.meta.env.BASE_URL}data/papers.json`;

export type DataState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: PapersData };

export function usePapers(): DataState {
  const [state, setState] = useState<DataState>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    fetch(DATA_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<PapersData>;
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
  }, []);

  return state;
}
