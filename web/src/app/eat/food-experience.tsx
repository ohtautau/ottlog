'use client';
import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import OptionField from '@/components/option-field';
import { usePersonalToolState } from '@/lib/use-personal-tool-state';
import { toolId } from '@/lib/tool-id';
import { advanceComparison, initialDiningState, normalizeDiningState, startComparison, tauFoods, type Comparison, type FoodRecord, type SavedFood } from './food-data';
import { foodIdeas, foodQuestions, rankFoodIdeas } from './food-catalog';
import styles from './food-options.module.css';

type View = 'menu' | 'compare' | 'questions' | 'result' | 'library' | 'history' | 'catalog';
export default function FoodExperience() {
  const storage = usePersonalToolState('dining', initialDiningState);
  return <FoodFlow key={storage.owner} storage={storage}/>;
}
function FoodFlow({ storage }: { storage: ReturnType<typeof usePersonalToolState<typeof initialDiningState>> }) {
  const state = normalizeDiningState(storage.value);
  const foods = [...tauFoods, ...state.customFoods];
  const [view, setView] = useState<View>('menu');
  const [comparisonTrail, setComparisonTrail] = useState<Comparison[]>(() => [startComparison(tauFoods)]);
  const [comparisonStep, setComparisonStep] = useState(0);
  const comparison = comparisonTrail[comparisonStep];
  const [answers, setAnswers] = useState<string[]>([]);
  const [questionStep, setQuestionStep] = useState(0);
  const [result, setResult] = useState<FoodRecord | null>(null);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const isTau = storage.owner.startsWith('admin:');
  const ranked = rankFoodIdeas(answers.slice(0, questionStep)).slice(0, 3);
  function go(view: View) { setMessage(''); setSearch(''); setView(view); }
  async function finish(id: string, mode: FoodRecord['mode'], early = false) {
    if (!storage.ready || saving.current) return;
    const food = mode === 'compare' ? foods.find(f => f.id === id) : foodIdeas.find(f => f.id === id);
    if (!food) return;
    saving.current = true; setBusy(true);
    const record: FoodRecord = { id: toolId(), foodId: id, name: food.name, english: food.english, at: new Date().toISOString(), mode, early, answers: mode === 'questions' ? answers.slice(0, questionStep) : [] };
    try {
      let applied = false;
      await storage.setValue(previous => { applied = true; const state = normalizeDiningState(previous); return { ...state, history: [record, ...state.history].slice(0, 500) }; });
      if (!applied) throw new Error('Account changed');
      setResult(record); go('result');
    } catch { setMessage('这次没能保存，请重试。'); }
    finally { saving.current = false; setBusy(false); }
  }
  function compare(id: string) {
    const next = advanceComparison(comparison, id);
    if (next) {
      setComparisonTrail(previous => previous[comparisonStep + 1]?.pair.every((id, index) => id === next.pair[index]) ? previous : [...previous.slice(0, comparisonStep + 1), next]);
      setComparisonStep(previous => previous + 1);
    } else void finish(id, 'compare');
  }
  function answer(id: string) {
    setAnswers(previous => previous[questionStep] === id ? previous : [...previous.slice(0, questionStep), id]);
    setQuestionStep(previous => previous + 1);
  }
  function restartQuestions() { setAnswers([]); setQuestionStep(0); }
  function jumpQuestion(step: number) {
    if (step >= 0 && step <= answers.length) setQuestionStep(step);
  }
  function jumpComparison(step: number) {
    if (step >= 0 && step < comparisonTrail.length) setComparisonStep(step);
  }
  const status = <><span role='status'>{message || storage.status}</span>{!storage.ready && <button onClick={storage.retry}>重试</button>}</>;
  if (view === 'menu') return <OptionField title='今天想吃什么？' eyebrow='TAU / 吃什么' options={[
    { id: 'compare', label: '比较一下', caption: '从 Tau 的餐单里，两两留下更想吃的', mark: 6 },
    { id: 'questions', label: '问问自己', caption: '几个小问题，找找新加坡的美食灵感', mark: 4 },
  ]} disabled={!storage.ready} onChoose={id => { if (id === 'compare') { setComparisonTrail([startComparison(foods)]); setComparisonStep(0); } else restartQuestions(); go(id as View); }} footer={<><button onClick={() => go('library')}>Tau 的餐单</button><button onClick={() => go('history')}>选择记录</button><Link href='/eat/legacy'>饮食工具</Link>{!storage.ready && status}</>}/>;
  if (view === 'compare') return <OptionField title='这两个，更想吃哪个？' progress={{ completed: comparisonStep, total: comparison.rounds + comparison.remaining.length + 1, furthest: comparisonTrail.length - 1, onJump: jumpComparison }} eyebrow={`TAU / 比较 · 还需 ${comparison.remaining.length + 1} 次选择`} options={comparison.pair.map(id => {
    const food = foods.find(f => f.id === id)!;
    return { id, label: food.name, caption: `${food.english} · ${food.dishes}`, detail: `${food.location1} · ${food.location2}\n${food.tags.join(' / ')}` };
  })} onChoose={compare} onDirect={id => void finish(id, 'compare', true)} onBack={() => comparisonStep ? jumpComparison(comparisonStep - 1) : go('menu')} onNext={comparisonStep < comparisonTrail.length - 1 ? () => jumpComparison(comparisonStep + 1) : undefined} disabled={!storage.ready || busy} footer='点色块继续比较 · 点“就吃这个”直接决定'/>;
  if (view === 'questions') {
    const complete = questionStep === foodQuestions.length;
    const question = foodQuestions[Math.min(questionStep, foodQuestions.length - 1)];
    return <OptionField title={complete ? '这三个，哪个最合心意？' : question.prompt} eyebrow={`TAU / 问题 · ${Math.min(questionStep + 1, foodQuestions.length)} / ${foodQuestions.length}`} stage={questionStep} progress={{ completed: questionStep, total: foodQuestions.length, furthest: answers.length, onJump: jumpQuestion }}
      options={complete ? ranked.map(f => ({ id: f.id, label: f.name, caption: f.english, detail: f.examples.join('\n') })) : question.options}
      onChoose={id => { if (complete) void finish(id, 'questions'); else answer(id); }}
      disabled={!storage.ready || busy} onBack={() => { if (questionStep) jumpQuestion(questionStep - 1); else go('menu'); }} onNext={questionStep < answers.length ? () => jumpQuestion(questionStep + 1) : undefined}
      footer={<><button onClick={restartQuestions}>重新回答</button><button onClick={() => go('catalog')}>全部食物</button></>}>
      <p className={styles.recommendationLabel} aria-live='polite'>此刻最可能想吃的三种 · 点击即可决定</p>
      <div className={styles.candidates}>{ranked.map(food => <button key={food.id} data-testid='food-candidate' className={styles.candidate} disabled={!storage.ready || busy} onClick={() => void finish(food.id, 'questions', !complete)}><strong>{food.name}</strong><small>{food.english}</small>{food.examples.length > 0 && <span>{food.examples.map(example => example.split(' / ')[0]).join(' · ')}</span>}</button>)}</div>
    </OptionField>;
  }
  async function addFood(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!isTau || !storage.ready || saving.current) return;
    const form = event.currentTarget, data = new FormData(form);
    const text = (key: string) => String(data.get(key) || '').trim();
    const item: SavedFood = { id: toolId(), name: text('name'), english: text('english'), dishes: text('dishes'), location1: text('location1') || '待确认', location2: text('location2') || '待确认', location3: text('location3') || '待确认', tags: text('tags').split(/[,，、]/).map(t => t.trim()).filter(Boolean) };
    if (normalizeDiningState({ customFoods: [item] }).customFoods.length !== 1) { setMessage('请填写中英文名称和代表菜，标签最多 20 个、每个不超过 30 字。'); return; }
    saving.current = true; setBusy(true); let full = false;
    try {
      let applied = false;
      await storage.setValue(previous => { applied = true; const state = normalizeDiningState(previous); if (state.customFoods.length >= 132) { full = true; return state; } return { ...state, customFoods: [...state.customFoods, item] }; });
      if (!applied) throw new Error('Account changed');
      setMessage(full ? '餐单已满 150 条。' : `已添加 ${item.name}`); if (!full) form.reset();
    } catch { setMessage('添加失败，请重试。'); }
    finally { saving.current = false; setBusy(false); }
  }
  return <section className={styles.page} data-choice-scene><div className={styles.paper}>
    <p className={styles.eyebrow}>TAU / 吃什么</p>
    <div className={styles.actions}><Link href='/'>首页</Link><button onClick={() => go(view === 'catalog' ? 'questions' : 'menu')}>返回{view === 'catalog' ? '问题' : '吃什么'}</button></div>
    {view === 'result' && result && <><h1>就吃 {result.name}。</h1><h2>{result.english}</h2><p role='status'>已记录这次选择{result.early ? ' · 提前决定' : ''}。</p>
      {result.mode === 'compare' && (() => { const food = foods.find(f => f.id === result.foodId)!; return <><p>代表菜：{food.dishes}</p><p>{food.location1} · {food.location2}<br/>{food.location3}</p><div className={styles.tags}>{food.tags.map(tag => <span key={tag}>{tag}</span>)}</div></>; })()}
      {result.mode === 'questions' && foodIdeas.find(f => f.id === result.foodId)?.examples.map(example => <p key={example}>{example}</p>)}
      <div className={styles.actions}><button onClick={() => go('menu')}>再选一次</button><button onClick={() => go('history')}>查看记录</button></div></>}
    {view === 'history' && <><h1>每次决定，都记得。</h1><p>最近 {state.history.length} 次选择（保留最近 500 次）</p>{!state.history.length && <p>还没有记录，选好的一餐会留在这里。</p>}{state.history.map(record => <article className={styles.row} key={record.id}><h2>{record.name}</h2><small>{record.english}</small><p>{new Date(record.at).toLocaleString('zh-CN')} · {record.mode === 'compare' ? '比较' : '问题'}{record.early ? ' · 提前决定' : ''}</p></article>)}</>}
    {view === 'library' && <><h1>Tau 的餐单。</h1><p>{foods.length} 个熟悉的选择 · 只由 Tau 添加</p><p className={styles.status}>位置资料按 Tau 提供的内容保存，待确认的地址保留原标记。</p>
      {isTau ? <details><summary>添加一个食物</summary><form onSubmit={event => void addFood(event)}><div className={styles.grid}>{[['name','中文名称'],['english','英文名称'],['dishes','代表菜'],['location1','一级位置'],['location2','二级位置'],['location3','三级位置'],['tags','标签（顿号或逗号分隔）']].map(([key, label]) => <label key={key}>{label}<input name={key} maxLength={200} required={['name','english','dishes'].includes(key)}/></label>)}</div><button type='submit' disabled={!storage.ready || busy}>添加到比较餐单</button></form></details> : <p className={styles.status}>Tau 登录管理员账号后可添加餐单。</p>}
      <label>搜索餐单<input value={search} onChange={event => setSearch(event.target.value)} placeholder='名称、位置或标签'/></label>
      {foods.filter(f => JSON.stringify(f).toLowerCase().includes(search.toLowerCase())).map(food => <article className={styles.row} key={food.id}><h2>{food.name}</h2><small>{food.english}</small><p>代表菜：{food.dishes}<br/>{food.location1} · {food.location2}<br/>{food.location3}</p><div className={styles.tags}>{food.tags.map(tag => <span key={tag}>{tag}</span>)}</div></article>)}</>}
    {view === 'catalog' && <><h1>新加坡，吃点什么。</h1><p>{foodIdeas.length} 种食物与菜系。宽泛菜系列出三道代表菜。</p><label>搜索食物<input value={search} onChange={event => setSearch(event.target.value)} placeholder='中文、English 或代表菜'/></label>{foodIdeas.filter(f => `${f.name} ${f.english} ${f.examples.join(' ')}`.toLowerCase().includes(search.toLowerCase())).map(food => <article className={styles.row} key={food.id}><h2>{food.name}</h2><small>{food.english}</small>{food.examples.map(example => <p key={example}>{example}</p>)}<button disabled={!storage.ready || busy} onClick={() => void finish(food.id, 'questions', true)}>就吃这个</button></article>)}<p className={styles.status}>饮食文化参考：<a href='https://www.visitsingapore.com/things-to-do/dining/'>Visit Singapore</a> · <a href='https://www.roots.gov.sg/ich-landing/ich/peranakan-cuisine-in-singapore'>新加坡国家文物局</a></p></>}
    <div className={styles.status}>{status}</div>
  </div></section>;
}
