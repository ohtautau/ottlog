import { trimTextEnd } from '../../lib/text-whitespace';
import SheetActions from '../../components/sheet-actions';
import SectionTitle from '../../components/section-title';
import EditorHeading from '../../components/editor-heading';
import EditorFieldsLayout from '../../components/editor-fields-layout';
import SingleLineInput from '../../components/single-line-input';
import { CoreScreen, MoreSection } from '../../components/page-sections';
import { useEffect, useRef, useState } from 'react';
import useEditorCloseGuard from '../../lib/use-editor-close-guard';
import { requestAppConfirmation } from '../../lib/app-dialog';
import EntityTitleRow, { EntityTitleInput } from '../../components/entity-title-field';
import { Button, Input, Picker, ScrollView, Switch, Text, View } from '@tarojs/components';
import ActionButton, { ChoiceButton } from '../../components/ui-button';
import { EditSymbol } from '../../components/manage-symbol';
import PageScroll from '../../components/page-scroll';
import CreateButton from '../../components/create-button';
import PageToolbar, { CategoryButton, CategoryRow } from '../../components/page-toolbar';
import { hasVolatilePersonalTool, usePersonalToolState } from '../../lib/use-personal-tool-state';
import { initialMealLibrary, isMealLibrary, isNutritionEntries, kindLabels, occasionLabels, type Meal, type MealKind, type MealLibrary, type NutritionEntry, type Occasion } from '../../lib/meal-data';
import { CustomChoiceRow, SingleChoiceField, TagChoiceRow } from '../../components/form-options';
import { rankCommonValues } from '../../lib/form-options';
import './index.css';

