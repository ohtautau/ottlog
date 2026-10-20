import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import ActionButton from '../../components/ui-button';
import { previewMode, previewStorageKey } from '../../lib/development-preview';
import { toolCacheKey } from '../../lib/tool-state-store';
import { isDomainState, type DomainState } from '../../lib/domain-data';
import { cleanState, habitDayIndex, hasHabitDay, initialReminders, isReminderState, type ReminderState } from '../../lib/reminder-data';
import { noteStateFits } from '../../lib/note-image-data';

const { createDomainPreviewRecords, createReminderPreviewRecords, createHabitCommentPreviewRecords,
  extendDomainPreview, extendReminderPreview, extendHabitCommentPreview, extendNegativeRecordPreview, extendEntertainmentDomainPreview } = require('../../../scripts/domain-preview-records.cjs') as {
  createDomainPreviewRecords: (now?: number) => DomainState;
  createReminderPreviewRecords: (initial: ReminderState, now?: number) => ReminderState;
  createHabitCommentPreviewRecords: (initial: ReminderState, now?: number) => ReminderState;
  extendDomainPreview: (existing: DomainState, samples: DomainState) => DomainState;
  extendNegativeRecordPreview: (existing: DomainState, now?: number) => DomainState;
  extendEntertainmentDomainPreview: (existing: DomainState) => DomainState;
  extendReminderPreview: (existing: ReminderState, samples: ReminderState, domains: DomainState, doneForDay: (day: string) => string[]) => ReminderState;
  extendHabitCommentPreview: (existing: ReminderState, samples: ReminderState, domains: DomainState, doneForDay: (day: string) => string[]) => ReminderState;
};

export default function DomainPreviewData() {
  const [error, setError] = useState('');
  async function openPreview() {
    if (!previewMode) return;
    try {
      const key = previewStorageKey(toolCacheKey('guest', 'domains'));
      const habitKey = previewStorageKey(toolCacheKey('guest', 'reminders'));
      const markerKey = previewStorageKey('ottlog-domain-preview-seed-v2');
      const commentMarkerKey = previewStorageKey('ottlog-habit-comment-preview-seed-v3');
      const negativeMarkerKey = previewStorageKey('ottlog-domain-negative-preview-seed-v4');
      const entertainmentMarkerKey = previewStorageKey('ottlog-domain-entertainment-preview-seed-v5');
      const cached = Taro.getStorageSync(key), habitCache = Taro.getStorageSync(habitKey);
      // Keep invalid archives on their original read/retry path, without seeding over them.
      if (cached && (!isDomainState(cached.data) || typeof cached.pending !== 'boolean')
        || habitCache && (!isReminderState(habitCache.data) || typeof habitCache.pending !== 'boolean')) {
        await Taro.switchTab({ url: '/pages/domains/index' }); return;
      }
      const upgradeDomains = !cached || Taro.getStorageSync(markerKey) !== 2;
      const upgradeComments = Taro.getStorageSync(commentMarkerKey) !== 3;
      const upgradeNegatives = Taro.getStorageSync(negativeMarkerKey) !== 4;
      const upgradeEntertainment = Taro.getStorageSync(entertainmentMarkerKey) !== 5;
      if (upgradeDomains || upgradeComments || upgradeNegatives || upgradeEntertainment) {
        const now = Date.now(), samples = createDomainPreviewRecords(now);
        let domains = cached ? (upgradeDomains ? extendDomainPreview(cached.data, samples) : cached.data) : samples;
        if (upgradeNegatives) domains = extendNegativeRecordPreview(domains, now);
        if (upgradeEntertainment) domains = extendEntertainmentDomainPreview(domains);
        const habitSamples = createReminderPreviewRecords(initialReminders, now);
        const normalized = habitCache ? cleanState(habitCache.data) : null;
        let reminders = habitCache ? (upgradeDomains ? extendReminderPreview(habitCache.data, habitSamples, domains, day =>
          normalized!.items.filter(item => hasHabitDay(normalized!.completionHistory?.[item.id], habitDayIndex(day)!)).map(item => item.id)) : habitCache.data) : habitSamples;
        if (upgradeComments) {
          const habitHistory = cleanState(reminders);
          reminders = extendHabitCommentPreview(reminders, createHabitCommentPreviewRecords(initialReminders, now), domains, day =>
            habitHistory.items.filter(item => hasHabitDay(habitHistory.completionHistory?.[item.id], habitDayIndex(day)!)).map(item => item.id));
        }
        if (!isDomainState(domains) || !isReminderState(reminders) || !noteStateFits(reminders))
          throw new Error('预览样本无法追加，已有数据已保留');
        for (const [storageKey, previous, data] of [[key, cached, domains], [habitKey, habitCache, reminders]] as const) {
          if (!previous || JSON.stringify(previous.data) !== JSON.stringify(data))
            Taro.setStorageSync(storageKey, { ...previous, data, pending: previous?.pending ?? false, revision: previous ? (previous.revision || 0) + 1 : 0 });
        }
        // Written last; partial storage failure retries by stable IDs without duplication.
        if (upgradeDomains) Taro.setStorageSync(markerKey, 2);
        if (upgradeComments) Taro.setStorageSync(commentMarkerKey, 3);
        if (upgradeNegatives) Taro.setStorageSync(negativeMarkerKey, 4);
        if (upgradeEntertainment) Taro.setStorageSync(entertainmentMarkerKey, 5);
      }
      await Taro.switchTab({ url: '/pages/domains/index' });
    } catch (reason) { setError(reason instanceof Error ? reason.message : '预览数据暂不可用'); }
  }
  useEffect(() => { void openPreview(); }, []);
  return <View className='tool-page'><Text>{error || '正在准备领域预览…'}</Text>{!!error && <ActionButton onClick={() => { void openPreview(); }}>重试</ActionButton>}</View>;
}
