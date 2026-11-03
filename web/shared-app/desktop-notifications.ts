const delivered=new Set<string>();
export function requestFocusNotificationPermission():void {
  if(typeof Notification==='undefined' || !window.isSecureContext || Notification.permission!=='default')return;
  void Notification.requestPermission().catch(()=>{});
}
export function notifyFocusComplete(owner:string,id:string,title:string):void {
  if(typeof Notification==='undefined' || Notification.permission!=='granted')return;
  const key=`ottlog.focus-notified:${owner}:${id}`;
  if(delivered.has(key))return;
  try { if(localStorage.getItem(key))return; } catch { /* The in-memory guard and notification tag still deduplicate. */ }
  try {
    const notification=new Notification('专注已完成',{body:title ? `${title}，休息一下吧。` : '本轮专注已完成，选择短休息或长休息。',tag:`ottlog-focus:${id}`});
    delivered.add(key);
    try {localStorage.setItem(key,'1');}catch{}
    notification.onclick=()=>{window.focus();window.dispatchEvent(new CustomEvent('ottlog:focus-completed'));notification.close();};
  }catch { /* Completion UI remains available when the browser refuses notifications. */ }
}
