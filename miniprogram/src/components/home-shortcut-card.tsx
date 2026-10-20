import { trimTextEnd } from '../lib/text-whitespace';
import type { ComponentProps } from 'react';
import { Button, Text, View } from '@tarojs/components';
import type { HomeShortcut } from '../lib/home-shortcuts';
import { EditSymbol, ReplaceSymbol } from './manage-symbol';
import CardCornerActions, { CardMoveActions } from './card-corner-actions';
import ShortcutBackground from './shortcut-background';
import ActionButton from './ui-button';
import CardCreateButton from './card-create-button';
import './home-shortcut-card.css';

export function HomeShortcutCreateCard({ onCreate, disabled = false }: { onCreate: () => void; disabled?: boolean }) {
  return <View className='home-shortcut-card is-create'><CardCreateButton ariaLabel='添加快捷方式' disabled={disabled} onClick={onCreate} /></View>;
}

/** Shared card appearance; navigation, editing and sort persistence belong to the host. */
export default function HomeShortcutCard({ item, onOpen, onEdit, onReplace, onMoveUp, onMoveDown, disabled = false, upDisabled = false, downDisabled = false, rankVisible = false, className = '', rootProps }: {
  item: HomeShortcut; onOpen?: () => void; onEdit?: () => void; onReplace?: () => void; onMoveUp?: () => void; onMoveDown?: () => void;
  disabled?: boolean; upDisabled?: boolean; downDisabled?: boolean; rankVisible?: boolean;
  className?: string; rootProps?: Omit<ComponentProps<typeof View>, 'children' | 'className'>;
}) {
  const moving = !!(onMoveUp && onMoveDown), managing = !!(onEdit || onReplace), interactive = onOpen && !moving && !managing;
  const name = <Text className='today-entry-name'>{trimTextEnd(item.name)}</Text>;
  return <View {...rootProps} className={`home-shortcut-card shortcut-color-${item.color}${moving ? ' is-sorting' : managing ? ' is-managing' : ''} ${className}`}>
    <ShortcutBackground icon={item.icon} name={item.key} />
    {interactive ? <Button className='home-shortcut-open' ariaLabel={item.name} disabled={disabled} hoverClass='home-shortcut-open-pressed' onClick={onOpen}>{name}</Button> : <View className='home-shortcut-open is-preview'>{name}</View>}
    {rankVisible && <Text className='home-shortcut-rank'>{item.rank}</Text>}
    {moving ? <CardMoveActions className='home-shortcut-actions' objectLabel={`${item.name}快捷方式`} disabled={disabled} upDisabled={upDisabled} downDisabled={downDisabled} onMoveUp={onMoveUp!} onMoveDown={onMoveDown!} /> : managing && <CardCornerActions className='home-shortcut-actions'>
      {onEdit && <ActionButton appearance='icon' size='compact' width='content' className='home-shortcut-edit' ariaLabel={`编辑快捷方式：${item.name}`} disabled={disabled} onClick={event => { event.stopPropagation(); onEdit(); }}><EditSymbol /></ActionButton>}
      {onReplace && <ActionButton appearance='icon' size='compact' width='content' className='home-shortcut-replace' ariaLabel={`替换快捷方式：${item.name}`} disabled={disabled} onClick={event => { event.stopPropagation(); onReplace(); }}><ReplaceSymbol /></ActionButton>}
    </CardCornerActions>}
  </View>;
}
