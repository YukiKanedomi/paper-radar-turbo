import { readFileSync, writeFileSync } from 'fs';

const db = JSON.parse(readFileSync('data/papers.json', 'utf-8'));
const TODAY = '2026-06-30';
const PREV = '2026-06-29';

// 1. 前号 issue を外す
db.papers.forEach(p => {
  if (p.issue === PREV) delete p.issue;
});

// SVG データ
const svgL8 = `<svg viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg"><rect width="600" height="200" fill="#fff"/><text x="300" y="18" font-family="sans-serif" font-size="12" fill="#114a42" text-anchor="middle" font-weight="700">遠心圧縮機の性能マップと安定作動域拡大の模式</text><line x1="80" y1="168" x2="540" y2="168" stroke="#1d2127" stroke-width="1.5"/><line x1="80" y1="168" x2="80" y2="32" stroke="#1d2127" stroke-width="1.5"/><text x="310" y="183" font-family="sans-serif" font-size="10.5" fill="#1d2127" text-anchor="middle">質量流量 →</text><text x="34" y="100" font-family="sans-serif" font-size="10.5" fill="#1d2127" text-anchor="middle" transform="rotate(-90,34,100)">圧力比 →</text><path d="M155 46 C158 65 160 105 162 148 C163 158 164 168 164 168" stroke="#c0392b" stroke-width="2" fill="none" stroke-dasharray="6,3"/><text x="132" y="55" font-family="sans-serif" font-size="9" fill="#c0392b" text-anchor="middle">サージ線</text><text x="132" y="65" font-family="sans-serif" font-size="9" fill="#c0392b" text-anchor="middle">（処理なし）</text><path d="M115 48 C120 66 123 106 126 148 C127 158 128 168 128 168" stroke="#1a5e54" stroke-width="2.5" fill="none"/><text x="88" y="55" font-family="sans-serif" font-size="9" fill="#1a5e54" text-anchor="middle">ケーシング</text><text x="88" y="65" font-family="sans-serif" font-size="9" fill="#1a5e54" text-anchor="middle">処理後</text><path d="M490 50 C488 90 486 130 486 168" stroke="#6c7078" stroke-width="1.5" fill="none" stroke-dasharray="4,2"/><text x="498" y="68" font-family="sans-serif" font-size="9" fill="#6c7078">チョーク</text><path d="M130 48 C240 42 380 78 486 168" stroke="#1d2127" stroke-width="1.2" fill="none" stroke-dasharray="3,2" opacity=".35"/><path d="M125 88 C230 82 370 108 486 168" stroke="#1d2127" stroke-width="1.2" fill="none" stroke-dasharray="3,2" opacity=".35"/><text x="340" y="76" font-family="sans-serif" font-size="8.5" fill="#6c7078">回転速度線</text><path d="M115 48 C120 66 123 106 126 148 C127 158 128 168 128 168 L155 168 C155 168 162 148 162 148 C160 105 158 65 155 46 Z" fill="#1a5e54" opacity=".08"/><path d="M152 88 L120 88" stroke="#1a5e54" stroke-width="1.2" stroke-dasharray="3,2" marker-end="url(#arl)" marker-start="url(#arr)"/><text x="136" y="82" font-family="sans-serif" font-size="8.5" fill="#1a5e54" text-anchor="middle">余裕拡大</text><defs><marker id="arl" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#1a5e54"/></marker><marker id="arr" markerWidth="7" markerHeight="7" refX="1" refY="3" orient="auto"><path d="M6,0 L0,3 L6,6 z" fill="#c0392b"/></marker></defs><text x="300" y="197" font-family="sans-serif" font-size="9.5" fill="#6c7078" text-anchor="middle">（模式・実データではない）</text></svg>`;

