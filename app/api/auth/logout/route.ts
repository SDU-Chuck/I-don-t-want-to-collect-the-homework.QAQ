import {guard,sameOrigin} from '../../../../lib/server';
import {sessionCookie} from '../../../admin-auth';
export const POST=(r:Request)=>guard(async()=>{sameOrigin(r);return new Response(null,{status:303,headers:{Location:'/login','Cache-Control':'no-store','Set-Cookie':sessionCookie+'=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'+(new URL(r.url).protocol==='https:'?'; Secure':'')}})});
