#!/usr/bin/env node
// Optional, self-contained review copy. Does not change the deployed source.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../dist');
const out=path.resolve(process.argv[2]||path.join(__dirname,'../AI_Security_Observatory_v0.1.html'));
const payload={};
function collect(dir){for(const e of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){const rel=path.posix.join(dir,e.name);if(e.isDirectory())collect(rel);else if(/\.(json|md)$/.test(e.name))payload['/'+rel]=fs.readFileSync(path.join(root,rel),'utf8');}}
collect('config');collect('data');collect('content');
let app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
app=app.replace("const url = (p, query = {}) => `/${lang}/${p === 'home' ? '' : p + '/'}${Object.keys(query).length ? '?' + new URLSearchParams(query) : ''}`;", "const url = (p, query = {}) => location.pathname + '?' + new URLSearchParams({lang,page:p,...query});");
app=app.replace('href="/${other}/${page===\'home\'?\'\':page+\'/\'}${location.search}"','href="${languageURL(other)}"');
app=app.replace("$('.language').href=`/${lang==='ja'?'en':'ja'}/${page}/`+location.search;", "$('.language').href=languageURL(lang==='ja'?'en':'ja');");
const bootstrap=`const initial=new URLSearchParams(location.search);document.documentElement.lang=initial.get('lang')==='en'?'en':'ja';document.body.dataset.page=['home','brief','library','tracker','concepts','cases','japan','about'].includes(initial.get('page'))?initial.get('page'):'home';const payload=${JSON.stringify(payload)};const fetch=async path=>({ok:Object.hasOwn(payload,path),status:Object.hasOwn(payload,path)?200:404,json:async()=>JSON.parse(payload[path]),text:async()=>payload[path]});const languageURL=other=>{const p=new URLSearchParams(location.search);p.set('lang',other);p.set('page',document.body.dataset.page);return location.pathname+'?'+p;};`;
const css=fs.readFileSync(path.join(root,'assets/style.css'),'utf8');
const html=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#142c38"><title>AI &amp; Security Observatory · v0.1 preview</title><style>${css}</style></head><body data-page="home"><a class="skip" href="#main">本文へ / Skip to content</a><div id="app"></div><script>(()=>{${(bootstrap+app).replace(/<\/script/gi,'<\\/script')}})();</script></body></html>`;
fs.writeFileSync(out,html);
console.log(`Standalone preview exported: ${out} (${Buffer.byteLength(html)} bytes)`);
