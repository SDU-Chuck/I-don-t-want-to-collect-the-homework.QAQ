import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'课业集 · 作业收集',description:'收集数据结构与计算机网络作业，按科目整理每一份提交。',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>}
