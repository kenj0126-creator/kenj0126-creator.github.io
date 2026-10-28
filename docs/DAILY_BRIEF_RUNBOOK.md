# Daily AI × Security Brief — 原稿作成ランブック（v2）

対象リポジトリ：`kenj0126-creator/kenj0126-creator.github.io`
編集責任：神保謙（Ken Jimbo）。本ランブックは、毎朝の自動実行（Claude のスケジュール実行）が従う手順と執筆規則を定める。手順を変えるときはこのファイルを編集する。スケジュール側の指示文は「このファイルを読んで従う」ことを求めている。

## 役割分担（2026-10-28 から）

- **Claude（毎朝 05:35 JST の自動実行）**：その日の Daily Brief の原稿（本文・出典・タグ）を作成し、`handoff/daily/YYYY-MM-DD.json` と `handoff/daily/YYYY-MM-DD.md` としてこのリポジトリに置く。原稿がそのまま公開本文になる前提で書く。
- **ChatGPT（公開サイト AI & Security Observatory の編集・公開）**：原稿を取り込み、原典リンクを確認し、サイトのデータ形式に格納して公開する。原稿にない動向は短信として補う。
- **GitHub Pages**（kenj0126-creator.github.io）での公開は 2026-10-28 に終了した。`dist/` は旧版の記録として残し、日次の作業では変更しない。

ChatGPT が読む受け渡しURL：
`https://raw.githubusercontent.com/kenj0126-creator/kenj0126-creator.github.io/main/handoff/daily/YYYY-MM-DD.json`

## 0. 成果物

1. `handoff/daily/YYYY-MM-DD.json` — 原稿（日英）。§4 の形式。
2. `handoff/daily/YYYY-MM-DD.md` — 日本語の読み物版。§5 の形式。
3. `main` への commit と push。
4. 実行報告（§6）。

日付は **Asia/Tokyo の当日**（`TZ=Asia/Tokyo date +%F`）。ファイル名の日付＝`edition_date`。

## 1. 手順

```sh
git clone --depth 1 https://github.com/kenj0126-creator/kenj0126-creator.github.io
cd kenj0126-creator.github.io
DAY=$(TZ=Asia/Tokyo date +%F)
test -f handoff/daily/$DAY.json && echo "already exists — skip"   # 同日分があれば作成せず報告のみ
```

1. 調査と選定（§2）。
2. 原稿 JSON（§3・§4）と読み物版 Markdown（§5）を書く。
3. 検証：`node tools/check-handoff.js $DAY`。ERROR がなくなるまで直す。WARN は内容を見て判断し、残した理由を報告に書く。
4. 検証を通った場合のみ、2つのファイルだけを commit・push する。

```sh
git add handoff/daily/$DAY.json handoff/daily/$DAY.md
git commit -m "brief: $DAY"
git push origin main
git ls-remote origin refs/heads/main   # 手元の HEAD と一致することを確認する
```

5. 報告（§6）。

## 2. 調査と選定

- **対象期間**：前回の原稿の `generated_at` から当日朝まで。最低24時間、月曜は72時間をさかのぼる。
- **5つの観点**：実装（軍・政府でのAI導入）、運用（戦場・作戦での使用と効果）、制度化・調達（予算、契約、組織、法規）、民間AIと軍事（フロンティアAI企業、半導体、輸出管理と安全保障の接点）、規範・戦略的安定（国際規範、軍備管理、核・NC3、認知戦）。
- **毎回確認する範囲**
  - 地域：米国、中国、日本、韓国、台湾、欧州・NATO、英国、ロシア・ウクライナ、イスラエル・中東、インド、豪州、ASEAN。
  - 分野：戦略・政策文書／予算・調達・契約／作戦・戦場での使用／防衛産業・スタートアップ・資金調達／フロンティアAI企業の発表と評価機関の報告／国際規範（国連、CCW、REAIM 等）／輸出管理・計算資源／サイバー／研究論文・シンクタンク報告。
  - 日本：防衛省、防衛装備庁、国家安全保障局、内閣府、経済産業省、外務省の発表、大臣会見、国会審議、主要政党の提言。
  - 確認した範囲と該当なしの区分は `internal.scan` に記録する。
