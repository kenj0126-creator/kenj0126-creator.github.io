# Daily AI × Security Brief — 日次更新ランブック

対象リポジトリ：`kenj0126-creator/kenj0126-creator.github.io`
公開URL：https://kenj0126-creator.github.io/
編集責任：神保謙（Ken Jimbo）。本ランブックは毎朝の自動更新（Claude のスケジュール実行）が従う手順と編集ルールを定める。手順を変えるときはこのファイルを編集する。スケジュール側の指示文は「このファイルを読んで従う」ことだけを求めている。

## 0. 成果物

1. `dist/data/brief/YYYY-MM-DD.json` — その日の項目の配列（日英）。サイトの Daily Brief・Home・信号の場に取り込まれる。
2. `briefs/YYYY-MM-DD.md` — 読み物としての日本語ブリーフ（8〜10分で読める分量）。公開対象外、リポジトリに保存。
3. `main` への commit と push → GitHub Actions が検証して `dist/` を再配信 → 公開データの読戻し確認。
4. 実行報告（日本語）。

日付は **Asia/Tokyo の当日**（`TZ=Asia/Tokyo date +%F`）。ブリーフの日付＝ファイル名＝`brief_date`＝`created`＝`updated`。

## 1. 手順

```sh
# 1) リポジトリを取得（セッションに push 権限で接続してから）
git clone --depth 1 https://github.com/kenj0126-creator/kenj0126-creator.github.io
cd kenj0126-creator.github.io
DAY=$(TZ=Asia/Tokyo date +%F)

# 2) 冪等性：同日分が既にあれば生成しない（報告のみ）
test -f dist/data/brief/$DAY.json && echo "already exists — skip"
```

3) 調査（§2）→ 項目を選び、JSON（§3）と Markdown（§4）を書く。
4) 検証：

```sh
node tools/index-data.js
node tools/validate.js
node tools/check-brief.js $DAY
node --check dist/assets/app.js
```

5) 検証がすべて通った場合のみ commit・push：

```sh
git add dist/data/brief/$DAY.json dist/data/index.json briefs/$DAY.md
git commit -m "brief: $DAY"
git push origin main
```

6) 配信確認：`gh api repos/kenj0126-creator/kenj0126-creator.github.io/actions/runs?per_page=3` で最新の「Deploy site to GitHub Pages」が `completed / success` になるまで待つ（通常1〜2分）。その後、公開URLから読み戻す：

- `https://kenj0126-creator.github.io/data/index.json` に `data/brief/YYYY-MM-DD.json` が含まれること
- `https://kenj0126-creator.github.io/data/brief/YYYY-MM-DD.json` が取得でき、項目数が一致すること

（実行環境のシェルから github.io に直接接続できない場合は、Web取得ツールで読み戻す。GitHub API は `gh api` で到達できる。）

7) 報告（§5）。

**やってはいけないこと**：検証に失敗した状態で push しない。`dist/config/`、`dist/assets/`、HTML、`tools/`、他のデータファイルを日次更新で変更しない。既存の項目を削除しない。同日ファイルを上書きしない（修正が必要なときは報告に書き、人が判断する）。

## 2. 調査と選定

- 対象：直近24〜48時間に公表・発生した、AIと安全保障に関わる重要動向。日本時間の前日〜当日朝まで。
- 常に追う5つの観点：**実装**（軍・政府でのAI導入）、**運用**（戦場・作戦での使用と効果）、**制度化・調達**（予算、契約、組織、法規）、**民間AIと軍事**（フロンティアAI企業・半導体・輸出管理と安全保障の接点）、**規範・戦略的安定**（国際規範、軍備管理、核・NC3、認知戦）。
- 件数：主要動向は約6件、最大8件。情報が薄い日は少なくてよい。**件数を埋めるために薄い話題を入れない。** 重要な動きが何もない日は、1〜3件でも構わない。
- 地域：米中欧に偏らず、日本・インド太平洋（韓国、台湾、豪州、ASEAN、インド）とウクライナ・中東の運用面を意識する。
- 情報源：一次資料（政府・軍・国際機関の公表文書、企業の正式発表、論文）を優先し、報道は一次資料が無い場合や解釈を補う場合に使う。各項目の `url` は原典への直接リンク。一次か報道かを `source_type` に記録する。
- 検索の例：「AI military」「autonomous weapons」「Pentagon AI」「防衛省 AI」「PLA AI」「AI export controls」「REAIM」「CCW LAWS」「AI nuclear command」「cognitive warfare」等に、前日の日付を添えて検索する。重要官庁・機関のニュースルームも確認する。

## 3. 編集ルール（必ず守る）

