import type {Metadata} from 'next';
import './globals.css';
import './sdu-theme.css';
import {UniversityHeader} from './university-brand';
export const metadata:Metadata={title:'课业集 · 山大计算机班级作业空间',description:'山东大学计算机科学与技术学院同学的班级作业空间，收集、整理与提交课程作业。',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body><UniversityHeader />{children}</body></html>}
