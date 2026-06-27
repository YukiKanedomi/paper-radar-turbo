# 論文レーダー — 設計図 / ビルド指示書（共通）

> このファイルを新プロジェクトの `CLAUDE.md` として置く。`topics.json` と `data/papers.json`（種データ）を一緒に入れて、「CLAUDE.md（SPEC）通りに作って」で着手。
> **仕組みは2アプリ共通。トピック構成だけ `topics.json` で変える。**
> - 軸受系アプリ（本人用）：フォイルガス軸受＋ロータダイナミクスの2トピック
> - ターボ系アプリ（妻用）：流体・ターボ機械の1トピック

## 0. 最重要ルール — 嘘をつかない
- 要約・紹介は**出典に忠実**。数値・主張・固有名を**捏造しない**。原文に無いことを足さない。
- **図は実図（出典明記）か、技術的に正しい"概念図（模式・実データではない と明記）"のみ。** 誤解を生む図を作らない。
- 全文が取れない論文は**「抄録ベース」と明記**し、推測で埋めない。被引用数は**概数として扱い、不明なら出さない**。
- 確信が持てない箇所は正直にその旨を書く。これは本アプリの信頼性の核（専門家＋妻が使うため）。

## 1. これは何
気になる論文を**定期サーチ → やさしく要約 → 洗練された詳細ページで配信**するWebアプリ。少数精鋭（**各トピック2件固定**）、OA優先で詳細ページを凝る。スマホ・PC両対応。

## 2. アーキテクチャ
```
収集(/collect・私が実行) → data/papers.json(蓄積) → React+shadcn 静的サイト → GitHub Pages → スマホ/PC
```
- データ(`papers.json`)と表示を分離。アプリは静的ビルドで `papers.json` を読み描画。
- 収集は Claude Code がローカルで実行（arXiv＋OpenAlex/Semantic Scholar）。**ソースはハイブリッド**：OA/arXiv＝全文で深い要約・図/式を拾う／有料＝抄録ベース要約＋原文リンク。

## 3. データモデル（data/papers.json）
`{ "meta": {...}, "papers": [ Paper ] }`。Paper:
```jsonc
{
  "id": "arxiv:2501.xxxxx" or "doi:10.xxxx/xxxx",   // 重複判定キー
  "topic": "foil" | "rotor" | "turbo",
  "stream": "classic" | "latest",
  "source": "arxiv" | "openalex" | "semanticscholar",
  "oa": true,                       // オープンアクセスか（false=抄録ベース）
  "title": "…",                     // 原題（英語論文はそのまま保持）
  "titleJa": "…",                   // 英語論文の忠実な和訳タイトル（任意。和訳主・原題副で表示）
  "authors": "…", "year": 1983, "venue": "…",
  "doi": "", "url": "", "pdfUrl": "",
  "citationNote": "定番（高被引用）",   // 概数 or 定性。不明なら空
  "citationCount": 900,             // OpenAlex cited_by_count（任意・概数。信頼できる時のみ。不明なら省略）
  "issue": "2026-06-27",            // 配信号（任意）。currentIssue と一致＝「今日の配信」。dateAdded とは別概念
  "levels": {                        // 説明レベル3段階（slider用）
    "easy":   { "tldr": "…", "problem": "…", "method": "…", "result": "…", "limit": "…" },
    "std":    { "tldr": "…", "problem": "…", "method": "…", "result": "…", "limit": "…" },
    "expert": { "tldr": "…", "problem": "…", "method": "…", "result": "…", "limit": "…" }
  },
  "equations": [ { "tex": "…", "caption": "…（原文 式N）" } ],
  "figures":  [ { "type":"original|concept", "src":"", "caption":"…（conceptは『模式・実データではない』と明記）" } ],
  "numbers":  [ { "v": "↑ 負荷容量", "l": "剛体比で向上" } ],
  "terms":    [ { "term": "コンプライアンス", "def": "やさしい定義" } ],
  "trivia":   [ { "label": "由来", "text": "…" } ],
  "related":  [ { "tag": "引く定番", "title": "…", "url": "" } ],
  "dateAdded": "2026-06-27", "status": "unread",
  "seed": true        // 種データの印（本実装の/collectで検証・拡張・置換）
}
```
`meta` にトピック定義・凡例＋ `currentIssue`（最新配信号）を持つ。**画面ラベルは meta から引く**。
- **配信号（issue）と追加日（dateAdded）は別**：`dateAdded` はシステムに入れた日、`issue` は編集判断で「今日の配信」に載せた号。ストック（過去に取得したが今日の号には載せない論文）は `issue` を付けない。「今日の配信」は `issue == meta.currentIssue` で判定。

