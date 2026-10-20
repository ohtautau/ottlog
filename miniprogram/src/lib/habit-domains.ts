import type { Domain } from './domain-data';
import type { Reminder } from './reminder-data';

const legacyDomain = (item: Reminder): string => {
  if (item.group === '健康' || item.group === '饮食') return 'life';
  if (item.group === '精神') return 'mind';
  if (item.group === '学习') return ({ focus: 'work', language: 'english', film: 'media', camera: 'photo' } as Record<string, string>)[item.kind] || 'growth';
  return '';
};

/** IDs retain the relationship when a domain is renamed. Deleted domains stay uncategorized. */
export function alignHabitDomain(item: Reminder, domains: readonly Domain[]): Reminder {
  const domain = item.domainId !== undefined
    ? domains.find(domain => domain.id === item.domainId)
    : domains.find(domain => domain.name === item.group) || domains.find(domain => domain.id === legacyDomain(item));
  return { ...item, group: domain?.name || '未分类', domainId: domain?.id || item.domainId };
}

/** Display orphaned and unset associations in the system card without rewriting stored IDs. */
export function alignHabitDisplayDomain(item: Reminder, domains: readonly Domain[]): Reminder {
  const aligned = alignHabitDomain(item, domains);
  const fallback = aligned.group === '未分类' ? domains.find(domain => domain.name.trim() === '未分类') : undefined;
  return fallback ? { ...aligned, domainId: fallback.id } : aligned;
}

export const habitTone = (item: Pick<Reminder, 'group'>) => `habit-tone-${({
  生活: 'mint', 心理: 'lilac', 成长: 'sky', 工作: 'sky', 英语: 'sky', 健身: 'peach', 摄影: 'gold', 自媒体: 'gold',
} as Record<string, string>)[item.group] || 'mint'}`;