const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
const makeId = () => `mini-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
const nutrients = [['carbs', '碳水', '#b9dbca'], ['protein', '蛋白质', '#99b8ec'], ['fat', '脂肪', '#e1c699']] as const;
const blankNutrition = { id: '', name: '', carbs: '', protein: '', fat: '' };
const blankMeal: Meal = { id: '', name: '', place: '', note: '', price: 20, minutes: 15, spicy: false, vegetarian: false, occasions: ['lunch', 'dinner'], kind: 'rice' };

function commonMealValues(meals: Meal[], key: 'price' | 'minutes', fallback: number) {
  return rankCommonValues(meals.map(meal => String(meal[key])), meals.length ? [] : [String(fallback)]).slice(0, 3).map(value => ({ value, label: value }));
}

export default function MealsPage() {
  const storage = usePersonalToolState('meals', initialMealLibrary);
  return <MealDiary key={storage.owner} storage={storage} />;
}

function MealDiary({ storage }: { storage: ReturnType<typeof usePersonalToolState<MealLibrary>> }) {
  const valid = isMealLibrary(storage.value), library = valid ? storage.value : initialMealLibrary;
  const entries = library.nutrition || [], [tab, setTab] = useState<'diary' | 'library'>('diary');
  const priceOptions = commonMealValues(library.meals, 'price', blankMeal.price), minuteOptions = commonMealValues(library.meals, 'minutes', blankMeal.minutes);
  const frequentOccasions = rankCommonValues(library.meals.flatMap(meal => meal.occasions), Object.keys(occasionLabels)).slice(0, 3) as Occasion[];
  const [date, setDate] = useState(today), [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false), pending = useRef(false), [message, setMessage] = useState('');
  const [nutritionOpen, setNutritionOpen] = useState(false), [nutrition, setNutrition] = useState(blankNutrition);
  const [mealOpen, setMealOpen] = useState(false), [mealDraft, setMealDraft] = useState<Meal>(blankMeal);
  const [price, setPrice] = useState('20'), [minutes, setMinutes] = useState('15');
  const [deletedMeal, setDeletedMeal] = useState<Meal | null>(null);
  const nutritionInitial = useRef('');
  const mealInitial = useRef('');
  const nutritionTarget = useRef<NutritionEntry | null>(null);
  const mealTarget = useRef<Meal | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const disabled = !storage.ready || busy || !valid;
  const formLocked = busy || !!nutritionTarget.current || !!mealTarget.current;
  const daily = entries.filter(entry => entry.date === date);
  const days = Array.from(new Set([today(), date, ...entries.map(entry => entry.date)])).sort().reverse();
  const filtered = library.meals.filter(meal => `${meal.name} ${meal.place} ${meal.note}`.toLowerCase().includes(search.toLowerCase()));

  async function commit(update: (previous: MealLibrary) => MealLibrary) {
    if (disabled || pending.current) return false;
    pending.current = true; setBusy(true); setMessage('');
    try {
      let applied = false;
      await storage.setValue(previous => {
        if (!isMealLibrary(previous)) throw new Error('暂时无法读取餐单，请重试。');
        const result = update(previous);
        if (!isMealLibrary(result)) throw new Error('请检查填写的数据。');
        applied = true; return result;
      });
      if (!mounted.current) return false;
      if (!applied) throw new Error('账号已切换，请重新打开记录。');
      if (hasVolatilePersonalTool('meals', storage.owner)) throw new Error('本机存储不可用，输入已保留，请重试。');
      setMessage(''); return true;
    } catch (error) { if (mounted.current) setMessage(error instanceof Error ? error.message : '保存失败，请重试。'); return false; }
    finally { pending.current = false; if (mounted.current) setBusy(false); }
  }
  function openNutrition(entry?: NutritionEntry) {
    setMessage('');
    const fields = entry ? { id: entry.id, name: entry.name, carbs: String(entry.carbs), protein: String(entry.protein), fat: String(entry.fat) } : { ...blankNutrition };
    nutritionInitial.current = JSON.stringify(fields); nutritionTarget.current = null;
    setNutrition(fields); setNutritionOpen(true);
  }
  async function saveNutrition() {
    const entry: NutritionEntry = nutritionTarget.current || { id: nutrition.id || makeId(), date, name: nutrition.name.trim(), carbs: Number(nutrition.carbs), protein: Number(nutrition.protein), fat: Number(nutrition.fat) };
    if (nutrients.some(([key]) => !nutrition[key].trim()) || !isNutritionEntries([entry])) { setMessage('请填写餐食名称，三项营养值为 0–2000 克。'); return; }
    const editing = Boolean(nutrition.id); nutritionTarget.current = entry;
    if (await commit(previous => {
      const records = previous.nutrition || [];
      if (editing && !records.some(record => record.id === entry.id)) throw new Error('这条记录已删除，可以重新添加。');
      const exists = records.some(record => record.id === entry.id);
      if (!exists && records.length >= 300) throw new Error('已达到 300 条记录，请先整理旧记录。');
      return { ...previous, nutrition: exists ? records.map(record => record.id === entry.id ? entry : record) : [...records, entry] };
    })) { nutritionTarget.current = null; setNutritionOpen(false); }
  }
  async function removeNutrition(entry: NutritionEntry) {
    const confirm = await requestAppConfirmation({ title: '删除这条饮食记录？', content: entry.name, confirmText: '删除', intent: 'danger' });
    if (confirm.confirm && mounted.current) await commit(previous => ({ ...previous, nutrition: (previous.nutrition || []).filter(record => record.id !== entry.id) }));
  }
  function shiftDate(offset: number) {
    const next = new Date(`${date}T12:00:00`); next.setDate(next.getDate() + offset);
    setDate(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`);
  }
  function openMeal(meal?: Meal) {
    const fields = meal ? { ...meal, occasions: [...meal.occasions] } : { ...blankMeal, occasions: [...blankMeal.occasions] };
    const nextPrice = meal ? String(meal.price) : priceOptions[0].value, nextMinutes = meal ? String(meal.minutes) : minuteOptions[0].value;
    mealInitial.current = JSON.stringify({ fields, price: nextPrice, minutes: nextMinutes }); mealTarget.current = null;
    setMealDraft(fields); setPrice(nextPrice); setMinutes(nextMinutes); setMessage(''); setMealOpen(true);
  }
  async function saveMeal() {
    const meal: Meal = mealTarget.current || { ...mealDraft, id: mealDraft.id || makeId(), name: mealDraft.name.trim(), place: mealDraft.place.trim(), note: mealDraft.note.trim(), price: Number(price), minutes: Number(minutes) };
    if (!price.trim() || !minutes.trim() || !isMealLibrary({ version: 1, meals: [meal] })) { setMessage('请填写名称、有效花费和准备时间，至少选一个用餐时段。'); return; }
    mealTarget.current = meal;
    if (await commit(previous => {
      if (mealDraft.id && !previous.meals.some(item => item.id === mealDraft.id)) throw new Error('这道餐食已移除，请重新添加。');
      const exists = previous.meals.some(item => item.id === meal.id);
      if (!exists && previous.meals.length >= 150) throw new Error('最多保存 150 道餐食，请先整理餐单。');
      return { ...previous, meals: exists ? previous.meals.map(item => item.id === meal.id ? meal : item) : [...previous.meals, meal] };
    })) { mealTarget.current = null; setMealOpen(false); }
  }
  async function removeMeal(meal: Meal) {
    const confirm = await requestAppConfirmation({ title: '从餐单移除这道菜？', content: `${meal.name}，已填写的饮食记录会保留。`, confirmText: '移除', intent: 'danger' });
    if (confirm.confirm && mounted.current && await commit(previous => ({ ...previous, meals: previous.meals.filter(item => item.id !== meal.id) }))) setDeletedMeal(meal);
  }
  const editorClose = useEditorCloseGuard({
    scope: storage.ready && valid && (nutritionOpen || mealOpen) ? `${storage.owner}:${nutritionOpen ? `nutrition:${nutrition.id || 'new'}` : `meal:${mealDraft.id || 'new'}`}` : '',
    hasChanges: nutritionOpen ? JSON.stringify(nutrition) !== nutritionInitial.current || !!nutritionTarget.current : mealOpen && (JSON.stringify({ fields: mealDraft, price, minutes }) !== mealInitial.current || !!mealTarget.current),
    blocked: busy, onSave: () => nutritionOpen ? saveNutrition() : saveMeal(),
    onClose: () => { if (!pending.current) { setNutritionOpen(false); setMealOpen(false); nutritionTarget.current = null; mealTarget.current = null; } },
  });
  const status = (message || !valid || storage.status) && <View className='meal-status'><Text>{message || (!valid ? '当前数据无法读取，请重试。' : storage.status)}</Text><ActionButton appearance='quiet' className="button-label meal-text-button" disabled={busy} onClick={storage.retry}>重试同步</ActionButton></View>;

  return <><PageScroll><View className='tool-page meal-page core-page'><CoreScreen moreLabel={tab === 'diary' ? '这一天与历史记录' : '全部餐单'}>
    <View className='tool-header'><Text className='tool-title'>今天，吃进了什么。</Text></View>
    <PageToolbar className='meal-page-toolbar' create={tab === 'diary' ? <CreateButton className='tool-primary meal-create' label={date === today() ? '记录餐单' : '补记餐单'} disabled={disabled} onClick={() => openNutrition()} /> : <CreateButton className='tool-primary meal-create' label='添加常用餐食' disabled={disabled || library.meals.length >= 150} onClick={() => openMeal()} />} />
    <CategoryRow className='meal-category-row' contentClassName='meal-tabs' ariaLabel='饮食分类'><CategoryButton className={'button-label ' + (tab === 'diary' ? 'is-active' : '')} onClick={() => setTab('diary')}>饮食记录</CategoryButton><CategoryButton className={'button-label ' + (tab === 'library' ? 'is-active' : '')} onClick={() => setTab('library')}>我的餐单 · {library.meals.length}</CategoryButton></CategoryRow>
    {tab === 'diary' && <>
      <View className='meal-date-row'><ActionButton appearance='icon' className="button-label meal-date-arrow" ariaLabel='前一天' onClick={() => shiftDate(-1)}>‹</ActionButton><Picker mode='date' value={date} onChange={event => setDate(String(event.detail.value))}><View className='meal-date-picker'><Text>{date === today() ? '今天' : date.slice(5).replace('-', ' 月 ') + ' 日'}</Text><Text>{date}</Text></View></Picker><ActionButton appearance='icon' className="button-label meal-date-arrow" ariaLabel='后一天' onClick={() => shiftDate(1)}>›</ActionButton></View>
      
    </>}
    {tab === 'library' && <>
      
      {deletedMeal && <View className='meal-undo'><Text>已移除 {deletedMeal.name}</Text><ActionButton appearance='quiet' className="button-label meal-text-button" disabled={disabled || library.meals.length >= 150} onClick={async () => { if (await commit(previous => ({ ...previous, meals: previous.meals.some(item => item.id === deletedMeal.id) ? previous.meals : [...previous.meals, deletedMeal] }))) setDeletedMeal(null); }}>撤销移除</ActionButton></View>}
      <Input cursorSpacing={96} adjustPosition className='tool-input' value={search} placeholder='找一道菜、店名或备注' onInput={event => setSearch(event.detail.value)} confirmType='search' />
    </>}
    </CoreScreen><MoreSection title={tab === 'diary' ? '饮食记录' : '全部餐单'}>
    {tab === 'diary' && <>
      <View className='meal-section-title'><SectionTitle inRow>这一天 · {daily.length} 餐</SectionTitle>{date !== today() && <ActionButton appearance='quiet' className="button-label meal-text-button" onClick={() => setDate(today())}>回到今天</ActionButton>}</View>
      {!daily.length && <View className='tool-empty meal-empty'><Text className='meal-empty-mark'>◌</Text><Text>这一天还没有记录。</Text></View>}
      {daily.map(entry => <View className='tool-card meal-entry' key={entry.id}><View className='meal-entry-top'><Text>{trimTextEnd(entry.name)}</Text><ActionButton appearance='icon' size='compact' width='content' className="button-label meal-text-button" ariaLabel={`编辑饮食记录：${entry.name}`} disabled={disabled} onClick={() => openNutrition(entry)}><EditSymbol /></ActionButton></View><View className='meal-entry-nutrients'>{nutrients.map(([key, label, color]) => <View key={key}><Text style={{ color }}>{label}</Text><Text>{entry[key]} g</Text></View>)}</View><ActionButton appearance='danger' className="button-label meal-remove-button" disabled={disabled} onClick={() => void removeNutrition(entry)}>删除这条</ActionButton></View>)}
      <View className='meal-section-title'><SectionTitle inRow>翻翻以前的记录</SectionTitle><Text className='tool-muted'>{entries.length} / 300 条</Text></View>
      <ScrollView scrollX className='meal-day-scroll' showScrollbar={false}><View className='meal-days'>{days.map(day => <Button className={day === date ? 'is-active' : ''} key={day} onClick={() => setDate(day)}><Text>{day === today() ? '今天' : day.slice(5).replace('-', '.')}</Text><Text>{entries.filter(entry => entry.date === day).length} 条</Text></Button>)}</View></ScrollView>
    </>}
    {tab === 'library' && <>
      {filtered.map(meal => <View className='tool-card meal-library-item' key={meal.id}><View className='meal-entry-top'><Text>{trimTextEnd(meal.name)}</Text><Text className='meal-price'>¥{meal.price}</Text></View><Text className='tool-muted'>{meal.place || kindLabels[meal.kind]}</Text>{meal.note && <Text className='meal-note'>{trimTextEnd(meal.note)}</Text>}<View className='tool-chips'><Text className='tool-chip'>{meal.minutes} 分钟</Text><Text className='tool-chip'>{meal.spicy ? '辣' : '不辣'}</Text>{meal.vegetarian && <Text className='tool-chip'>无肉</Text>}<Text className='tool-chip'>{meal.occasions.map(occasion => occasionLabels[occasion]).join(' / ')}</Text></View><View className='meal-library-actions'><ActionButton appearance='icon' size='compact' width='content' className="button-label meal-text-button" ariaLabel={`编辑常吃餐品：${meal.name}`} disabled={disabled} onClick={() => openMeal(meal)}><EditSymbol /></ActionButton><ActionButton appearance='danger' className="button-label meal-remove-button" disabled={disabled} onClick={() => void removeMeal(meal)}>移除</ActionButton></View></View>)}
      {!filtered.length && <View className='tool-empty'>未找到餐食</View>}
    </>}
    {status}
  </MoreSection></View></PageScroll>
    {(nutritionOpen || mealOpen) && <View className='meal-sheet-mask' onClick={editorClose.requestClose}><View className='meal-sheet' onClick={event => event.stopPropagation()}><EditorHeading embedded className='meal-sheet-heading' caption={nutritionOpen ? <Text className='tool-kicker'>{date}</Text> : undefined} title={nutritionOpen ? nutrition.id ? '编辑这一餐' : '这一餐，吃了什么？' : mealDraft.id ? '编辑常吃的' : '加一道常吃的'} actions={<ActionButton appearance='icon' ariaLabel='关闭餐食编辑' disabled={busy} onClick={editorClose.requestClose}>×</ActionButton>} /><ScrollView scrollY className='meal-sheet-scroll' showScrollbar={false}>
      {nutritionOpen && <EditorFieldsLayout className='meal-sheet-fields'><EntityTitleRow><EntityTitleInput cursorSpacing={96} adjustPosition ariaLabel='餐食名称' focus value={nutrition.name} maxlength={80} disabled={formLocked} placeholder='例如：午餐的鸡肉饭' onInput={event => setNutrition(previous => ({ ...previous, name: event.detail.value }))} /></EntityTitleRow>
        {library.meals.length > 0 && <SingleChoiceField options={library.meals.map(meal => ({ value: meal.id, label: meal.name }))} value={library.meals.find(meal => meal.name === nutrition.name)?.id || ''} disabled={formLocked} ariaLabel='从餐单选择' className='meal-pick-existing' onChange={id => { const meal = library.meals.find(item => item.id === id); if (meal) setNutrition(previous => ({ ...previous, name: meal.name })); }} />}
        <View className='meal-nutrient-fields'>{nutrients.map(([key, label]) => <View key={key}><Text className='meal-label'>{label} / 克</Text><SingleLineInput cursorSpacing={96} adjustPosition className='tool-input' ariaLabel={`${label}摄入克数`} type='digit' value={nutrition[key]} disabled={formLocked} placeholder='0.0' onInput={event => setNutrition(previous => ({ ...previous, [key]: event.detail.value }))} /></View>)}</View>
      </EditorFieldsLayout>}
      {mealOpen && <EditorFieldsLayout className='meal-sheet-fields'>
        <EntityTitleRow><EntityTitleInput cursorSpacing={96} adjustPosition ariaLabel='餐食名称' value={mealDraft.name} maxlength={60} disabled={formLocked} placeholder='例如：楼下的牛肉面' onInput={event => setMealDraft(previous => ({ ...previous, name: event.detail.value }))} /></EntityTitleRow>
        <Text className='meal-label'>备注</Text><Input cursorSpacing={96} adjustPosition className='tool-input meal-note-input' ariaLabel='餐食备注' value={mealDraft.note} maxlength={200} disabled={formLocked} placeholder='口味、招牌，或者想去的理由' onInput={event => setMealDraft(previous => ({ ...previous, note: event.detail.value }))} />
        <Text className='meal-label'>店名 / 地点</Text><Input cursorSpacing={96} adjustPosition className='tool-input' ariaLabel='餐食地点' value={mealDraft.place} maxlength={100} disabled={formLocked} placeholder='常去的店，或者做饭的地方' onInput={event => setMealDraft(previous => ({ ...previous, place: event.detail.value }))} />
        <Text className='meal-label'>每人花费 / 元</Text><CustomChoiceRow options={priceOptions} value={price} onChange={setPrice} inputAriaLabel='餐食花费' type='digit' maxlength={20} disabled={formLocked} className='meal-price-options' />
        <Text className='meal-label'>准备时间 / 分钟</Text><CustomChoiceRow options={minuteOptions} value={minutes} onChange={setMinutes} inputAriaLabel='餐食准备时间' type='number' maxlength={20} disabled={formLocked} className='meal-minute-options' />
        <Text className='meal-label'>餐食类型</Text><SingleChoiceField options={Object.entries(kindLabels).map(([value, label]) => ({ value: value as MealKind, label }))} value={mealDraft.kind} disabled={formLocked} ariaLabel='选择餐食类型' className='meal-kind-options' onChange={kind => setMealDraft(previous => ({ ...previous, kind }))} />
        <Text className='meal-label'>用餐时段</Text><TagChoiceRow labelKind='plain' options={Object.entries(occasionLabels).map(([value, label]) => ({ value: value as Occasion, label }))} value={mealDraft.occasions} frequentValues={frequentOccasions} disabled={formLocked} ariaLabel='选择用餐时段' className='meal-occasion-options' onChange={occasions => setMealDraft(previous => ({ ...previous, occasions }))} />
        <View className='meal-switch'><Text>这道菜是辣的</Text><Switch color='#7ba695' checked={mealDraft.spicy} disabled={formLocked} onChange={event => setMealDraft(previous => ({ ...previous, spicy: event.detail.value }))} /></View><View className='meal-switch'><Text>无肉餐食（可含蛋奶）</Text><Switch color='#7ba695' checked={mealDraft.vegetarian} disabled={formLocked} onChange={event => setMealDraft(previous => ({ ...previous, vegetarian: event.detail.value }))} /></View>
      </EditorFieldsLayout>}
      {message && <Text className='meal-form-message'>{message}</Text>}
    </ScrollView><SheetActions className='meal-sheet-actions'><ActionButton appearance='primary' width='fill' className="button-label tool-primary meal-sheet-save" ariaLabel={nutritionOpen ? '保存餐单记录' : '保存常用餐食'} disabled={disabled} loading={busy} onClick={() => void (nutritionOpen ? saveNutrition() : saveMeal())}>保存</ActionButton></SheetActions></View></View>}
    {editorClose.dialog}
  </>;
}
