import SectionTitle from './section-title';
import { useMemo, useState } from 'react';
import { Input, ScrollView, Text, View } from '@tarojs/components';
import ActionButton from './ui-button';
import SheetActions from './sheet-actions';
import EditorHeading from './editor-heading';
import { CategoryButton, CategoryRow } from './page-toolbar';
import { todoQuadrant, todoQuadrants, type Todo } from '../lib/tool-records';
import type { FocusSession } from '../lib/pomodoro-data';
import PriorityFlag from './priority-flag';
import TodoTaskCard from './todo-task-card';
import usePageNow from '../lib/use-page-now';
import './focus-selection-sheet.css';

type Props = {
  items: Todo[];
  sessions: FocusSession[];
  selectedId?: string | null;
  onSelect: (item: Todo | null) => void;
  onClose: () => void;
};
const searchable = (text: string) => text.replace(/\s+/g, '').toLowerCase();

export default function TodoSelectionSheet({ items, sessions, selectedId, onSelect, onClose }: Props) {
  const now = usePageNow();
  const [query, setQuery] = useState('');
  const initialCategory = () => {
    const selected = items.find(item => item.id === selectedId);
    return selected ? todoQuadrant(selected).id : (todoQuadrants.find(row => items.some(item => todoQuadrant(item).id === row.id)) || todoQuadrants[0]).id;
  };
  const [category, setCategory] = useState(initialCategory);
  const group = todoQuadrants.find(row => row.id === category)!;
  const groupName = (item: Todo) => todoQuadrant(item).title.replace('级', '度');
  const needle = searchable(query);
  const matches = items.filter(item => todoQuadrant(item).id === category && searchable(`${item.title}${groupName(item)}`).includes(needle));
  const recent = useMemo(() => {
    const byId = new Map(matches.map(item => [item.id, item]));
    const seen = new Set<string>();
    const result: Todo[] = [];
    for (const session of sessions) {
      if (session.mode !== 'focus' || !session.taskId || seen.has(session.taskId)) continue;
      const item = byId.get(session.taskId);
      if (!item) continue;
      seen.add(item.id); result.push(item);
      if (result.length === 4) break;
    }
    return result;
  }, [matches, sessions]);
  const showRecent = !needle && recent.length > 0;
  const remaining = showRecent ? matches.filter(item => !recent.some(row => row.id === item.id)) : matches;

  function options(rows: Todo[]) {
    return <View className='focus-selection-tasks'>{rows.map(item => <TodoTaskCard key={item.id} task={item} now={now} checked={item.id === selectedId} className={item.id === selectedId ? 'is-selected' : ''} rootProps={{ onClick: () => onSelect(item) }} contentClassName='focus-todo-option' pressed={item.id === selectedId} leading={check => <View className='todo-complete' aria-hidden>{check}</View>} ariaLabel={`选择待办：${item.title}`} onOpen={event => { event.stopPropagation(); onSelect(item); }} />)}</View>;
  }

  return <View className='focus-selection-overlay focus-todo-overlay'>
    <View className='focus-selection-backdrop' catchMove onClick={onClose} />
    <View className='focus-selection-sheet focus-todo-sheet'>
      <EditorHeading className='focus-selection-heading' title='选择待办' actions={<ActionButton appearance='icon' className='button-label' ariaLabel='关闭待办选择' onClick={onClose}>×</ActionButton>} />
      <View className='focus-selection-tools'>
        <View className='focus-selection-search'><View className='focus-selection-search-mark' aria-hidden /><Input ariaLabel='搜索待办' placeholder='搜索待办名称' value={query} maxlength={60} cursorSpacing={96} adjustPosition confirmType='search' onInput={event => setQuery(event.detail.value)} />{!!query && <ActionButton appearance='icon' className='button-label focus-selection-clear' ariaLabel='清空待办搜索' onClick={() => setQuery('')}>×</ActionButton>}</View>
        <CategoryRow className='focus-selection-filter-scroll' contentClassName='focus-selection-filters is-horizontal' ariaLabel='待办优先度'>{todoQuadrants.map(row => <CategoryButton key={row.id} className='button-label focus-selection-filter' ariaLabel={`待办优先度：${row.title.replace('级', '度')}`} selected={category === row.id} onClick={() => setCategory(row.id)}><PriorityFlag color={row.color} outlined={row.id === 'later'} /></CategoryButton>)}</CategoryRow>
      </View>
      <ScrollView key={JSON.stringify([category, needle])} scrollY className='focus-selection-scroll focus-todo-scroll' enhanced bounces={false} showScrollbar={false}>
        <View className='focus-selection-content'>
          {showRecent && <View className='focus-selection-recent focus-todo-recent'><SectionTitle className='focus-selection-section-title'>最近专注</SectionTitle>{options(recent)}</View>}
          {!!remaining.length && <View><View className='focus-selection-section-heading'><SectionTitle className='focus-selection-section-title'>{needle ? '搜索结果' : showRecent ? '其他待办' : group.title.replace('级', '度')}</SectionTitle><Text>{remaining.length}</Text></View>{options(remaining)}</View>}
          {!matches.length && <View className='focus-selection-empty'><Text>{items.length ? '当前优先度没有匹配的待办' : '暂无可选待办'}</Text>{!!query && <ActionButton className='button-label' onClick={() => setQuery('')}>清空搜索</ActionButton>}</View>}
        </View>
      </ScrollView>
      <SheetActions className='focus-selection-footer'><ActionButton className='button-label' ariaLabel='改为自由专注' onClick={() => onSelect(null)}>自由专注</ActionButton></SheetActions>
    </View>
  </View>;
}