- **日付を区別する**：`date` は原典の公表日または事象の発生日。`brief_date` は掲載日。`collected` は収集日（通常は掲載日と同じ）。
- **段階を混同しない**：予算要求／成立予算／契約／実証／配備は別の段階。発表や予算額から戦闘効果を推定しない。
- **主張と検証を分ける**：当事者（政府・軍・企業・交戦当事者）の主張は「〜と発表した」「〜と主張している」と書き、独立に確認された事実と区別する。
- **戦場関連の主張には信頼度コード**：戦場でのAI使用や効果に関する項目は `battlefield_claim: true` とし、`reliability` に情報源の信頼性（A〜F）と情報の確度（1〜6）を組み合わせたコード（例 `B2`）を付ける。公式文書そのものを掲載する場合は省略できる。
- **未確認の内容を登録しない**：裏付けが取れない話題は載せない。推測は推測として `comment_ja` に書く。
- **重要度**：3＝構造的変化（政策転換、新しい規範、実戦での初事例など。`japan_implication` 必須）、2＝注目すべき動き、1＝参考情報。
- **タグ**：`dist/config/tags.json` に登録された ID だけを使う。一覧にない概念は `comment_ja` に書く。テーマは1〜3個。
- **昇格先（promote_to）**：重要度3かつ `strategy` / `law-regulation` / `declaration` / `official-report` → `library`。予算・調達文書や特定プログラムの報道 → `tracker-program`。国の組織改編や方針転換 → `tracker-country`。それ以外 → `none`。日次更新では `promoted_id` は空のまま（週次作業で転記する）。
- **執筆者表示**：`author` は `"Daily Brief 自動生成（Claude）"`、`reviewed_by` は空文字。編集者が確認した項目は人が後で `reviewed_by` を記入する。
- **文体**：分析的な記述。日本語は「〜ではなく、〜である」構文や強い否定（「〜でない」「〜がない」）を避け、事実・重要性・含意の順に書く。英語は簡潔な分析調。

## 4. JSON の形式

`dist/data/brief/YYYY-MM-DD.json` は項目の配列。`rank` 順（1が最重要）に並べ、`id` は `brief-YYYYMMDD-NN`（NN は rank を2桁で）。

```json
[
  {
    "id": "brief-20261022-01",
    "brief_date": "2026-10-22",
    "rank": 1,
    "title_ja": "（日本語タイトル。40字以内を目安）",
    "title_en": "(English title)",
    "date": "2026-10-21",
    "collected": "2026-10-22",
    "url": "https://（原典への直接リンク）",
    "publisher": "（発行主体・日本語）",
    "publisher_en": "(Publisher, English)",
    "source_type": "primary",
    "themes": ["c2-decision"],
    "actors": ["US"],
    "doc_type": "official-report",
    "forums": [],
    "kill_chain": [],
    "importance": 2,
    "battlefield_claim": false,
    "reliability": "",
    "summary_ja": "（300〜500字。何が新しい事実か、なぜ重要か、政策・軍事上の含意は何か。主張と確認済み事実を区別する）",
    "summary_en": "(2–4 sentences: the new fact, why it matters, implications.)",
    "comment_ja": "（編集コメント：何が変わったか、どう読むべきか、今後の注目点。1〜3文）",
    "comment_en": "(Editorial comment, 1–2 sentences.)",
    "japan_implication": "（日本への含意。重要度3では必須、それ以外も推奨。1〜2文）",
    "japan_implication_en": "(Implications for Japan.)",
    "related": [],
    "promote_to": "none",
    "promoted_id": "",
    "author": "Daily Brief 自動生成（Claude）",
    "reviewed_by": "",
    "created": "2026-10-22",
    "updated": "2026-10-22"
  }
]
```

使える ID（`dist/config/tags.json` が原本。変更があればそちらが優先）：

- themes: `c2-decision`, `isr-targeting`, `autonomy-laws`, `nuclear-nc3`, `cognitive`, `cyber-ci`, `compute-export`, `frontier-safety`, `industry-procurement`, `governance-norms`
- actors: `US`, `CN`, `RU`, `JP`, `GB`, `AU`, `KR`, `TW`, `IN`, `IL`, `UA`, `NATO`, `EU`, `UN`, `G7`, `ASEAN`, `QUAD`
- doc_type: `strategy`, `law-regulation`, `declaration`, `official-report`, `think-tank`, `academic`, `budget-procurement`, `speech-testimony`, `news-analysis`, `dataset`
- forums: `un-ga`, `ccw-gge`, `reaim`, `political-declaration`, `g7-hiroshima`, `ai-summits`, `nato`, `eu`, `oecd`, `bilateral`
- kill_chain: `detect`, `decide`, `engage`, `assess`, `sustain`, `cognitive-domain`

## 5. 読み物版 Markdown（`briefs/YYYY-MM-DD.md`）

日本語。見出し構成は固定：

```markdown
# Daily AI × Security Brief — YYYY年M月D日

## 今日の要点
1. …
2. …
3. …

## 主要動向
### 1. （タイトル）
（300〜500字。出典：[発行主体](URL)（一次資料／報道））
### 2. …

## 戦闘・運用への含意
（該当する項目の整理。信頼度コードを明記）

## 調達・政策
（該当する項目の整理）

## 研究
（論文・報告書があれば）

## 今後注視する点
- （3〜5点）

---
生成：Claude（自動）／編集責任：神保謙／データ：dist/data/brief/YYYY-MM-DD.json
```

該当がない節は「本日は該当なし」と書く。項目を捏造して埋めない。

## 6. 実行報告

実行の最後に、日本語で次を報告する（公開完了の報告と自動更新の報告は分ける）。

1. 結果：生成した／同日分が既に存在したため生成しなかった／検証失敗で push しなかった、のいずれか。
2. 掲載日と件数、各項目のタイトル・重要度・一次資料か報道か。
3. commit ハッシュ、GitHub Actions の結果、公開URLからの読戻し結果（index.json に登録されているか、brief JSON の項目数）。
4. 読み物版ブリーフの本文（`briefs/YYYY-MM-DD.md` の内容をそのまま）。
5. 編集者の判断が必要な点（信頼度の低い主張、昇格候補、タグ体系に無い概念、同日分の修正提案）。

失敗したときは、どの段階で何が起きたかを具体的に書き、公開サイトが直前の正常版のまま維持されていることを確認して報告する。
