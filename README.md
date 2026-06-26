# paper-radar-turbo

論文レーダー（流体・ターボ機械／妻用）。

## 始め方
1. このフォルダで Claude Code を起動（新セッション）
2. 下のプロンプトを投げる

## 最初のプロンプト
CLAUDE.md（論文レーダーSPEC）に沿って v0→v1 まで作って。Vite+React+TS+Tailwind+shadcn を初期化し、data/papers.json（種）を読み込んでホームと詳細を表示 → A案エディトリアルのデザインを viz-panels/paper-radar のモック(home/detail)に忠実に再現。render-check でモバイル/PC両幅を確認。GitHub Pages 前提（base を '/paper-radar-turbo/'、データ取得は import.meta.env.BASE_URL 起点）。SPECの「嘘をつかない」ルール厳守。進める前に作業計画を見せて。

- 確定デザイン見本: https://yukikanedomi.github.io/viz-panels/paper-radar/home.html ・ /detail.html
- 設定(topics.json)・データ(data/papers.json)は配置済み
