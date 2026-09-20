export type Student={name:string;student_id:string};
export function normalize(value:string){return value.normalize('NFKC').trim()}
export function compareRoster(roster:Student[],submissions:any[]){
 const sameName=(a:string,b:string)=>normalize(a).replace(/\s/g,'')===normalize(b).replace(/\s/g,'');
 const rows=roster.map(student=>{const related=submissions.filter(s=>normalize(s.student_id)===normalize(student.student_id));const matched=related.filter(s=>sameName(s.name,student.name));return {...student,status:matched.length?'已交':related.length?'待核对':'未交',submission_count:matched.length,last_submitted_at:matched.map(s=>s.created_at).sort().at(-1)||null}});
 const exceptions=submissions.filter(s=>!roster.some(r=>normalize(r.student_id)===normalize(s.student_id)&&sameName(r.name,s.name))).map(s=>({...s,reason:roster.some(r=>normalize(r.student_id)===normalize(s.student_id))?'学号匹配，姓名不一致':'学号不在名单中'}));
 return {rows,exceptions,total:roster.length,submitted:rows.filter(s=>s.status==='已交').length,missing:rows.filter(s=>s.status==='未交').length,pending:rows.filter(s=>s.status==='待核对').length};
}
export function csvCell(v:unknown){let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'}
export function statusCsv(roster:Student[],submissions:any[]){const c=compareRoster(roster,submissions);return '\ufeff'+[['学号','姓名','状态','匹配提交次数','最近提交时间'],...c.rows.map(r=>[r.student_id,r.name,r.status,r.submission_count,r.last_submitted_at||'']),[],['待核对提交学号','提交姓名','原因','提交时间'],...c.exceptions.map(s=>[s.student_id,s.name,s.reason,s.created_at])].map(r=>r.map(csvCell).join(',')).join('\r\n')}
