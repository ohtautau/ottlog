import { MAX_DOMAIN_COUNT, type Domain, type DomainState } from './domain-data';

export const isUncategorizedDomain = (domain: Domain) => domain.name.trim() === '未分类';

/** An empty system card is a read-only projection, never a seed or migration. */
export function uncategorizedDomain(state: DomainState): Domain {
  const existing = state.domains.find(isUncategorizedDomain);
  if (existing) return existing;
  let id = 'uncategorized', suffix = 0;
  while (state.domains.some(domain => domain.id === id)) id = `uncategorized-${++suffix}`;
  return { id, name: '未分类', iconId: 'notes', longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [] };
}

export function domainDisplayState(state: DomainState): DomainState {
  return state.domains.some(isUncategorizedDomain) ? state : { ...state, domains: [...state.domains, uncategorizedDomain(state)] };
}

/** Called only for an explicit detail write; retain the original capacity guard. */
export function materializeUncategorizedDomain(state: DomainState): DomainState {
  if (state.domains.some(isUncategorizedDomain)) return state;
  if (state.domains.length >= MAX_DOMAIN_COUNT) throw new Error(`最多保存 ${MAX_DOMAIN_COUNT} 个领域`);
  return domainDisplayState(state);
}
