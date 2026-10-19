'use client';
import {useState} from 'react';
import {ArrowRight,LockKeyhole,BookOpen,ArrowLeft} from 'lucide-react';
import {CampusCredit,UniversityFooter} from '../university-brand';
export default function Login(){
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  return <><main className="login-layout">
    <section className="login-campus" aria-label="山东大学青岛校区春日校园">
      <img className="campus-image" src="/brand/qingdao-campus.webp" alt="春花掩映下的山东大学青岛校区" width="1600" height="1067" />
      <div className="login-campus-copy"><span className="campus-kicker">SHANDONG UNIVERSITY</span><h1>学无止境<br/>气有浩然<span>。</span></h1><p>让每一份认真，都有回响。</p></div>
      <div className="login-photo-caption"><span>山海之间 · 求知日常</span><CampusCredit /></div>
    </section>
    <section className="login-form-side">
      <a className="back-home" href="/"><ArrowLeft size={16}/>返回工作台</a>
      <div className="login-form-content"><div className="login-symbol"><BookOpen size={27}/></div><div className="eyebrow">CLASSWORK COLLECTION</div><h2>欢迎回到课业集</h2><p className="login-intro">管理班级作业，从这里开始。</p>
        <form aria-label="管理员登录" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');const password=new FormData(e.currentTarget).get('password');try{const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});const d:any=await r.json();if(!r.ok)throw Error(d.error);location.assign('/')}catch(e:any){setError(e.message)}finally{setBusy(false)}}}>
          <label>管理员密码<input type="password" name="password" required maxLength={256} autoComplete="current-password" placeholder="请输入管理员密码" /></label>
          {error&&<p className="error" role="alert">{error}</p>}<button className="primary full login-submit" disabled={busy}>{busy?'登录中…':'进入管理空间'}<ArrowRight size={18}/></button>
        </form>
        <div className="student-tip"><LockKeyhole size={18}/><p><b>同学提交作业，无需登录</b><span>请打开班级分享的作业提交链接。</span></p></div>
      </div>
    </section>
  </main><UniversityFooter /></>;
}
