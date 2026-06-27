---
name: collect
description: 論文レーダー(turbo)の配信を1号ぶん収集・作り込みして公開する。arXiv＋OpenAlexで候補取得→流体主役で選定(定番＋最新OA)→出典に忠実に要約/用語/図を作成→§0忠実性チェック→data/papers.jsonに追記→build/render-check→push。「論文を収集」「新しい配信を追加」「/collect」で使う。
---

# /collect — 論文レーダー(turbo) 配信の収集・作り込み

このプロジェクトの定点運用。**1回で1配信号**（perTopic=2・**必ず1件はOA全文**）を、CLAUDE.md（特に §0「嘘をつかない」・§7）に従って収集・作り込み・公開する。

## 大原則（CLAUDE.md §0 を厳守）
- 要約・図・数値は**出典に忠実**。捏造しない。原文に無いことを足さない。
- 全文が取れない論文は**「抄録ベース」と明記**。被引用は**概数**、不明/出典間で乖離するなら**出さない**。
- 図は**実図（CC-BY/CC0/PDのみ・出典明記）か、正しい概念図（『模式・実データではない』明記）**だけ。bronze/arXiv標準ライセンスの図は転載しない。無関係なストック写真も使わない。
- **収集の主役は流体・流れ現象**（失速/サージ/二次流れ/チップ漏れ/損失/衝撃波）。ML・数値手法は脇役（主役にしない）。

## 配信品質ルーブリック（毎号の最低ライン）
**毎号がこの深さ・忠実さを満たすことを目標**にする。`node scripts/validate-papers.mjs` で機械チェックでき、**ERROR が出る号は公開しない**（prebuild/CI で build が失敗＝自動配信されない）。WARN は助言（逐語不可のスキャン等、正当な例外はブロックしない）。

- **各論文（必須＝ERROR）**：`levels` 3段階×5項目（tldr/problem/method/result/limit）すべて非空／`topic`・`stream`(classic|latest)・`oa`・`title`・`authors`・`year` が妥当。
- **各論文（目標＝WARN）**：`terms`≥6／`figures`≥1（概念図でも可）／`related`≥1／`deepDive`≥1／`trivia`≥1／`numbers`≥1。
- **OA全文（目標）**：`quotes`≥2（逐語が取れるとき）＋`sections`（章立て・body はレベル別）＋実図に `note`。**逐語を保証できない出典では引用しない**（WARN は許容）。
- **抄録ベース**：`oa:false` を明記し、せめて概念図1枚で理解を助ける。
- **実図 `type:"original"`（必須＝ERROR）**：CC-BY/CC0/PD のみ。`credit`＋`creditUrl` が無ければ ERROR（ライセンス違反を機械的に止める）。
- **概念図 `type:"concept"`（目標）**：キャプション/note に「模式・実データではない」を明記。
- **被引用**：`citationCount` は信頼できる単一の概数のみ（正の数）。不明・乖離なら省略。
- **配信構成（必須＝ERROR）**：今号（`issue==meta.currentIssue`）は各トピック **2件**（classic＋latest）・**必ず1件はOA全文**。

## 手順
1. **候補取得**：`node scripts/collect.mjs --topic turbo`
   - arXiv（最新・全文OA）＋ OpenAlex（被引用上位・OA判定・cited_by_count）。`scripts/.collect-candidates.json` に出力。
   - 必要なら CC-BY 実図用に、OpenAlex を `filter=best_oa_location.license:cc-by` で別途検索（実図を載せたい号のとき）。
2. **選定**（流体主役）：定番(classic)＋最新(latest)の2件。**最低1件はOA全文**。実図を出したい号は **CC-BY/CC0/PD** を優先。ML/手法論文は主役にしない。
3. **チェックポイント**：候補と推し1本を**ユーザーに提示して確認**（§0 要約前の確認）。AskUserQuestion で。
4. **全文取得**：OAは本文を取得（arXiv HTML/PDF、CC-BYは出版社PDF）。取得可否は Unpaywall / Semantic Scholar の openAccessPdf で確認。gated(403/404)なら無理に取らず**抄録ベース**に切替。
   - 実図：`PyMuPDF`(fitz)/`pdftotext` でPDFから図を抽出・`PIL`で最適化し `public/img/` に保存。**著者自身のCC/PD図のみ**（キャプションに第三者転載の記載がない図）。`figures[].credit/creditUrl` を必ず付与。
