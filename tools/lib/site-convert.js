'use strict';
// Converts hand-off manuscripts (docs/DAILY_BRIEF_RUNBOOK.md §4, docs/WEEKLY_BRIEF_RUNBOOK.md §3)
// into the public site's data format. The conversion copies text verbatim: it maps fields,
// it does not summarise, shorten or rewrite anything.

const STAGE_FALLBACK = {
  announced: ['発表', 'Announced'],
  solicitation: ['公募', 'Solicitation'],
  awarded: ['契約', 'Awarded'],
  fielded: ['配備', 'Fielded'],
  cancelled: ['中止', 'Cancelled'],
};

const SITE_AUTHOR = 'AI & Security Observatory';

function stageLabels(stage, tags) {
  if (!stage) return ['', ''];
  const t = ((tags && tags.stages) || []).find(s => s.id === stage);
  if (t) return [t.ja || t.label_ja || STAGE_FALLBACK[stage]?.[0] || stage, t.en || t.label_en || STAGE_FALLBACK[stage]?.[1] || stage];
  return STAGE_FALLBACK[stage] || [stage, stage];
}

const siteId = id => String(id || '').replace(/^cl-/, 'brief-');

function mapSources(sources, checkedOn) {
  return (sources || []).map((s, i) => ({
    title: s.title,
    url: s.url,
    publisher: s.publisher,
    date: s.date || '',
    kind: s.kind === 'primary' ? 'primary' : 'reporting',
    id: `S${i + 1}`,
    // `accessed: false` in the manuscript means the writer could not open the page itself.
    checked_on: s.accessed === false ? '' : checkedOn,
  }));
}

function convertDailyItem(it, edition, tags) {
  const id = siteId(it.id);
  const sources = mapSources(it.sources, edition);
  const primary = sources.find(s => s.kind === 'primary');
  const [stageJa, stageEn] = stageLabels(it.stage, tags);
  const themes = it.themes || [];
  const isMain = it.tier === 'main';
  const out = {
    rank: it.rank,
    tier: it.tier,
    importance: it.importance,
    themes,
    actors: it.actors || [],
    forums: it.forums || [],
    kill_chain: it.kill_chain || [],
    doc_type: it.doc_type,
    publisher: it.publisher,
    publisher_en: it.publisher_en,
    japan_relevance: !!it.japan_relevance,
    reliability: it.reliability || '',
    continuation_of: it.continuation_of ? siteId(it.continuation_of) : '',
    title_ja: it.title_ja,
    title_en: it.title_en,
    summary_ja: isMain ? it.lead_ja : it.brief_text_ja,
    summary_en: isMain ? it.lead_en : it.brief_text_en,
    id,
    analysis_schema: 3,
    manuscript_id: it.id,
    date: it.date,
    published_date: it.date,
    event_date: it.event_date || it.date,
    brief_date: edition,
    collected_on: edition,
    primary_theme: themes[0] || '',
    secondary_themes: themes.slice(1),
    stage_ja: stageJa,
    stage_en: stageEn,
    stage: it.stage || '',
    author: SITE_AUTHOR,
    sample: false,
    created: edition,
    updated: edition,
    date_precision: 'day',
    related: [],
    question_ids: [],
    promote_to: 'none',
    comment_ja: '',
    comment_en: '',
    facts_ja: [],
    facts_en: [],
    source_urls: sources.map(s => s.url),
    source_kind: primary ? 'primary' : 'reporting',
    source_ids: sources.map(s => `${id}-${s.id}`),
    sources,
    url: (primary || sources[0] || {}).url || '',
  };
  if (it.battlefield_claim) out.battlefield_claim = true;
  if (isMain) {
    out.analysis = {
      lead_ja: it.lead_ja,
      lead_en: it.lead_en,
      sections: (it.sections || []).map(s => ({
        heading_ja: s.heading_ja,
        heading_en: s.heading_en,
        paragraphs_ja: [...(s.paragraphs_ja || [])],
        paragraphs_en: [...(s.paragraphs_en || [])],
      })),
      watch_next_ja: it.watch_next_ja,
      watch_next_en: it.watch_next_en,
      sources,
    };
  }
  return out;
}

