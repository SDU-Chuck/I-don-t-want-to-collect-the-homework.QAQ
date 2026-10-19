export function UniversityHeader() {
  return <header className="university-header"><div className="university-header-inner">
    <a className="university-logo" href="/" aria-label="山东大学计算机科学与技术学院 · 课业集首页"><img src="/brand/sdu-cs-logo.png" width="517" height="72" alt="山东大学 计算机科学与技术学院" /></a>
    <div className="university-header-label"><span>课业集</span><small>班级作业空间</small></div>
  </div></header>;
}
export function CampusCredit() {
  return <a className="campus-credit" href="https://www.qdxq.sdu.edu.cn/info/1831/60590.htm" target="_blank" rel="noreferrer">校园摄影：青岛校区融媒体中心</a>;
}
export function UniversityFooter() {
  return <footer className="university-footer"><span>课业集 · 班级自用工具</span><span>学无止境，气有浩然。</span><CampusCredit /></footer>;
}
