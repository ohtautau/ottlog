'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import OptionField from '@/components/option-field';
import { usePersonalToolState } from '@/lib/use-personal-tool-state';
import { initialTodoState, normalizeTodoState, todoQuadrants } from '@/lib/todo-data';
import { toolId } from '@/lib/tool-id';
import styles from '../../eat/food-options.module.css';
export default function TaskCapture() {
  const storage = usePersonalToolState('todos', initialTodoState);
  return <Capture key={storage.owner} storage={storage}/>;
}
function Capture({ storage }: { storage: ReturnType<typeof usePersonalToolState<typeof initialTodoState>> }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stage, setStage] = useState<'write' | 'quadrant' | 'done'>('write');
  const [message, setMessage] = useState('');
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  async function save(id: string) {
    if (!storage.ready || saving.current || !title.trim()) return;
    saving.current = true; setBusy(true);
    const quadrant = todoQuadrants.find(item => item.id === id)!;
    const now = new Date().toISOString();
    let full = false;
    try {
      let applied = false;
      await storage.setValue(previous => {
        applied = true;
        const state = normalizeTodoState(previous);
        if (state.tasks.length >= 200) { full = true; return state; }
        return { ...state, tasks: [{ id: toolId(), title: title.trim(), description: description.trim(), categoryId: '', important: quadrant.important, urgent: quadrant.urgent, dueDate: '', completedAt: null, createdAt: now, updatedAt: now }, ...state.tasks] };
      });
      if (!applied) throw new Error('Account changed');
      if (full) setMessage('待办已满 200 条，请先整理后再添加。');
      else { setMessage(`已放入「${quadrant.title}」· ${quadrant.caption}`); setStage('done'); }
    } catch { setMessage('保存失败，请重试。'); }
    finally { saving.current = false; setBusy(false); }
  }
  if (stage === 'quadrant') return <OptionField title='把这件事放在哪里？' eyebrow={title} progress={{ completed: 1, total: 2, onJump: () => setStage('write') }} options={todoQuadrants.map(q => ({ id: q.id, label: q.title, caption: q.caption }))} onChoose={id => void save(id)} disabled={!storage.ready || busy} onBack={() => setStage('write')} footer={message || storage.status}/>;
  return <section className={styles.page} data-choice-scene><div className={styles.paper}>
    <p className={styles.eyebrow}>TAU / 一件小事</p><h1>{stage === 'done' ? '安排好了。' : '先把任务写下来。'}</h1>
    {stage === 'done' ? <><h2>{title}</h2><p role='status'>{message}</p><div className={styles.actions}><Link href='/todos'>查看四象限</Link><button onClick={() => { setTitle(''); setDescription(''); setMessage(''); setStage('write'); }}>再写一件</button></div></> : <form onSubmit={event => { event.preventDefault(); if (title.trim()) setStage('quadrant'); }}>
      <label>任务名称<input autoFocus required disabled={!storage.ready} maxLength={100} value={title} onChange={event => setTitle(event.target.value)} placeholder='今天想完成什么？'/></label>
      <label>补充说明（可选）<textarea disabled={!storage.ready} maxLength={10000} rows={4} value={description} onChange={event => setDescription(event.target.value)} placeholder='先记下需要的细节'/></label>
      <div className={styles.actions}><Link href='/'>返回首页</Link><button type='submit' disabled={!title.trim() || !storage.ready}>写好了，选四象限 →</button></div>
    </form>}
    <p className={styles.status} role='status'>{storage.status}</p>{!storage.ready && <button onClick={storage.retry}>重试读取</button>}
  </div></section>;
}
