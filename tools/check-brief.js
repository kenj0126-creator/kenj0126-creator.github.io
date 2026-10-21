#!/usr/bin/env node
// Daily-brief specific checks, run in addition to tools/validate.js.
// Usage: node tools/check-brief.js YYYY-MM-DD
// Exit 1 on any error. Warnings are printed but do not fail the run.
const fs = require('node:fs');
const path = require('node:path');

const day = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '')) { console.error('Usage: node tools/check-brief.js YYYY-MM-DD'); process.exit(2); }
const root = path.resolve(__dirname, '../dist');
const file = path.join(root, 'data/brief', `${day}.json`);
const errors = [], warnings = [];
const err = m => errors.push(m), warn = m => warnings.push(m);

let items;
try { items = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error(`Cannot read ${file}: ${e.message}`); process.exit(1); }
if (!Array.isArray(items)) { console.error('Brief file must be a JSON array'); process.exit(1); }
if (items.length < 1) err('brief has no items (do not publish an empty brief; skip the day instead)');
if (items.length > 8) err(`brief has ${items.length} items; maximum is 8`);
if (items.length > 6) warn(`brief has ${items.length} items; 6 is the usual target, 8 the ceiling`);

const tags = JSON.parse(fs.readFileSync(path.join(root, 'config/tags.json'), 'utf8'));
const idOf = (g, v) => tags[g].some(t => t.id === v);
const jaLen = s => (s || '').replace(/\s/g, '').length;

// Collect URLs/IDs from earlier briefs to catch duplicates across days.
const briefDir = path.join(root, 'data/brief');
const earlier = fs.readdirSync(briefDir).filter(f => f.endsWith('.json') && f !== `${day}.json`);
const seenUrls = new Map();
for (const f of earlier) { try { for (const r of JSON.parse(fs.readFileSync(path.join(briefDir, f), 'utf8'))) if (r.url) seenUrls.set(r.url, f); } catch {} }

const ranks = new Set();
items.forEach((r, i) => {
  const n = String(i + 1).padStart(2, '0');
  const expectId = `brief-${day.replace(/-/g, '')}-${n}`;
  if (r.id !== expectId) err(`${r.id}: id should be ${expectId} (items ordered by rank)`);
  if (r.rank !== i + 1) err(`${r.id}: rank should be ${i + 1}`);
  if (ranks.has(r.rank)) err(`${r.id}: duplicate rank ${r.rank}`); ranks.add(r.rank);
  if (r.brief_date !== day) err(`${r.id}: brief_date must be ${day}`);
  if (r.created !== day) err(`${r.id}: created must be ${day} (the brief date)`);
  if (typeof r.updated !== 'string' || r.updated < day) err(`${r.id}: updated must be ${day} or later`);
  if (typeof r.date !== 'string' || r.date > day) err(`${r.id}: date (publication/event date) must not be after the brief date`);
  if (r.date && r.date < '2000-01-01') err(`${r.id}: implausible date ${r.date}`);
  if (typeof r.url !== 'string' || !/^https?:\/\//.test(r.url)) err(`${r.id}: url must be a direct HTTP(S) link to the source`);
  if (/example\.com/.test(r.url || '')) err(`${r.id}: placeholder URL`);
  if (seenUrls.has(r.url)) warn(`${r.id}: same URL already used in ${seenUrls.get(r.url)} (fine only if there is a genuinely new development)`);
  for (const k of ['title_ja', 'title_en', 'summary_ja', 'summary_en', 'comment_ja', 'publisher', 'publisher_en', 'author']) if (typeof r[k] !== 'string' || !r[k].trim()) err(`${r.id}: missing ${k}`);
  const L = jaLen(r.summary_ja);
  if (L < 150) err(`${r.id}: summary_ja is ${L} chars; write roughly 300–500 characters (new facts, significance, implications)`);
  else if (L < 250 || L > 600) warn(`${r.id}: summary_ja is ${L} chars (target 300–500)`);
  if ((r.summary_en || '').length < 120) warn(`${r.id}: summary_en is short (${(r.summary_en || '').length} chars); aim for 2–4 sentences`);
  if (!Array.isArray(r.themes) || r.themes.length < 1 || r.themes.length > 3) err(`${r.id}: themes must have 1–3 ids`);
  for (const [field, group] of [['themes', 'themes'], ['actors', 'actors'], ['forums', 'forums'], ['kill_chain', 'kill_chain']]) for (const v of r[field] || []) if (!idOf(group, v)) err(`${r.id}: unregistered ${field} id ${v}`);
  if (!idOf('doc_types', r.doc_type)) err(`${r.id}: unregistered doc_type ${r.doc_type}`);
  if (![1, 2, 3].includes(r.importance)) err(`${r.id}: importance must be 1, 2 or 3`);
  if (r.importance === 3 && !(r.japan_implication || '').trim()) err(`${r.id}: importance 3 requires japan_implication`);
  if ((r.japan_implication || '').trim() && !(r.japan_implication_en || '').trim()) warn(`${r.id}: japan_implication_en missing`);
  if (r.battlefield_claim === true && !/^[A-F][1-6]$/.test(r.reliability || '')) err(`${r.id}: battlefield claims need a reliability code such as B2`);
  if (r.battlefield_claim !== true && r.reliability && !/^[A-F][1-6]$/.test(r.reliability)) err(`${r.id}: invalid reliability ${r.reliability}`);
  if (!['library', 'tracker-program', 'tracker-country', 'none'].includes(r.promote_to)) err(`${r.id}: invalid promote_to`);
  const structural = ['strategy', 'law-regulation', 'declaration', 'official-report'].includes(r.doc_type);
  if (r.importance === 3 && structural && r.promote_to !== 'library') warn(`${r.id}: importance 3 + ${r.doc_type} normally promotes to library`);
  if (r.doc_type === 'budget-procurement' && r.promote_to !== 'tracker-program') warn(`${r.id}: budget/procurement items normally promote to tracker-program`);
  if (!Array.isArray(r.related)) err(`${r.id}: related must be an array (may be empty)`);
  if (r.sample === true) err(`${r.id}: sample must not be true on a real brief`);
  if (!['primary', 'media', 'mixed'].includes(r.source_type)) warn(`${r.id}: source_type should be primary | media | mixed`);
  if (r.collected !== day) warn(`${r.id}: collected (collection date) should be ${day}`);
});

// Index must list the file.
const index = JSON.parse(fs.readFileSync(path.join(root, 'data/index.json'), 'utf8'));
if (!(index.brief || []).includes(`data/brief/${day}.json`)) err(`data/index.json does not list data/brief/${day}.json; run node tools/index-data.js`);

for (const w of warnings) console.log('WARN  ' + w);
for (const e of errors) console.log('ERROR ' + e);
if (errors.length) { console.log(`check-brief: ${errors.length} error(s), ${warnings.length} warning(s)`); process.exit(1); }
console.log(`check-brief: OK — ${items.length} item(s) for ${day}, ${warnings.length} warning(s)`);