## 4. 画面
**ホーム（読む画面・設定なし）**
- 今日の配信（最新 `issue`＝`meta.currentIssue` の号、各トピック2件、定番/最新/OA(抄録)バッジ）
- アーカイブ（検索＋トピックfilter＋カード。QOL方式の蓄積一覧）
- **設定パネルは置かない**（キーワード/配信数の調整はアプリでは行わない。下記運用参照）

**詳細ページ（A案＝エディトリアル。確定デザイン）**
- **説明レベル slider（やさしい/標準/専門）**：`levels` を切替え本文がライブで変わる（追従配置）
- **用語**：点線、タップ/ホバーで `terms` の定義ポップ＋末尾に用語集
- 式（KaTeX）、概念図（明記）、数値カード、深掘りアコーディオン、豆知識複数、関連論文、原文リンク
- 既読/お気に入りは localStorage

確定デザインの実物（モック）：`viz-panels/paper-radar/home.html` `…/detail.html`
（https://yukikanedomi.github.io/viz-panels/ ）。**この見た目・配色・トーンを忠実に再現**。

## 5. デザイン方針
- **洗練。絵文字は使わない。** 単色アクセント＝深いティール `#1a5e54` ＋ ニュートラル ＋ 暖色ペーパー `#faf9f5`、本文は明朝（Hiragino Mincho/Yu Mincho）、UI/ラベルはサンセリフ。
- frontend-design で方向維持、theme-factory でトークン化可。**render-check でモバイル/PC両幅を必ず目視**。仕上げに `/code-review`。数式は KaTeX。

## 6. 技術スタック / デプロイ
- Vite + React + TypeScript + Tailwind + shadcn/ui（shadcn MCP活用）。lucide-react は使うが**装飾的絵文字は不可**。
- データは `public/data/papers.json`、`fetch(import.meta.env.BASE_URL + 'data/papers.json')`。
- GitHub Pages（`vite.config` の `base:'/<repo名>/'`、Actions deploy）。詳細はグローバル方針に従う。

## 7. 収集・運用（/collect）
- 各トピック **latest（arXiv/OpenAlex 日付順）＋ classic（OpenAlex/Semantic Scholar 被引用上位）を各1件＝計2件/トピック**。
- **配信に必ず1件は OA（全文）を含める**：2件のうち最低1件は OA 全文（抄録だけだと薄いため深掘り用）。定番が有料なら最新（arXiv等）を OA にする／逆も可。両方 OA でもよい。
- **英語論文は `titleJa`（忠実な和訳タイトル）を付ける**。意味を変えない。和訳主・原題副で表示される。
- **被引用は OpenAlex `cited_by_count` を `citationCount` に**（概数として扱い、信頼できる時のみ。不明なら省略）。
- 取得→ **levels 3段階を出典に忠実に生成**（OAは全文、有料は抄録ベースと明記）。`terms`/`trivia`/`equations`/`figures` を埋める（§0厳守。OA論文は実図＝出典明記、または正しい概念図を1枚入れて深掘り）。
- 重複は `id`/DOI で判定し新規のみ `papers.json` に追記、`dateAdded`＋`issue` 付与・`meta.currentIssue` 更新 → `git push` で公開更新。今日の号に載せないストックは `issue` を付けない。
- **検索ワードの調整＝`topics.json` を更新**（アプリUIではなく**チャットで**。私が幅広くなるよう提案・調整、またはユーザー指示で増減）。配信数は2件/トピック固定。

## 8. マイルストーン（新プロジェクトでの順序）
1. **v0**：Vite+React+TS+Tailwind+shadcn 初期化。`papers.json` 読み込み、ホームと詳細を素表示。
2. **v1**：A案デザイン再現（モック忠実）。render-check でモバイル/PC調整。
3. **v2**：説明レベルslider・用語ポップ・用語集・KaTeX・アーカイブ検索/filter・localStorage。
4. **v3**：仕上げ（今日の配信ハイライト、空状態、軽い演出）。`/code-review`。
5. **v4**：GitHub Pages 公開。
6. **v5**：`/collect` を整備（topics.json で検索→papers.json 追記）。定期運用へ。

## 9. 始め方
1. 新フォルダ作成（軸受系＝`paper-radar-bearing` / ターボ系＝`paper-radar-turbo`）。git init。
2. この `SPEC.md` を `CLAUDE.md` として置き、対応する `topics.json` と `data/papers.json`（種）を入れる。
3. そのフォルダで Claude Code を起動（新セッション＝shadcn MCP 有効）。
4. プロンプト（`PROMPTS.md` 参照）を投げて v0→v1 から着手。
