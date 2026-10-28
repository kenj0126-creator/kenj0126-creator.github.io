# Weekly AI × Security Brief — 論考原稿ランブック（v1）

対象リポジトリ：`kenj0126-creator/kenj0126-creator.github.io`
編集責任：神保謙（Ken Jimbo）。本ランブックは、毎週土曜の自動実行（Claude のスケジュール実行、06:40 JST 開始）が従う手順と執筆規則を定める。公開の目安は土曜 08:00 JST。

## 0. 位置づけ

Weekly Brief は、その週（月〜金）の動きを素材に、一つの主張を立てて論じる論考である。Daily Brief の要約の束ねとは役割が異なり、「今週の動きから何をつかむべきか」を、根拠・反対の見方・日本にとっての論点とともに示す。

成果物：

1. `handoff/weekly/YYYY-Www.json` — 原稿（日英）。§3 の形式。
2. `handoff/weekly/YYYY-Www.md` — 日本語の読み物版。§4 の形式。
3. `site/` がある場合は公開データ（`node tools/publish.js weekly YYYY-Www` が書く）。
4. `main` への commit と push、実行報告（§6）。

週番号は ISO 週（`TZ=Asia/Tokyo date +%G-W%V`、土曜の実行日で数える）。`date` は公開日（その週の土曜）、対象期間は同じ週の月曜〜金曜（JST）。

## 1. 手順

```sh
git clone --depth 1 https://github.com/kenj0126-creator/kenj0126-creator.github.io
cd kenj0126-creator.github.io
WEEK=$(TZ=Asia/Tokyo date +%G-W%V)
test -f handoff/weekly/$WEEK.json && echo "already exists — skip"   # 同じ週の原稿があれば作成せず報告のみ
```

1. 素材を読む：その週の Daily Brief 原稿（`handoff/daily/` の月曜〜土曜の号）を全部読む。
2. 補う調査：日次で拾えていない重要な動き、論点の背景となる文書・研究を WebSearch／WebFetch で確認する。
3. 主張を決め、原稿 JSON（§2・§3）と読み物版 Markdown（§4）を書く。
4. 検証：`node tools/check-weekly.js $WEEK`。ERROR がなくなるまで直す。WARN は内容を見て判断し、残した理由を報告に書く。
5. 公開データへの変換：`FILES=$(node tools/publish.js weekly $WEEK)`（`site/` がない間は何もせず終わる）。
6. commit と push：

```sh
git add handoff/weekly/$WEEK.json handoff/weekly/$WEEK.md $FILES
git commit -m "weekly: $WEEK"
git push origin main            # 失敗したら git pull --rebase origin main の後に1回だけ再試行
git ls-remote origin refs/heads/main
```

7. 報告（§6）。

## 2. 執筆規則

### 2.1 主張と構成

- **題**（`title_ja`）：その週の動きから導く主張を一文で述べる。20〜40字。（例：「AIの軍事的価値を決めるのは、基盤を動かす権限である」）
- **リード**（`lead_ja`）：3〜5文。主張、主な根拠、政策上の含意を示す。
- **本論**（`sections`）：3〜5節。各節に、
  - 内容に即した節題（`title_ja`、8〜24字。「背景」「概要」「まとめ」などの定型は使わない）
  - 節の主張（`claim_ja`、1文）
  - 本文（`paragraphs_ja`、2〜4段落、各150〜300字）
  を置く。本文は「その週の事実と数値 → 解釈 → 反対の見方・限界」の順で組み立て、扱った動向の id を `item_ids` に、使った出典を `source_ids` に記す。
- **反対の見方**：少なくとも1つの節で、実在する当事者・論者の異なる立場や、主張が当てはまらない条件を検討する。
- **日本にとっての論点**（`japan_paragraphs_ja`）：日本の政策・同盟・産業が問い直すべき点を1〜2段落。その週の動きに日本が関わらない場合も、日本の制度・調達・同盟運用への含意を具体的に書く。書くべき論点がない週は空でよい（報告にその旨を書く）。
- **来週以降の検証点**（`verification`）：3〜5項目。日付・文書・指標で書き、主張が正しいかを確かめる手がかりにする。
- **今週の主要動向**（`developments`）：8〜30件。日付、見出し、主体、段階、確度、出典 id、日次の項目 id。
- **精読を勧める資料**（`reading`）：3〜5件。出典 id と、読む理由（1文）。

### 2.2 分量

日本語の本文（リード＋各節＋日本にとっての論点）で 3,000〜5,000字。英語は同じ内容・同程度の分量。

### 2.3 事実と文体

