const lang = document.documentElement.lang === 'en' ? 'en' : 'ja';
const page = document.body.dataset.page;
const $ = (s, p = document) => p.querySelector(s);
const t = (ja, en) => lang === 'ja' ? ja : en;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tx = (v, key) => v[`${key}_${lang}`] || v[`${key}_ja`] || v[key] || '';
const params = () => new URLSearchParams(location.search);
const routes = ['home','brief','library','tracker','concepts','cases','japan','about'];
const navNames = {home:['ホーム','Home'],brief:['Daily Brief','Daily Brief'],library:['資料ライブラリ','Library'],tracker:['各国・調達','Tracker'],concepts:['論点と概念','Concepts'],cases:['ケーススタディ','Case Studies'],japan:['日本の視点','Japan Focus'],about:['編集方針','About']};
const url = (p, query = {}) => `/${lang}/${p === 'home' ? '' : p + '/'}${Object.keys(query).length ? '?' + new URLSearchParams(query) : ''}`;
const arrow = ''; // Links are identified by typography and focus, not decorative arrows.
let site, tags, data, records, byId;
const get = async p => { const r = await fetch('/' + p); if (!r.ok) throw new Error(`${p} (${r.status})`); return r.json(); };
const label = (group, id) => { const r = tags[group]?.find(x => String(x.id) === String(id)); return r ? r[lang] : id; };
const date = s => s ? s.replaceAll('-', '.') : '—';
const sample = item => item.sample ? `<span class="sample">${t('サンプル','SAMPLE')}</span>` : '';
const count = n => String(n).padStart(2, '0');
const itemURL = item => url(item._section === 'questions' ? 'concepts' : (item._section || 'library'), {id:item.id});
const safeURL = s => { try { const u = new URL(s, location.href); return ['http:','https:'].includes(u.protocol) ? u.href : '#'; } catch {return '#';} };
const source = item => item.sample ? `<span class="muted">${t('原典未登録 · 表示確認用','Source pending · illustrative sample')}</span>` : `<a class="text-link" href="${esc(safeURL(item.url))}" target="_blank" rel="noopener noreferrer">${t('原典を読む','Read original source')} ${arrow}</a>`;
const orderedThemes = ids => tags.themes.filter(theme=>(ids||[]).includes(theme.id)).map(theme=>theme.id);
const topicTags = item => `<div class="tags">${orderedThemes(item.themes).map(id=>`<a href="${url('library',{scope:'all',theme:id})}" class="tag" data-theme="${esc(id)}">${esc(label('themes',id))}</a>`).join('')}</div>`;
const related = ids => (ids||[]).map(id=>byId.get(id)).filter(Boolean).map(r=>`<a class="related-link" href="${itemURL(r)}">${esc(tx(r,'title')||tx(r,'question'))}</a>`).join('');
const importance = n => `<span class="importance i${n}">${esc(label('importance',n))}</span>`;
const heading = (_eyebrow,title,description,extra='') => `<header class="page-heading"><div class="heading-row"><h1>${title}</h1>${extra}</div><p>${description}</p></header>`;
const sectionHead = (_label,title,link='') => `<div class="section-head"><h2>${title}</h2>${link}</div>`;
const more = (p,text) => `<a class="text-link" href="${url(p)}">${text}</a>`;
const card = (r,featured=false) => `<article class="record ${featured?'featured':''}"><div class="record-meta"><time datetime="${r.date}">${date(r.date)}</time><span>${esc((r.actors||[]).map(a=>label('actors',a)).join(' / '))}</span><span>${esc(label('doc_types',r.doc_type))}</span>${sample(r)}</div><div class="record-copy"><h3><a href="${itemURL(r)}">${esc(tx(r,'title'))}</a></h3><p>${esc(tx(r,'summary'))}</p>${topicTags(r)}</div><div class="record-bottom">${importance(r.importance)}<a href="${itemURL(r)}" aria-label="${esc(tx(r,'title'))}">${t('詳細','Read')}</a></div></article>`;
const pending = () => `<div class="empty pending"><p>${t('登録準備中','No entries yet')}</p></div>`;
const empty = () => `<div class="empty"><h3>${t('該当する項目がありません','No matching entries')}</h3><p>${t('検索語や絞り込み条件を変更してください。','Try another keyword or fewer filters.')}</p><button class="button secondary" data-reset>${t('条件をリセット','Reset filters')}</button></div>`;
const money = x => x.amount == null ? t('未登録','Not entered') : `${Number(x.amount).toLocaleString(lang)} ${esc(x.currency)}`;

