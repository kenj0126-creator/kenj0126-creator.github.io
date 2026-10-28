# 公開の仕組み（自動公開）

編集責任：神保謙。公開サイト：https://ai-security-observatory.org （Xサーバー）

## 1. 毎日・毎週の流れ

| 時刻（JST） | 実行するもの | 内容 |
| --- | --- | --- |
| 毎日 05:35 | Claude の定期実行 | Daily Brief の原稿を書き（`docs/DAILY_BRIEF_RUNBOOK.md`）、検証を通ったものを `tools/publish.js` で公開データへ変換して push |
| push の直後 | GitHub Actions「Deploy site to Xserver」 | `site/` を検証し、SSH（rsync）で Xサーバーへ転送。サーバー上と公開URLで最新版を確認 |
| 毎日 07:30 | GitHub Actions「Check publication」 | 公開サイトにその日の号があるかを確認。なければ失敗としてメールで通知 |
| 土曜 06:40 | Claude の定期実行 | Weekly Brief（その週の月〜金の論考）を書き（`docs/WEEKLY_BRIEF_RUNBOOK.md`）、同じ経路で公開。08:00 目安 |
| 土曜 08:30 | GitHub Actions「Check publication」 | Weekly Brief の公開を確認 |

決められた方針で公開するための仕組み：

- 原稿は `tools/check-handoff.js`／`tools/check-weekly.js` を通らない限り変換されない（定型の小見出し、「〜ではなく」構文、作業過程の語、分量不足などで止まる）。
- `tools/publish.js` は原稿の文を一字も変えずに公開データへ写し、写した後に本文が一致することを確かめる。公開済みの号は上書きしない。
- `tools/check-site.js` は、確認用アドレス（chatgpt.site）、仮置きの文言、内部記録の項目が公開ファイルに紛れ込んでいないかを、転送の前に確かめる。

## 2. 最初に一度だけ行う設定

### 2.1 Xサーバー（サーバーパネル）

1. 「SSH設定」を ON にする。
2. 「+公開鍵を登録」→ ラベル（例：github-actions）を入力 → パスフレーズは設定しない →「登録して秘密鍵をダウンロードする」。`[サーバーID].key` が保存される。
3. 「SSH設定」→「アクセス制限」→「国外アクセス制限」を OFF にする。GitHub の自動実行は海外のサーバーから接続するため。接続は鍵による認証だけで、パスワードでは入れない。
4. 公開ディレクトリのパスを確かめる：`/home/[サーバーID]/ai-security-observatory.org/public_html`

### 2.2 GitHub（リポジトリの Settings → Secrets and variables → Actions）

Secrets（New repository secret）：

| 名前 | 値 |
| --- | --- |
| `XSERVER_HOST` | `sv17288.xserver.jp` |
| `XSERVER_USER` | サーバーID |
| `XSERVER_PORT` | `10022` |
| `XSERVER_PATH` | `/home/[サーバーID]/ai-security-observatory.org/public_html` |
| `XSERVER_SSH_KEY` | ダウンロードした `.key` ファイルの中身全体 |
| `SITE_BASIC_AUTH` | 公開前のベーシック認証の `ユーザー名:パスワード`（公開後は削除） |

Variables（New repository variable）：

| 名前 | 値 |
| --- | --- |
| `PUBLIC_SITE_URL` | `https://ai-security-observatory.org` |

登録後、`.key` ファイルはパソコンから削除するか、安全な場所に保管する。鍵とパスワードはチャットに貼らない。

### 2.3 サイトの原本を `site/` に置く

ChatGPT から書き出したサイト一式（公開されているファイルと、ページ・RSS・サイトマップを生成する仕組み）を `site/` に置く。ページの再生成が必要な場合は、その手順を `tools/build-site.sh` にまとめる（`tools/publish.js` が変換のたびに呼び出す。生成・更新したファイルのパスを1行ずつ標準出力に書く）。

### 2.4 リポジトリを非公開にする

`site/` 移行後は、原稿を外部から読む必要がなくなる。Settings → General → Danger Zone → Change visibility で Private にする。GitHub Pages の旧版終了案内はこの時点で表示されなくなる。

## 3. 失敗したとき

- 原稿の検証で止まった場合：Claude の実行報告（通知）に理由が出る。原稿は push されない。
- 転送で止まった場合：GitHub からのメール、または Actions 画面の「Deploy site to Xserver」に理由が出る。原因を直して Actions 画面の「Re-run jobs」で再実行する。
- 07:30 の確認で失敗した場合：その日の号が公開されていない。Claude の実行報告と転送の結果を確認する。

## 4. ChatGPT によるデザイン・機能の改修

- ChatGPT は Xサーバーへ直接アップロードしない。公開の経路は GitHub からの自動転送だけにする（二重の経路は、毎日の更新を古い版で上書きする原因になる）。
- 改修は、変更したファイル一式（コード・スタイル・テンプレート）を zip で書き出し、Claude がリポジトリの `site/` に取り込む。`site/data/brief/`、`site/data/brief-meta/`、`site/data/weekly/`、`site/data/index.json` は自動公開が管理するため、改修では触れない。
