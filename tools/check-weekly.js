#!/usr/bin/env node
// Checks a Weekly Brief manuscript (docs/WEEKLY_BRIEF_RUNBOOK.md).
// Usage: node tools/check-weekly.js YYYY-Www
// Files: handoff/weekly/YYYY-Www.json and handoff/weekly/YYYY-Www.md
// Exit 1 on any ERROR. WARN lines are printed but do not fail the run.
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const week = process.argv[2];
if (!/^\d{4}-W\d{2}$/.test(week || '')) { console.error('Usage: node tools/check-weekly.js YYYY-Www'); process.exit(2); }

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'handoff/weekly');
const errors = [];
const warnings = [];
const err = m => errors.push(m);
const warn = m => warnings.push(m);
const str = v => typeof v === 'string' && v.trim().length > 0;
const jaLen = s => (s || '').replace(/\s/g, '').length;
const sentences = s => ((s || '').match(/[。！？]/g) || []).length;

let doc;
try { doc = JSON.parse(fs.readFileSync(path.join(dir, `${week}.json`), 'utf8')); } catch (e) { console.error(`Cannot read handoff/weekly/${week}.json: ${e.message}`); process.exit(1); }

const tagsFile = [path.join(root, 'site/config/tags.json'), path.join(root, 'dist/config/tags.json')].find(f => fs.existsSync(f));
const tags = JSON.parse(fs.readFileSync(tagsFile, 'utf8'));
const has = (group, v) => (tags[group] || []).some(t => t.id === v);

const BANNED = ['背景', '経緯', '概要', 'まとめ', '結論', '詳細', '分析', 'ポイント', 'なぜ重要か', '意義', '今後の展望', '日本への含意', '何が起きたか'];
const PROCESS_WORDS = ['遅延確認', '確認窓', '重複確認', '候補台帳', '補遺として', 'Claude', 'ChatGPT', '生成AIの支援', '人による確認待ち'];

// ISO week → Monday..Saturday dates
function isoWeekDates(w) {
  const [y, n] = w.split('-W').map(Number);
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const mon = new Date(jan4);
  mon.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7) + (n - 1) * 7);
  const d = k => { const x = new Date(mon); x.setUTCDate(mon.getUTCDate() + k); return x.toISOString().slice(0, 10); };
  return { mon: d(0), fri: d(4), sat: d(5) };
}
const wk = isoWeekDates(week);

// Top level
if (doc.week !== week) err(`week must be ${week}`);
if (doc.date !== wk.sat) err(`date must be the Saturday of ${week} (${wk.sat})`);
if (doc.coverage_from !== wk.mon || doc.coverage_to !== wk.fri) err(`coverage must be ${wk.mon}〜${wk.fri}`);
if (!str(doc.generated_at) || Number.isNaN(Date.parse(doc.generated_at))) err('generated_at must be an ISO 8601 timestamp');
for (const k of ['title_ja', 'title_en', 'lead_ja', 'lead_en']) if (!str(doc[k])) err(`${k} is required`);
if (str(doc.title_ja) && (jaLen(doc.title_ja) < 16 || jaLen(doc.title_ja) > 48)) warn(`title_ja is ${jaLen(doc.title_ja)} chars (target 20–40)`);
if (str(doc.lead_ja) && (sentences(doc.lead_ja) < 3 || sentences(doc.lead_ja) > 6)) warn(`lead_ja has ${sentences(doc.lead_ja)} sentences (target 3–5)`);
if (!Array.isArray(doc.themes) || doc.themes.length < 1) err('themes is required');
for (const t of doc.themes || []) if (!has('themes', t)) err(`unknown theme "${t}"`);

// Sources
const sources = Array.isArray(doc.sources) ? doc.sources : [];
const sourceIds = new Set();
sources.forEach((s, i) => {
  const L = `sources[${i}]`;
  if (!/^W\d+$/.test(s.id || '')) err(`${L}: id must be W1, W2, …`);
  if (sourceIds.has(s.id)) err(`${L}: duplicate id ${s.id}`);
  sourceIds.add(s.id);
  if (!/^https?:\/\//.test(s.url || '')) err(`${L}: url must be http(s)`);
  if (!['primary', 'media'].includes(s.kind)) err(`${L}: kind must be primary or media`);
  for (const k of ['title', 'publisher', 'date']) if (!str(s[k])) err(`${L}: ${k} is required`);
});
if (sources.length < 8) warn(`only ${sources.length} sources`);
const used = new Set();
const useIds = (L, ids) => { for (const id of ids || []) { if (!sourceIds.has(id)) err(`${L}: unknown source id ${id}`); used.add(id); } };

// Daily items of the week, for item id checks
const dailyIds = new Set();
const ddir = path.join(root, 'handoff/daily');
if (fs.existsSync(ddir)) for (const f of fs.readdirSync(ddir).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))) {
  try { for (const it of JSON.parse(fs.readFileSync(path.join(ddir, f), 'utf8')).items || []) dailyIds.add(it.id); } catch { /* ignore */ }
}
const checkItem = (L, id) => { if (!/^(cl|brief)-\d{8}-\d{2}$/.test(id)) err(`${L}: item id ${id} has the wrong form`); else if (id.startsWith('cl-') && !dailyIds.has(id)) warn(`${L}: ${id} is not in handoff/daily`); };