const svgC13 = `<svg viewBox="0 0 600 205" xmlns="http://www.w3.org/2000/svg"><rect width="600" height="205" fill="#fff"/><text x="300" y="18" font-family="sans-serif" font-size="12" fill="#114a42" text-anchor="middle" font-weight="700">翼端漏れ渦崩壊のメカニズム（模式・実データではない）</text><rect x="40" y="28" width="520" height="16" fill="#6c7078" rx="2"/><text x="570" y="40" font-family="sans-serif" font-size="9.5" fill="#6c7078" text-anchor="end">ケーシング壁</text><path d="M100 44 L100 178" stroke="#1d2127" stroke-width="7" stroke-linecap="round"/><path d="M360 44 L360 178" stroke="#1d2127" stroke-width="7" stroke-linecap="round"/><text x="90" y="118" font-family="sans-serif" font-size="9.5" fill="#1d2127" text-anchor="end">翼</text><text x="370" y="118" font-family="sans-serif" font-size="9.5" fill="#1d2127">翼</text><path d="M135 38 C145 44 155 46 165 48" stroke="#1a5e54" stroke-width="1.5" stroke-dasharray="4,2" fill="none" marker-end="url(#ard)"/><path d="M185 36 C195 42 205 44 215 46" stroke="#1a5e54" stroke-width="1.5" stroke-dasharray="4,2" fill="none" marker-end="url(#ard)"/><text x="175" y="30" font-family="sans-serif" font-size="9" fill="#1a5e54" text-anchor="middle" font-weight="700">翼端漏れ流れ</text><path d="M185 68 A16 10 0 1 1 213 68" stroke="#1a5e54" stroke-width="1.5" fill="none" marker-end="url(#ard)"/><text x="196" y="66" font-family="sans-serif" font-size="8.5" fill="#1a5e54" text-anchor="middle">渦</text><circle cx="248" cy="80" r="5" fill="#1a5e54"/><text x="248" y="96" font-family="sans-serif" font-size="8.5" fill="#1a5e54" text-anchor="middle">よどみ点</text><ellipse cx="300" cy="80" rx="42" ry="24" fill="#1a5e54" opacity=".07"/><ellipse cx="300" cy="80" rx="42" ry="24" fill="none" stroke="#1a5e54" stroke-width="1.8" stroke-dasharray="5,3"/><text x="300" y="76" font-family="sans-serif" font-size="9" fill="#114a42" text-anchor="middle" font-weight="700">崩壊バブル</text><text x="300" y="88" font-family="sans-serif" font-size="9" fill="#114a42" text-anchor="middle">（逆流域）</text><path d="M245 74 C225 70 195 68 165 69" stroke="#888" stroke-width="1.5" stroke-dasharray="5,3" fill="none" marker-end="url(#arl)"/><text x="200" y="60" font-family="sans-serif" font-size="8.5" fill="#888" text-anchor="middle">大ブロッケージ</text><text x="200" y="70" font-family="sans-serif" font-size="8.5" fill="#888" text-anchor="middle">（前縁上流まで）</text><path d="M340 83 Q355 118 345 155" stroke="#c0392b" stroke-width="1.5" stroke-dasharray="4,2" fill="none" marker-end="url(#arr)"/><text x="380" y="112" font-family="sans-serif" font-size="8.5" fill="#c0392b">吸い込み面</text><text x="380" y="123" font-family="sans-serif" font-size="8.5" fill="#c0392b">境界層の3次元剥離</text><text x="380" y="134" font-family="sans-serif" font-size="8.5" fill="#c0392b">→全圧上昇急落</text><rect x="40" y="178" width="520" height="12" fill="#1d2127" opacity=".15" rx="2"/><text x="570" y="187" font-family="sans-serif" font-size="9.5" fill="#aaa" text-anchor="end">ハブ側</text><defs><marker id="ard" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#1a5e54"/></marker><marker id="arl" markerWidth="7" markerHeight="7" refX="1" refY="3" orient="auto"><path d="M7,0 L1,3 L7,6 z" fill="#888"/></marker><marker id="arr" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#c0392b"/></marker></defs></svg>`;

