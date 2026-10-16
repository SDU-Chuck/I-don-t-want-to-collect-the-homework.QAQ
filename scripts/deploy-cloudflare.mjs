import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const config=JSON.parse(fs.readFileSync('wrangler.jsonc','utf8').replace(/^\uFEFF/,''));
const id=config.d1_databases?.find(b=>b.binding==='DB')?.database_id;
if(!id||id==='00000000-0000-4000-8000-000000000000')throw Error('请先把 Cloudflare D1 database_id 填入 wrangler.jsonc。');
for(const key of ['GITHUB_OWNER','GITHUB_HOMEWORK_REPO','GITHUB_HOMEWORK_BRANCH'])if(!config.vars?.[key])throw Error('请先在 wrangler.jsonc 配置私有作业仓库：'+key);
if(!fs.existsSync('dist/server/index.js'))throw Error('请先运行 npm run build。');
const builtConfig=JSON.parse(fs.readFileSync('dist/server/wrangler.json','utf8').replace(/^\uFEFF/,''));
const builtId=builtConfig.d1_databases?.find(b=>b.binding==='DB')?.database_id;
if(id!==builtId||config.name!==builtConfig.name||['GITHUB_OWNER','GITHUB_HOMEWORK_REPO','GITHUB_HOMEWORK_BRANCH'].some(k=>config.vars[k]!==builtConfig.vars?.[k]))throw Error('部署配置已改变，请重新运行 npm run build 后再部署。');
for(const args of [['d1','migrations','apply','DB','--remote','--config','wrangler.jsonc'],['deploy','--config','dist/server/wrangler.json']]){const r=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args],{stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status??1)}
