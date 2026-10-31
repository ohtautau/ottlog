import { MAX_DOMAIN_COUNT, type Domain, type DomainState } from './domain-data';
import { OTHER_DOMAIN_NAME, findFallbackDomain, isFallbackDomainName } from './domain-fallback';

export const isUncategorizedDomain = (domain: Domain) => isFallbackDomainName(domain.name);

/** An empty system card is a read-only projection, never a seed or migration. */
export function uncategorizedDomain(state: DomainState): Domain {
  const existing = findFallbackDomain(state.domains);
  if (existing) return existing.name === OTHER_DOMAIN_NAME ? existing : { ...existing, name: OTHER_DOMAIN_NAME };
  let id = 'uncategorized', suffix = 0;
  while (state.domains.some(domain => domain.id === id)) id = `uncategorized-${++suffix}`;
  return { id, name: OTHER_DOMAIN_NAME, iconId: 'notes', longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [] };
}

export function domainDisplayState(state: DomainState): DomainState {
  const existing = findFallbackDomain(state.domains), fallback = uncategorizedDomain(state);
  if (existing === fallback) return state;
  return { ...state, domains: existing ? state.domains.map(domain => domain.id === existing.id ? fallback : domain) : [...state.domains, fallback] };
}

/** Called only for an explicit detail write; retain the original capacity guard. */
export function materializeUncategorizedDomain(state: DomainState): DomainState {
  if (findFallbackDomain(state.domains)) return domainDisplayState(state);
  if (state.domains.length >= MAX_DOMAIN_COUNT) throw new Error(`最多保存 ${MAX_DOMAIN_COUNT} 个领域`);
  return domainDisplayState(state);
}