// 2. 新論文 L8（遠心圧縮機舶用レビュー）
const paperL8 = {
  id: "doi:10.3390/en19040991",
  topic: "turbo",
  stream: "latest",
  source: "openalex",
  oa: true,
  title: "Assessment of the State and Development Trends of Centrifugal Compressors for Marine Power Plants",
  titleJa: "舶用パワープラント向け遠心圧縮機の現状と開発動向の評価",
  authors: "Olga Afanaseva, Dmitry Pervukhin, Mikhail Afanasyev, Aleksandr Khatrusov",
  year: 2026,
  venue: "MDPI Energies",
  doi: "10.3390/en19040991",
  url: "https://doi.org/10.3390/en19040991",
  pdfUrl: "https://www.mdpi.com/1996-1073/19/4/991/pdf",
  citationNote: "最新（MDPI Energies 2026・CC BY）",
  issue: TODAY,
  levels: {
    easy: {
      tldr: "船舶のエンジン過給やLNG船での液化ガス圧縮に使われる遠心圧縮機について、2015〜2025年の10年間の研究成果（178件の論文）をまとめた総説（レビュー）。圧力比・効率・サージ余裕といった流れの指標や、ケーシング処理などの安定域拡大技術を整理した（CC BY・MDPI Energies 2026）。",
      problem: "遠心圧縮機の研究は空力・機械設計・デジタル化と専門が分かれていて、船舶向けの横断的な設計判断が難しかった。",
      method: "ScopusとWeb of Scienceから2015〜2025年の査読論文を体系的に収集・整理し、応用種別（ターボチャージャー・LNG圧縮・補助設備）ごとに空力・機械・デジタルの成果を統合した（178件）。",
      result: "文献報告によると、単段圧力比は約5.4〜5.7、多段では10超の実績がある。先進ディフューザやケーシング・端壁処理により失速余裕が最大約40〜44%改善でき、自己再循環ケーシング処理では作動域が最大25%拡大できることが報告されている（いずれも文献集計値）。",
      limit: "これはレビュー論文で、本論文自体の実験・計算結果はない。紹介されている数値は文献集計値（概数）。多くは非海運用途での知見で、海運固有の検証データと標準化が今後の課題とされている。"
    },
    std: {
      tldr: "2015〜2025年の査読論文178件に基づき、舶用遠心圧縮機の空力KPI（圧力比・効率・サージ/失速余裕）と機械設計・デジタル化の動向を体系的に整理した構造化レビュー（CC BY・MDPI Energies 2026）。",
      problem: "海運向け遠心圧縮機の研究は空力・機械設計・規格・デジタル化に分散しており、舶用デューティサイクルにおける横断的エンジニアリング判断を困難にしていた。",
      method: "ScopusとWeb of Scienceによる明示的プロトコルでの文献収集（2015〜2025、最終検索2025年12月）。応用クラス別（ターボチャージャー統合段・LNG/BOG圧縮列・補助設備）に空力KPI・機械/寿命要素・デジタル手法の定量的影響を統合（178件）。",
      result: "文献集計から: 単段圧力比 ~5.4〜5.7、多段全体圧力比 >10、段効率83〜85%（最適化で88〜90%）。先進ディフューザ・ケーシング/端壁処理でサージ余裕 ~40〜44%改善。自己再循環ケーシング処理で作動域最大+25%・サージ余裕+5.5〜9.7%・効率ペナルティ<0.4ppが報告されている（文献集計値）。",
      limit: "本論文は構造化ナラティブレビューであり独自の実験・シミュレーションは含まない。数値は文献集計値（概数・範囲）。多くの知見は非舶用産業由来であり、海運固有の検証データと試験標準の整備が残る課題とされている。"
    },
    expert: {
      tldr: "2015〜2025年の査読済み文献178件を対象とした構造化レビュー。舶用遠心圧縮機（ターボチャージャー統合段・LNG/BOG圧縮・補助設備）の空力KPI（圧力比・効率・サージ/失速余裕・作動域）、機械/寿命要素（シール・軸受・ロータダイナミクス）、デジタル手法（制御・診断・デジタルツイン）の定量的動向を体系的に統合した（CC BY・MDPI Energies 2026）。",
      problem: "海運向け遠心圧縮機の研究は分野（空力・機械設計・規格・デジタル化）をまたいで断片化されており、舶用デューティサイクルの横断的エンジニアリング判断を困難にしていた。",
      method: "ScopusとWeb of Scienceによる明示的プロトコルでの構造化文献収集（2015〜2025、最終検索2025年12月）。応用クラス別（ターボチャージャー・LNG圧縮・補助サービス）に空力KPI・機械/寿命要素・デジタル手法の定量的影響を統合（178件）。",
      result: "§4（空力特性）の文献集計: 単段PR ~5.4〜5.7、多段 >10、段効率83〜85%（最適化構成で88〜90%）。ケーシング/端壁処理でサージ余裕 ~40〜44%改善；エンドウォール輪郭で余裕12.8%→20.4%（+0.78pp効率）の事例あり。自己再循環ケーシング処理で作動域+25%・サージ余裕+5.5〜9.7%・効率ペナルティ<0.4pp（以上すべて文献集計値）。§7.1の統一解釈: 最も効果的な手法は設計点の小ペナルティと引き換えにサージ近傍の安定域を広げるものである。",
      limit: "構造化ナラティブレビュー（メタ解析ではない）。数値は概数・範囲として記載された文献集計値。デジタル診断等の数値は非舶用産業事例由来であり、舶用固有の検証データセットと標準化が残る主要課題とされている。"
    }
  },
  quotes: [
    {
      text: "Reported trends include single-stage pressure ratios of ~5.4–5.7, multistage overall pressure ratios exceeding 10, and surge-margin improvements of ~40–44% associated with advanced diffusers as well as casing and endwall treatments.",
      textJa: "報告されるトレンドとして、単段圧力比は約5.4〜5.7、多段での全体圧力比は10超、また先進ディフューザ・ケーシングおよびエンドウォール処理に関連したサージ余裕改善が約40〜44%に上る。",
      where: "Abstract"
    },
    {
      text: "The reviewed literature supports a consistent interpretation: several of the most impactful measures for marine use are those that trade small design-point penalties (or yield near-neutral changes) for a more robust and wider stable operating range—particularly near surge.",
      textJa: "文献調査が一貫して示す解釈として、舶用用途において最も効果の大きい手法の多くは、設計点での小さなペナルティ（あるいはほぼ中立の変化）と引き換えに、サージ近傍を中心としてより堅牢で広い安定作動域を実現するものである。",
      where: "§7.1 Discussion"
    },
    {
      text: "Key gaps remain in marine-specific validation datasets and harmonized testing and data standards.",
      textJa: "海運固有の検証データセットと、テスト・データ標準の整合化に主要なギャップが残る。",
      where: "Abstract"
    }
  ],
  sections: [
    {
      heading: "1. はじめに（Introduction）",
      body: {
        easy: "遠心圧縮機は船舶のエンジン（ターボチャージャー）、LNG船の液化ガス処理、空調など様々な場面で使われている。これらに関する研究が専門分野ごとにバラバラで整理されていないのが問題。この論文はその整理を試みた。",
        std: "舶用遠心圧縮機の適用クラス（ターボチャージャー・LNG/BOG圧縮・補助設備）を定義し、研究の断片化問題を設定。5つのリサーチクエスチョン（RQ1〜RQ5：空力性能/機械設計/デジタル化/海運特有の制約/残るギャップ）を明示して構造化レビューの目的を提示した。",
        expert: "§1は5つのRQを明示。RQ1: 2015〜2025の空力KPI（圧力比・効率・サージ/失速余裕・作動域）のトレンド。RQ2: 機械/寿命要素の動向。RQ3: デジタル手法の定量効果。RQ4: 海運固有の制約（デューティサイクル・規制・運転条件）への対応。RQ5: 残るギャップは何か。"
      }
    },
    {
      heading: "4. 空力特性（Aerodynamic Properties）",
      body: {
        easy: "圧縮機の流れに関する章。どのくらいの圧力を出せるか（圧力比）、どのくらい効率が良いか、どこまで流量を絞っても大丈夫か（サージ余裕）などの指標を整理している。",
        std: "§4.1では翼形状とディフューザの幾何最適化、§4.2では安定作動域の拡大（サージ・脈動対策・設計手法）、§4.3ではCFD・数値最適化を扱う。段効率83〜85%、最適化構成で88〜90%、単段PR ~5.4〜5.7という傾向が整理されている（文献集計値）。",
        expert: "§4.1: ハブ線・シュラウド線曲率、インデューサ・インペラ翼角の最適化とCFDの役割。§4.2: ケーシング処理（自己再循環・ポーテッドシュラウド）・エンドウォール輪郭・IGV/スワール制御によるサージ余裕拡大（自己再循環で+5.5〜9.7%余裕・+25%作動域・<0.4ppペナルティ；エンドウォール輪郭で12.8%→20.4%の事例あり、文献集計値）。§4.3: CFDサロゲート最適化と不確実性定量化の動向。"
      }
    },
    {
      heading: "4.2 安定作動域の拡大（サージ・脈動と設計手法）",
      body: {
        easy: "圧縮機がサージ（大振動）を起こさずに働ける範囲を広げる工夫を整理した節。ケーシングに穴や溝を作ったり（ケーシング処理）、流路の壁の形を変えたり（エンドウォール輪郭）することで、作動域を広げられる。",
        std: "安定作動域拡大の主要手法: ①自己再循環ケーシング処理（サージ余裕+5.5〜9.7%、作動域+25%、効率ペナルティ<0.4pp）、②エンドウォール輪郭（余裕12.8%→20.4%、効率+0.78pp の事例）、③IGV/可変ガイドベーン制御。脈動（低速2ストローク機関での部分サージ）への対応も整理（文献集計値）。",
        expert: "§4.2 の定量文献集計: (i) 自己再循環ケーシング処理（ポーテッドシュラウド）: サージ余裕+5.5〜9.7%、作動域拡大+25%、設計点効率ペナルティ<0.4pp。(ii) 非軸対称エンドウォール輪郭: サージ余裕12.8%→20.4%（+0.78pp効率）の単独事例。(iii) 先進ディフューザ形状最適化。Abstract では広義のケーシング/端壁処理全体で~40〜44%の余裕改善とまとめられている。海運特有として低速2ストローク機関での間欠サージ（脈動）対策も記述（すべて文献集計値）。"
      }
    },
    {
      heading: "7. 考察（Discussion）",
      body: {
        easy: "10年分の研究をまとめて、こういうことが見えてきた、という章。最も効果的な改善策の多くが『設計点の性能はほぼそのまま（または小さなペナルティ）で、サージに近い領域の余裕を広げる』ものだという共通の解釈を提示している。",
        std: "§7.1は、文献の統一解釈として「最も効果的な手法は、設計点のペナルティが小さく（またはほぼ中立）、サージ近傍の安定域を広げるもの」という知見を提示。これは海運の変動デューティサイクル（低負荷〜高負荷の頻繁な変化）に特に有効。残るギャップ（§7.6）: 海運固有の検証データ・試験標準の未整備。",
        expert: "§7.1〜7.6では各分野（空力・機械・デジタル）の横断的知見を統合。§7.1の統一解釈: 設計点ペナルティが小さく安定域を広げる手法の優越性。§7.5: 非舶用産業事例の転用可能性（conditionally transferable）。§7.6: 残るギャップ=海運固有の検証データセット・統一テスト標準・部分サージ対策の不足。"
      }
    },
    {
      heading: "8. 結論（Conclusions）",
      body: {
        easy: "まとめ：遠心圧縮機の技術は圧力比・効率・安定域とも着実に進化している。でも海運向けの実証データはまだ少なく、陸上や航空の知見を海運に当てはめるには慎重さが要る。",
        std: "空力・機械・デジタル各分野の主要知見を§8でまとめ。空力では単段PR~5.4〜5.7・段効率83〜90%・サージ余裕改善~40〜44%（文献集計）。機械では先進シール・フォイル軸受等。デジタルでは診断精度95〜99.98%（非舶用産業・研究ベンチ）。",
        expert: "§8はドメイン別の定量サマリ。空力: 既記。シール: 一部文献でHALOシール類似技術が漏れ削減を報告（PR>3）。軸受: フォイル軸受が高速域（100,000 rpm超）で安定を示す事例あり。デジタル: 診断精度95〜99.98%（研究ベンチ・非舶用）。著者は各数値に文献IDを付記しており、「not marine-validated」文脈を保持することが§0上必須（文献集計値）。"
      }
    }
  ],
  equations: [],
  figures: [
    {
      type: "concept",
      src: svgL8,
      caption: "概念図：遠心圧縮機の圧力比－質量流量マップ。ケーシング処理により、サージ線が低流量側に拡張し、安定作動域が広がることを模式的に示す（模式・実データではない）"
    }
  ],
  numbers: [
    { v: "単段PR ~5.4〜5.7", l: "舶用遠心圧縮機（文献集計）" },
    { v: "サージ余裕 +40〜44%", l: "先進ディフューザ・ケーシング処理で（文献集計）" },
    { v: "作動域 +25%まで", l: "自己再循環ケーシング処理で（文献集計）" },
    { v: "178件", l: "対象文献数（2015〜2025）" }
  ],
  terms: [
    { term: "遠心圧縮機", def: "羽根車（インペラ）で流体を半径方向に加速して圧力を高める圧縮機。ガスタービン過給やLNG処理に広く使われる。" },
    { term: "サージ余裕 (surge margin)", def: "圧縮機が安定に運転できる最低流量と、サージ（大振動・逆流）が起きる限界の間の余裕の割合。大きいほど安全に運転できる幅が広い。" },
    { term: "ケーシングトリートメント", def: "圧縮機外壁（ケーシング）に施す穴・溝・再循環路などの加工。翼先端付近の流れを操作してサージ余裕を高める。" },
    { term: "自己再循環", def: "ケーシングにポートを設け、高圧側の流れの一部を低圧側（翼入口付近）に戻す手法。流量を絞ってもサージしにくくなる。" },
    { term: "エンドウォール輪郭", def: "流路の端壁に非軸対称な形状をつける手法。二次流れや損失を低減し、サージ余裕を改善する。" },
    { term: "ターボチャージャー", def: "エンジンの排気ガスのエネルギーで圧縮機を駆動し、吸気を過給する装置。船舶のディーゼルエンジンに必須の補機。" },
    { term: "BOG（ボイルオフガス）", def: "LNG（液化天然ガス）タンクで自然蒸発する気化ガス。LNG船では専用の遠心圧縮機でこれを回収・処理する。" }
  ],
  trivia: [
    {
      label: "178件の文献から見えること",
      text: "本レビューは2015〜2025年の査読論文178件を整理した。最も効果的な改善策の多くは、設計点の性能をほぼ変えずにサージに近い危険域での余裕を広げるものだ——という一貫した解釈が浮かび上がっている（§7.1）。"
    },
    {
      label: "海運ならではの厳しさ",
      text: "船舶のエンジンは港での低回転から航行中の高負荷まで変動が大きく、陸上設備より過酷。LNG船のボイルオフガス圧縮は相変化（液化ガス→蒸気）を含む複雑な運転条件で、一般の産業データがそのまま使えないことが残る課題とされている。"
    }
  ],
  deepDive: [
    {
      title: "さらに深掘り：安定作動域の拡大——サージに近い領域での攻防",
      body: {
        easy: "遠心圧縮機の設計で大事なのは、効率が最高の「設計点」だけでなく、その周辺の「安定に動ける範囲」の広さ。本レビューが示す重要な洞察は、最も効果的な手法の多くが「設計点の性能はほぼそのまま（または小さなペナルティ）で、サージに近い領域の余裕を広げる」ものだということ。自己再循環ケーシング処理は、作動域を最大25%拡大しながら効率のペナルティが0.4ポイント未満という優れた特性が複数の研究で報告されている（文献集計値）。",
        std: "§4.2とAbstractを統合すると: 安定作動域拡大の主要手法は①受動的形状最適化（エンドウォール輪郭・先進ディフューザ）②受動的流体再循環（自己再循環ケーシング処理）③能動的制御（IGV・スワール制御）の3類型に整理できる。§7.1の統一解釈は「設計点ペナルティ小・サージ近傍安定域拡大型」の優越性を確認。これは海運特有の高頻度な負荷変動への適合性を高める観点からも重要（文献集計値）。",
        expert: "§4.2の定量文献集計: (i) 自己再循環ケーシング処理: サージ余裕+5.5〜9.7%・作動域+25%・効率ペナルティ<0.4pp。(ii) 非軸対称エンドウォール輪郭: サージ余裕12.8%→20.4%（+0.78pp効率・特定事例）。これらを含む広義のケーシング/端壁処理で~40〜44%改善（Abstract）。§7.1逐語: 「several of the most impactful measures for marine use are those that trade small design-point penalties … for a more robust and wider stable operating range—particularly near surge.」海運デューティサイクルでは、設計点効率よりも安定域の幅が律速条件になりやすいことをこの統一解釈は示唆する（文献集計値）。"
      }
    }
  ],
  related: [
    {
      tag: "翼端漏れ渦崩壊の古典",
      title: "The Role of Tip Leakage Vortex Breakdown in Compressor Rotor Aerodynamics (Furukawa et al., 1999)",
      url: "https://doi.org/10.1115/1.2841339"
    },
    {
      tag: "ターボ機械損失の総説",
      title: "Loss Mechanisms in Turbomachines (Denton, 1993)",
      url: "https://doi.org/10.1115/1.2929299"
    }
  ],
  dateAdded: TODAY,
  status: "unread"
};