- **件数**：主要動向（`tier: "main"`）は4〜8件、短信（`tier: "brief"`）は5〜15件を目安とする。重要な動きが少ない日は少なくてよく、件数を埋めるために薄い話題を入れない。
- **重要度**
  - 3：能力、ドクトリン、同盟、規範、市場の構造を変えうる決定や事実（成立予算、主要契約、実戦での新たな使用、主要国の公式方針、国際合意など）。
  - 2：構造変化に至る途中段階の動き（予算要求、規則案、公募、実証、主要報告など）。
  - 1：背景情報、小規模な動き。短信に置く。
- **並び順**：重要度の高い順。同じ重要度の中では、制度化の段階、日本との関わり、新規性、確度の順に並べる。過去の日付に公表され遅れて確認した資料は公表日で記録し、当日の新規動向より下に置く。
- **情報源**：一次資料（政府・軍・国際機関の公表文書、企業の正式発表、論文）を優先し、報道は一次資料がない場合や解釈を補う場合に使う。各出典を `sources` に記録し、一次資料か報道かを区別する。
- 採用しなかった有力候補は、理由とともに `internal.dropped` に記録する。

## 3. 執筆規則

### 3.1 主要動向（tier: main）

1. **見出し**（`title_ja`）：事実と意味が伝わる一文。30〜45字を目安とする。
2. **リード**（`lead_ja`）：2〜3文で、何が起き、なぜ重要かを述べる。
3. **本文**（`sections`）：記事の内容に即した小見出しを2〜4本置く。小見出しには、その節の主張または具体的な論点を10〜20字で書く。
   - 良い例：「士官教育に組み込まれるAI」「シンドゥール作戦の教訓」「装備計画との接続は今後」「契約上限と実支出の差」「証券開示に移った軍事利用の対立」
   - 使わない例：「何が起きたか」「背景と経緯」「背景」「概要」「なぜ重要か」「意義」「解釈の分かれ目」「日本への含意」「次に見るべき点」「今後の展望」「まとめ」
4. **段落**：各節は1〜3段落。段落は120〜250字を目安に、主張・根拠・含意の流れで書く。節の分量はそろえず、論点の重さに応じて配分する。
5. **分量**（本文の日本語の合計）：重要度3は1,000〜1,600字、重要度2は600〜1,000字。
6. **日本への含意**：日本が直接関わる場合に限り、内容に即した小見出しの節として本文に組み込む（例：「日印の無人システム協力への含意」）。`japan_relevance` を true にする。
7. **見解の対立**：実在する当事者や論者の立場として示す。根拠を伴わない「一つの読み方／別の読み方」の型は使わない。
8. **今後の焦点**（`watch_next_ja`）：日付・文書・指標を1〜3行。本文とは別の欄に書く。
9. **記事の種類による構成の手がかり**（小見出しの文言は記事ごとに書く）
   - 政策・文書の公表：主な内容／従来方針からの変化／実施の鍵
   - 契約・調達：契約の中身／技術・運用上の狙い／産業・予算への波及
   - 作戦・戦場：観測された事実／検証の度合い／作戦上の意味
   - 規範・外交：主張と対立軸／各国の立場／次の交渉の場
   - 研究・評価報告：主要な知見／方法と限界／政策への含意
   - 企業・資金：発表の内容／事業と規制の位置／安全保障上の影響
10. **具体性**：数値、日付、固有名詞、短い引用、留保（何が未公開・未確認か）を残す。抽象的な一般論で置き換えない。

### 3.2 短信（tier: brief）

見出しと1〜3文の本文（`brief_text_ja`）、原典リンク。小見出しは付けない。

### 3.3 号の題と副題（edition_title_ja・edition_dek_ja）

- 題：その号の動きを貫く論点を、20〜32字の名詞句で示す（例：「AI防御の実行体制と自律システムの検証段階」）。個別の項目の見出しの繰り返しは避ける。
- 副題：題を補う一文、25〜45字（例：「検査、調達、企業の利用条件をつなぐ制度と、実装の到達点。」）。
- 英語（`edition_title_en`・`edition_dek_en`）も同じ内容で書く。

### 3.4 今日の要点（lead_points_ja）

