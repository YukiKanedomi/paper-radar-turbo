import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

// 出典の数式（LaTeX）を KaTeX で描画。種データには式が無いので休眠。
// /collect が equations[].tex を埋めたら自動で表示される。
export default function Equation({ tex, caption }: { tex: string; caption: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, {
        throwOnError: false,
        displayMode: true,
      });
    } catch {
      return null;
    }
  }, [tex]);

  return (
    <div className="eq">
      {html ? (
        <span dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        // 描画に失敗したら原文 tex をそのまま見せる（捏造しない）
        <span>{tex}</span>
      )}
      <span className="cap">{caption}</span>
    </div>
  );
}
