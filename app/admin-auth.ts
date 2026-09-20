import {headers} from 'next/headers';
import {env} from 'cloudflare:workers';
export const sessionCookie='classwork_admin';
const encode=(v:Uint8Array)=>btoa(String.fromCharCode(...v)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const decode=(s:string)=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
export function configured(){return !!env.ADMIN_PASSWORD&&env.ADMIN_PASSWORD.length>=12&&!!env.SESSION_SECRET&&env.SESSION_SECRET.length>=32}
async function key(){return crypto.subtle.importKey('raw',new TextEncoder().encode(env.SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign','verify'])}
export async function issueSession(){const body=encode(new TextEncoder().encode(JSON.stringify({exp:Date.now()+8*3600000,nonce:crypto.randomUUID()})));const signature=encode(new Uint8Array(await crypto.subtle.sign('HMAC',await key(),new TextEncoder().encode(body))));return body+'.'+signature}
export async function verifySession(token:string){if(!configured())return false;try{const [body,sig,extra]=token.split('.');if(!body||!sig||extra)return false;if(!await crypto.subtle.verify('HMAC',await key(),decode(sig),new TextEncoder().encode(body)))return false;const data=JSON.parse(new TextDecoder().decode(decode(body)));return typeof data.exp==='number'&&data.exp>Date.now()&&data.exp<=Date.now()+8*3600000}catch{return false}}
export async function checkPassword(input:string){const digest=async(s:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));const a=await digest(input),b=await digest(env.ADMIN_PASSWORD||'');let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0}
export async function getAdminUser(){const h=await headers();const token=(h.get('cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(sessionCookie+'='))?.slice(sessionCookie.length+1);return token&&await verifySession(token)?{userId:'local_seedy'}:null}

