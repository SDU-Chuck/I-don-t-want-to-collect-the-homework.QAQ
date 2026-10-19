'use client';
import {useState} from 'react';
import './assignment-schedule.css';
type Schedule={id:string;closed:number;deadline:string|null};
function localInput(iso:string|null){if(!iso)return '';const date=new Date(iso);return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16)}

export default function AssignmentSchedule({assignment,reopen,onSaved,onCancel,onBusyChange}:{assignment:Schedule;reopen:boolean;onSaved:(schedule:{closed:number;deadline:string|null})=>Promise<void>;onCancel:()=>void;onBusyChange:(busy:boolean)=>void}){
  const [unlimited,setUnlimited]=useState(!assignment.deadline),[saving,setSaving]=useState(false),[error,setError]=useState('');
  async function save(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setError('');
    const time=new Date(String(new FormData(e.currentTarget).get('deadline')||'')).getTime();
    if(!unlimited&&(!Number.isFinite(time)||time<=Date.now())){setError('请选择晚于当前时间的新截止时间。');return}
    setSaving(true);onBusyChange(true);
    try{
      const r=await fetch('/api/assignments/'+assignment.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({deadline:unlimited?null:new Date(time).toISOString(),...(reopen?{closed:false}:{})})});
      const data=await r.json() as {error?:string;assignment:{closed:number;deadline:string|null}};
      if(!r.ok)throw Error(data.error||'更新失败，请稍后重试。');
      await onSaved(data.assignment);
    }catch(e){setError(e instanceof Error?e.message:'更新失败，请稍后重试。')}
    finally{setSaving(false);onBusyChange(false)}
  }
  return <form className="schedule-editor" onSubmit={save} aria-label={reopen?'重新开放作业':'修改截止时间'}>
    <h3>{reopen?'重新开放作业':'修改截止时间'}</h3>
    <p>{reopen?'设置新的截止时间后，原提交链接即可继续使用。':'延后截止时间可继续接收补交，已有提交会保留。'}{!reopen&&!!assignment.closed&&' 此作业已手动停止，仅修改时间不会恢复收集。'}</p>
    <label>新的截止时间<input type="datetime-local" name="deadline" defaultValue={localInput(assignment.deadline)} disabled={unlimited||saving} required={!unlimited}/><small>按当前设备时区显示；到期后自动停止接收。</small></label>
    <label className="schedule-unlimited"><input type="checkbox" checked={unlimited} disabled={saving} onChange={e=>setUnlimited(e.target.checked)}/>不设截止时间</label>
    {error&&<p className="error" role="alert">{error}</p>}
    <div className="schedule-buttons"><button className="primary" disabled={saving}>{saving?'保存中…':reopen?'确认重新开放':'保存截止时间'}</button><button className="secondary" type="button" disabled={saving} onClick={onCancel}>取消</button></div>
  </form>;
}
