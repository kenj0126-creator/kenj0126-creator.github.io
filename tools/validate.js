#!/usr/bin/env node
// Dependency-free content validation. A failing check exits with status 1.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.argv[2] || path.join(__dirname,'../dist'));
const errors=[],records=[],references=[];
const fail=(file,msg)=>errors.push(`${file}: ${msg}`);
const read=file=>{try{return JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));}catch(e){fail(file,e.message);return null;}};
const tags=read('config/tags.json')||{},site=read('config/site.json')||{},index=read('data/index.json')||{};
const text=(r,k,file)=>{if(typeof r[k]!=='string'||!r[k].trim())fail(file,`${r.id||'?'} missing/non-string ${k}`);};
const array=(r,k,file)=>{if(!Array.isArray(r[k])){fail(file,`${r.id||'?'} ${k} must be an array`);return [];}return r[k];};
const date=(d,file,key)=>{const parsed=new Date(d);if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==d)fail(file,`${key}: invalid date ${d}`);};
const enumCheck=(v,allowed,file,key)=>{if(!allowed.includes(v))fail(file,`${key}: invalid value ${v}`);};
const url=(v,file,key)=>{try{const u=new URL(v);if(!['https:','http:'].includes(u.protocol))throw new Error();}catch{fail(file,`${key}: invalid HTTP(S) URL`);}};
const vocabulary=(r,field,group,file,required=false)=>{
  const values=r[field]===undefined&&!required?[]:array(r,field,file);
  for(const v of values)if(!tags[group]?.some(t=>t.id===v))fail(file,`${r.id||'?'} unregistered ${field}: ${v}`);
  if(field==='themes'&&(values.length<1||values.length>3))fail(file,`${r.id||'?'} themes must contain 1–3 values`);
};
const ref=(id,file,key)=>{if(id)references.push({id,file,key});};
const refs=(r,key,file)=>{for(const id of r[key]||[])ref(id,file,key);};
const identity=(r,file)=>{text(r,'id',file);records.push({r,file});if(r.sample!==undefined&&typeof r.sample!=='boolean')fail(file,`${r.id} sample must be boolean`);if(site.sample_mode&&r.sample!==true)fail(file,`${r.id} all records must be marked sample while sample_mode is enabled`);};
function common(r,file,kind){
  identity(r,file);
  for(const k of ['title_ja','publisher','doc_type','summary_ja','author'])text(r,k,file);
  for(const k of ['date','created','updated'])date(r[k],file,`${r.id}.${k}`);
  if(r.title_en!==undefined&&typeof r.title_en!=='string')fail(file,`${r.id}.title_en must be a string`);
  if(r.summary_en!==undefined&&typeof r.summary_en!=='string')fail(file,`${r.id}.summary_en must be a string`);
  vocabulary(r,'themes','themes',file,true);vocabulary(r,'actors','actors',file);vocabulary(r,'forums','forums',file);vocabulary(r,'kill_chain','kill_chain',file);
  if(!tags.doc_types?.some(t=>t.id===r.doc_type))fail(file,`${r.id} unregistered doc_type: ${r.doc_type}`);
  enumCheck(r.importance,[1,2,3],file,`${r.id}.importance`);
  if(r.importance===3)text(r,'japan_implication',file);
  if(r.battlefield_claim||kind==='cases'){if(!/^[A-F][1-6]$/.test(r.reliability||''))fail(file,`${r.id} battlefield claim requires reliability A–F + 1–6`);}
  else if(r.reliability&&!/^[A-F][1-6]$/.test(r.reliability))fail(file,`${r.id} invalid reliability`);
  if(!['concepts','cases','japan'].includes(kind))url(r.url,file,`${r.id}.url`);
  if(!r.sample&&String(r.url).includes('example.com'))fail(file,`${r.id} real record cannot use an example.com source`);
  refs(r,'related',file);
}
function arrayFile(file,kind,fn){const value=read(file);if(!Array.isArray(value)){fail(file,'expected an array');return;}value.forEach(r=>{if(!r||typeof r!=='object'){fail(file,'invalid record');return;}if(kind)common(r,file,kind);fn?.(r,file);});}
const money=(r,file)=>{if(r.amount!==null&&(typeof r.amount!=='number'||!Number.isFinite(r.amount)||r.amount<0))fail(file,`${r.id||'budget'} amount must be a nonnegative number or null`);text(r,'currency',file);};
arrayFile('data/library.json','library',(r,f)=>{enumCheck(r.category,['government','norms','academic','think-tank'],f,'category');enumCheck(r.status,['in-force','superseded','draft','n/a'],f,'status');if(typeof r.essential!=='boolean')fail(f,`${r.id} essential must be boolean`);array(r,'authors_list',f);ref(r.superseded_by,f,'superseded_by');});
arrayFile('data/tracker/programs.json','programs',(r,f)=>{for(const k of ['program_name','country','buyer','system_type','fiscal_year'])text(r,k,f);if(!tags.actors?.some(x=>x.id===r.country))fail(f,`${r.id} unknown country ${r.country}`);enumCheck(r.stage,tags.stages?.map(x=>x.id)||[],f,'stage');money(r,f);array(r,'vendors',f);array(r,'timeline',f).forEach(e=>{date(e.date,f,'timeline.date');text(e,'event',f);url(e.source_url,f,'timeline.source_url');});});
arrayFile('data/tracker/positions.json',null,(r,f)=>{identity(r,f);for(const k of ['actor','issue','stance','note_ja'])text(r,k,f);enumCheck(r.actor,tags.actors?.map(x=>x.id)||[],f,'actor');enumCheck(r.issue,tags.issues?.map(x=>x.id)||[],f,'issue');enumCheck(r.stance,tags.stances?.map(x=>x.id)||[],f,'stance');date(r.as_of,f,'as_of');url(r.evidence_url,f,'evidence_url');});
arrayFile('data/open-questions.json',null,(r,f)=>{identity(r,f);text(r,'question_ja',f);text(r,'current_assessment_ja',f);vocabulary(r,'themes','themes',f,true);date(r.last_updated,f,'last_updated');array(r,'evidence',f).forEach(e=>{date(e.date,f,'evidence.date');ref(e.item_id,f,'evidence.item_id');enumCheck(e.direction,['strengthens','weakens','mixed'],f,'direction');text(e,'note_ja',f);});});
for(const f of index.brief||[])arrayFile(f,'brief',(r,f)=>{date(r.brief_date,f,'brief_date');if(!Number.isInteger(r.rank)||r.rank<1)fail(f,`${r.id} rank must be positive integer`);enumCheck(r.promote_to,['library','tracker-program','tracker-country','none'],f,'promote_to');text(r,'comment_ja',f);ref(r.promoted_id,f,'promoted_id');});
for(const f of index.weekly||[])arrayFile(f,null,(r,f)=>{identity(r,f);text(r,'title_ja',f);text(r,'summary_ja',f);if(!/^\d{4}-W\d{2}$/.test(r.week))fail(f,`${r.id} invalid week`);vocabulary(r,'themes','themes',f,true);array(r,'item_ids',f).forEach(id=>ref(id,f,'item_ids'));});
for(const f of index.countries||[]){const r=read(f);if(!r)continue;common(r,f,'country');enumCheck(r.country,tags.actors?.map(x=>x.id)||[],f,'country');date(r.last_reviewed,f,'last_reviewed');for(const field of ['strategy_docs','key_programs'])array(r,field,f).forEach(id=>ref(id,f,field));array(r,'organizations',f);array(r,'budget_notes',f).forEach(b=>{money(b,f);url(b.source_url,f,'budget.source_url');});}
for(const e of index.content||[]){try{const raw=fs.readFileSync(path.join(root,e.path),'utf8'),match=raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);if(!match)throw new Error('missing JSON frontmatter');const r=JSON.parse(match[1]);common(r,e.path,e.section);enumCheck(r.status,['draft','published'],e.path,'status');text(r,'version',e.path);date(r.last_revised,e.path,'last_revised');for(const k of ['key_library_ids','related_cases','open_questions'])array(r,k,e.path).forEach(id=>ref(id,e.path,k));if(!match[2].includes('<!-- lang:ja -->'))fail(e.path,'missing Japanese content marker');}catch(err){fail(e.path,err.message);}}
const ids=new Set();for(const {r,file} of records){if(ids.has(r.id))fail(file,`duplicate ID ${r.id}`);ids.add(r.id);}for(const r of references)if(!ids.has(r.id))fail(r.file,`${r.key} references missing ID ${r.id}`);
for(const [group,values] of Object.entries(tags)){if(!Array.isArray(values)){fail('config/tags.json',`${group} must be an array`);continue;}const seen=new Set();values.forEach(r=>{if(seen.has(r.id))fail('config/tags.json',`duplicate ${group} ID ${r.id}`);seen.add(r.id);text(r,'ja','config/tags.json');text(r,'en','config/tags.json');});}
for(const [folder,ext,listed] of [['data/brief','.json',index.brief||[]],['data/weekly','.json',index.weekly||[]],['data/tracker/countries','.json',index.countries||[]],...['concepts','cases','japan'].map(k=>[`content/${k}`,'.md',(index.content||[]).filter(e=>e.section===k).map(e=>e.path)])]){
 try{for(const f of fs.readdirSync(path.join(root,folder)).filter(f=>f.endsWith(ext))){if(!listed.includes(`${folder}/${f}`))fail('data/index.json',`missing ${folder}/${f}; run node tools/index-data.js`);}}catch(e){fail(folder,e.message);}
}
for(const lang of ['ja','en'])for(const p of ['','brief/','library/','tracker/','concepts/','cases/','japan/','about/'])if(!fs.existsSync(path.join(root,lang,p,'index.html')))fail(`${lang}/${p}`,'missing page');
for(const key of ['name','editor_ja','editor_en','hero_ja','hero_en','sample_notice_ja','sample_notice_en'])text(site,key,'config/site.json');
if(errors.length){console.error(`Validation failed: ${errors.length} issue(s)\n`+errors.map(e=>'• '+e).join('\n'));process.exitCode=1;}else console.log(`Validation passed: ${records.length} records, ${references.length} ID references, 16 localized pages. All required fields and controlled tags are valid.`);