// 3. 新論文 C13（翼端漏れ渦崩壊・古典）
const paperC13 = {
  id: "doi:10.1115/1.2841339",
  topic: "turbo",
  stream: "classic",
  source: "openalex",
  oa: false,
  title: "The Role of Tip Leakage Vortex Breakdown in Compressor Rotor Aerodynamics",
  titleJa: "圧縮機ロータ空力における翼端漏れ渦崩壊の役割",
  authors: "Manabu Furukawa, M. Inoue, Keitarou Saiki, K. Yamada",
  year: 1999,
  venue: "ASME Journal of Turbomachinery",
  doi: "10.1115/1.2841339",
  url: "https://doi.org/10.1115/1.2841339",
  pdfUrl: "",
  citationNote: "定番（翼端漏れ渦崩壊の古典・高被引用）",
  citationCount: 256,
  issue: TODAY,
  levels: {
    easy: {
      tldr: "圧縮機の翼先端のすき間から漏れ出した流れが作る渦が、失速に近い状態で「崩れる」（渦崩壊）と、前縁の上流まで巨大なふさぎ効果が生まれ、翼面の境界層がはがれて圧力上昇が急落する——という連鎖を数値計算と可視化で示した古典（抄録ベース）。",
      problem: "翼先端のすき間を抜ける漏れ流れが作る渦が、失速に近い流量でどのように変化し、なぜ圧縮機の性能を急激に落とすのかが分かっていなかった。",
      method: "適度な翼負荷を持つ低速軸流圧縮機ロータで、Navier-Stokes方程式の数値計算（CFD）と渦を見つける可視化技術を組み合わせて調べた。",
      result: "流量を下げると渦によどみ点と泡状の逆流域（バブル）が現れて崩壊する。崩壊すると渦が膨張して前縁の上流まで流れをふさぎ（ブロッケージ）、吸い込み面の境界層が3次元的にはがれて圧力上昇が急落する（抄録ベース）。",
      limit: "低速で適度な翼負荷の単一ロータでの研究。高速・高負荷条件への拡張はさらなる検証を要する（抄録ベース）。"
    },
    std: {
      tldr: "低速軸流圧縮機ロータの翼端漏れ渦が失速近傍で崩壊（vortex breakdown）する過程を Navier-Stokes シミュレーションと可視化で解明。崩壊が近失速での性能急低下を引き起こす主要機構であることを示した1999年の古典（抄録ベース）。",
      problem: "翼端漏れ渦が失速に近い流量で渦崩壊を経て圧縮機性能に与える機構的影響が不明確だった。",
      method: "適度翼負荷を持つ低速軸流圧縮機ロータで Navier-Stokes 数値シミュレーションを実施し、可視化技術で渦崩壊を同定した。",
      result: "崩壊はピーク圧力上昇条件より低流量でロータ内部に発生。よどみ点と気泡状再循環域で特徴づけられ、渦の軸方向渦度が消滅して渦が大膨張し、前縁上流に極めて大きなブロッケージをもたらす。流量低下とともに崩壊域が軸方向・スパン方向・ピッチ方向に急速拡大し、吸い込み面の3次元境界層剥離を経て全圧上昇が急落する（抄録ベース）。",
      limit: "単一の低速・適度負荷ロータに限定。他の速度域・負荷条件への定量一般化には追加検証が要る（抄録ベース）。"
    },
    expert: {
      tldr: "低速軸流圧縮機ロータの翼端漏れ渦崩壊（vortex breakdown）を Navier-Stokes シミュレーションと可視化で解明。崩壊はよどみ点と気泡状再循環域で特徴づけられ、軸方向渦度の消滅と渦の大膨張により前縁上流まで極めて大きなブロッケージをもたらす。失速近傍での崩壊域の三方向急速拡大と吸い込み面3次元境界層剥離が全圧上昇の急落を引き起こすことを示した（抄録ベース）。",
      problem: "翼端漏れ渦の崩壊がロータ近失速性能特性に果たす機構的役割が不明確だった。",
      method: "適度翼負荷を持つ低速軸流圧縮機ロータで Navier-Stokes 流れ場計算を実施し、可視化技術で崩壊を同定・解析した。",
      result: "崩壊はピーク圧力上昇条件より低流量でロータ内部に発生し、よどみ点・気泡状再循環域で特徴づけられる。崩壊により翼端漏れ渦の軸方向渦度が消滅して渦が大膨張し、前縁上流に及ぶ極めて大きなブロッケージ効果を生じさせる。ロータ下流の漏れ流れ場は崩壊バブルの収縮による外向き半径方向流れに支配される。流量低下とともに崩壊域が軸・スパン・ピッチ三方向に急速拡大し、吸い込み面境界層の3次元剥離を経て全圧上昇が急落する（抄録ベース）。",
      limit: "単一の低速・適度負荷ロータに基づく知見。高速・高負荷ロータや他形状への外挿には追加的な研究が必要（抄録ベース）。"
    }
  },
  equations: [],
  figures: [
    {
      type: "concept",
      src: svgC13,
      caption: "概念図：軸流圧縮機ロータの翼端部（スパン方向断面）。翼端すき間からの漏れ流れが渦を作り、失速近傍でよどみ点・崩壊バブルが現れる。崩壊により大きなブロッケージが前縁上流まで及び、吸い込み面の3次元境界層剥離を経て全圧上昇が急落する（模式・実データではない）"
    }
  ],
  numbers: [
    { v: "3方向に急拡大", l: "流量低下で崩壊域が急成長（軸・スパン・ピッチ方向）" },
    { v: "前縁上流まで", l: "渦崩壊のブロッケージ効果の影響範囲" },
    { v: "3次元境界層剥離", l: "吸い込み面で生じ、全圧上昇急落の引き金になる" }
  ],
  terms: [
    { term: "翼端漏れ渦", def: "動翼先端のすき間を高圧側から低圧側へ漏れる流れが作る渦。損失と失速に深く関わる。" },
    { term: "渦崩壊 (vortex breakdown)", def: "強い軸方向渦が急激に変形し、よどみ点と泡状の逆流域（バブル）が現れる現象。翼端漏れ渦が失速近傍でこれを起こす。" },
    { term: "よどみ点 (stagnation point)", def: "流速がゼロになる点。渦崩壊の始まりを示す特徴的なサイン。" },
    { term: "ブロッケージ (blockage)", def: "渦の膨張などが流路の有効断面積を実質的に「ふさぐ」効果。圧縮機の性能に直結する。" },
    { term: "軸方向渦度 (streamwise vorticity)", def: "流れの主流方向に沿った回転成分。渦の強さを表す量。崩壊により消滅する。" },
    { term: "3次元境界層剥離", def: "翼の吸い込み面（負圧面）で流れが三次元的に翼面からはがれる現象。失速・損失の主因。" },
    { term: "Navier-Stokes シミュレーション (CFD)", def: "流れの支配方程式（Navier-Stokes方程式）を数値的に解いて流れ場を予測する手法。" }
  ],
  trivia: [
    {
      label: "気泡状バブルという特徴",
      text: "翼端漏れ渦の崩壊は、渦の軸上に流速ゼロの「よどみ点」が現れ、その後方に気泡のような逆流域（バブル）が生じることで特徴づけられる。流体力学の渦崩壊理論（vortex breakdown）における「バブル型」に対応する（抄録ベース）。"
    },
    {
      label: "なぜ失速直前が危険か",
      text: "崩壊域は流量を下げるほど軸・スパン・ピッチの三方向に急速に広がり、損失が急増する。最終的に吸い込み面の境界層が3次元的にはがれ、全圧上昇が急落する——失速の一つの入口だとこの研究は示す（抄録ベース）。"
    }
  ],
  deepDive: [
    {
      title: "さらに深掘り：翼端漏れ渦崩壊の流れの連鎖",
      body: {
        easy: "翼先端から漏れる流れは渦を作る。その渦は流量が下がると、まず「よどみ点（速度ゼロの点）」が現れて崩れ始め、泡のような逆流域（バブル）が生じる。バブルが生まれると渦は急に膨らんで前縁よりも上流まで流れをふさぐ（ブロッケージ）。さらに流量を下げると崩壊域は三方向に急速に広がり、翼の吸い込み面の境界層を三次元的にはがして全圧上昇を急落させる（抄録ベース）。",
        std: "渦崩壊の連鎖（抄録から）: (1) よどみ点の形成 → (2) バブル状再循環域の出現 → (3) 渦の軸方向渦度消滅・大膨張 → (4) 前縁上流に及ぶ著しいブロッケージ → (5) ロータ下流は崩壊バブルの収縮による外向き半径方向流支配 → (6) 崩壊域の3次元急速拡大 → (7) 吸い込み面3次元境界層剥離 → (8) 全圧上昇急落（抄録ベース）。",
        expert: "Navier-Stokes シミュレーションが示す崩壊の物理連鎖（抄録から）: よどみ点出現 → バブル状再循環域形成（vortex breakdown bubble type）→ streamwise vorticity 消滅・渦の大膨張 → 前縁上流に極めて大きなブロッケージ → ロータ下流の漏れ流れ場はバブル収縮による外向き半径方向流支配 → 流量低下で崩壊域が軸・スパン・ピッチ三方向に急速成長 → 損失・ブロッケージ急増 → 吸い込み面境界層3次元剥離 → 全圧上昇急落（抄録ベース）。"
      }
    }
  ],
  related: [
    {
      tag: "損失機構の総説",
      title: "Loss Mechanisms in Turbomachines (Denton, 1993)",
      url: "https://doi.org/10.1115/1.2929299"
    },
    {
      tag: "遠心圧縮機サーベイ（今号Latest）",
      title: "Assessment of State and Development Trends of Centrifugal Compressors for Marine Power Plants (Afanaseva et al., 2026)",
      url: "https://doi.org/10.3390/en19040991"
    }
  ],
  dateAdded: TODAY,
  status: "unread"
};

// 4. 追記
db.papers.push(paperL8);
db.papers.push(paperC13);

// 5. メタ更新
db.meta.currentIssue = TODAY;
db.meta.lastUpdated = TODAY;

// 6. 書き込み
writeFileSync('data/papers.json', JSON.stringify(db, null, 2), 'utf-8');
console.log('papers.json 更新完了');
console.log('合計論文数:', db.papers.length);
console.log('currentIssue:', db.meta.currentIssue);
const todayPapers = db.papers.filter(p => p.issue === TODAY);
console.log('今号の論文:', todayPapers.map(p => `${p.id} [${p.stream}, oa=${p.oa}]`));
const stockPapers = db.papers.filter(p => !p.issue);
console.log('ストック論文数:', stockPapers.length);
