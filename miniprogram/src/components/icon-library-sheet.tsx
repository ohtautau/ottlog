import SectionTitle from './section-title';
import { useState } from 'react';
import { Button, Input, ScrollView, Text, View } from '@tarojs/components';
import ActionButton, { ChoiceButton } from './ui-button';
import { CategoryButton, CategoryRow } from './page-toolbar';
import { findLibraryIcons, iconCategories, iconLibrary, type IconCategory, type LibraryIconId } from '../lib/icon-library';
import LibraryIcon from './library-icon';
import SheetActions from './sheet-actions';
import EditorHeading from './editor-heading';
import './icon-library-sheet.css';

export default function IconLibrarySheet({ selectedId, allowNone = false, onSelect, onClose, title = '图标库', ariaLabel = '图标库', optionPrefix = '选择图标：', closeLabel = '关闭图标库', className = '' }: {
  selectedId?: string; allowNone?: boolean; onSelect: (id: LibraryIconId | null) => void; onClose: () => void;
  title?: string; ariaLabel?: string; optionPrefix?: string; closeLabel?: string;
  className?: string;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<IconCategory | '全部'>('全部');
  const matches = findLibraryIcons(category, query);
  return <View className={`icon-library-overlay ${className}`}>
    <View className='icon-library-backdrop' catchMove onClick={onClose} />
    <View className='icon-library-sheet' role='dialog' ariaLabel={ariaLabel}>
      <EditorHeading className='icon-library-heading' title={title} actions={<ActionButton appearance='icon' className='button-label' ariaLabel={closeLabel} onClick={onClose}>×</ActionButton>} />
      <View className='icon-library-tools'>
        <View className='icon-library-search'><View className='icon-library-search-mark' aria-hidden /><Input ariaLabel='搜索图标' placeholder='搜索图标，如运动、阅读、旅行' value={query} maxlength={60} cursorSpacing={96} adjustPosition confirmType='search' onInput={event => setQuery(event.detail.value)} />{!!query && <ActionButton appearance='icon' className='button-label' ariaLabel='清空图标搜索' onClick={() => setQuery('')}>×</ActionButton>}</View>
        <CategoryRow className='icon-library-category-scroll' contentClassName='icon-library-categories' ariaLabel='图标分类' enhanced bounces={false} fixedLeading={<CategoryButton className='icon-library-category' ariaLabel='图标分类：全部' selected={category === '全部'} onClick={() => setCategory('全部')}>全部</CategoryButton>}>{iconCategories.map(name => <CategoryButton key={name} className={`button-label icon-library-category${category === name ? ' is-active' : ''}`} ariaLabel={`图标分类：${name}`} selected={category === name} onClick={() => setCategory(name)}>{name}</CategoryButton>)}</CategoryRow>
      </View>
      <ScrollView key={`${category}:${query.trim()}`} scrollY className='icon-library-scroll' enhanced bounces={false} showScrollbar={false}>
        <View className='icon-library-content'><View className='icon-library-result-heading'><SectionTitle inRow>{query.trim() ? '搜索结果' : category === '全部' ? '全部图标' : category}</SectionTitle><Text>{matches.length}</Text></View>
          <View className='icon-library-grid'>{matches.map(icon => <Button key={icon.id} className={`icon-library-option${selectedId === icon.id ? ' is-selected' : ''}`} ariaLabel={`${optionPrefix}${icon.label}`} aria-pressed={selectedId === icon.id} onClick={() => onSelect(icon.id)}><LibraryIcon name={icon.id} /><Text>{icon.label}</Text>{selectedId === icon.id && <View className='icon-library-selected-mark' aria-hidden />}</Button>)}</View>
          {!matches.length && <View className='icon-library-empty'><Text>没有找到这个图标</Text><ActionButton className='button-label' onClick={() => { setQuery(''); setCategory('全部'); }}>查看全部图标</ActionButton></View>}
        </View>
      </ScrollView>
      {allowNone && <SheetActions className='icon-library-footer'><ChoiceButton className='button-label' ariaLabel='不使用图标' aria-pressed={!selectedId} onClick={() => onSelect(null)}>不使用图标</ChoiceButton></SheetActions>}
    </View>
  </View>;
}
