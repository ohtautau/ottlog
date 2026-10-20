export const statisticsPanels = [
  { id: 'todos', label: '待办' }, { id: 'focus', label: '专注' },
  { id: 'habits', label: '习惯' }, { id: 'meals', label: '饮食' },
  { id: 'domains', label: '领域' }, { id: 'growth', label: '成长' },
] as const;
export type StatisticsPanel = typeof statisticsPanels[number]['id'];

export function statisticsPanel(value: unknown): StatisticsPanel {
  return statisticsPanels.find(panel => panel.id === value)?.id || 'todos';
}

/** A partially loaded or mixed-account cohort must never reveal cached statistics. */
export function statisticsOwner(sources: readonly { ready: boolean; owner: string }[]): string {
  const owner = sources[0]?.owner;
  return owner && sources.every(source => source.ready && source.owner === owner) ? owner : '';
}
