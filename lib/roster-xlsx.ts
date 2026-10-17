import {unzipSync,strFromU8} from 'fflate';
import type {Student} from './roster';
export function parseRosterXlsx(bytes:Uint8Array):Student[]{
 let expanded=0;const zip=unzipSync(bytes,{filter:entry=>{if(!/^xl\/(workbook.xml|_rels\/workbook.xml.rels|sharedStrings.xml|worksheets\/[^/]+.xml)$/.test(entry.name))return false;expanded+=entry.originalSize;if(expanded>12*1024*1024)throw Error('表格内容过大，请只保留班级名单。');return true}});
 const xml=(name:string)=>{if(!zip[name])throw Error('无法读取 Excel 表格，请使用标准 .xlsx 文件。');const doc=new DOMParser().parseFromString(strFromU8(zip[name]),'text/xml');if(doc.querySelector('parsererror'))throw Error('表格格式损坏。');return doc};
 const elements=(root:Document|Element,name:string)=>Array.from(root.getElementsByTagNameNS('*',name));
 const workbook=xml('xl/workbook.xml');const sheet=elements(workbook,'sheet')[0];if(!sheet)throw Error('表格没有工作表。');const relationship=sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||sheet.getAttribute('r:id');const rel=elements(xml('xl/_rels/workbook.xml.rels'),'Relationship').find(r=>r.getAttribute('Id')===relationship);const target=rel?.getAttribute('Target');if(!target)throw Error('无法读取第一个工作表。');const sheetPath=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'');
 const strings=zip['xl/sharedStrings.xml']?elements(xml('xl/sharedStrings.xml'),'si').map(x=>elements(x,'t').map(t=>t.textContent||'').join('')):[];
 const rows=elements(xml(sheetPath),'row').map(row=>{const values:Record<string,string>={};for(const c of elements(row,'c')){const col=(c.getAttribute('r')||'').replace(/\d/g,'');const v=elements(c,'v')[0]?.textContent||'';values[col]=c.getAttribute('t')==='s'?strings[Number(v)]||'':c.getAttribute('t')==='inlineStr'?elements(c,'t').map(t=>t.textContent||'').join(''):v}return values});
 const headerIndex=rows.findIndex(r=>Object.values(r).some(x=>x.trim()==='姓名')&&Object.values(r).some(x=>x.trim()==='学号'));if(headerIndex<0)throw Error('第一个工作表需要包含“姓名”和“学号”列。');const h=rows[headerIndex],nc=Object.keys(h).find(k=>h[k].trim()==='姓名')!,ic=Object.keys(h).find(k=>h[k].trim()==='学号')!;
 return rows.slice(headerIndex+1).filter(r=>r[nc]||r[ic]).map(r=>({name:(r[nc]||'').trim(),student_id:(r[ic]||'').trim()}));
}

