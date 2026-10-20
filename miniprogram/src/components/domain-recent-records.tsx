import type { ComponentProps } from 'react';
import { Text, View } from '@tarojs/components';
import { DomainRecordCard, DomainRecordColumn, DomainRecordColumns } from './domain-records';
import { recentDomainRecords, type DomainState, type RecentDomainRecord } from '../lib/domain-data';
import './domain-recent-records.css';

type Props = { state: DomainState; disabled: boolean; onEdit: (item: RecentDomainRecord) => void; className?: string; style?: ComponentProps<typeof View>['style'] };

export default function DomainRecentRecords({ state, disabled, onEdit, className = '', style }: Props) {
  const records = recentDomainRecords(state);
  return <View className={`domains-recent-records ${className}`} style={style}>
        {records.length ? <DomainRecordColumns className='domains-recent-list' variant='compact' scrollable>{(['negative', 'positive'] as const).map(kind => {
          const items = records.filter(item => item.kind === kind);
          return <DomainRecordColumn key={kind} kind={kind} showHeading={false} scrollable>
            {items.length ? items.map(item => <DomainRecordCard key={item.record.id} kind={kind} record={item.record} id={`domain-recent-${item.record.id}`} data-record-id={item.record.id} data-domain-id={item.domainId} data-record-kind={item.kind}
              className='domains-recent-record' disabled={disabled}
              ariaLabel={`编辑${item.domainName}${kind === 'positive' ? '正' : '负'}记录：${item.record.content}`}
              onClick={() => onEdit(item)} />) : <Text className='domain-record-empty'>暂无记录</Text>}
          </DomainRecordColumn>;
        })}</DomainRecordColumns> : <Text className='domains-recent-empty'>暂无记录</Text>}
  </View>;
}
