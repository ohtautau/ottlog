import { focusActivities } from './focus-activities';
import { getLibraryIcon } from './icon-library';
export type RestActivity = { id:string; title:string; iconId:string };
export const defaultRestActivities: readonly RestActivity[] = focusActivities.map((item,index)=>({...item,id:`rest-default-${index+1}`}));
export function restActivityPool(state: {restActivities?:unknown}): {items:readonly RestActivity[];writable:boolean} {
  if(!Object.prototype.hasOwnProperty.call(state,'restActivities'))return {items:defaultRestActivities,writable:true};
  const rows=state.restActivities;
  if(!Array.isArray(rows) || rows.length>60)return {items:[],writable:false};
  const ids=new Set<string>(),names=new Set<string>();
  for(const row of rows){
    if(!row || typeof row!=='object' || Object.keys(row).some(key=>!['id','title','iconId'].includes(key)) || typeof row.id!=='string' || !row.id.trim() || row.id.length>100 || typeof row.title!=='string' || !row.title.trim() || row.title!==row.title.trim() || Array.from(row.title).length>30 || typeof row.iconId!=='string' || !getLibraryIcon(row.iconId) || ids.has(row.id) || names.has(row.title.toLocaleLowerCase()))return {items:[],writable:false};
    ids.add(row.id);names.add(row.title.toLocaleLowerCase());
  }
  return {items:rows,writable:true};
}
export function changeRestActivities<T extends {restActivities?:unknown}>(state:T, change:{add:RestActivity}|{remove:string}):T {
  const pool=restActivityPool(state);
  if(!pool.writable)throw new Error('休息建议格式不兼容，已保留原数据');
  let rows=[...pool.items];
  if('add' in change){const item={...change.add,title:change.add.title.trim()};
    const existing=rows.find(row=>row.id===item.id);
    if(existing){if(existing.title===item.title && existing.iconId===item.iconId)return state;throw new Error('建议ID已存在');}
    rows.push(item);
  }else rows=rows.filter(row=>row.id!==change.remove);
  if(!restActivityPool({restActivities:rows}).writable)throw new Error('名称须为1–30字且不重复，请选择有效图标（最多60项）');
  return {...state,restActivities:rows};
}
