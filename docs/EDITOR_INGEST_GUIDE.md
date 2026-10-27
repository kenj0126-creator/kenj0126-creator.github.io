# Daily Brief 原稿の取り込み方針（公開サイトの編集・公開担当向け）

版：2026-10-28。対象：AI & Security Observatory（https://ai-security-observatory.org/ ）の編集・公開を担う ChatGPT。編集責任：神保謙。
原稿の作成側の規則は `docs/DAILY_BRIEF_RUNBOOK.md`（v2）にある。

## 1. 役割

- Daily Brief の主要動向と短信の原稿は、毎朝 06:30 JST 頃までに次の場所に置かれる。原稿は執筆規則に基づいて作成・検証済みであり、そのまま公開本文として使う。
  - 原稿（JSON・日英）：`https://raw.githubusercontent.com/kenj0126-creator/kenj0126-creator.github.io/main/handoff/daily/YYYY-MM-DD.json`
  - 読み物版（Markdown・日本語）：同じ場所の `YYYY-MM-DD.md`
- 公開担当の役割は、原稿の取り込み、原典リンクの確認、サイトのデータ形式への格納、公開、補足の短信の追加である。本文の書き直し・要約・再構成は行わない。
- `https://kenj0126-creator.github.io/` のデータ（`data/brief/` など）は 2026-10-28 に公開を終了した。今後は参照しない。

## 2. 一度だけ行う改修

1. 項目の形式 `analysis_schema: 3` を追加する。主要動向の `analysis` に次を持たせる。
   - `lead_ja` / `lead_en`：リード（2〜3文）
   - `sections`：`[{heading_ja, heading_en, paragraphs_ja[], paragraphs_en[]}]`（記事ごとの小見出しと段落）
   - `watch_next_ja` / `watch_next_en`：今後の焦点
   - `sources`：従来どおり（`S1`, `S2`…、`kind`, `checked_on` など）
   schema 3 の項目では `happened` / `background` / `significance` / `interpretations` / `japan` / `next_watch` を使わない。schema 2 以前の過去の項目はそのまま残し、従来の表示を維持する。
2. Daily Brief の表示：schema 3 の主要動向は「見出し → リード → 小見出しと段落（原稿の順）→ 今後の焦点（枠囲み）→ 出典」の順に表示する。定型の小見出し（何が起きたか、背景と経緯など）を自動で付けない。短信は「見出し＋本文1〜3文＋出典リンク」で表示する。
3. 各号の冒頭に「今日の要点」（原稿の `lead_points`、3〜5項目）、末尾に「今後の予定」（`upcoming`）を表示する。保存先は `data/brief-meta/YYYY-MM-DD.json` とし、`data/index.json` に登録する。
4. 総合検索の索引に、schema 3 の lead・小見出し・段落・watch_next を含める。

## 3. 毎朝の取り込み手順

1. 当日（Asia/Tokyo）の原稿 JSON を読む。404 の場合は15分おきに最大1時間待ち、なお無い場合は公開を見送り「原稿未着」と報告する。代わりの主要動向を独自に書かない。
2. 対応づけ（原稿 → `data/brief/YYYY-MM-DD.json` の各項目）
   - `id`：`cl-YYYYMMDD-NN` → `brief-YYYYMMDD-NN`（NN は同じ）。原稿の id は `manuscript_id` に残す。
   - `title_*`, `rank`, `tier`, `importance`, `themes`（先頭を `primary_theme`、残りを `secondary_themes`）, `actors`, `forums`, `kill_chain`, `doc_type`, `publisher(_en)`, `japan_relevance`, `reliability`, `continuation_of`：そのまま使う。`continuation_of` が `cl-` の id なら `brief-` に読み替える。
   - `date` → `date` / `published_date` / `event_date`。`brief_date` と `collected_on` は `edition_date`。
   - `stage`（announced / solicitation / awarded / fielded / cancelled）→ `stage_ja` / `stage_en`：区分に沿い、本文に即した短い表記にする（例：awarded →「契約締結」）。
   - 主要動向：`lead` → `summary_ja/en` と `analysis.lead_*`、`sections` → `analysis.sections`、`watch_next` → `analysis.watch_next_*`、`sources` → `analysis.sources` と `source_urls`・`source_kind`。`analysis_schema` は 3。`comment` と `facts` は空でよい。
   - 短信：`brief_text` → `summary_ja/en`。`sources` → `source_urls`・`source_kind`。
   - `edition_title_*` と `edition_dek_*` → その号の題と副題（号の冒頭に表示している題・副題）。書き換えずに使う。
   - `lead_points` と `upcoming` → その号の「今日の要点」と「今後の予定」（既存の保存場所があればそこに、なければ `data/brief-meta/YYYY-MM-DD.json`）。
   - `internal`（scan, dropped, notes_for_editor）は公開しない。採用記録（internal_log）に写す。
3. 原典の確認：各出典の URL を開き、題名・発行主体・日付と、本文の数値・固有名詞との対応を確認し、`checked_on` を記録する。
   - リンク切れ：同じ文書の正しい URL が見つかれば差し替えて記録する。
   - 日付・表記の軽微な不一致：修正して記録する。
   - 本文の事実と原典が食い違う、または原典で確認できない：その項目を公開から外し（保留）、理由を報告する。本文を書き換えて辻褄を合わせることはしない。
4. 許される編集：明白な誤字の修正、サイトの表記規則への統一、英語が欠けている場合の翻訳。小見出しの言い換えや統合、段落の要約や短縮、定型見出しへの置換、評価文の追加は行わない。
5. 補足：原稿にない重要な動向を見つけた場合に限り、短信（`tier: brief`、importance 1〜2）として末尾に追加できる。主要動向は追加しない。追加分は採用記録に「補足」と記す。原稿と同じ規則（一次資料優先、日付と段階の区別、「〜ではなく、〜」の構文を使わない）に従う。
6. 表示上のクレジットと注記は編集方針の一括表記に従い、項目ごとの AI 関連ラベルは付けない。
7. 公開後、神保に報告する：号の日付、主要動向と短信の件数、保留にした項目と理由、差し替えたリンク、追加した短信、公開 URL。

## 4. Weekly Brief

その週に公開した schema 3 の項目（特に小見出しの論点と今後の焦点）を素材として使う。

## 改訂履歴

- 2026-10-28：号の題と副題（edition_title・edition_dek）の対応を追加。
- 2026-10-28：初版。原稿の受け渡し方式への移行に伴い作成。