async function readMarkdown(entry) {
  const response = await fetch('/'+entry.path);
  if (!response.ok) throw new Error(entry.path);
  const raw = await response.text();
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) throw new Error(`Invalid frontmatter: ${entry.path}`);
  return {...JSON.parse(match[1]), body:match[2], _section:entry.section, path:entry.path};
}
function mdInline(text) {
  return esc(text).replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (_,label,href)=>`<a href="${esc(safeURL(href.replaceAll('&amp;','&')))}" rel="noopener noreferrer">${label}</a>`).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>');
}
function markdown(text) {
  const lines = text.trim().split('\n'); let out='', list=false, table=false;
  const close = () => { if (list) {out+='</ul>';list=false;} if(table) {out+='</tbody></table></div>';table=false;} };
  lines.forEach((line,i) => {
    if (line.startsWith('|')) {
      if (/^\|[\s:|\-]+\|$/.test(line)) return;
      const cells=line.split('|').slice(1,-1).map(x=>mdInline(x.trim()));
      if (!table) {if(list){out+='</ul>';list=false;} out+='<div class="table-wrap"><table><thead><tr>'+cells.map(c=>'<th scope="col">'+c+'</th>').join('')+'</tr></thead><tbody>';table=true;}
      else out+='<tr>'+cells.map(c=>'<td>'+c+'</td>').join('')+'</tr>';
    } else if (/^[-*] /.test(line)) {
      if(table){out+='</tbody></table></div>';table=false;}
      if(!list){out+='<ul>';list=true;}out+='<li>'+mdInline(line.slice(2))+'</li>';
    } else {close();if (/^## /.test(line)) out+=`<h2 id="part-${i}">${mdInline(line.slice(3))}</h2>`;else if(/^### /.test(line))out+='<h3>'+mdInline(line.slice(4))+'</h3>';else if(line.trim())out+='<p>'+mdInline(line)+'</p>';}
  });close();return out;
}
function articleBody(r) {
  const parts=r.body?.split('<!-- lang:');
  if(!parts || parts.length<2) return r.body ? markdown(r.body) : '';
  const selected=parts.find(p=>p.startsWith(lang+' -->')) || parts.find(p=>p.startsWith('ja -->'));
  return markdown(selected?.replace(/^(ja|en) -->/,'') || '');
}
function shell(content) {
  const other=lang==='ja'?'en':'ja';
  const mark=`<svg class="signal-logo" viewBox="0 0 48 48" aria-hidden="true"><path d="M4 10h34M10 24h34M4 38h29"/><circle cx="14" cy="10" r="3.5"/><circle cx="34" cy="24" r="3.5"/><circle cx="23" cy="38" r="3.5"/></svg>`;
  const links=routes.map(p=>`<a href="${url(p)}" ${p===page?'aria-current="page"':''}>${t(...navNames[p])}</a>`).join('');
  $('#app').innerHTML=`<header class="masthead"><div class="wrap brand-row"><a class="brand" href="${url('home')}" aria-label="AI & Security Observatory Home">${mark}<span><strong>${esc(site.short_name)}</strong><small>Observatory</small></span></a><div class="brand-right"><span class="editor">${esc(tx(site,'editor'))}</span><a class="language" href="/${other}/${page==='home'?'':page+'/'}${location.search}" lang="${other}">${lang==='ja'?'<b>JA</b><span>/</span>EN':'JA<span>/</span><b>EN</b>'}</a></div></div><nav class="wrap main-nav" aria-label="${t('メインナビゲーション','Main navigation')}">${links}</nav><details class="wrap mobile-nav"><summary>${t('メニュー','Menu')}</summary><nav aria-label="${t('メインナビゲーション','Main navigation')}">${links}</nav></details></header>
  ${site.sample_mode?`<div class="wrap preview-note">${esc(tx(site,'sample_notice'))}</div>`:''}<main id="main" class="${page==='home'&&!params().get('id')?'home-main':'wrap'}" tabindex="-1">${content}</main>
  <footer><div class="wrap footer-top"><div><a class="footer-brand" href="${url('home')}">${mark}<strong>AI & Security Observatory</strong></a><p>${esc(tx(site,'description'))}</p></div><div><span>${esc(tx(site,'editor'))}</span><p>${t('最終更新','Updated')} ${date(site.last_updated)} · v${esc(site.version)}</p></div></div><div class="wrap footer-bottom"><span>© 2026 AI & Security Observatory</span><a href="${url('about')}">${t('編集方針・方法論・免責','Editorial policy, methodology & disclaimer')}</a></div></footer>`;
  $('[data-reset]')?.addEventListener('click',()=>{history.replaceState({},'',url(page));render();});
}
function home() {
  const brief=[...data.brief].sort((a,b)=>b.brief_date.localeCompare(a.brief_date)||a.rank-b.rank),latest=brief[0]?.brief_date;
  const important=brief.filter(r=>r.importance===3).slice(0,3);
  const news=records.filter(r=>['library','tracker'].includes(r._section)).sort((a,b)=>b.updated.localeCompare(a.updated)).slice(0,5);
  const cases=data.content.filter(r=>r._section==='cases').slice(0,1);
  return `<section class="signal-hero" aria-labelledby="hero-title"><div class="wrap"><div class="hero-intro"><h1 id="hero-title">${esc(tx(site,'hero')).replace('\n','<br>')}</h1><div class="hero-description"><p>${esc(tx(site,'intro'))}</p><div class="hero-actions"><a class="button" href="${url('brief')}">${t('最新のBriefを読む','Read the latest brief')}</a><a class="text-link" href="${url('library')}">${t('資料を探す','Browse the library')}</a></div></div></div><div id="signal-panel"></div></div></section>
  <div class="wrap home-content"><div class="stats"><a href="${url('library')}"><span>${t('収録資料','Library entries')}</span><strong>${data.library.length}<small>${t('件','entries')}</small></strong></a><a href="${url('tracker')}"><span>${t('国・地域プロファイル','Country profiles')}</span><strong>${data.countries.length}<small>${t('件','profiles')}</small></strong></a><a href="${url('concepts')}"><span>${t('共通テーマ','Research themes')}</span><strong>${tags.themes.length}<small>${t('分野','themes')}</small></strong></a><a href="${url('about')}"><span>${t('編集体制','Editorship')}</span><strong class="stat-text">${t('個人編集','Individual')}</strong></a></div>
  <section class="section">${sectionHead('',t('今日のBrief','Today’s brief'),more('brief',t('すべてのBrief','All briefs')))}${latest?`<div class="home-brief"><div class="brief-date"><time datetime="${latest}">${date(latest)}</time></div><div class="brief-list">${brief.filter(b=>b.brief_date===latest).map((r,i)=>`<article class="brief-line"><span class="rank">${count(r.rank||i+1)}</span><div><div class="record-meta">${importance(r.importance)}${sample(r)}</div><h3><a href="${itemURL(r)}">${esc(tx(r,'title'))}</a></h3><p>${esc(tx(r,'comment'))}</p>${topicTags(r)}</div></article>`).join('')}</div></div>`:pending()}</section>
  <section class="section">${sectionHead('',t('テーマから探る','Explore by theme'))}<div class="themes-grid">${tags.themes.map(a=>`<a class="theme-tile" data-theme="${esc(a.id)}" href="${url('library',{scope:'all',theme:a.id})}">${esc(a[lang])}</a>`).join('')}</div></section>
  <section class="section two-columns"><div>${sectionHead('',t('重要動向','On the radar'))}${important.length?important.map(r=>card(r,true)).join(''):pending()}${sectionHead('',t('注目ケース','Case in focus'))}${cases.length?cases.map(r=>card(r)).join(''):pending()}</div><div>${sectionHead('',t('資料・トラッカーの新着','New in the collection'))}<div class="ledger">${news.map(r=>`<a class="ledger-row" href="${itemURL(r)}"><span class="ledger-meta">${r._section==='library'?'Library':'Tracker'} · ${date(r.updated)}</span><strong>${esc(tx(r,'title'))}</strong>${sample(r)}</a>`).join('')||pending()}</div></div></section>
  <section class="section questions-band">${sectionHead('',t('未解決の問い','Open questions'),more('concepts',t('論点と概念へ','Explore concepts')))}<div class="question-grid">${data.questions.map(q=>`<a href="${url('concepts',{id:q.id})}" class="question-card"><h3>${esc(tx(q,'question'))}</h3><span>${t('更新','Updated')} ${date(q.last_updated)}</span></a>`).join('')||pending()}</div></section></div>`;
}

// Presentation-only projection. Stored records and their controlled tags are never mutated.
let signalRange=null,signalHasAnimated=false,signalCleanup=null;
const signalDay=86400000;
const utcDay=value=>Date.parse(value+'T00:00:00Z');
function signalToday() {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const part=type=>parts.find(p=>p.type===type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
function signalItems() {
  const common=[...data.brief,...data.library,...data.programs,...data.countries].map(r=>({id:r.id,title:tx(r,'title'),date:r.date,themes:orderedThemes(r.themes),importance:r.importance,href:itemURL(r),kind:r._section==='brief'?'Brief':r._section==='library'?'Library':r.strategy_docs?t('Tracker・国別プロファイル','Tracker · country profile'):t('Tracker・調達','Tracker · program'),dateKind:r.strategy_docs?t('基準日','Reference date'):t('公表日','Publication date')}));
  const positions=data.positions.map(r=>({id:r.id,title:`${label('actors',r.actor)} / ${label('issues',r.issue)} / ${label('stances',r.stance)}`,date:r.as_of,themes:['governance-norms'],importance:null,href:url('tracker',{view:'positions'})+'#'+encodeURIComponent(r.id),kind:t('Tracker・規範形成での立場','Tracker · position on norms'),dateKind:t('確認日','As of')}));
  return [...new Map([...common,...positions].map(r=>[r.id,r])).values()].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
}
function signalView(items,{width=1200,compact=false,range='all',today=signalToday(),animate=false}={}) {
  const end=utcDay(today),valid=items.filter(r=>Number.isFinite(utcDay(r.date))&&utcDay(r.date)<=end);
  const start=range==='30'?end-29*signalDay:Math.min(end-29*signalDay,...valid.map(r=>utcDay(r.date)));
  const visible=valid.filter(r=>utcDay(r.date)>=start),left=compact?106:264,right=16,top=34,row=34,bottom=top+tags.themes.length*row,plotWidth=Math.max(80,width-left-right),height=bottom+42;
  const xFor=stamp=>left+(stamp-start)/(end-start)*plotWidth;
  const shortNames={ja:['意思決定・C2','ISR・標的','自律・無人','核・抑止','認知・情報','サイバー','計算資源','AI安全性','産業・調達','規範形成'],en:['Decision & C2','ISR & targeting','Autonomy','Nuclear C3','Cognitive','Cyber','Compute','AI safety','Acquisition','Norms']};
  const tickCount=compact?2:5,ticks=Array.from({length:tickCount},(_,i)=>start+(end-start)*i/(tickCount-1));
  const tickLabel=(stamp,i)=>{const d=new Date(stamp).toISOString().slice(0,10);if(i===tickCount-1)return t('今日','Today');return compact?d.slice(5).replace('-','/'):end-start>370*signalDay?d.slice(0,7).replace('-','.'):date(d);};
  const pointIndex=[];const occupied=new Map();
  const points=visible.flatMap(r=>r.themes.map(theme=>{
    const band=tags.themes.findIndex(v=>v.id===theme);if(band<0)return '';
    const x=xFor(utcDay(r.date)),bucket=band+':'+Math.round(x/14),n=occupied.get(bucket)||0;occupied.set(bucket,n+1);
    const y=top+band*row+row/2+(n===0?0:n%2?-9:9),radius=r.importance===3?6:r.importance===2?4:2.5;
    const index=pointIndex.length;pointIndex.push({item:r,band,x,y});
    const detail=`${r.title}。${r.dateKind}: ${r.date}。${r.kind}。${r.importance?t('重要度','Importance')+' '+r.importance:t('重要度未設定','Importance not set')}。${label('themes',theme)}`;
    return `<a class="signal-point level-${r.importance||'unset'}" href="${esc(r.href)}" tabindex="${index===0?'0':'-1'}" data-point="${index}" data-record="${esc(r.id)}" data-band="${band}" data-x="${x.toFixed(2)}" aria-label="${esc(detail)}"><circle class="signal-hit" cx="${x.toFixed(2)}" cy="${y}" r="12"/><circle class="signal-halo" cx="${x.toFixed(2)}" cy="${y}" r="${radius+4}"/><circle class="signal-mark" cx="${x.toFixed(2)}" cy="${y}" r="${radius}" style="--reveal-delay:${Math.round((x-left)/plotWidth*1200)}ms"/></a>`;
  })).join('');
  const svg=`<svg class="signal-svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-labelledby="signal-title signal-description"><title id="signal-title">${t('信号の場：テーマと時間からたどる登録項目','Signal field: entries across themes and time')}</title><desc id="signal-description">${t('横軸は時間、右端は今日。縦軸は10のテーマ。Tabで図に入り、矢印キーで点を移動、Enterで詳細へ。Escapeで補足を閉じます。','Time runs left to right, ending today. Ten rows represent themes. Tab enters the field; arrow keys move between points; Enter opens the entry; Escape dismisses the description.')}</desc><g class="signal-grid" aria-hidden="true">${tags.themes.map((r,i)=>`<rect class="signal-band" x="${left}" y="${top+i*row}" width="${plotWidth}" height="${row}"/><line x1="${left}" x2="${width-right}" y1="${top+i*row}" y2="${top+i*row}"/>`).join('')}<line x1="${left}" x2="${width-right}" y1="${bottom}" y2="${bottom}"/>${ticks.map(stamp=>`<line x1="${xFor(stamp)}" x2="${xFor(stamp)}" y1="${top}" y2="${bottom}"/>`).join('')}</g><g class="signal-labels" aria-hidden="true">${tags.themes.map((r,i)=>`<text x="0" y="${top+i*row+row/2}" dominant-baseline="middle">${esc(compact?shortNames[lang][i]:r[lang])}</text>`).join('')}${ticks.map((stamp,i)=>`<text class="signal-tick" x="${xFor(stamp)}" y="${bottom+28}" text-anchor="${i===0?'start':i===tickCount-1?'end':'middle'}">${esc(tickLabel(stamp,i))}</text>`).join('')}</g><g class="signal-points">${points}</g>${animate?`<rect class="signal-scan" x="${left}" y="${top}" width="1" height="${bottom-top}" style="--scan-distance:${plotWidth}px" aria-hidden="true"/>`:''}</svg>`;
  const dateStart=new Date(start).toISOString().slice(0,10);
  return {points:pointIndex,visible,html:`<div class="signal-chart ${animate?'is-scanning':''}" role="group" aria-label="${t('信号の場','Signal field')}"><div class="signal-toolbar"><p>${t('信号の場','Signal field')} <span>${visible.length} ${t('項目','entries')}</span></p><label for="signal-range">${t('期間','Period')}<select id="signal-range"><option value="all" ${range==='all'?'selected':''}>${t('全期間','All time')}</option><option value="30" ${range==='30'?'selected':''}>${t('直近30日','Last 30 days')}</option></select></label></div>${svg}${visible.length?'':`<p class="signal-no-data">${t('この期間の登録はありません。','No entries in this period.')}</p>`}<div class="signal-legend"><span><i class="legend-dot level-1"></i>${t('重要度1','Importance 1')}</span><span><i class="legend-dot level-2"></i>${t('重要度2','Importance 2')}</span><span><i class="legend-dot level-3"></i>${t('重要度3','Importance 3')}</span>${visible.some(r=>!r.importance)?`<span><i class="legend-dot level-unset"></i>${t('未設定','Not set')}</span>`:''}<span class="signal-period">${date(dateStart)} — ${date(today)} (${t('日本時間','Japan time')})</span></div><div id="signal-inspector" class="signal-inspector" role="status" aria-live="polite" aria-atomic="true"><p class="signal-help">${t('点に触れると、資料のタイトル・日付・種別を確認できます。','Hover or focus a point to read its title, date and type.')}<span>${t('キーボード：Tabで入り、矢印キーで移動、Enterで詳細へ。','Keyboard: Tab to enter, arrows to move, Enter to open.')}</span></p></div><details class="signal-alternative"><summary>${t('この図の項目を一覧で見る','View the entries in this chart as a list')} <span>(${visible.length})</span></summary><p class="signal-method">${t('複数テーマの項目は各帯に表示し、この一覧では1件にまとめています。規範形成の立場は確認日で配置し、重要度は未設定として表示しています。','An entry with multiple themes appears in each relevant row and once in this list. Positions on norms use their as-of date and have no assigned importance.')}</p><ul>${[...visible].reverse().map(r=>`<li><div><span>${r.dateKind} ${date(r.date)} · ${esc(r.kind)}</span><a href="${esc(r.href)}">${esc(r.title)}</a><small>${r.themes.map(id=>esc(label('themes',id))).join(' / ')} · ${r.importance?t('重要度','Importance')+' '+r.importance:t('重要度未設定','Importance not set')}</small></div></li>`).join('')||`<li>${t('この期間の登録はありません。','No entries in this period.')}</li>`}</ul></details></div>`};
}
function wireSignal() {
  signalCleanup?.();signalCleanup=null;
  const panel=$('#signal-panel');if(!panel)return;
  const compactQuery=window.matchMedia('(max-width:760px)'),motionQuery=window.matchMedia('(prefers-reduced-motion: reduce)');
  const items=signalItems();let timer,resizeFrame,measuredWidth=0,compactState;
  function paint(allowAnimation=false) {
    const compact=compactQuery.matches,width=Math.max(260,Math.round(panel.clientWidth|| (compact?350:1200))),range=signalRange||(compact?'30':'all');
    const listOpen=$('.signal-alternative',panel)?.open;
    const active=document.activeElement,activeRecord=active?.dataset?.record,activeBand=active?.dataset?.band;
    const animate=allowAnimation&&!signalHasAnimated&&!motionQuery.matches;
    signalHasAnimated=true;measuredWidth=width;compactState=compact;
    const view=signalView(items,{width,compact,range,animate});panel.innerHTML=view.html;
    if(listOpen)$('.signal-alternative',panel).open=true;
    const chart=$('.signal-chart',panel),info=$('#signal-inspector',panel),help=info.innerHTML,points=[...panel.querySelectorAll('.signal-point')];
    const stop=()=>{chart.classList.remove('is-scanning');clearTimeout(timer);};
    const describe=(index,announce)=>{
      stop();const item=view.points[index]?.item;if(!item)return;
      points.forEach(p=>p.classList.toggle('is-active',p.dataset.record===item.id));
      info.setAttribute('aria-live',announce?'polite':'off');
      info.innerHTML=`<p class="signal-inspector-meta">${esc(item.kind)} · ${esc(item.dateKind)} ${date(item.date)} · ${item.importance?t('重要度','Importance')+' '+item.importance:t('重要度未設定','Importance not set')}</p><a href="${esc(item.href)}">${esc(item.title)}</a>`;
    };
    points.forEach((point,index)=>{
      point.addEventListener('pointerenter',()=>describe(index,false));
      point.addEventListener('focus',()=>{points.forEach(p=>p.setAttribute('tabindex',p===point?'0':'-1'));describe(index,true);});
      point.addEventListener('keydown',event=>{
        let next=index;
        if(event.key==='Escape'){info.innerHTML=help;points.forEach(p=>p.classList.remove('is-active'));return;}
        if(event.key==='ArrowRight')next=(index+1)%points.length;
        else if(event.key==='ArrowLeft')next=(index+points.length-1)%points.length;
        else if(event.key==='Home')next=0;
        else if(event.key==='End')next=points.length-1;
        else if(event.key==='ArrowUp'||event.key==='ArrowDown'){
          const origin=view.points[index],step=event.key==='ArrowDown'?1:-1;
          for(let delta=1;delta<=tags.themes.length;delta++){
            const band=(origin.band+step*delta+tags.themes.length*2)%tags.themes.length;
            const candidates=view.points.map((p,i)=>({...p,index:i})).filter(p=>p.band===band);
            if(candidates.length){next=candidates.sort((a,b)=>Math.abs(a.x-origin.x)-Math.abs(b.x-origin.x))[0].index;break;}
          }
        }else return;
        event.preventDefault();points[next]?.focus();
      });
    });
    $('#signal-range',panel).addEventListener('change',event=>{signalRange=event.target.value;stop();paint();$('#signal-range',panel).focus();});
    if(animate)timer=setTimeout(stop,1250);
    if(activeRecord)points.find(p=>p.dataset.record===activeRecord&&p.dataset.band===activeBand)?.focus();
  }
  const resize=()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{if(Math.round(panel.clientWidth)!==measuredWidth||compactQuery.matches!==compactState)paint();});};
  const motion=()=>{if(motionQuery.matches){$('.signal-chart',panel)?.classList.remove('is-scanning');clearTimeout(timer);}};
  paint(true);window.addEventListener('resize',resize);motionQuery.addEventListener('change',motion);
  signalCleanup=()=>{clearTimeout(timer);cancelAnimationFrame(resizeFrame);window.removeEventListener('resize',resize);motionQuery.removeEventListener('change',motion);};
}

function options(group, selected) {return tags[group].map(x=>`<option value="${esc(x.id)}" ${String(selected)===String(x.id)?'selected':''}>${esc(x[lang])}</option>`).join('');}
function controls(isBrief) {
  const p=params(),field=(name,group,title)=>`<label><span>${title}</span><select name="${name}"><option value="">${t('すべて','All')}</option>${options(group,p.get(name))}</select></label>`;
  return `<form class="filters" id="filters" role="search"><label class="search-field"><span>${t('キーワード','Keyword')}</span><input type="search" name="q" placeholder="${t('タイトル、要旨、発行主体から検索','Search titles, summaries or publishers')}" value="${esc(p.get('q'))}"></label><div class="filter-grid">${field('theme','themes',t('テーマ','Theme'))}${field('actor','actors',t('国・主体','Actor'))}${field('doc','doc_types',t('文書種別','Document type'))}${field('forum','forums',t('規範フォーラム','Forum'))}${field('importance','importance',t('重要度','Importance'))}</div>${isBrief?`<div class="date-filters"><label>${t('開始日','From')}<input type="date" name="from" value="${esc(p.get('from'))}"></label><span>—</span><label>${t('終了日','To')}<input type="date" name="to" value="${esc(p.get('to'))}"></label></div>`:''}<div class="filter-bottom"><label class="checkbox"><input type="checkbox" name="${isBrief?'unused':'essential'}" ${p.get('essential')==='1'?'checked':''} ${isBrief?'hidden':''}>${isBrief?t('公表日とBrief掲載日は項目詳細で確認できます。','Publication and briefing dates appear in each entry.'):t('「まず読む」資料のみ','Essential reading only')}</label><button class="reset" type="reset">${t('条件をリセット','Reset filters')}</button></div></form>`;
}
function filtered(list) {
  const p=params();let result=list;
  if(p.get('q')) {const q=p.get('q').toLocaleLowerCase().trim();result=result.filter(r=>JSON.stringify(r).toLocaleLowerCase().includes(q));}
  for(const [key,field] of [['theme','themes'],['actor','actors'],['forum','forums']]) if(p.get(key)) result=result.filter(r=>r[field]?.includes(p.get(key)));
  if(p.get('doc'))result=result.filter(r=>r.doc_type===p.get('doc'));
  if(p.get('importance'))result=result.filter(r=>r.importance===Number(p.get('importance')));
  if(p.get('essential')==='1')result=result.filter(r=>r.essential);
  if(p.get('from'))result=result.filter(r=>(r.brief_date||r.date)>=p.get('from'));
  if(p.get('to'))result=result.filter(r=>(r.brief_date||r.date)<=p.get('to'));
  return [...result].sort((a,b)=>b.date.localeCompare(a.date)||(a.rank||0)-(b.rank||0));
}
function resultHTML(list) {
  const items=filtered(list);
  return `<div class="results-meta"><span><b>${items.length}</b> ${t('件の項目','entries')}</span><span>${t('公表日の新しい順','Newest publication first')}</span></div>${items.length?`<div class="records-grid">${items.map(r=>card(r)).join('')}</div>`:list.length?empty():pending()}`;
}
function collection(isBrief) {
  const scope=params().get('scope')==='all',list=isBrief?data.brief:scope?records.filter(r=>r.date):data.library;
  const tabs=isBrief?`<div class="tabs"><a class="${params().get('view')!=='weekly'?'active':''}" href="${url('brief')}">Daily Brief</a><a class="${params().get('view')==='weekly'?'active':''}" href="${url('brief',{view:'weekly'})}">Weekly Digest</a></div>`:`<div class="tabs"><a class="${!scope?'active':''}" href="${url('library')}">${t('収録資料','Library')}</a><a class="${scope?'active':''}" href="${url('library',{scope:'all'})}">${t('全セクション横断','Explore all sections')}</a><a href="#essential">${t('まず読む資料','Essential reading')}</a><a href="#norms-timeline">${t('規範形成の記録','Norms timeline')}</a></div>`;
  const intro=heading('',isBrief?'Daily Brief':t('資料ライブラリ','Library'),isBrief?t('日々の変化を、根拠と含意に分けて記録する。','Document daily changes, their evidence and implications.'):t('一次資料と研究をつなぎ、議論の根拠をたどる。','Follow the evidence through primary sources and research.'));
  if(isBrief&&params().get('view')==='weekly')return intro+tabs+`<div class="digest-list">${data.weekly.map(w=>`<article class="digest"><div class="record-meta">${esc(w.week)} ${sample(w)}</div><h2>${esc(tx(w,'title'))}</h2><p>${esc(tx(w,'summary'))}</p>${related(w.item_ids)}</article>`).join('')||pending()}</div>`;
  const essential=isBrief?'':`<section class="section" id="essential">${sectionHead('',t('カテゴリ別・まず読む資料','Essential reading by category'))}<p class="section-intro">${t('各カテゴリ最大5件。','Up to five entries per category.')}${site.sample_mode?t('表示確認用のサンプルを含みます。','Includes illustrative sample records.'):''}</p><div class="essential-grid">${[['government','政府文書','Government'],['norms','国際規範','Norms'],['academic','学術研究','Academic'],['think-tank','シンクタンク','Think tanks']].map(([id,ja,en])=>`<section class="essential-group"><h3>${t(ja,en)}</h3>${related(data.library.filter(r=>r.category===id&&r.essential).slice(0,5).map(r=>r.id))||pending()}</section>`).join('')}</div></section><section class="section" id="norms-timeline">${sectionHead('',t('規範形成の記録','Norms timeline'))}<div class="timeline">${[...data.library].filter(r=>r.category==='norms'||r.forums?.length).sort((a,b)=>a.date.localeCompare(b.date)).map(r=>`<div><time datetime="${r.date}">${date(r.date)}</time><a href="${itemURL(r)}">${esc(tx(r,'title'))}</a>${sample(r)}</div>`).join('')||pending()}</div></section>`;
  return intro+tabs+controls(isBrief)+`<div id="results" aria-live="polite">${resultHTML(list)}</div>`+essential;
}
function tracker() {
  const view=params().get('view')||'countries',stage=params().get('stage')||'';
  let content='';
  if(view==='countries')content=`<div class="country-grid">${data.countries.map(r=>`<article class="country-card"><div class="country-top"><span class="country-code">${esc(r.country)}</span>${sample(r)}</div><h2><a href="${itemURL(r)}">${esc(label('actors',r.country))}</a></h2><p>${esc(tx(r,'summary'))}</p>${topicTags(r)}<div class="country-stats"><span>${r.strategy_docs.length} ${t('政策文書','policy documents')}</span><span>${r.key_programs.length} ${t('プログラム','programs')}</span></div><a class="text-link" href="${itemURL(r)}">${t('プロファイルを見る','Read country profile')}</a><small>${t('最終確認','Last reviewed')} ${date(r.last_reviewed)}</small></article>`).join('')||pending()}</div>`;
  if(view==='programs'){
    const list=data.programs.filter(r=>!stage||r.stage===stage),headers=[t('プログラム','Program'),t('国','Country'),t('段階','Stage'),t('金額','Amount'),t('年度','Fiscal year')];
    content=`<label class="stage-select">${t('調達段階','Acquisition stage')}<select id="stage"><option value="">${t('すべての段階','All stages')}</option>${options('stages',stage)}</select></label><div class="stage-flow">${tags.stages.map(s=>`<a class="${s.id===stage?'selected':''}" href="${url('tracker',{view:'programs',stage:s.id})}">${esc(s[lang])}<b>${data.programs.filter(r=>r.stage===s.id).length}</b></a>`).join('')}</div><div class="table-wrap"><table class="responsive-table"><caption>${t('調達・プログラム台帳','Acquisition register')}${site.sample_mode?t(' — 架空のサンプル',' — illustrative samples'):''}</caption><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${list.map(r=>`<tr><th scope="row"><a href="${itemURL(r)}">${esc(tx(r,'program_name'))}</a>${sample(r)}${topicTags(r)}${importance(r.importance)}</th><td data-label="${headers[1]}">${esc(label('actors',r.country))}</td><td data-label="${headers[2]}">${esc(label('stages',r.stage))}</td><td data-label="${headers[3]}" class="numeric">${money(r)}</td><td data-label="${headers[4]}" class="numeric">${esc(r.fiscal_year)}</td></tr>`).join('')||`<tr><td colspan="5">${data.programs.length?t('該当するプログラムはありません。','No programs at this stage.'):t('登録準備中','No entries yet')}</td></tr>`}</tbody></table></div>`;
  }
  if(view==='positions'){
    const actors=[...new Set(data.positions.map(r=>r.actor))];
    content=`<p class="inline-note">${site.sample_mode?t('表示確認用の架空の立場です。','These are illustrative positions.'):''}${t('空欄は未登録を意味します。各項目の根拠と確認日を併記します。','A dash means no entry. Evidence and as-of dates are listed below.')}</p><div class="table-wrap"><table class="responsive-table positions-table"><caption>${t('国・主体 × 論点','Actors × issues')}</caption><thead><tr><th scope="col">${t('国・主体','Actor')}</th>${tags.issues.map(i=>`<th scope="col">${esc(i[lang])}</th>`).join('')}</tr></thead><tbody>${actors.map(a=>`<tr><th scope="row">${esc(label('actors',a))}</th>${tags.issues.map(i=>{const r=data.positions.find(r=>r.actor===a&&r.issue===i.id);return `<td data-label="${esc(i[lang])}">${r?`<a class="stance" href="#${esc(r.id)}">${esc(label('stances',r.stance))} ${sample(r)}</a>`:'—'}</td>`;}).join('')}</tr>`).join('')||`<tr><td colspan="${tags.issues.length+1}">${t('登録準備中','No entries yet')}</td></tr>`}</tbody></table></div><div class="position-notes">${data.positions.map(r=>`<article id="${esc(r.id)}"><h3>${esc(label('actors',r.actor))} / ${esc(label('issues',r.issue))}</h3><p>${esc(tx(r,'note'))}</p><span>${t('確認日','As of')} ${date(r.as_of)} · </span>${r.sample?t('根拠：未登録（サンプル）','Evidence: pending (sample)'):`<a href="${esc(safeURL(r.evidence_url))}" target="_blank" rel="noopener noreferrer">${t('根拠資料','Evidence')}</a>`}</article>`).join('')}</div>`;
  }
  return heading('',t('各国・調達トラッカー','Tracker'),t('各国の方針、実装への道筋、規範形成での立場を比較する。','Compare national policies, acquisition pathways and positions on norms.'))+`<div class="tabs">${[['countries','国別プロファイル','Country profiles'],['programs','調達・プログラム','Acquisition register'],['positions','立場マトリクス','Positions matrix']].map(([id,ja,en])=>`<a class="${view===id?'active':''}" href="${url('tracker',{view:id})}">${t(ja,en)}</a>`).join('')}</div>`+content;
}

function questions() {if(!data.questions.length)return pending();return data.questions.map(q=>`<details class="question-detail" id="${q.id}"><summary><span>${sample(q)} ${esc(tx(q,'question'))}</span><span aria-hidden="true">+</span></summary><p>${esc(tx(q,'current_assessment'))}</p>${q.evidence.map(e=>`<div class="evidence"><span>${date(e.date)} · ${t('評価への影響','Assessment impact')}: ${t(...({strengthens:['支持を強める','Strengthens'],weakens:['支持を弱める','Weakens'],mixed:['混合','Mixed']}[e.direction]))}</span><p>${esc(tx(e,'note'))}</p>${related([e.item_id])}</div>`).join('')}<small>${t('更新','Updated')} ${date(q.last_updated)}</small></details>`).join('');}
function analysisPage(kind) {
  const titles={concepts:[t('論点と概念','Concepts'),t('何が問われ、どこまで分かっているのか。','What are the questions, and what do we know?'),'IDEAS & OPEN QUESTIONS'],cases:[t('ケーススタディ','Case Studies'),t('技術の使用、効果の主張、検証の限界を分けて読む。','Distinguish technology use, claimed effects and the limits of verification.'),'EVIDENCE IN CONTEXT'],japan:[t('日本の視点','Japan Focus'),t('政策、同盟、産業、研究。日本に関わる論点を横断する。','Connect policy, alliances, industry and research through a Japanese lens.'),'A JAPANESE PERSPECTIVE']};
  const [title,sub,eye]=titles[kind],list=data.content.filter(r=>r._section===kind);
  let extra='';
  if(kind==='concepts') extra=`<section class="section">${sectionHead('CONCEPT MAP',t('軍事利用のどこを考えるか','Where does AI enter military activity?'))}<p class="section-intro">${t('各段階から関連するテーマへ。テーマを選ぶと、資料・Brief・分析を横断して表示します。','Select a theme to find related sources, briefs and analysis across the site.')}</p><div class="concept-map">${tags.kill_chain.map((k,i)=>{const map=[['isr-targeting'],['c2-decision','nuclear-nc3'],['autonomy-laws'],['isr-targeting'],['industry-procurement','cyber-ci'],['cognitive']][i];return `<div><h3>${esc(k[lang])}</h3>${orderedThemes(map).map(id=>`<a href="${url('library',{scope:'all',theme:id})}">${label('themes',id)}</a>`).join('')}</div>`;}).join('')}</div><div class="cross-cutting"><span>${t('横断する条件','Cross-cutting conditions')}</span>${orderedThemes(['compute-export','frontier-safety','governance-norms']).map(id=>`<a href="${url('library',{scope:'all',theme:id})}">${label('themes',id)}</a>`).join('')}</div></section><section class="section" id="open-questions">${sectionHead('OPEN QUESTIONS',t('未解決の問い','Open questions'))}${questions()}</section><section class="section">${sectionHead('BILINGUAL GLOSSARY',t('日英対照・論点用語集','Bilingual topic glossary'))}<div class="table-wrap"><table><thead><tr><th scope="col">日本語</th><th scope="col">English</th></tr></thead><tbody>${tags.themes.map(r=>`<tr><th scope="row">${esc(r.ja)}</th><td>${esc(r.en)}</td></tr>`).join('')}</tbody></table></div></section>`;
  if(kind==='cases')extra=`<section class="section">${sectionHead('CROSS-CASE COMPARISON',t('同じ分析軸で比較する','Compare through a shared framework'))}<div class="table-wrap"><table><thead><tr><th scope="col">${t('ケース','Case')}</th><th scope="col">${t('対象','Type')}</th><th scope="col">${t('キルチェーン','Kill chain')}</th><th scope="col">${t('評価の確度','Confidence')}</th></tr></thead><tbody>${list.map(r=>`<tr><th scope="row"><a href="${itemURL(r)}">${esc(tx(r,'title'))}</a>${sample(r)}</th><td>${r.scenario?t('想定シナリオ','Hypothetical scenario'):t('分析テンプレート','Analysis template')}</td><td>${r.kill_chain.map(id=>label('kill_chain',id)).join(' / ')}</td><td><a href="${url('about')}#reliability">${esc(r.reliability)} · ${t('判断不能','Not assessed')}</a></td></tr>`).join('')||`<tr><td colspan="4">${t('登録準備中','No entries yet')}</td></tr>`}</tbody></table></div></section>`;
  if(kind==='japan')extra=`<section class="section">${sectionHead('JAPAN ACROSS THE OBSERVATORY',t('日本に関わる最新の登録','Japan across the collection'),`<a class="text-link" href="${url('library',{scope:'all',actor:'JP'})}">${t('すべて見る','View all')}</a>`)}<div class="records-grid">${records.filter(r=>r.actors?.includes('JP')&&!['japan'].includes(r._section)).slice(0,4).map(r=>card(r)).join('')}</div></section>`;
  return heading(eye,title,sub)+`<div class="records-grid">${list.map(r=>card(r)).join('')||pending()}</div>`+extra;
}
function countryDetail(r) {
  return `<h2>${t('戦略・方針文書','Strategy and policy documents')}</h2>${related(r.strategy_docs)}<h2>${t('推進組織と役割','Organizations and responsibilities')}</h2><div class="table-wrap"><table><thead><tr><th scope="col">${t('組織','Organization')}</th><th scope="col">${t('役割','Role')}</th></tr></thead><tbody>${r.organizations.map(o=>`<tr><th scope="row">${esc(tx(o,'name'))}</th><td>${esc(tx(o,'role'))}</td></tr>`).join('')}</tbody></table></div><h2>${t('予算と主要プログラム','Budget and key programs')}</h2>${r.budget_notes.map(b=>`<p>${esc(b.fiscal_year)} · ${esc(tx(b,'item'))}: ${money(b)}</p>`).join('')}${related(r.key_programs)}<h2>${t('規範形成での立場','Positions on norms')}</h2>${data.positions.filter(p=>p.actor===r.country).map(p=>`<p>${label('issues',p.issue)}: <a href="${url('tracker',{view:'positions'})}#${p.id}">${label('stances',p.stance)} ${sample(p)}</a></p>`).join('')}<h2>${t('同盟・パートナーとの協力','Alliances and partner cooperation')}</h2><p>${esc(tx(r,'cooperation'))}</p>`;
}
function programDetail(r) {
  return `<dl class="facts">${[[t('発注主体','Buyer'),tx(r,'buyer')],[t('企業','Vendors'),(r[lang==='en'?'vendors_en':'vendors']||r.vendors).join(' / ')||t('未登録','Not entered')],[t('システム','System'),tx(r,'system_type')],[t('段階','Stage'),label('stages',r.stage)],[t('金額','Amount'),money(r)],[t('年度','Fiscal year'),r.fiscal_year]].map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><h2>${t('プログラムの経過','Program timeline')}</h2><div class="timeline">${r.timeline.map(e=>`<div><span>${date(e.date)}</span><p>${esc(tx(e,'event'))}</p>${r.sample?sample(r):`<a href="${esc(safeURL(e.source_url))}" target="_blank" rel="noopener noreferrer">${t('根拠','Source')}</a>`}</div>`).join('')}</div>`;
}
function detail(id) {
  const r=byId.get(id);
  if(!r)return heading('NOT FOUND',t('項目が見つかりません','Entry not found'),t('IDを確認するか、一覧から項目を選び直してください。','Check the entry ID or select an item from the collection.'))+more(page,t('一覧へ戻る','Back to collection'));
  if(r._section==='questions')return `<div class="back">${more('concepts',t('論点と概念へ','Back to concepts'))}</div>`+heading('OPEN QUESTION',esc(tx(r,'question')),t('根拠の追加に応じて評価を更新する。','Revisit the assessment as new evidence arrives.'))+`<div class="article-body">${sample(r)}<p>${esc(tx(r,'current_assessment'))}</p><h2>${t('根拠と評価への影響','Evidence and assessment impact')}</h2>${r.evidence.map(e=>`<p>${date(e.date)} · ${esc(tx(e,'note'))}</p>${related([e.item_id])}`).join('')}</div>`;
  document.title=tx(r,'title')+' | AI & Security Observatory';
  const body=r.body?articleBody(r):r.country&&r.strategy_docs?countryDetail(r):r.program_name?programDetail(r):`<h2>${t('要旨','Summary')}</h2><p>${esc(tx(r,'summary'))}</p>${r.comment_ja?`<h2>${t('編集コメント','Editorial assessment')}</h2><p>${esc(tx(r,'comment'))}</p>`:''}${r.annotation_ja?`<h2>${t('この資料を読む意味','Why read this source')}</h2><p>${esc(tx(r,'annotation'))}</p>`:''}`;
  return `<div class="back"><a href="${url(r._section)}">${t('一覧へ戻る','Back to collection')}</a></div><header class="article-heading"><div class="record-meta">${sample(r)}<span>${t(...navNames[r._section])}</span><span>${date(r.date)}</span>${r.scenario?`<span class="pill">${t('想定シナリオ','HYPOTHETICAL SCENARIO')}</span>`:''}</div><h1>${esc(tx(r,'title'))}</h1><p>${esc(tx(r,'summary'))}</p>${topicTags(r)}</header><div class="article-layout"><article class="article-body">${body}<div class="implication"><h2>${t('日本への含意','Implications for Japan')}</h2><p>${esc(tx(r,'japan_implication'))}</p></div>${r.key_library_ids?.length?`<h2>${t('参照資料','Key reading')}</h2>${related(r.key_library_ids)}`:''}${r.related_cases?.length?`<h2>${t('関連ケース','Related cases')}</h2>${related(r.related_cases)}`:''}${r.open_questions?.length?`<h2>${t('関連する問い','Related open questions')}</h2>${related(r.open_questions)}`:''}<h2>${t('関連項目','Related entries')}</h2>${related(r.related)||`<p>${t('関連項目は未登録です。','No related entries yet.')}</p>`}</article><aside class="article-sidebar"><dl><dt>${t('発行主体','Publisher')}</dt><dd>${esc(tx(r,'publisher'))}</dd><dt>${t('公表日','Publication date')}</dt><dd>${date(r.date)}</dd>${r.brief_date?`<dt>${t('Brief掲載日','Brief date')}</dt><dd>${date(r.brief_date)}</dd>`:''}<dt>${t('文書種別','Document type')}</dt><dd>${label('doc_types',r.doc_type)}</dd><dt>${t('重要度','Importance')}</dt><dd>${label('importance',r.importance)}</dd>${r.reliability?`<dt>${t('信頼度','Confidence')}</dt><dd><a href="${url('about')}#reliability">${r.reliability} · ${t('評価基準を見る','Rating method')}</a></dd>`:''}${r.status?`<dt>${t('状態','Status')}</dt><dd>${esc(r.status)}</dd>`:''}<dt>${t('執筆','Author')}</dt><dd>${esc(r.author)}</dd><dt>${t('レビュー','Reviewed by')}</dt><dd>${esc(r.reviewed_by)||t('未確認','Not yet reviewed')}</dd><dt>${t('最終更新','Updated')}</dt><dd>${date(r.updated)}</dd></dl>${source(r)}<div class="record-id">${esc(r.id)}</div></aside></div>`;
}
function about() {
  const vocab=(group,ja,en)=>`<details class="vocab"><summary>${t(ja,en)} <span>${tags[group].length}</span></summary><div class="table-wrap"><table><thead><tr><th scope="col">ID</th><th scope="col">日本語</th><th scope="col">English</th></tr></thead><tbody>${tags[group].map(r=>`<tr><th scope="row"><code>${esc(r.id)}</code></th><td>${esc(r.ja)}</td><td>${esc(r.en)}</td></tr>`).join('')}</tbody></table></div></details>`;
  return heading('ABOUT & METHODOLOGY',t('観測の方法、編集の約束。','How we observe. How we edit.'),t('資料の選定、評価、改訂の過程を明らかにする。','Make source selection, evaluation and revision transparent.'))+`<div class="about-layout"><aside class="about-index"><a href="#purpose">${t('目的と編集体制','Purpose & editorship')}</a><a href="#method">${t('選定・更新の方法','Selection & updates')}</a><a href="#reliability">${t('信頼度の評価','Source assessment')}</a><a href="#vocabulary">${t('共通タグ体系','Controlled vocabulary')}</a><a href="#disclaimer">${t('免責と更新履歴','Disclaimer & history')}</a></aside><article class="article-body"><section id="purpose"><h2>${t('研究と政策をつなぐ情報基盤','A bridge between research and policy')}</h2><p>${esc(tx(site,'intro'))}</p><p>${esc(tx(site,'editorial'))}</p><div class="implication"><strong>${esc(tx(site,'editor'))}</strong><p>${t('現在はPhase 1・個人編集です。RAISの責任編集への移行には、担当・レビュー体制と名義使用についての合意が必要です。','Currently Phase 1: individual editorship. Transition to RAIS responsibility requires editorial assignments, review procedures and institutional approval.')}</p></div></section><section id="method"><h2>${t('フローを、ストックと分析につなぐ','Connect developments to evidence and analysis')}</h2><p>${t('Daily Briefで観測した変化を記録し、重要な政策文書や研究をLibraryへ、調達や組織の変化をTrackerへ蓄積します。ConceptsとCase Studiesは、この根拠を参照して改訂します。','Record developments in the Daily Brief. Retain important policy and research in the Library, and changes in programs and organizations in the Tracker. Concepts and Case Studies draw on this evidence.')}</p><ol><li>${t('一次資料を優先し、発生日・公表日・登録日を区別する。','Prioritize original sources and distinguish event, publication and entry dates.')}</li><li>${t('事実、当事者の主張、編集上の推論を区別する。','Distinguish facts, attributed claims and editorial inferences.')}</li><li>${t('重要度3の項目はLibraryまたはTrackerへの登録対象とする。','Retain importance-3 entries in the Library or Tracker.')}</li><li>${t('週次で資料への登録とダイジェストを整理し、月次で論点と原典リンクを確認する。','Review promotions and digests weekly, and concepts and source links monthly.')}</li></ol><p class="inline-note">${t('定期実行・自動収集はまだ設定していません。','Scheduled collection is not yet configured.')}</p><h3>${t('重要度','Importance')}</h3><div class="table-wrap"><table><tbody>${tags.importance.map(r=>`<tr><th scope="row">${r.id}</th><td>${esc(r[lang])}</td></tr>`).join('')}</tbody></table></div></section><section id="reliability"><h2>${t('情報源と情報内容を分けて評価する','Assess the source and the claim separately')}</h2><p>${t('設計書で採用する二軸の評価方式です。情報源の信頼性（A〜F）と情報の確度（1〜6）を組み合わせ、「B2」のように表示します。公式発表であることと、効果が実証されたことは別々に評価します。','The design uses a two-axis assessment: source reliability (A–F) and information credibility (1–6), shown together as B2, for example. Official attribution and independently demonstrated effects are assessed separately.')}</p><div class="table-wrap"><table><thead><tr><th scope="col">${t('情報源の信頼性','Source reliability')}</th><th scope="col">${t('情報の確度','Information credibility')}</th></tr></thead><tbody>${tags.source_reliability.map((r,i)=>`<tr><td><b>${r.id}</b> ${esc(r[lang])}</td><td><b>${tags.information_credibility[i].id}</b> ${esc(tags.information_credibility[i][lang])}</td></tr>`).join('')}</tbody></table></div><p>${t('Fと6は、否定的な判断ではなく評価に必要な情報がない状態を表します。','F and 6 indicate insufficient information to assess reliability or credibility.')}</p></section><section id="vocabulary"><h2>${t('すべての資料を、共通の言葉でつなぐ','Connect every entry through shared terms')}</h2>${vocab('themes','テーマ','Themes')}${vocab('actors','国・主体','Countries & actors')}${vocab('doc_types','文書種別','Document types')}${vocab('forums','規範フォーラム','Norms forums')}${vocab('kill_chain','キルチェーン段階','Kill-chain stages')}</section><section id="disclaimer"><h2>${t('免責と更新履歴','Disclaimer and revision history')}</h2><p>${t('掲載内容は編集者による研究・教育目的の整理であり、所属機関の公式見解を示すものではありません。各項目の原典と確認日を参照してください。','This is an editorial research and educational resource and does not represent institutional policy. Please consult the original sources and review dates for individual entries.')}</p><div class="timeline"><div><span>${date(site.last_updated)} / v${esc(site.version)}</span><p>${t('日英8セクション、統制語彙、検索・絞り込みに対応。登録項目を信号の場で表示。','Eight bilingual sections, controlled vocabulary, search, filters and a signal field of registered entries.')}</p></div></div></section></article></div>`;
}
function updateQuery(changes) { const p=params();for(const [k,v] of Object.entries(changes)){if(v)p.set(k,v);else p.delete(k);}history.replaceState({},'',location.pathname+(p.size?'?'+p:'')); }
function wire() {
  const form=$('#filters');
  if(form){
    const change=()=>{const values=Object.fromEntries(new FormData(form));values.essential=form.elements.essential?.checked?'1':'';delete values.unused;updateQuery(values);const all=page==='brief'?data.brief:params().get('scope')==='all'?records.filter(r=>r.date):data.library;$('#results').innerHTML=resultHTML(all);$('[data-reset]')?.addEventListener('click',()=>form.reset());$('.language').href=`/${lang==='ja'?'en':'ja'}/${page}/`+location.search;};
    form.addEventListener('submit',e=>{e.preventDefault();change();});form.addEventListener('input',change);form.addEventListener('change',change);form.addEventListener('reset',e=>{e.preventDefault();const p=params(),scope=p.get('scope');history.replaceState({},'',url(page,scope?{scope}:{}));render();});
  }
  $('#stage')?.addEventListener('change',e=>{updateQuery({stage:e.target.value});render();});
}
function render() {
  const id=params().get('id');
  const content=id?detail(id):page==='home'?home():page==='brief'?collection(true):page==='library'?collection(false):page==='tracker'?tracker():['concepts','cases','japan'].includes(page)?analysisPage(page):about();
  shell(content);wire();wireSignal();
  if(location.hash) requestAnimationFrame(()=>document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView());
}
async function init() {
  const [s,g,manifest,library,programs,positions,questionsData]=await Promise.all(['config/site.json','config/tags.json','data/index.json','data/library.json','data/tracker/programs.json','data/tracker/positions.json','data/open-questions.json'].map(get));
  site=s;tags=g;
  const [brief,weekly,countries,content]=await Promise.all([Promise.all(manifest.brief.map(get)),Promise.all(manifest.weekly.map(get)),Promise.all(manifest.countries.map(get)),Promise.all(manifest.content.map(readMarkdown))]);
  data={brief:brief.flat().map(r=>({...r,_section:'brief'})),weekly:weekly.flat(),library:library.map(r=>({...r,_section:'library'})),programs:programs.map(r=>({...r,_section:'tracker'})),positions,countries:countries.map(r=>({...r,_section:'tracker'})),content,questions:questionsData.map(r=>({...r,_section:'questions'}))};
  records=[...data.brief,...data.library,...data.programs,...data.countries,...data.content];byId=new Map([...records,...data.questions].map(r=>[r.id,r]));
  render();window.addEventListener('popstate',render);
}
init().catch(error=>{console.error(error);$('#app').innerHTML=`<main class="loading"><h1>${t('データを読み込めませんでした','Unable to load data')}</h1><p>${t('ページを再読み込みしてください。問題が続く場合は、データファイルの配置と形式をご確認ください。','Reload the page. If the problem persists, check the data files and their format.')}</p><button class="button" onclick="location.reload()">${t('再読み込み','Reload')}</button></main>`;});
