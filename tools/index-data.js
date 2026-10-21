#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const files = (folder, ext) => fs.readdirSync(path.join(root,folder)).filter(f=>f.endsWith(ext)).sort().map(f=>`${folder}/${f}`);
const index = {
  brief: files('data/brief','.json'),
  weekly: files('data/weekly','.json'),
  countries: files('data/tracker/countries','.json'),
  content: ['concepts','cases','japan'].flatMap(section=>files(`content/${section}`,'.md').map(p=>({section,path:p})))
};
fs.writeFileSync(path.join(root,'data/index.json'),JSON.stringify(index,null,2)+'\n');
console.log(`Indexed ${index.brief.length} daily files, ${index.weekly.length} weekly files, ${index.countries.length} countries and ${index.content.length} articles.`);