function convertDaily(man, tags) {
  const edition = man.edition_date;
  const items = [...man.items].sort((a, b) => a.rank - b.rank).map(it => convertDailyItem(it, edition, tags));
  const ja = man.lead_points_ja || [];
  const en = man.lead_points_en || [];
  const meta = {
    schema_version: 3,
    edition_date: edition,
    edition_title_ja: man.edition_title_ja,
    edition_title_en: man.edition_title_en,
    edition_dek_ja: man.edition_dek_ja,
    edition_dek_en: man.edition_dek_en,
    lead_points: ja.map((t, i) => ({ text_ja: t, text_en: en[i] || '' })),
    upcoming: (man.upcoming || []).map(u => {
      const o = { date: u.date, text_ja: u.text_ja, text_en: u.text_en };
      if (u.url) o.url = u.url;
      return o;
    }),
  };
  return { items, meta };
}

function convertWeekly(man) {
  const sections = (man.sections || []).map(s => ({
    id: s.id,
    title_ja: s.title_ja,
    title_en: s.title_en,
    claim_ja: s.claim_ja,
    claim_en: s.claim_en,
    body_ja: (s.paragraphs_ja || []).join('\n\n'),
    body_en: (s.paragraphs_en || []).join('\n\n'),
    development_ids: (s.item_ids || []).map(siteId),
  }));
  const japanJa = (man.japan_paragraphs_ja || []).join('\n\n');
  const japanEn = (man.japan_paragraphs_en || []).join('\n\n');
  const bodyJa = [man.lead_ja, ...sections.map(s => s.body_ja), japanJa].filter(Boolean).join('\n\n');
  const bodyEn = [man.lead_en, ...sections.map(s => s.body_en), japanEn].filter(Boolean).join('\n\n');
  return [{
    id: `weekly-${man.week}`,
    week: man.week,
    date: man.date,
    updated: man.date,
    title_ja: man.title_ja,
    title_en: man.title_en,
    test_edition: false,
    themes: man.themes || [],
    sections,
    lead_ja: man.lead_ja,
    lead_en: man.lead_en,
    japan_ja: japanJa,
    japan_en: japanEn,
    verification: (man.verification || []).map(v => ({ text_ja: v.text_ja, text_en: v.text_en })),
    appendix_a: (man.developments || []).map(d => ({
      date: d.date,
      title_ja: d.title_ja,
      title_en: d.title_en,
      actor_ja: d.actor_ja,
      actor_en: d.actor_en,
      stage_ja: d.stage_ja,
      stage_en: d.stage_en,
      source_ids: d.source_ids || [],
      confidence: d.confidence || '',
      item_id: d.item_id ? siteId(d.item_id) : '',
    })),
    appendix_b: (man.reading || []).map(r => ({ source_id: r.source_id, reason_ja: r.reason_ja, reason_en: r.reason_en })),
    sources: (man.sources || []).map(s => ({
      id: s.id,
      title: s.title,
      publisher: s.publisher,
      url: s.url,
      published: s.date || '',
      published_date: s.date || '',
      checked_on: s.accessed === false ? '' : man.date,
      kind: s.kind === 'primary' ? 'primary' : 'reporting',
    })),
    item_ids: (man.item_ids || []).map(siteId),
    schema_version: 2,
    summary_ja: man.lead_ja,
    summary_en: man.lead_en,
    coverage_note_ja: `対象期間：${man.coverage_from}〜${man.coverage_to}。`,
    coverage_note_en: `Period covered: ${man.coverage_from} to ${man.coverage_to}.`,
    body_ja: bodyJa,
    body_en: bodyEn,
    editorial_credit_key: 'editorial_credit',
  }];
}

module.exports = { convertDaily, convertDailyItem, convertWeekly, stageLabels, siteId };