// Sections
const secs = Array.isArray(doc.sections) ? doc.sections : [];
if (secs.length < 3 || secs.length > 5) err(`sections must be 3–5 (has ${secs.length})`);
let bodyLen = jaLen(doc.lead_ja);
const jaTexts = [doc.title_ja, doc.lead_ja];
secs.forEach((s, i) => {
  const L = `section ${i + 1}`;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.id || '')) err(`${L}: id must be kebab-case`);
  for (const k of ['title_ja', 'title_en', 'claim_ja', 'claim_en']) if (!str(s[k])) err(`${L}: ${k} is required`);
  if (str(s.title_ja)) {
    if (BANNED.some(b => s.title_ja.trim() === b || s.title_ja.trim() === b + 'と経緯')) err(`${L}: 定型の節題「${s.title_ja}」は使わない`);
    if (jaLen(s.title_ja) < 6 || jaLen(s.title_ja) > 28) warn(`${L}: title_ja is ${jaLen(s.title_ja)} chars (target 8–24)`);
  }
  if (str(s.claim_ja) && sentences(s.claim_ja) > 1) warn(`${L}: claim_ja should be one sentence`);
  const ps = s.paragraphs_ja || [];
  if (ps.length < 2 || ps.length > 4) err(`${L}: paragraphs_ja must be 2–4 (has ${ps.length})`);
  ps.forEach((p, j) => { if (jaLen(p) < 80) err(`${L} paragraph ${j + 1}: too short (${jaLen(p)} chars)`); else if (jaLen(p) > 360) warn(`${L} paragraph ${j + 1}: long (${jaLen(p)} chars, target 150–300)`); });
  if ((s.paragraphs_en || []).length !== ps.length) warn(`${L}: paragraphs_en should mirror paragraphs_ja`);
  if (!(s.item_ids || []).length) warn(`${L}: item_ids is empty`);
  (s.item_ids || []).forEach(id => checkItem(L, id));
  useIds(L, s.source_ids);
  bodyLen += ps.reduce((n, p) => n + jaLen(p), 0);
  jaTexts.push(s.title_ja, s.claim_ja, ...ps);
});

// Japan, verification, developments, reading
const jp = doc.japan_paragraphs_ja || [];
if (!jp.length) warn('japan_paragraphs_ja is empty (say why in the report)');
bodyLen += jp.reduce((n, p) => n + jaLen(p), 0);
jaTexts.push(...jp);
if (bodyLen < 2400) err(`本文が ${bodyLen} 字。3,000〜5,000字を目安に書く`);
else if (bodyLen < 3000 || bodyLen > 5500) warn(`本文が ${bodyLen} 字（目安 3,000〜5,000字）`);

const ver = doc.verification || [];
if (ver.length < 3 || ver.length > 5) err(`verification must be 3–5 (has ${ver.length})`);
ver.forEach((v, i) => { if (!str(v.text_ja) || !str(v.text_en)) err(`verification ${i + 1}: text_ja and text_en are required`); jaTexts.push(v.text_ja); });

const dev = doc.developments || [];
if (dev.length < 8) warn(`developments has ${dev.length} entries (target 8–30)`);
dev.forEach((d, i) => {
  const L = `developments ${i + 1}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date || '')) err(`${L}: date is required`);
  else if (d.date > doc.date) err(`${L}: date is after the publication date`);
  for (const k of ['title_ja', 'title_en']) if (!str(d[k])) err(`${L}: ${k} is required`);
  if (d.confidence && !/^[A-F][1-6]$/.test(d.confidence)) err(`${L}: confidence must look like B2`);
  if (d.item_id) checkItem(L, d.item_id);
  useIds(L, d.source_ids);
});

const reading = doc.reading || [];
if (reading.length < 3 || reading.length > 5) warn(`reading has ${reading.length} entries (target 3–5)`);
reading.forEach((r, i) => { useIds(`reading ${i + 1}`, [r.source_id]); if (!str(r.reason_ja)) err(`reading ${i + 1}: reason_ja is required`); });
for (const id of sourceIds) if (!used.has(id)) warn(`source ${id} is not cited anywhere`);

// Style
for (const t of jaTexts.filter(str)) {
  const m = t.match(/.{0,12}ではなく.{0,12}/);
  if (m) err(`「〜ではなく」の構文を書き換える → …${m[0]}…`);
  for (const w of PROCESS_WORDS) if (t.includes(w)) err(`作業過程の語「${w}」を本文から外す`);
}
const neg = jaTexts.join('').match(/(ではない|でない|がない|していない|されていない)/g) || [];
if (neg.length > 8) warn(`否定形が${neg.length}回ある。言える範囲を肯定文で示せないか見直す`);

// Markdown
const md = path.join(dir, `${week}.md`);
if (!fs.existsSync(md)) err(`handoff/weekly/${week}.md is missing`);
else {
  const t = fs.readFileSync(md, 'utf8');
  if (!t.startsWith('# Weekly AI × Security Brief')) err('Markdown must start with "# Weekly AI × Security Brief"');
  if (str(doc.title_ja) && !t.includes(doc.title_ja)) err('Markdown does not contain title_ja');
  for (const s of secs) if (str(s.title_ja) && !t.includes(s.title_ja)) err(`Markdown is missing section "${s.title_ja}"`);
}

for (const w of warnings) console.log('WARN  ' + w);
for (const e of errors) console.log('ERROR ' + e);
if (errors.length) { console.log(`check-weekly: ${errors.length} error(s), ${warnings.length} warning(s)`); process.exit(1); }
console.log(`check-weekly: OK — ${secs.length} sections, ${bodyLen} chars, ${sources.length} sources for ${week}, ${warnings.length} warning(s)`);
