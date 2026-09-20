import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const config=JSON.parse(fs.readFileSync('wrangler.jsonc','utf8').replace(/^\uFEFF/,''));
const id=config.d1_databases?.find(b=>b.binding==='DB')?.database_id;
if(!id||id==='00000000-0000-4000-8000-000000000000')throw Error('请先把 Cloudflare D1 database_id 填入 wrangler.jsonc。');
if(!fs.existsSync('dist/server/index.js'))throw Error('请先运行 npm run build。');
for(const args of [['d1','migrations','apply','DB','--remote','--config','wrangler.jsonc'],['deploy','--config','dist/server/wrangler.json']]){const r=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args],{stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status??1)}
