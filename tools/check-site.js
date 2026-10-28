#!/usr/bin/env node
// Guards the copy of the public site before it is uploaded.
// Usage: node tools/check-site.js [siteDir]   (default: site)
// Checks that every JSON file parses, that data/index.json lists only files that exist,
// that each Daily Brief edition has its metadata, and that no review-host URL or
// placeholder text slipped into published files. Exit 1 on any ERROR.
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const site = path.resolve(root, process.argv[2] || 'site');
if (!fs.existsSync(site)) { console.log(`check-site: ${path.relative(root, site)} がないため省略`); process.exit(0); }

const errors = [];
const err = m => errors.push(m);
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
  const p = path.join(d, e.name);
  return e.isDirectory() ? walk(p) : [p];
});
const files = walk(site);

const FORBIDDEN = [
  [/kenj0126\.chatgpt\.site/, '確認用アドレス（chatgpt.site）'],
  [/https?:\/\/kenj0126-creator\.github\.io/, '旧サイトのアドレス（github.io）'],
  [/【[^】]{0,30}(連絡先|URL|TODO|未定)[^】]{0,30}】/, '仮置きの文言'],
  [/\[(Personal contact|TODO|TBD)[^\]]*\]/, '仮置きの文言'],
  [/"(internal|notes_for_editor|dropped)"\s*:/, '内部記録の項目'],
];

for (const f of files) {
  const rel = path.relative(site, f);
  if (!/\.(json|html|xml|txt|js|css|md|webmanifest)$/.test(f)) continue;
  const t = fs.readFileSync(f, 'utf8');
  if (f.endsWith('.json')) { try { JSON.parse(t); } catch (e) { err(`${rel}: JSON として読めない（${e.message}）`); } }
  for (const [re, label] of FORBIDDEN) {
    // Code may mention these patterns in validation rules; only check content files.
    if (/\.(js|css)$/.test(f) && label !== '確認用アドレス（chatgpt.site）') continue;
    if (re.test(t)) err(`${rel}: ${label}が含まれる`);
  }
}

const indexFile = path.join(site, 'data', 'index.json');
if (fs.existsSync(indexFile)) {
  const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
  for (const [group, list] of Object.entries(index)) {
    if (!Array.isArray(list)) continue;
    for (const rel of list) if (typeof rel === 'string' && !fs.existsSync(path.join(site, rel))) err(`index.json の ${group} にある ${rel} が存在しない`);
  }
  const days = (index.brief || []).map(f => (f.match(/(\d{4}-\d{2}-\d{2})\.json$/) || [])[1]).filter(Boolean);
  for (const d of days) {
    const items = JSON.parse(fs.readFileSync(path.join(site, 'data/brief', `${d}.json`), 'utf8'));
    const v3 = Array.isArray(items) && items.some(i => i.analysis_schema === 3);
    if (v3 && !(index.brief_meta || []).includes(`data/brief-meta/${d}.json`)) err(`${d}: 新形式の号に brief-meta がない（表示が止まる）`);
  }
} else err('data/index.json がない');

if (errors.length) { for (const e of errors) console.log('ERROR ' + e); console.log(`check-site: ${errors.length} error(s)`); process.exit(1); }
console.log(`check-site: OK — ${files.length} files`);
