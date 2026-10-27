#!/usr/bin/env node
// Checks a Daily Brief manuscript written for hand-off (runbook v2).
// Usage: node tools/check-handoff.js YYYY-MM-DD
// Files: handoff/daily/YYYY-MM-DD.json and handoff/daily/YYYY-MM-DD.md
// Exit 1 on any ERROR. WARN lines are printed but do not fail the run.
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const day = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '')) { console.error('Usage: node tools/check-handoff.js YYYY-MM-DD'); process.exit(2); }

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'handoff/daily');
const jsonFile = path.join(dir, `${day}.json`);
const mdFile = path.join(dir, `${day}.md`);
const errors = [];
const warnings = [];
const err = m => errors.push(m);
const warn = m => warnings.push(m);

let doc;
try { doc = JSON.parse(fs.readFileSync(jsonFile, 'utf8')); } catch (e) { console.error(`Cannot read ${jsonFile}: ${e.message}`); process.exit(1); }
if (!doc || typeof doc !== 'object' || Array.isArray(doc)) { console.error('Manuscript must be a JSON object (see runbook §4)'); process.exit(1); }

const tags = JSON.parse(fs.readFileSync(path.join(root, 'dist/config/tags.json'), 'utf8'));
const has = (group, v) => (tags[group] || []).some(t => t.id === v);
const jaLen = s => (s || '').replace(/\s/g, '').length;
const sentences = s => ((s || '').match(/[。！？]/g) || []).length;
const str = v => typeof v === 'string' && v.trim().length > 0;

const BANNED_HEADINGS = ['何が起きたか', '背景と経緯', '背景', '経緯', '概要', 'なぜ重要か', '意義', '重要性', '解釈の分かれ目', '日本への含意', '次に見るべき点', '今後の焦点', '今後の展望', 'まとめ', '詳細', '分析', 'ポイント'];
const PROCESS_WORDS = ['遅延確認', '確認窓', '重複確認', '本号の評価', '候補台帳', '補遺として', 'Claude', 'ChatGPT', '生成AIの支援', '人による確認待ち'];

// Top level
if (doc.edition_date !== day) err(`edition_date must be ${day}`);
if (!str(doc.generated_at) || Number.isNaN(Date.parse(doc.generated_at))) err('generated_at must be an ISO 8601 timestamp');
if (!Array.isArray(doc.lead_points_ja) || doc.lead_points_ja.length < 3 || doc.lead_points_ja.length > 5) err('lead_points_ja must have 3–5 entries');
if (!Array.isArray(doc.lead_points_en) || doc.lead_points_en.length !== (doc.lead_points_ja || []).length) warn('lead_points_en should mirror lead_points_ja');
if (!Array.isArray(doc.items) || doc.items.length < 1) { console.error('items must be a non-empty array'); process.exit(1); }
if (!doc.internal || !Array.isArray(doc.internal.dropped)) warn('internal.dropped is missing (record notable candidates you did not use)');

// Earlier manuscripts, for duplicate URLs
const seen = new Map();
if (fs.existsSync(dir)) {
  for (const f of fs.readdirSync(dir).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f) && f < `${day}.json`)) {
    try { for (const it of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).items || []) for (const s of it.sources || []) if (s.url) seen.set(s.url, f); } catch { /* ignore unreadable */ }
  }
}

// Style scan over every Japanese text field
const jaTexts = it => [it.title_ja, it.lead_ja, it.brief_text_ja, it.watch_next_ja, ...(it.sections || []).flatMap(s => [s.heading_ja, ...(s.paragraphs_ja || [])])].filter(str);
const styleScan = (label, texts) => {
  for (const t of texts) {
    const m = t.match(/.{0,12}ではなく.{0,12}/);
    if (m) err(`${label}: 「〜ではなく」の構文を書き換える → …${m[0]}…`);
    for (const w of PROCESS_WORDS) if (t.includes(w)) err(`${label}: 作業過程の語「${w}」を本文から外す（internal に記録する）`);
  }
  const neg = texts.join('').match(/(ではない|でない|がない|していない|されていない)/g) || [];
  if (neg.length > 3) warn(`${label}: 否定形が${neg.length}回ある。言える範囲を肯定文で示せないか見直す`);
};
styleScan('lead_points_ja', doc.lead_points_ja || []);

