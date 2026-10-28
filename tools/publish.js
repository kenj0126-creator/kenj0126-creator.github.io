#!/usr/bin/env node
// Puts a checked manuscript into the public site's data, word for word.
//
//   node tools/publish.js daily  YYYY-MM-DD   (after: node tools/check-handoff.js YYYY-MM-DD)
//   node tools/publish.js weekly YYYY-Www     (after: node tools/check-weekly.js YYYY-Www)
//
// Writes into site/ (the copy of the public site kept in this repository). When site/ does
// not exist yet, it prints a notice and exits 0 so the daily run can call it unconditionally.
// Prints the paths it wrote, one per line, on stdout (for `git add`); messages go to stderr.
// It never overwrites a published edition unless --force is given.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { convertDaily, convertWeekly } = require('./lib/site-convert');

const [kind, key, ...flags] = process.argv.slice(2);
const force = flags.includes('--force');
const root = path.resolve(__dirname, '..');
const site = path.join(root, 'site');
const log = m => process.stderr.write(m + '\n');
const fail = m => { log('ERROR ' + m); process.exit(1); };

if (!['daily', 'weekly'].includes(kind)) fail('Usage: node tools/publish.js daily YYYY-MM-DD | weekly YYYY-Www [--force]');
if (kind === 'daily' && !/^\d{4}-\d{2}-\d{2}$/.test(key || '')) fail('daily needs YYYY-MM-DD');
if (kind === 'weekly' && !/^\d{4}-W\d{2}$/.test(key || '')) fail('weekly needs YYYY-Www');

if (!fs.existsSync(path.join(site, 'data', 'index.json'))) {
  log('NOTICE site/data/index.json がないため、公開データへの変換を省略した（原稿のみ保存）。');
  process.exit(0);
}

// The manuscript must pass its checker first; nothing that breaks the editorial rules is published.
const checker = kind === 'daily' ? 'check-handoff.js' : 'check-weekly.js';
const pre = spawnSync(process.execPath, [path.join(root, 'tools', checker), key], { cwd: root, stdio: ['ignore', 2, 2] });
if (pre.status !== 0) fail(`${checker} ${key} が通らないため公開しない`);

const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const tagsFile = [path.join(site, 'config/tags.json'), path.join(root, 'dist/config/tags.json')].find(f => fs.existsSync(f));
const tags = tagsFile ? readJson(tagsFile) : {};
const written = [];
const write = (rel, obj) => {
  const f = path.join(site, rel);
  if (fs.existsSync(f) && !force) fail(`${rel} は公開済み。上書きしない（修正は人が判断する。必要なら --force）`);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(obj, null, 2) + '\n');
  written.push(path.join('site', rel));
};

const indexFile = path.join(site, 'data', 'index.json');
const index = readJson(indexFile);
const register = (group, rel) => {
  const list = Array.isArray(index[group]) ? index[group] : [];
  if (!list.includes(rel)) list.push(rel);
  index[group] = [...new Set(list)].sort();
};

if (kind === 'daily') {
  const man = readJson(path.join(root, 'handoff/daily', `${key}.json`));
  if (man.edition_date !== key) fail(`edition_date (${man.edition_date}) と指定日 (${key}) が一致しない`);
  const { items, meta } = convertDaily(man, tags);
  // Verbatim check: every Japanese and English text of the manuscript must appear unchanged.
  for (const it of man.items) {
    const out = items.find(x => x.manuscript_id === it.id);
    if (!out) fail(`${it.id} が変換結果にない`);
    if (out.title_ja !== it.title_ja || out.title_en !== it.title_en) fail(`${it.id} の見出しが一致しない`);
    if (it.tier === 'main') {
      const a = JSON.stringify(it.sections.map(s => [s.heading_ja, s.heading_en, s.paragraphs_ja, s.paragraphs_en]));
      const b = JSON.stringify(out.analysis.sections.map(s => [s.heading_ja, s.heading_en, s.paragraphs_ja, s.paragraphs_en]));
      if (a !== b || out.analysis.lead_ja !== it.lead_ja || out.analysis.watch_next_ja !== it.watch_next_ja) fail(`${it.id} の本文が一致しない`);
    } else if (out.summary_ja !== it.brief_text_ja) fail(`${it.id} の本文が一致しない`);
  }
  write(`data/brief/${key}.json`, items);
  write(`data/brief-meta/${key}.json`, meta);
  register('brief', `data/brief/${key}.json`);
  register('brief_meta', `data/brief-meta/${key}.json`);
} else {
  const man = readJson(path.join(root, 'handoff/weekly', `${key}.json`));
  if (man.week !== key) fail(`week (${man.week}) と指定週 (${key}) が一致しない`);
  write(`data/weekly/${key}.json`, convertWeekly(man));
  register('weekly', `data/weekly/${key}.json`);
}

fs.writeFileSync(indexFile, JSON.stringify(index, null, 2) + '\n');
written.push('site/data/index.json');

// Regenerate pages, feeds and the sitemap with the site's own build step, when it exists.
const build = path.join(root, 'tools', 'build-site.sh');
if (fs.existsSync(build)) {
  const r = spawnSync('bash', [build], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' });
  if (r.status !== 0) fail('tools/build-site.sh が失敗した');
  for (const line of (r.stdout || '').split('\n').map(s => s.trim()).filter(Boolean)) written.push(line);
} else {
  log('NOTICE tools/build-site.sh がないため、ページ・RSS・サイトマップの再生成を省略した。');
}

const check = spawnSync(process.execPath, [path.join(root, 'tools', 'check-site.js')], { cwd: root, stdio: ['ignore', 2, 2] });
if (check.status !== 0) fail('公開データの検証（tools/check-site.js）に失敗した');

process.stdout.write([...new Set(written)].join('\n') + '\n');
