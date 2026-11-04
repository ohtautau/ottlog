import {useEffect,useRef} from 'react';
import {SettledAutosave} from './settled-autosave';
/** Same lifecycle for native and browser: settle, serialize, merge, owner guard, explicit retry. */
export default function useSettledAutosave<T>({owner,value,blocked,persist,onError}:{owner:string;value:T|null;blocked:boolean;persist:(value:T,owner:string)=>Promise<boolean>;onError:(error:string)=>void}) {
 const latest=useRef({persist,onError});latest.current={persist,onError};
 const queue=useRef<SettledAutosave<T>>();
 if(!queue.current)queue.current=new SettledAutosave((target,account)=>latest.current.persist(target,account),error=>latest.current.onError(error));
 const encoded=JSON.stringify(value);
 useEffect(()=>{if(value&&owner){queue.current!.set(owner,value,blocked);void queue.current!.flush();}else queue.current!.cancel();},[owner,encoded,blocked]);
 useEffect(()=>()=>queue.current!.cancel(),[]);
 return {reset:(account:string,initial:T)=>queue.current!.reset(account,initial),retry:()=>queue.current!.flush(true)};
}
