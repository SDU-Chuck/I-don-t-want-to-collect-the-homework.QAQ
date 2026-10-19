type Schedule = {closed:number|boolean;deadline:string|null};
export type ScheduleUpdate = {closed?:boolean;deadline?:string|null};
export class ScheduleError extends Error {}

export function parseScheduleUpdate(input:unknown,current:Schedule,now=Date.now()):ScheduleUpdate {
  if(!input||typeof input!=='object'||Array.isArray(input))throw new ScheduleError('请检查提交内容。');
  const body=input as Record<string,unknown>;
  const keys=Object.keys(body);
  if(!keys.length||keys.some(key=>!['closed','deadline'].includes(key)))throw new ScheduleError('请提交收集状态或截止时间。');
  const update:ScheduleUpdate={};
  if(Object.hasOwn(body,'closed')){
    if(typeof body.closed!=='boolean')throw new ScheduleError('收集状态无效。');
    update.closed=body.closed;
  }
  if(Object.hasOwn(body,'deadline')){
    if(body.deadline===null)update.deadline=null;
    else{
      if(typeof body.deadline!=='string'||body.deadline.length>40)throw new ScheduleError('截止时间格式无效。');
      const time=Date.parse(body.deadline);
      if(!Number.isFinite(time)||new Date(time).toISOString()!==body.deadline)throw new ScheduleError('截止时间格式无效。');
      if(time<=now)throw new ScheduleError('新截止时间应晚于当前时间。');
      update.deadline=new Date(time).toISOString();
    }
  }
  const deadline=Object.hasOwn(update,'deadline')?update.deadline:current.deadline;
  if(update.closed===false&&deadline&&Date.parse(deadline)<=now)throw new ScheduleError('请设置未来的截止时间，或取消截止时间后重新开放。');
  return update;
}
