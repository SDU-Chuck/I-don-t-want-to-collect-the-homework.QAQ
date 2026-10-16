export type GitHubStorageConfig={owner:string;repo:string;branch:string;token:string};
export type StoredFile={key:string;name:string;size:number;type:string};
export class GitHubStorageError extends Error {
 constructor(message:string,public status=503){super(message);this.name='GitHubStorageError'}
}
class GitHubApiError extends Error{constructor(public status:number){super('GitHub API request failed ('+status+')')}}
const bytes=new TextEncoder();
function pathPart(value:string){return value.normalize('NFKC').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/^[. ]+|[. ]+$/g,'').slice(0,150)||'file'}
// Stream base64 JSON to avoid retaining a second full copy of large attachments.
export function blobJsonStream(file:Blob):ReadableStream<Uint8Array>{
 const reader=file.stream().getReader();let started=false,done=false,carry=new Uint8Array(0);
 const base64=(data:Uint8Array)=>{let text='';for(let i=0;i<data.length;i+=8192)text+=String.fromCharCode(...data.subarray(i,i+8192));return btoa(text)};
 return new ReadableStream({async pull(c){try{if(!started){started=true;c.enqueue(bytes.encode('{"encoding":"base64","content":"'));return}while(!done){const next=await reader.read();if(next.done){done=true;if(carry.length)c.enqueue(bytes.encode(base64(carry)));c.enqueue(bytes.encode('"}'));c.close();reader.releaseLock();return}const joined=new Uint8Array(carry.length+next.value.length);joined.set(carry);joined.set(next.value,carry.length);const length=joined.length-joined.length%3;carry=joined.slice(length);if(length){c.enqueue(bytes.encode(base64(joined.subarray(0,length))));return}}}catch(e){await reader.cancel().catch(()=>{});c.error(e)}},async cancel(reason){await reader.cancel(reason)}});
}
export class GitHubHomeworkStorage {
 private checked=false;
 constructor(private config:GitHubStorageConfig,private request:typeof fetch=fetch){
  const {owner,repo,branch,token}=config;
  if(!/^[A-Za-z0-9-]+$/.test(owner)||!repo||!/^[A-Za-z0-9_.-]+$/.test(repo)||['.','..'].includes(repo)||!branch||branch.startsWith('/')||branch.endsWith('/')||/[\s~^:?*\[\\]|\.\.|@\{|\/\//.test(branch)||!token)throw new GitHubStorageError('作业仓库尚未配置完整，请联系管理员。');
 }
 private root(){return 'https://api.github.com/repos/'+encodeURIComponent(this.config.owner)+'/'+encodeURIComponent(this.config.repo)}
 private headers(raw=false){return {'Accept':raw?'application/vnd.github.raw+json':'application/vnd.github+json','Authorization':'Bearer '+this.config.token,'X-GitHub-Api-Version':'2026-03-10','User-Agent':'classwork-collection','Content-Type':'application/json'}}
 private async api(path:string,method='GET',body?:unknown,raw=false):Promise<Response>{
  let r:Response;try{r=await this.request(this.root()+path,{method,headers:this.headers(raw),redirect:'error',body:body instanceof ReadableStream?body:body===undefined?undefined:JSON.stringify(body)} as RequestInit)}catch{throw new GitHubStorageError('连接作业仓库失败，请稍后重试。')}
  if(!r.ok){await r.body?.cancel().catch(()=>{});throw new GitHubApiError(r.status)}return r;
 }
 private async data(path:string,method='GET',body?:unknown):Promise<any>{return (await this.api(path,method,body)).json()}
 private fail(e:unknown):never{if(e instanceof GitHubStorageError)throw e;if(e instanceof GitHubApiError){if(e.status===401||e.status===404)throw new GitHubStorageError('作业仓库或访问凭据不可用，请联系管理员。');if(e.status===403||e.status===429)throw new GitHubStorageError('作业仓库暂时无法访问或请求过于频繁，请稍后重试。');if(e.status===409||e.status===422)throw new GitHubStorageError('作业仓库正在更新，请稍后重新提交。')}throw new GitHubStorageError('作业仓库暂时不可用，请稍后重试。')}
 async ensurePrivate(){if(this.checked)return;try{const repo=await this.data('');if(repo.private!==true)throw new GitHubStorageError('保存作业的仓库必须是私有仓库，请联系管理员设置。');if(repo.archived||repo.disabled)throw new GitHubStorageError('作业仓库已归档或停用，请联系管理员。');this.checked=true}catch(e){this.fail(e)}}
 private key(sha:string){return 'github:'+this.config.owner+'/'+this.config.repo+':'+sha}
 private sha(key:string){const prefix='github:'+this.config.owner+'/'+this.config.repo+':';if(!key.toLowerCase().startsWith(prefix.toLowerCase())||!/^[0-9a-f]{40}$/.test(key.slice(prefix.length)))throw new GitHubStorageError('附件所属仓库与当前配置不一致，旧附件需由管理员迁移。');return key.slice(prefix.length)}
 async saveSubmission(assignmentId:string,id:string,files:File[],metadata:Record<string,unknown>):Promise<StoredFile[]>{
  if(!/^[a-f0-9-]{36}$/.test(assignmentId)||!/^[a-f0-9-]{36}$/.test(id)||files.length<1||files.length>5||files.reduce((sum,f)=>sum+f.size,0)>20*1024*1024)throw new GitHubStorageError('提交文件或编号不正确。',400);
  try{await this.ensurePrivate();const folder='homework/'+assignmentId+'/'+id;const entries:any[]=[];const stored:StoredFile[]=[];
   for(let i=0;i<files.length;i++){const file=files[i];const blob=await this.data('/git/blobs','POST',blobJsonStream(file));if(!/^[0-9a-f]{40}$/.test(blob.sha))throw Error('Invalid blob ID');entries.push({path:folder+'/'+String(i+1).padStart(2,'0')+'-'+pathPart(file.name),mode:'100644',type:'blob',sha:blob.sha});stored.push({key:this.key(blob.sha),name:file.name,size:file.size,type:file.type})}
   const manifest=await this.data('/git/blobs','POST',{encoding:'utf-8',content:JSON.stringify({...metadata,assignment_id:assignmentId,submission_id:id,files:stored},null,2)});if(!/^[0-9a-f]{40}$/.test(manifest.sha))throw Error('Invalid manifest ID');entries.push({path:folder+'/submission.json',mode:'100644',type:'blob',sha:manifest.sha});
   const refPath='/git/refs/heads/'+this.config.branch.split('/').map(encodeURIComponent).join('/');
   for(let attempt=0;attempt<4;attempt++){let head:any;try{head=await this.data('/git/ref/heads/'+this.config.branch.split('/').map(encodeURIComponent).join('/'))}catch(e){if(e instanceof GitHubApiError&&(e.status===404||e.status===409))throw new GitHubStorageError('作业仓库需要先创建 README，并确认配置的分支存在。');throw e}
    const parent=await this.data('/git/commits/'+head.object.sha);const tree=await this.data('/git/trees','POST',{base_tree:parent.tree.sha,tree:entries});const commit=await this.data('/git/commits','POST',{message:'Collect homework '+id,tree:tree.sha,parents:[head.object.sha]});
    try{await this.data(refPath,'PATCH',{sha:commit.sha,force:false});return stored}catch(e){if(e instanceof GitHubApiError&&(e.status===409||e.status===422)&&attempt<3)continue;throw e}
   }throw Error('Commit failed');
  }catch(e){this.fail(e)}
 }
 async read(key:string):Promise<ReadableStream<Uint8Array>>{try{const sha=this.sha(key);await this.ensurePrivate();const r=await this.api('/git/blobs/'+sha,'GET',undefined,true);if(!r.body)throw Error('Missing file');return r.body as ReadableStream<Uint8Array>}catch(e){this.fail(e)}}
}
