import type { ReactNode } from 'react';
import { Button, Image, Text, View } from '@tarojs/components';
import LibraryIcon from './library-icon';
import HabitPriorityCorner from './habit-priority-corner';
import { EditSymbol } from './manage-symbol';
import { memoSurfaceStyle } from './memo-fields-layout';
import { memoPriorityColor, type MemoPriority, type MemoImage } from '../lib/tool-records';
import './data-card-views.css';

/** Presentation-only props keep examples out of entity models and save handlers. */
export function MemoCard({ title, body, priority = 'none', metadata, images = [], actions, onOpen, selected, selecting = false }: {
  title: string; body: string; priority?: MemoPriority;
  metadata?: ReactNode; images?: MemoImage[]; actions?: ReactNode; onOpen?: () => void; selected?:boolean;selecting?:boolean;
}) {
  const content = <><View className='memo-note-copy'>
    <View className='memo-note-title-row'><Text className='memo-note-title'>{title}</Text></View>
    <Text className='memo-note-body'>{body}</Text><View className='memo-note-meta'>{metadata}</View>
  </View>{!!images.length && <View className='memo-note-images'><Image src={images[0].dataUrl} mode='aspectFill' /></View>}</>;
  return <View className={`memo-note${selecting ? ' is-selecting' : ''}${selected ? ' is-selected' : ''}`} style={memoSurfaceStyle()}><HabitPriorityCorner priority={priority} color={memoPriorityColor(priority)} />
    {onOpen ? <Button className='memo-note-open' hoverClass='none' ariaLabel={`${selecting ? '选择' : '编辑'}便签：${title}`} aria-pressed={selecting ? !!selected : undefined} onClick={onOpen}>{content}</Button> : <View className='memo-note-open'>{content}</View>}
    {actions && <View className='memo-note-actions'>{actions}</View>}
  </View>;
}

export function MottoRow({ text, index, onEdit, disabled }: { text: string; index: number; onEdit?: () => void; disabled?: boolean }) {
  const content = <><Text className='mottos-number'>{String(index + 1).padStart(2, '0')}</Text><Text className='mottos-text'>{text}</Text><EditSymbol /></>;
  return onEdit ? <Button className='mottos-row' ariaLabel={`编辑第 ${index + 1} 句格言`} disabled={disabled} onClick={onEdit}>{content}</Button> : <View className='mottos-row'>{content}</View>;
}

export function FocusRecordCard({ title, duration, metadata, isBreak, children, actions }: { title: string; duration: string; metadata: string; isBreak?: boolean; children?: ReactNode; actions?: ReactNode }) {
  return <View className='focus-record'><View className={isBreak ? 'focus-record-mark is-break' : 'focus-record-mark'}>{isBreak ? '∿' : '◷'}</View><View className='focus-record-body'><View className='focus-record-top'><Text className='focus-record-title'>{title}</Text><Text className='focus-record-duration'>{duration}</Text></View><Text className='focus-record-meta'>{metadata}</Text>{children}</View>{actions}</View>;
}

export function ActivityRow({ title, metadata, action, icon, disabled, onOpen }: { title: string; metadata: string; action: string; icon: string; disabled?: boolean; onOpen?: () => void }) {
  const content = <><View className='summary-activity-icon'><LibraryIcon name={icon} /></View><View className='summary-activity-content'><Text className='summary-activity-title'>{title}</Text><Text className='summary-activity-meta'>{metadata}</Text></View><Text className='summary-activity-action'>{action} ↗</Text></>;
  return onOpen ? <Button className='summary-activity' disabled={disabled} onClick={onOpen} ariaLabel={`${action}：${metadata}，${title}`}>{content}</Button> : <View className='summary-activity'>{content}</View>;
}

export function CommentCard({ name, date, text }: { name: string; date: string; text: string }) {
  return <View className='detail-comment'><View className='detail-comment-head'><Text className='detail-comment-author'>{name}</Text><Text className='detail-comment-date'>{date}</Text></View><Text className='detail-comment-content' selectable>{text}</Text></View>;
}

export function GoalHistoryCard({ kind, date, text }: { kind: string; date: string; text: string }) {
  return <View className='domain-history-item'><View className='domain-history-meta'><Text>{kind}</Text><Text>{date}</Text></View><Text>{text}</Text></View>;
}

export function SavedArticleCard({ title, index, onOpen, actions }: { title: string; index: number; onOpen?: () => void; actions?: ReactNode }) {
  return <View className='account-saved-card'><View className='account-saved-open' onClick={onOpen}><Text className='account-saved-number'>{String(index + 1).padStart(2, '0')}</Text><View className='account-saved-title'>{title}</View></View><View className='account-saved-bottom'><Text className='account-read' onClick={onOpen}>阅读全文</Text>{actions}</View></View>;
}
