import {useEffect,useState} from 'react';
import {Text,View} from '@tarojs/components';
import {ChoicePopover,PopoverHeading} from './form-options';
import ActionButton from './ui-button';
import SearchInput from './search-input';
import CheckSymbol from './check-symbol';
import './entity-choice-options.css';
import type { Domain } from '../lib/domain-data';
import { domainIcon } from '../lib/domain-data';
import { SingleChoiceField } from './form-options';
import LibraryIcon from './library-icon';
import { OTHER_DOMAIN_NAME, domainDisplayName, findFallbackDomain } from '../lib/domain-fallback';

type DomainChoice = Pick<Domain, 'id' | 'name' | 'iconId'>;

/** Shared domain selection for progress, habits and timers; values are stable IDs. */
export default function DomainChoiceField({ domains, value, onChange, readOnly = false, ariaLabel, disabled = false, optionPrefix = '',compact=false }: {
  domains: readonly DomainChoice[]; value: string;
  ariaLabel: string; disabled?: boolean; optionPrefix?: string;compact?:boolean;
} & ({ readOnly: true; onChange?: never } | { readOnly?: false; onChange: (id: string) => void })) {
  const [open,setOpen]=useState(false),[query,setQuery]=useState('');
  useEffect(()=>{if(disabled){setOpen(false);setQuery('');}},[disabled]);
  const choices: readonly DomainChoice[] = findFallbackDomain(domains)
    ? domains : [...domains, { id: '', name: OTHER_DOMAIN_NAME, iconId: 'notes' }];
  const selectedId = value || findFallbackDomain(choices)?.id || '';
  const selected=choices.find(domain=>domain.id===selectedId) || choices[0];
  if(compact)return <ChoicePopover ariaLabel={ariaLabel} open={open} onOpenChange={next=>{setOpen(next);if(!next)setQuery('');}} disabled={disabled||readOnly} trigger={<><LibraryIcon name={domainIcon(selected)} className='entity-choice-icon'/><Text>{domainDisplayName(selected.name)}</Text></>} triggerAppearance='quiet' triggerSize='compact' triggerClassName='todo-category-trigger' placement='center' panelWidth={400} maxHeightRatio={.8} bodySpacing='none' contentKey={`${query}:${choices.length}`} heading={<PopoverHeading title='选择领域'/>}>
    <View className='entity-choice-search'><SearchInput ariaLabel='搜索领域' placeholder='搜索领域' value={query} maxlength={100} disabled={disabled} onInput={event=>setQuery(event.detail.value)}/></View>
    <View className='entity-choice-options'>{choices.filter(domain=>domainDisplayName(domain.name).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).map(domain=><ActionButton key={domain.id} appearance='quiet' className={`entity-choice-option${domain.id===selectedId?' is-selected':''}`} ariaLabel={`${optionPrefix}${domainDisplayName(domain.name)}`} aria-pressed={domain.id===selectedId} disabled={disabled} onClick={()=>{onChange?.(domain.id);setOpen(false);}}><LibraryIcon name={domainIcon(domain)} className='entity-choice-icon'/><Text className='entity-choice-label'>{domainDisplayName(domain.name)}</Text>{domain.id===selectedId&&<CheckSymbol className='entity-choice-check'/>}</ActionButton>)}</View>
  </ChoicePopover>;
  return <SingleChoiceField ariaLabel={ariaLabel} size='regular' width='fill' value={selectedId}
    options={choices.map(domain => ({ value: domain.id, label: domainDisplayName(domain.name), icon: <LibraryIcon name={domainIcon(domain)} />, ariaLabel: `${optionPrefix}${domainDisplayName(domain.name)}` }))}
    disabled={disabled} {...(readOnly ? { readOnly: true as const } : { onChange: onChange! })} />;
}