- Daily Brief ランブック §3.5（事実の扱い）と §3.6（文体）に従う。日付は発表主体の現地時間。
- 論考なので主張は明確に書く。そのうえで、事実（確認されたこと）と推論（「〜を示唆する」「〜と考えられる」）を書き分ける。
- 日次の原稿にない事実を使うときは、必ず出典を付ける。日次の原稿で「未確認」とされた点は、確認できた場合だけ断定する。
- 「〜ではなく、〜」の構文は使わない。強い否定の多用を避ける。作業の過程、ツール名、AIの名称は本文に書かない。

## 3. JSON の形式

```json
{
  "week": "2026-W44",
  "date": "2026-10-31",
  "generated_at": "2026-10-31T07:20:00+09:00",
  "coverage_from": "2026-10-26",
  "coverage_to": "2026-10-30",
  "title_ja": "（主張を述べる題）",
  "title_en": "(Title stating the argument)",
  "lead_ja": "（3〜5文）",
  "lead_en": "(3–5 sentences)",
  "themes": ["cyber-ci", "frontier-safety"],
  "sections": [
    {
      "id": "kebab-case-id",
      "title_ja": "（節題）",
      "title_en": "(Section title)",
      "claim_ja": "（節の主張、1文）",
      "claim_en": "(Section claim)",
      "paragraphs_ja": ["（段落）", "（段落）"],
      "paragraphs_en": ["(Paragraph)", "(Paragraph)"],
      "item_ids": ["cl-20261028-01"],
      "source_ids": ["W1", "W2"]
    }
  ],
  "japan_paragraphs_ja": ["（段落）"],
  "japan_paragraphs_en": ["(Paragraph)"],
  "verification": [{"text_ja": "（日付・文書・指標）", "text_en": "(...)"}],
  "developments": [
    {"date": "2026-10-26", "title_ja": "（見出し）", "title_en": "(Headline)", "actor_ja": "（主体）", "actor_en": "(Actor)", "stage_ja": "（段階）", "stage_en": "(Stage)", "source_ids": ["W1"], "confidence": "A2", "item_id": "cl-20261028-01"}
  ],
  "reading": [{"source_id": "W1", "reason_ja": "（読む理由）", "reason_en": "(Why read it)"}],
  "sources": [
    {"id": "W1", "title": "（題名）", "publisher": "（発行主体）", "url": "https://...", "date": "2026-10-26", "kind": "primary", "accessed": true}
  ],
  "item_ids": ["cl-20261028-01"],
  "internal": {"scan": "（読んだ日次の号と補った調査）", "notes_for_editor": []}
}
```

- `kind` は `primary`（政府・軍・国際機関・企業の公式文書、論文）か `media`（報道）。`accessed: false` は本文を直接開けなかった出典。
- `confidence` は Daily Brief と同じ信頼度コード（A〜F × 1〜6）。戦場以外の公式発表は空でよい。
- `themes` は `dist/config/tags.json`（`site/` 移行後は `site/config/tags.json`）の ID。

## 4. 読み物版 Markdown（`handoff/weekly/YYYY-Www.md`）

```markdown
# Weekly AI × Security Brief — YYYY年第WW週（M月D日〜M月D日）

## （題）
（リード）

### （節題）
**（節の主張）**

（段落）

### 日本にとっての論点
（段落）

## 来週以降の検証点
- …

## 今週の主要動向
- M/D （見出し）— （主体）、（段階）［出典 W1］

## 精読を勧める資料
- [（題名）](URL) — （理由）

## 出典
- W1 [（題名）](URL)（発行主体、日付、一次資料／報道）
```

## 5. 公開の経路

`site/`（公開サイトの原本）がリポジトリにある場合、`tools/publish.js` が原稿を書き換えずに公開データへ変換し、`main` への push を受けて GitHub Actions が Xサーバーへ転送する（`docs/PUBLISHING.md`）。`site/` がない間は原稿だけを置く。

## 6. 実行報告

1. 結果：作成した／同じ週の原稿が既にあったため作成しなかった／検証に通らず push しなかった、のいずれか。
2. 週番号、題、各節の題と主張、日本語の本文字数。
3. commit ハッシュと、`git ls-remote` で確認した push の結果。公開データへ変換したかどうか。
4. 読み物版（Markdown）の全文。
5. 編集者の判断が必要な点（`internal.notes_for_editor`、検証の WARN を残した理由）。

## 7. 毎週の作業で変更しないもの

`dist/`、`tools/`、`.github/`、`docs/`、過去の週の `handoff/weekly/` ファイル、`handoff/daily/`。`site/` は `tools/publish.js` を通してだけ変更する。

## 改訂履歴

- v1（2026-10-29）：初版。毎週土曜 08:00 JST 公開、対象は同じ週の月〜金。
