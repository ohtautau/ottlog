import { trimTextEnd } from '../lib/text-whitespace';
import SectionTitle from './section-title';
import { useMemo, useState } from 'react';
import { Button, Input, ScrollView, Text, View } from '@tarojs/components';
import ActionButton from './ui-button';
import SheetActions from './sheet-actions';
import EditorHeading from './editor-heading';
import { CategoryButton, CategoryRow } from './page-toolbar';
import { type Reminder } from '../lib/reminder-data';
import type { FocusSession } from '../lib/pomodoro-data';
import HabitIcon from './habit-icon';
import HabitPriorityCorner from './habit-priority-corner';
import { habitIconId } from '../lib/icon-library';
import './focus-selection-sheet.css';

type Props = {
  items: Reminder[];
  sessions: FocusSession[];
  selectedId?: string | null;
  onSelect: (item: Reminder | null) => void;
  onClose: () => void;
};
const searchable = (text: string) => text.replace(/\s+/g, '').toLowerCase();

export default function HabitSelectionSheet({ items, sessions, selectedId, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('全部');
  const needle = searchable(query);
  const availableGroups = [...new Set(items.map(item => item.group))];
  const effectiveGroup = availableGroups.some(name => name === group) ? group : '全部';
  const matches = items.filter(item => (effectiveGroup === '全部' || item.group === effectiveGroup) && searchable(`${item.title}${item.group}`).includes(needle));
  const recent = useMemo(() => {
    const byId = new Map(items.map(item => [item.id, item]));
    const seen = new Set<string>();
    const result: Reminder[] = [];
    // Pomodoro sessions are normalized in newest-first order by the page.
    for (const session of sessions) {
      if (session.mode !== 'focus' || !session.habitId || seen.has(session.habitId)) continue;
      const item = byId.get(session.habitId);
      if (!item) continue;
      seen.add(item.id); result.push(item);
      if (result.length === 4) break;
    }
    return result;
  }, [items, sessions]);
  const showRecent = !needle && effectiveGroup === '全部' && recent.length > 0;
  const remaining = showRecent ? matches.filter(item => !recent.some(row => row.id === item.id)) : matches;

  function options(rows: Reminder[]) {
    return <View className='focus-selection-grid focus-habit-grid'>{rows.map(item => <Button key={item.id} className={`focus-selection-option focus-habit-option${item.id === selectedId ? ' is-selected' : ''}`} ariaLabel={`选择习惯：${item.title}`} aria-pressed={item.id === selectedId} onClick={() => onSelect(item)}>
      <HabitIcon name={habitIconId(item)} />
      <View className='focus-selection-copy focus-habit-copy'><Text className='focus-selection-name focus-habit-name'>{trimTextEnd(item.title)}</Text><Text className='focus-selection-group focus-habit-group'>{item.group}</Text></View>
      <HabitPriorityCorner priority={item.priority} />
    </Button>)}</View>;
  }

  return <View className='focus-selection-overlay focus-habit-overlay'>
    <View className='focus-selection-backdrop focus-habit-backdrop' catchMove onClick={onClose} />
    <View className='focus-selection-sheet focus-habit-sheet'>
      <EditorHeading className='focus-selection-heading focus-habit-heading' title='选择习惯' actions={<ActionButton appearance='icon' className='button-label' ariaLabel='关闭习惯选择' onClick={onClose}>×</ActionButton>} />
      <View className='focus-selection-tools focus-habit-tools'>
        <View className='focus-selection-search focus-habit-search'><View className='focus-selection-search-mark focus-habit-search-mark' aria-hidden /><Input ariaLabel='搜索习惯' placeholder='搜索习惯名称或分组' value={query} maxlength={60} cursorSpacing={96} adjustPosition confirmType='search' onInput={event => setQuery(event.detail.value)} />{!!query && <ActionButton appearance='icon' className='button-label focus-selection-clear focus-habit-clear' ariaLabel='清空习惯搜索' onClick={() => setQuery('')}>×</ActionButton>}</View>
        <CategoryRow className='focus-selection-filter-scroll focus-habit-filter-scroll' contentClassName='focus-selection-filters focus-habit-filters' ariaLabel='习惯分组' fixedLeading={<CategoryButton className='focus-selection-filter focus-habit-filter' ariaLabel='习惯分组：全部' selected={effectiveGroup === '全部'} onClick={() => setGroup('全部')}>全部</CategoryButton>}>{availableGroups.map(name => <CategoryButton key={name} className={`button-label focus-selection-filter focus-habit-filter${effectiveGroup === name ? ' is-selected' : ''}`} ariaLabel={`习惯分组：${name}`} selected={effectiveGroup === name} onClick={() => setGroup(name)}>{name}</CategoryButton>)}</CategoryRow>
      </View>
      <ScrollView key={`${effectiveGroup}:${needle}`} scrollY className='focus-selection-scroll focus-habit-scroll' enhanced bounces={false} showScrollbar={false}>
        <View className='focus-selection-content focus-habit-content'>
          {showRecent && <View className='focus-selection-recent focus-habit-recent'><SectionTitle className='focus-selection-section-title focus-habit-section-title'>最近专注</SectionTitle>{options(recent)}</View>}
          {!!remaining.length && <View className='focus-selection-results focus-habit-results'><View className='focus-selection-section-heading focus-habit-section-heading'><SectionTitle className='focus-selection-section-title focus-habit-section-title'>{needle ? '搜索结果' : effectiveGroup === '全部' ? showRecent ? '其他习惯' : '全部习惯' : effectiveGroup}</SectionTitle><Text>{remaining.length}</Text></View>{options(remaining)}</View>}
          {!matches.length && <View className='focus-selection-empty focus-habit-empty'><Text>{items.length ? '没有找到这个习惯' : '暂无可选习惯'}</Text>{items.length > 0 && <ActionButton className='button-label' onClick={() => { setQuery(''); setGroup('全部'); }}>查看全部习惯</ActionButton>}</View>}
        </View>
      </ScrollView>
      <SheetActions className='focus-selection-footer focus-habit-footer'><ActionButton className='button-label' ariaLabel='改为自由专注' onClick={() => onSelect(null)}>自由专注</ActionButton></SheetActions>
    </View>
  </View>;
}
