import type { Domain } from '../lib/domain-data';
import { domainIcon } from '../lib/domain-data';
import { SingleChoiceField } from './form-options';
import LibraryIcon from './library-icon';
import { OTHER_DOMAIN_NAME, domainDisplayName, findFallbackDomain } from '../lib/domain-fallback';

type DomainChoice = Pick<Domain, 'id' | 'name' | 'iconId'>;

/** Shared domain selection for progress, habits and timers; values are stable IDs. */
export default function DomainChoiceField({ domains, value, onChange, readOnly = false, ariaLabel, disabled = false, optionPrefix = '' }: {
  domains: readonly DomainChoice[]; value: string;
  ariaLabel: string; disabled?: boolean; optionPrefix?: string;
} & ({ readOnly: true; onChange?: never } | { readOnly?: false; onChange: (id: string) => void })) {
  const choices: readonly DomainChoice[] = findFallbackDomain(domains)
    ? domains : [...domains, { id: '', name: OTHER_DOMAIN_NAME, iconId: 'notes' }];
  const selectedId = value || findFallbackDomain(choices)?.id || '';
  return <SingleChoiceField ariaLabel={ariaLabel} size='regular' width='fill' value={selectedId}
    options={choices.map(domain => ({ value: domain.id, label: domainDisplayName(domain.name), icon: <LibraryIcon name={domainIcon(domain)} />, ariaLabel: `${optionPrefix}${domainDisplayName(domain.name)}` }))}
    disabled={disabled} {...(readOnly ? { readOnly: true as const } : { onChange: onChange! })} />;
}
