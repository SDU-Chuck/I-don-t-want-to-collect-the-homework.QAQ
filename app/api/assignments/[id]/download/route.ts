import {db,bucket,guard,owner,assignment,HttpError} from '../../../../../lib/server';
import {statusCsv,type Student} from '../../../../../lib/roster';
import {safePart,zipStream,textStream,type ZipEntry} from '../../../../../lib/zip';
export const GET=(r:Request,c:{params:Promise<{id:string}>})=>guard(async()=>{const uid=await owner();const a=await assignment((await c.params).id);if(a.owner!==uid)throw new HttpError('只有收集发起人可以打包下载。',403);
 const {results:students}=await db().prepare('SELECT name,student_id FROM roster WHERE owner=? ORDER BY student_id').bind(uid).all<Student>();
 const {results:submissions}=await db().prepare('SELECT * FROM submissions WHERE assignment_id=? ORDER BY created_at DESC,id').bind(a.id).all<any>();
 const {results:files}=await db().prepare('SELECT f.*,s.name AS student_name,s.student_id,s.created_at FROM files f JOIN submissions s ON s.id=f.submission_id WHERE s.assignment_id=? ORDER BY s.created_at DESC,s.id,f.id').bind(a.id).all<any>();
 if(!files.length)throw new HttpError('尚无作业附件可下载。',404);if(files.length>60000||files.reduce((sum,f)=>sum+f.size,0)>3.5*1024**3)throw new HttpError('附件超过单个压缩包的容量，请逐份下载。',413);
 for(const f of files){if(!await bucket().head(f.key))throw new HttpError('部分附件暂时不可用，请稍后重试，未生成不完整压缩包。',503)}
 const entries:ZipEntry[]=[{name:'提交情况.csv',open:async()=>textStream(statusCsv(students,submissions))},{name:'说明.txt',open:async()=>textStream('作业：'+a.title+'\n科目：'+a.subject+'\n导出时间：'+new Date().toISOString()+'\n所有提交版本均保留；同一人重复提交不重复计入已交人数。\n姓名与学号都匹配才计为已交，其他记录列为待核对。\n'+(!students.length?'尚未导入班级名单，无法判断未交人员。\n':''))},...files.map((f:any)=>({name:safePart(f.student_id)+'_'+safePart(f.student_name)+'/'+safePart(f.created_at)+'_'+f.submission_id+'/'+f.id.slice(0,8)+'_'+safePart(f.name),open:async()=>{const o=await bucket().get(f.key);if(!o)throw Error('附件不可用');return o.body as ReadableStream<Uint8Array>}}))];
 return new Response(zipStream(entries) as any,{headers:{'Content-Type':'application/zip','Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(safePart(a.subject)+'_'+safePart(a.title)+'.zip'),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})});