3〜5項目。1項目目にその日の動きを貫く見立てを置き、続けて要点を示す。各項目は1〜2文。

### 3.5 事実の扱い（必ず守る）

- **日付を区別する**：`date` は原典の公表日または事象の発生日で、発表主体の現地時間の日付で書く（米国の26日夕方の発表は26日）。`edition_date` は掲載日。
- **段階を混同しない**：予算要求／成立予算／契約／実証／配備は別の段階。発表や予算額から戦闘効果を推定しない。
- **主張と検証を分ける**：当事者の主張は「〜と発表した」「〜と主張している」と書き、独立に確認された事実と区別する。
- **戦場関連の主張には信頼度コード**：`battlefield_claim: true` とし、`reliability` に情報源の信頼性（A〜F）と情報の確度（1〜6）を組み合わせたコード（例 `B2`）を付ける。
- **未確認の内容を登録しない**：裏付けが取れない話題は載せない。推測は推測と明記する。

### 3.6 文体

- 日本語は分析的な論説調（である調）。一文は60〜80字を目安とし、「したがって」「一方で」「その結果」など論理の接続を明示する。
- 「〜ではなく、〜」の構文は使わない（`check-handoff.js` が検出する）。強い否定（「〜でない」「〜がない」）の多用を避け、言える範囲を肯定文で示す。
- 作業の過程（検索手順、遅延確認、確認窓、ツール名、AIの名称）は本文に書かない。必要な記録は `internal` に置く。
- 英語は簡潔な分析調とし、日本語と同じ内容・同程度の分量で書く。

## 4. JSON の形式

`handoff/daily/YYYY-MM-DD.json` は1つのオブジェクト。`items` は `rank` 順（1が最上位）に並べ、`id` は `cl-YYYYMMDD-NN`（NN は rank を2桁で）。タグは `dist/config/tags.json` に登録された ID だけを使う。

```json
{
  "edition_date": "2026-10-28",
  "generated_at": "2026-10-28T06:05:00+09:00",
  "window_from": "2026-10-27T06:00:00+09:00",
  "edition_title_ja": "（号の題）",
  "edition_title_en": "(Edition title)",
  "edition_dek_ja": "（副題の一文）",
  "edition_dek_en": "(One-sentence dek)",
  "lead_points_ja": ["（その日を貫く見立て）", "（要点）", "（要点）"],
  "lead_points_en": ["...", "...", "..."],
  "items": [
    {
      "id": "cl-20261028-01",
      "rank": 1,
      "tier": "main",
      "importance": 2,
      "title_ja": "（見出し）",
      "title_en": "(Headline)",
      "lead_ja": "（リード2〜3文）",
      "lead_en": "(Lead, 2–3 sentences)",
      "sections": [
        {
          "heading_ja": "（内容に即した小見出し）",
          "heading_en": "(Section heading)",
          "paragraphs_ja": ["（段落）", "（段落）"],
          "paragraphs_en": ["(Paragraph)", "(Paragraph)"]
        }
      ],
      "watch_next_ja": "（今後の焦点。日付・文書・指標）",
      "watch_next_en": "(What to watch)",
      "japan_relevance": false,
      "date": "2026-10-27",
      "stage": "announced",
      "publisher": "（発行主体・日本語）",
      "publisher_en": "(Publisher)",
      "sources": [
        {"title": "（原典の題名）", "url": "https://...", "publisher": "（発行主体）", "date": "2026-10-27", "kind": "primary"},
        {"title": "（報道の題名）", "url": "https://...", "publisher": "（媒体）", "date": "2026-10-27", "kind": "media"}
      ],
      "themes": ["c2-decision"],
      "actors": ["US"],
      "doc_type": "official-report",
      "forums": [],
      "kill_chain": [],
      "battlefield_claim": false,
      "reliability": "",
      "continuation_of": ""
    },
    {
      "id": "cl-20261028-05",
      "rank": 5,
      "tier": "brief",
      "importance": 1,
      "title_ja": "（見出し）",
      "title_en": "(Headline)",
      "brief_text_ja": "（1〜3文）",
      "brief_text_en": "(1–3 sentences)",
      "japan_relevance": false,
      "date": "2026-10-27",
      "stage": "",
      "publisher": "（発行主体）",
      "publisher_en": "(Publisher)",
      "sources": [{"title": "...", "url": "https://...", "publisher": "...", "date": "2026-10-27", "kind": "media"}],
      "themes": ["industry-procurement"],
      "actors": ["KR"],
      "doc_type": "news-analysis",
      "forums": [],
      "kill_chain": [],
      "battlefield_claim": false,
      "reliability": "",
      "continuation_of": ""
    }
  ],
  "upcoming": [
    {"date": "2026-11-16", "text_ja": "（予定）", "text_en": "(Scheduled event)"}
  ],
  "internal": {
    "scan": {"regions": "（確認した地域と該当なしの区分）", "japan": "（確認した日本の発表源）"},
    "dropped": [{"title": "（不採用の候補）", "url": "https://...", "reason": "（理由）"}],
    "notes_for_editor": ["（編集者の判断が必要な点）"]
  }
}
```

