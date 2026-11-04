import { Children, cloneElement, isValidElement, type ComponentProps, type ReactNode } from 'react';
import { Text, View } from '@tarojs/components';
import { ChoicePopover } from './form-options';
import { TimeSymbol, RestSymbol, DeleteSymbol, EditSymbol, MoreSymbol, default as ManageSymbol, RestoreDefaultsSymbol } from './manage-symbol';
import SortSymbol from './sort-symbol';
import './action-menu.css';

function OptionSymbol({ label }: { label:string }) {
  if (/调整时长/.test(label))return <TimeSymbol/>;
  if (/休息建议/.test(label))return <RestSymbol/>;
  if (/排序/.test(label))return <SortSymbol/>;
  if (/设置/.test(label))return <ManageSymbol/>;
  if (/删除/.test(label)) return <DeleteSymbol />;
  if (/编辑/.test(label)) return <EditSymbol />;
  if (/清空|重置|恢复/.test(label)) return <RestoreDefaultsSymbol />;
  return <View className={`action-menu-symbol is-${/专注/.test(label) ? 'focus' : /收起|关闭/.test(label) ? 'collapse' : 'next'}`} aria-hidden><View /><View /></View>;
}
type Props = Omit<ComponentProps<typeof ChoicePopover>, 'trigger'|'triggerIconOnly'|'showIndicator'|'children'> & { children:ReactNode };

/** All three-dot menus share symbols, text measurement, spacing and touch targets. */
export default function ActionMenu({ children, ...props }: Props) {
  const items=Children.toArray(children).filter(isValidElement<{children?:ReactNode}>);
  const labels=items.map(item => typeof item.props.children === 'string' ? item.props.children : '').filter(Boolean);
  return <ChoicePopover {...props} trigger={<MoreSymbol />} triggerIconOnly showIndicator={false} menuLabels={labels} menuLeadingWidth={30}>
    {items.map((item,index) => { const label=typeof item.props.children==='string' ? item.props.children : '';return label ? cloneElement(item,{key:item.key || index,children:<View className='action-menu-option'><OptionSymbol label={label}/><Text>{label}</Text></View>}) : item; })}
  </ChoicePopover>;
}