let main = 0;
let brief = 0;
const compact = day.replace(/-/g, '');
doc.items.forEach((it, i) => {
  const rank = i + 1;
  const id = `cl-${compact}-${String(rank).padStart(2, '0')}`;
  const L = it.id || `item ${rank}`;
  if (it.id !== id) err(`${L}: id should be ${id} (items ordered by rank)`);
  if (it.rank !== rank) err(`${L}: rank should be ${rank}`);
  if (!['main', 'brief'].includes(it.tier)) err(`${L}: tier must be "main" or "brief"`);
  if (![1, 2, 3].includes(it.importance)) err(`${L}: importance must be 1, 2 or 3`);
  for (const k of ['title_ja', 'title_en', 'publisher', 'publisher_en']) if (!str(it[k])) err(`${L}: missing ${k}`);
  const tl = jaLen(it.title_ja);
  if (tl > 60) warn(`${L}: title_ja is ${tl} chars (target 30–45)`);
  if (typeof it.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(it.date) || it.date > day) err(`${L}: date must be YYYY-MM-DD and not after ${day}`);
  if (typeof it.japan_relevance !== 'boolean') err(`${L}: japan_relevance must be true or false`);

  // Sources
  const src = Array.isArray(it.sources) ? it.sources : [];
  if (src.length < 1) err(`${L}: sources must list at least one source`);
  for (const s of src) {
    if (!str(s.url) || !/^https?:\/\//.test(s.url) || /example\.com/.test(s.url)) err(`${L}: each source needs a direct http(s) url`);
    if (!['primary', 'media'].includes(s.kind)) err(`${L}: source kind must be "primary" or "media"`);
    if (!str(s.title)) warn(`${L}: a source is missing its title`);
    if (seen.has(s.url)) warn(`${L}: ${s.url} was already used in ${seen.get(s.url)} (fine only for a genuine follow-up; set continuation_of)`);
  }

  // Tags
  if (!Array.isArray(it.themes) || it.themes.length < 1 || it.themes.length > 3) err(`${L}: themes must have 1–3 ids`);
  for (const [field, group] of [['themes', 'themes'], ['actors', 'actors'], ['forums', 'forums'], ['kill_chain', 'kill_chain']]) {
    if (!Array.isArray(it[field])) { err(`${L}: ${field} must be an array (may be empty)`); continue; }
    for (const v of it[field]) if (!has(group, v)) err(`${L}: unregistered ${field} id ${v}`);
  }
  if (!has('doc_types', it.doc_type)) err(`${L}: unregistered doc_type ${it.doc_type}`);
  if (it.stage && !has('stages', it.stage)) err(`${L}: unregistered stage ${it.stage}`);
  if (it.battlefield_claim === true && !/^[A-F][1-6]$/.test(it.reliability || '')) err(`${L}: battlefield claims need a reliability code such as B2`);
  if (it.battlefield_claim !== true && it.reliability && !/^[A-F][1-6]$/.test(it.reliability)) err(`${L}: invalid reliability ${it.reliability}`);

  if (it.tier === 'main') {
    main++;
    if (it.importance < 2) warn(`${L}: importance 1 items normally go in the brief tier`);
    if (!str(it.lead_ja) || !str(it.lead_en)) err(`${L}: main items need lead_ja and lead_en`);
    const ls = sentences(it.lead_ja);
    if (ls < 2 || ls > 4) warn(`${L}: lead_ja has ${ls} sentences (target 2–3)`);
    const secs = Array.isArray(it.sections) ? it.sections : [];
    if (secs.length < 2 || secs.length > 4) err(`${L}: main items need 2–4 sections (has ${secs.length})`);
    const heads = new Set();
    let body = 0;
    secs.forEach((s, j) => {
      const S = `${L} section ${j + 1}`;
      const h = (s.heading_ja || '').trim();
      if (!h) err(`${S}: missing heading_ja`);
      if (BANNED_HEADINGS.includes(h)) err(`${S}: 「${h}」は汎用の小見出し。内容に即した語句にする`);
      const hl = jaLen(h);
      if (h && (hl < 6 || hl > 24)) warn(`${S}: heading_ja is ${hl} chars (target 10–20)`);
      if (heads.has(h)) err(`${S}: duplicate heading`); heads.add(h);
      if (!str(s.heading_en)) warn(`${S}: missing heading_en`);
      const pj = Array.isArray(s.paragraphs_ja) ? s.paragraphs_ja : [];
      if (pj.length < 1 || pj.length > 4) err(`${S}: paragraphs_ja must have 1–3 paragraphs (has ${pj.length})`);
      pj.forEach((p, k) => {
        const pl = jaLen(p);
        body += pl;
        if (pl < 60) err(`${S} paragraph ${k + 1}: only ${pl} chars; develop the point or merge it`);
        else if (pl < 100 || pl > 300) warn(`${S} paragraph ${k + 1}: ${pl} chars (target 120–250)`);
      });
      const pe = Array.isArray(s.paragraphs_en) ? s.paragraphs_en : [];
      if (pe.length !== pj.length) warn(`${S}: paragraphs_en (${pe.length}) should mirror paragraphs_ja (${pj.length})`);
    });
    if (it.importance === 3) { if (body < 800) err(`${L}: body is ${body} chars; importance 3 needs about 1,000–1,600`); else if (body > 1800) warn(`${L}: body is ${body} chars (target 1,000–1,600)`); }
    if (it.importance === 2) { if (body < 450) err(`${L}: body is ${body} chars; importance 2 needs about 600–1,000`); else if (body < 550 || body > 1200) warn(`${L}: body is ${body} chars (target 600–1,000)`); }
    if (!str(it.watch_next_ja)) err(`${L}: main items need watch_next_ja`);
    if (!str(it.watch_next_en)) warn(`${L}: watch_next_en missing`);
    const primary = src.filter(s => s.kind === 'primary').length;
    const media = src.filter(s => s.kind === 'media').length;
    if (primary < 1 && media < 2) err(`${L}: main items need one primary source or two independent media sources`);
    if (it.brief_text_ja) warn(`${L}: brief_text_ja is ignored on main items`);
  } else if (it.tier === 'brief') {
    brief++;
    if (!str(it.brief_text_ja) || !str(it.brief_text_en)) err(`${L}: brief items need brief_text_ja and brief_text_en`);
    const bs = sentences(it.brief_text_ja);
    if (bs < 1 || bs > 3) warn(`${L}: brief_text_ja has ${bs} sentences (target 1–3)`);
    if (Array.isArray(it.sections) && it.sections.length) err(`${L}: brief items take no sections`);
  }
  styleScan(L, jaTexts(it));
});

if (main < 1) err('no main items; if the day is genuinely quiet, write one or two and say so in lead_points');
if (main > 8) err(`${main} main items; the ceiling is 8`);
if (main < 3) warn(`${main} main items (target 4–8)`);
if (brief > 15) warn(`${brief} brief items (target 5–15)`);
const mainRanks = doc.items.map((it, i) => (it.tier === 'main' ? i : -1)).filter(i => i >= 0);
const firstBrief = doc.items.findIndex(it => it.tier === 'brief');
if (firstBrief >= 0 && mainRanks.some(i => i > firstBrief)) warn('main items should come before brief items in rank order');

// Reading version
let md = '';
try { md = fs.readFileSync(mdFile, 'utf8'); } catch { err(`missing ${path.relative(root, mdFile)}`); }
if (md) {
  if (!md.startsWith('# Daily AI × Security Brief')) warn('Markdown should start with "# Daily AI × Security Brief — YYYY年M月D日"');
  for (const it of doc.items.filter(x => x.tier === 'main')) if (!md.includes((it.title_ja || '').trim())) warn(`${it.id}: its title does not appear in the Markdown version`);
  const m = md.match(/.{0,12}ではなく.{0,12}/);
  if (m) err(`Markdown: 「〜ではなく」の構文を書き換える → …${m[0]}…`);
}

for (const w of warnings) console.log('WARN  ' + w);
for (const e of errors) console.log('ERROR ' + e);
if (errors.length) { console.log(`check-handoff: ${errors.length} error(s), ${warnings.length} warning(s)`); process.exit(1); }
console.log(`check-handoff: OK — ${main} main / ${brief} brief item(s) for ${day}, ${warnings.length} warning(s)`);
