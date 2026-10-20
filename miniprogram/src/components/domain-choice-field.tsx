import type { Domain } from '../lib/domain-data';
import { domainIcon } from '../lib/domain-data';
import { SingleChoiceField } from './form-options';
import LibraryIcon from './library-icon';

type DomainChoice = Pick<Domain, 'id' | 'name' | 'iconId'>;

/** Shared domain selection for progress, habits and timers; values are stable IDs. */
export default function DomainChoiceField({ domains, value, onChange, readOnly = false, ariaLabel, disabled = false, optionPrefix = '' }: {
  domains: readonly DomainChoice[]; value: string;
  ariaLabel: string; disabled?: boolean; optionPrefix?: string;
} & ({ readOnly: true; onChange?: never } | { readOnly?: false; onChange: (id: string) => void })) {
  const choices: readonly DomainChoice[] = domains.some(domain => domain.name.trim() === '未分类')
    ? domains : [...domains, { id: '', name: '未分类', iconId: 'notes' }];
  const selectedId = value || choices.find(domain => domain.name.trim() === '未分类')?.id || '';
  return <SingleChoiceField ariaLabel={ariaLabel} size='regular' width='fill' value={selectedId}
    options={choices.map(domain => ({ value: domain.id, label: domain.name, icon: <LibraryIcon name={domainIcon(domain)} />, ariaLabel: `${optionPrefix}${domain.name}` }))}
    disabled={disabled} {...(readOnly ? { readOnly: true as const } : { onChange: onChange! })} />;
}
