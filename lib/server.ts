import {env} from 'cloudflare:workers';
import {getAdminUser} from '../app/admin-auth';
import {GitHubStorageError} from './github-storage';
export function db(){if(!env.DB)throw Error('DB unavailable');return env.DB}
export class HttpError extends Error{constructor(message:string,public status=400){super(message)}}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
export async function guard(fn:()=>Promise<Response>){try{return await fn()}catch(e){if(e instanceof HttpError||e instanceof GitHubStorageError)return json({error:e.message},e.status);console.error('Collection request failed',e);return json({error:'暂时无法完成操作，请保留文件并稍后重试。'},503)}}
export async function owner(){const u=await getAdminUser();if(!u)throw new HttpError('请先登录管理空间。',401);return u.userId}
export function sameOrigin(r:Request){const origin=r.headers.get('origin');if(origin&&origin!==new URL(r.url).origin)throw new HttpError('请求来源无效。',403)}
export function bounded(v:unknown,max:number,required=false){if(typeof v!=='string'||v.trim().length>max||(required&&!v.trim()))throw new HttpError('请检查填写内容。');return v.trim()}
export async function assignment(id:string){const a=await db().prepare('SELECT * FROM assignments WHERE id=?').bind(id).first<any>();if(!a)throw new HttpError('找不到这份作业收集。',404);return a}
export function isOpen(a:any){return !a.closed&&(!a.deadline||Date.parse(a.deadline)>Date.now())}
export async function boundedBody(r:Request,max:number){if(Number(r.headers.get('content-length')||0)>max)throw new HttpError('文件合计不能超过 20 MB。',413);if(!r.body)throw new HttpError('未收到提交内容。');const reader=r.body.getReader();let count=0;const parts:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;count+=value.length;if(count>max){await reader.cancel();throw new HttpError('文件合计不能超过 20 MB。',413)}parts.push(value)}const bytes=new Uint8Array(count);let pos=0;for(const p of parts){bytes.set(p,pos);pos+=p.length}return bytes}


