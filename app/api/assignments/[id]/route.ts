import {db,guard,json,owner,sameOrigin,assignment,HttpError,boundedBody} from '../../../../lib/server';
import {parseScheduleUpdate,ScheduleError} from '../../../../lib/assignment-schedule';
type Context={params:Promise<{id:string}>};
export const GET=(r:Request,c:Context)=>guard(async()=>{const uid=await owner();const a=await assignment((await c.params).id);if(a.owner!==uid)throw new HttpError('只有收集发起人可以查看作业。',403);const {results:submissions}=await db().prepare('SELECT * FROM submissions WHERE assignment_id=? ORDER BY created_at DESC').bind(a.id).all<any>();const {results:files}=await db().prepare('SELECT f.id,f.submission_id,f.name,f.size FROM files f JOIN submissions s ON s.id=f.submission_id WHERE s.assignment_id=?').bind(a.id).all<any>();return json({submissions:submissions.map(s=>({...s,files:files.filter(f=>f.submission_id===s.id)}))})});
export const PATCH=(r:Request,c:Context)=>guard(async()=>{
  sameOrigin(r);const uid=await owner();const a=await assignment((await c.params).id);
  if(a.owner!==uid)throw new HttpError('没有管理权限。',403);
  let body:unknown;
  try{body=JSON.parse(new TextDecoder().decode(await boundedBody(r,4096)))}catch(e){if(e instanceof HttpError)throw e;throw new HttpError('请检查提交内容。')}
  let update;
  try{update=parseScheduleUpdate(body,a)}catch(e){if(e instanceof ScheduleError)throw new HttpError(e.message);throw e}
  const sets:string[]=[],values:(string|number|null)[]=[];
  if(update.closed!==undefined){sets.push('closed=?');values.push(update.closed?1:0)}
  if(Object.hasOwn(update,'deadline')){sets.push('deadline=?');values.push(update.deadline!)}
  // Patch only supplied fields so a stop action cannot overwrite another tab's new deadline.
  let condition='';
  if(update.closed===false&&!Object.hasOwn(update,'deadline')){
    condition=' AND (deadline IS NULL OR julianday(deadline)>julianday(?))';
  }
  const bindings=[...values,a.id,uid,...(condition?[new Date().toISOString()]:[])];
  const saved=await db().prepare('UPDATE assignments SET '+sets.join(',')+' WHERE id=? AND owner=?'+condition+' RETURNING closed,deadline').bind(...bindings).first<{closed:number;deadline:string|null}>();
  if(!saved)throw new HttpError('作业状态已变化，请刷新后设置新的截止时间。',409);
  return json({ok:true,assignment:saved});
});