5. **作り込み**（出典に忠実に）：
   - `titleJa`（和訳主・原題副）、`levels`3段階（OA=全文/有料=抄録ベース明記）、`terms`、`trivia`/`deepDive`（`text`/`body` は **説明レベルで文章を変える**＝`{easy,std,expert}` オブジェクト推奨。全レベル共通なら文字列でも可）、`numbers`、`equations`（**KaTeX・実在の式のみ。式番号を詐称しない**。無ければ空）、`figures`（概念図は『模式』明記／実図はcredit付き。実図には `note`＝図解説を任意で）、`citationCount`（信頼できる単一値のみ、乖離時は省略）、`related`、`doi/url/pdfUrl`、`dateAdded`、`issue=今日`。
   - **OA（全文）号の読み応え（OAのみ・全文が取れたら積極的に）**：
     - `quotes`（原文の直接引用）＝**全文から逐語で**引く（`text`＝原文／英語論文は原語のまま改変しない、`textJa`＝忠実和訳、`where`＝出典箇所）。角括弧の文献番号など省略時はその旨を `where` に記す。**スキャンOCR等で逐語を保証できない出典では引用しない**（崩れた語を quote にしない）。
     - `sections`（章立てウォークスルー）＝論文の節構成を**節ごとに1段落で忠実要約**。`body` は `{easy,std,expert}` で**説明レベル別に書き分け**（easy=平易/短め、expert=手法・数値の具体を明記。出典に無い具体は足さない）。
     - `figures[].note`＝実図を複数載せる号で「何を示す図か」の出典に忠実な補足。実図は **CC-BY/CC0/PD のみ・credit/creditUrl 必須**（§7）。
6. **§0 忠実性チェック**：各論文の要約ドラフトを、サブエージェント `faithfulness-check`（下記）に渡し、出典で裏取りできない記述・数値・固有名を検出→**修正**。複数候補があれば並列で吟味も可。
7. **追記・号の更新**：`data/papers.json` に重複(`id`/DOI)を避けて追記。`meta.currentIssue=今日`、今日の号に載せる論文に `issue`、前号をストックに回すものは `issue` を削除。
8. **用語マップ更新（軽い・任意）**：用語集ページ(#/glossary)は `terms[]` から**自動集約**、関係グラフの**共起エッジも自動**。手作業は新語の**分類1〜2件**と**意味エッジ数本**を `src/lib/glossary-graph.ts` に足すだけ（未分類語は「その他」扱いで自動共起のみで繋がる＝足さなくても壊れない）。
9. **品質チェック→公開**：`node scripts/validate-papers.mjs` で**配信品質ルーブリック**を確認（**ERROR ゼロが公開の必須条件**。WARN は深さの助言＝可能なら埋める）→ `npm run build`（prebuild で検証も自動実行）→ render-check（モバイル/PC両幅を目視・式や図の表示確認）→ commit → `git push`（GitHub Actions が自動デプロイ）。ライブURL `https://yukikanedomi.github.io/paper-radar-turbo/` を確認。

## 自動モード（毎日1配信・人の確認なし）
スケジュール実行（タスクスケジューラ）から呼ばれる無人運用。**§0を機械的に守るのが最優先**。手順3の人間チェックポイントは省略し、代わりに忠実性ゲートを必ず通す。

**ハイブリッド構成（利用枠に優しく品質維持）**：本体オーケストレーション＝**Sonnet**（`daily-collect.sh` の `--model sonnet`）、§0 の最終チェック `faithfulness-check` だけ **Opus**（エージェント frontmatter `model: opus`）。要約は Sonnet で十分忠実に書け、Opus ゲートで裏取りを担保する。

1. 候補取得（上記1）→ **自動選定**：流体主役・定番＋最新・**必ず1件OA全文**。実図を出すなら CC-BY/CC0/PD を優先。ML/手法は主役にしない。
2. 全文取得（上記4）。取れなければ**抄録ベースと明記**（嘘で埋めない）。
3. 出典に忠実に作り込み（上記5）。
4. **忠実性ゲート（必須）**：各論文の要約を `faithfulness-check` サブエージェントに渡す。
   - `verdict: ok` → 公開可。
   - `needs_fix` → 指摘箇所を**1回だけ**修正し再チェック。
   - 再チェックでも `needs_fix`、または high severity の指摘が残る → **その論文は公開しない（保留）**。
5. **公開判定**：
   - 検証を通った論文だけを `data/papers.json` に追記し `issue=今日`・`meta.currentIssue` 更新。
   - **OA全文1件を満たせない／2件とも保留**になった日は、**無理に公開しない**（その日はスキップ＝前号のまま）。歪な配信より「出さない」を選ぶ。
6. **配信品質ルーブリック検証**：`node scripts/validate-papers.mjs`。**ERROR が出たら公開しない**（不足を埋めるか、その論文を保留）。WARN は助言（逐語不可など正当な例外は許容）。→ build（prebuild で検証も走り ERROR なら失敗＝公開されない）→ commit → push。**検証を通った内容のみ**。
7. 実行ログ（何を公開・何を保留・スキップ理由）を残す。

> 原則：**自信が持てないものは公開しない**。最悪その日は配信なしでよい。これは妻＋専門家が使うアプリの信頼性の核（§0）。

## サブエージェント活用
- **候補吟味の並列化**：1論文1エージェントで「流体主役か／ライセンス（実図可否）／OA全文か／関連性」を構造化判定。
- **`faithfulness-check`**：要約と出典の突き合わせ（§0の機械的担保）。

## 配置・参照
- 検索ワードの調整は `topics.json`（アプリUIではなくチャットで）。流体現象側に寄せる。
- データモデル・画面・運用の詳細は repo の `CLAUDE.md` を参照。
