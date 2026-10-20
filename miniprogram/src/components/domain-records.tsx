import type { ComponentProps, ReactNode } from 'react';
import { Button, ScrollView, Text, View } from '@tarojs/components';
import type { RecordItem, RecordKind } from '../lib/domain-data';
import DomainRecordContent from './domain-record-content';
import './domain-records.css';

type ColumnProps = {
  kind: RecordKind; children: ReactNode; className?: string; style?: ComponentProps<typeof View>['style']; showHeading?: boolean; scrollable?: boolean;
} & ({ variant?: 'static' } | { variant: 'create'; disabled?: boolean; createLabel: string; onCreate: () => void });
type CardProps = Omit<ComponentProps<typeof Button>, 'children'> & {
  kind: RecordKind; record: RecordItem; metadata?: ReactNode;
};
const label = (kind: RecordKind) => kind === 'positive' ? '正记录' : '负记录';

/** Layout and theme are shared; callers compose columns and keep their own data selection. */
export function DomainRecordColumns({ children, className = '', variant = 'default', scrollable = false, ...props }: ComponentProps<typeof View> & { variant?: 'default' | 'compact'; scrollable?: boolean }) {
  return <View {...props} className={`domain-records${variant === 'compact' ? ' is-compact' : ''}${scrollable ? ' is-scrollable' : ''} ${className}`}>{children}</View>;
}

export function DomainRecordColumn(props: ColumnProps) {
  const { kind, children, className = '', style, showHeading = true, scrollable = false } = props;
  const action = props.variant === 'create' ? props : null;
  const create = action && !action.disabled ? action.onCreate : undefined;
  const heading = <Text>{kind === 'positive' ? '+' : '−'} {label(kind)}</Text>;
  return <View className={`domain-record-column is-${kind}${action ? '' : ' is-static'}${scrollable ? ' has-scroll' : ''} ${className}`} style={style} onClick={create}>
    {showHeading && (action ? <Button className='domain-record-add' disabled={action.disabled} ariaLabel={action.createLabel} onClick={event => { event.stopPropagation(); create?.(); }}>{heading}</Button> : <View className='domain-record-add'>{heading}</View>)}
    {scrollable ? <ScrollView scrollY enhanced bounces={false} showScrollbar={false} className='domain-record-scroll' ariaLabel={label(kind)}><View className='domain-record-scroll-content'>{children}</View></ScrollView> : children}
  </View>;
}

/** Metadata is a scene-owned slot; rendering, signed appearance and event isolation stay shared. */
export function DomainRecordCard({ kind, record, metadata, className = '', hoverClass = 'domain-record-pressed', disabled, onClick, ariaLabel, ...props }: CardProps) {
  const content = <DomainRecordContent record={record} compact format='plain' />;
  return <Button {...props} className={`domain-record is-${kind} ${className}`} hoverClass={disabled ? 'none' : hoverClass} disabled={disabled}
    ariaLabel={ariaLabel ?? `编辑${label(kind)}：${record.content}`} onClick={event => { event.stopPropagation(); if (!disabled) onClick?.(event); }}>
    <Text className='domain-record-sign'>{kind === 'positive' ? '+' : '−'}</Text>
    {metadata != null ? <View className='domain-record-body'>{metadata}{content}</View> : content}
  </Button>;
}