- `stage` は `tags.json` の stages（announced, solicitation, awarded, fielded, cancelled）または空文字。
- `continuation_of` は、過去の原稿の続報である場合にその `id` を書く。
- 使える ID：themes `c2-decision`, `isr-targeting`, `autonomy-laws`, `nuclear-nc3`, `cognitive`, `cyber-ci`, `compute-export`, `frontier-safety`, `industry-procurement`, `governance-norms`／actors `US`, `CN`, `RU`, `JP`, `GB`, `AU`, `KR`, `TW`, `IN`, `IL`, `UA`, `NATO`, `EU`, `UN`, `G7`, `ASEAN`, `QUAD`／doc_type `strategy`, `law-regulation`, `declaration`, `official-report`, `think-tank`, `academic`, `budget-procurement`, `speech-testimony`, `news-analysis`, `dataset`／forums `un-ga`, `ccw-gge`, `reaim`, `political-declaration`, `g7-hiroshima`, `ai-summits`, `nato`, `eu`, `oecd`, `bilateral`／kill_chain `detect`, `decide`, `engage`, `assess`, `sustain`, `cognitive-domain`。

## 5. 読み物版 Markdown（`handoff/daily/YYYY-MM-DD.md`）

日本語。JSON と同じ内容を、次の構成で書く。

```markdown
# Daily AI × Security Brief — YYYY年M月D日

**（号の題）**
（副題）

## 今日の要点
1. …
2. …
3. …

## 主要動向

### （見出し）
（リード）

#### （内容に即した小見出し）
（段落）

#### （内容に即した小見出し）
（段落）

> 今後の焦点：（日付・文書・指標）
> 出典：[（題名）](URL)（一次資料）／[（題名）](URL)（報道）

## 短信
- **（見出し）** （1〜3文）（[出典](URL)）

## 今後の予定
- YYYY-MM-DD：（予定）
```

## 6. 実行報告

実行の最後に、日本語で次を報告する。

1. 結果：作成した／同日分が既にあったため作成しなかった／検証に通らず push しなかった、のいずれか。
2. 掲載日と件数（主要動向・短信）、各項目の見出し・重要度・一次資料か報道か。
3. commit ハッシュと、`git ls-remote` で確認した push の結果。
4. 読み物版（`handoff/daily/YYYY-MM-DD.md`）の全文。
5. 編集者の判断が必要な点（信頼度の低い主張、タグ体系にない概念、検証の WARN を残した理由）。
6. 採用しなかった主な候補と理由（`internal.dropped` の要約）。

失敗したときは、どの段階で何が起きたかを具体的に書く。

## 7. 日次の作業で変更しないもの

`dist/`、`tools/`、`.github/`、`docs/`（本ランブックの改訂は人が行う）、過去の日付の `handoff/daily/` ファイル。同日ファイルを上書きしない（修正が必要なときは報告に書き、人が判断する）。

## 改訂履歴

- v2.1（2026-10-28）：号の題と副題（edition_title・edition_dek）を追加。
- v2（2026-10-28）：原稿の受け渡し方式に移行。内容に即した小見出し、主要動向と短信の二層構成、日英の本文を採用。GitHub Pages での公開を終了。
- v1（2026-10-22）：`dist/data/brief/` への直接公開（GitHub Pages）。
