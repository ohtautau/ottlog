import { useEffect, useRef, useState } from 'react';
import { Text, View } from '@tarojs/components';
import { todoQuadrants, type TodoCategory, type TodoPanelSource } from '../lib/tool-records';
import { todoCategoryChoices } from '../lib/todo-categories';
import LibraryIcon from './library-icon';
import { ChoicePopover, PopoverHeading } from './form-options';
import ActionButton, { ChoiceButton } from './ui-button';
import { MoreSymbol } from './manage-symbol';
import PriorityFlag from './priority-flag';
import './todo-panel-picker.css';

/** Display sources only; hosts own task matching, assignment and persistence. */
export default function TodoPanelPicker({ categories, value, onChange, disabled = false, ariaLabel = '更换区域显示', owner = '' }: {
  categories: readonly TodoCategory[]; value: TodoPanelSource; onChange: (source: TodoPanelSource) => Promise<void> | void;
  disabled?: boolean; ariaLabel?: string; owner?: string;
}) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const generation = useRef(0), scope = useRef(owner), lock = useRef(false); scope.current = owner;
  useEffect(() => { ++generation.current; lock.current = false; setOpen(false); setBusy(false); setError(''); }, [owner]);
  useEffect(() => () => { ++generation.current; }, []);
  async function choose(source: TodoPanelSource) {
    if (disabled || lock.current) return;
    const expectedOwner = owner, operation = ++generation.current;
    lock.current = true; setBusy(true); setError('');
    try {
      await onChange(source);
      if (scope.current === expectedOwner && operation === generation.current) setOpen(false);
    } catch (reason) {
      if (scope.current === expectedOwner && operation === generation.current) setError(reason instanceof Error ? reason.message : '显示方式未保存，请重试');
    } finally {
      if (scope.current === expectedOwner && operation === generation.current) { lock.current = false; setBusy(false); }
    }
  }
  const choices = todoCategoryChoices({ categories });
  return <ChoicePopover ariaLabel={ariaLabel} open={open} onOpenChange={next => { if (!busy) { setOpen(next); setError(''); } }} disabled={disabled}
    trigger={<MoreSymbol />} triggerAppearance='icon' triggerSize='compact' triggerIconOnly showIndicator={false}
    triggerClassName='todo-panel-source-trigger' layerClassName='todo-panel-source-layer' panelClassName='todo-panel-source-panel' placement='center' panelWidth={360} maxHeightRatio={.8} bodySpacing='none' contentKey={`${choices.length}:${error}`}
    heading={<PopoverHeading title='更换显示' actions={<ActionButton appearance='icon' size='compact' ariaLabel='关闭区域显示选择' disabled={busy} onClick={() => setOpen(false)}>×</ActionButton>} />}>
    <View className='todo-panel-source-options'><Text className='todo-panel-source-section'>优先级</Text>
      {todoQuadrants.map(quadrant => <ChoiceButton key={quadrant.id} className='todo-panel-source-option' selected={value.kind === 'quadrant' && value.quadrantId === quadrant.id} disabled={busy} ariaLabel={`显示象限：${quadrant.title}`} onClick={() => { void choose({ kind: 'quadrant', quadrantId: quadrant.id }); }}><PriorityFlag color={quadrant.color} outlined={quadrant.id === 'later'} /><Text>{quadrant.title}</Text></ChoiceButton>)}
      <Text className='todo-panel-source-section'>分类</Text>
      {choices.map(category => <ChoiceButton key={category.id} className='todo-panel-source-option' selected={value.kind === 'category' && value.categoryId === category.id} disabled={busy} ariaLabel={`显示分类：${category.name}`} onClick={() => { void choose({ kind: 'category', categoryId: category.id }); }}><LibraryIcon name={category.iconId} fallback='notes' className='todo-panel-category-icon' /><Text>{category.name}</Text></ChoiceButton>)}
      {!!error && <View className='todo-panel-source-error' role='alert'>{error}</View>}
    </View>
  </ChoicePopover>;
}
