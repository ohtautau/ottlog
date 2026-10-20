import { MAX_DOMAIN_RECORD_LENGTH, saveDomainRecords, type DomainState, type RecordItem, type RecordKind } from './domain-data';
import { validNoteImages } from './note-image-data';
import { toolId } from './tool-records';

type ProgressEntry = { kind: RecordKind; record: RecordItem };
export type ProgressDraft = { domainId: string; positive: RecordItem; negative: RecordItem; pair?: true; kinds?: [RecordKind, RecordKind]; single?: true; kind?: RecordKind; legacy?: ProgressEntry[] };
export type ProgressRow = ProgressEntry & { slot: 'positive' | 'negative' };
export function newProgressDraft(domainId = ''): ProgressDraft {
  const createdAt = new Date().toISOString();
  return { domainId, pair: true, kinds: ['positive', 'negative'], positive: { id: toolId(), content: '', images: [], createdAt }, negative: { id: toolId(), content: '', images: [], createdAt } };
}
const isKind = (kind: unknown): kind is RecordKind => kind === 'positive' || kind === 'negative';
export function isProgressDraft(value: unknown): value is ProgressDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as ProgressDraft;
  const valid = (record: RecordItem) => !!record && typeof record.id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(record.id)
    && typeof record.content === 'string' && typeof record.createdAt === 'string' && Number.isFinite(Date.parse(record.createdAt)) && validNoteImages(record.images);
  return typeof draft.domainId === 'string' && valid(draft.positive) && valid(draft.negative) && draft.positive.id !== draft.negative.id
    && (draft.single === undefined || draft.single === true) && (draft.kind === undefined || isKind(draft.kind))
    && (draft.pair === undefined ? draft.kinds === undefined : draft.pair === true && draft.single === undefined && draft.kind === undefined
      && Array.isArray(draft.kinds) && draft.kinds.length === 2 && Array.from(draft.kinds).every(isKind))
    && (draft.legacy === undefined || Array.isArray(draft.legacy) && Array.from(draft.legacy).every(item => !!item && isKind(item.kind) && valid(item.record)));
}
const hasContent = (record: RecordItem) => !!record.content.trim() || !!record.images?.length;
export const progressRecord = (draft: ProgressDraft) => draft.pair || draft.single || hasContent(draft.positive) ? draft.positive : draft.negative;
/** A read-only view also keeps the unused lower box empty for old single-record retries. */
export function progressRows(draft: ProgressDraft): ProgressRow[] {
  return [
    { slot: 'positive', kind: draft.pair ? draft.kinds![0] : draft.single ? draft.kind || 'positive' : 'positive', record: draft.positive },
    { slot: 'negative', kind: draft.pair ? draft.kinds![1] : 'negative', record: draft.single ? { ...draft.negative, content: '', images: [] } : draft.negative },
  ];
}
export const hasProgressContent = (draft: ProgressDraft) => progressRows(draft).some(({ record }) => hasContent(record));
const uniqueEntries = (entries: ProgressEntry[]) => entries.filter((entry, index) => entries.findIndex(item => item.record.id === entry.record.id) === index);
/** Only unsent drafts migrate. Reading this view never allocates IDs or copies image bytes. */
export function pairedProgressDraft(draft: ProgressDraft): ProgressDraft {
  if (draft.pair) return draft;
  const { single, kind, ...base } = draft;
  if (!single) return { ...base, pair: true, kinds: ['positive', 'negative'] };
  const legacy = uniqueEntries(draft.legacy || []);
  const topKind = kind || legacy.find(item => item.record.id === draft.positive.id)?.kind || 'positive';
  const recovered = legacy.find(item => item.record.id !== draft.positive.id);
  const lower = hasContent(draft.negative) ? draft.negative : recovered?.record || draft.negative;
  const lowerKind = legacy.find(item => item.record.id === lower.id)?.kind || 'negative';
  return { ...base, pair: true, kinds: [topKind, lowerKind], negative: lower };
}
/** Kept for older single-box callers and legacy recovery; new creation uses pairs. */
export function singleProgressDraft(draft: ProgressDraft): ProgressDraft {
  if (draft.single) return draft;
  const { pair, kinds, ...base } = draft;
  const legacy = uniqueEntries([...(draft.legacy || []), ...progressEntriesOrEmpty(draft)]);
  const record = progressRecord(draft), spare = record.id === draft.positive.id ? draft.negative : draft.positive;
  const kind = progressRows(draft).find(item => item.record.id === record.id)!.kind;
  return { ...base, single: true, kind, positive: record, negative: { ...spare, content: '', images: [] }, legacy };
}
export function setProgressText(draft: ProgressDraft, content: string): ProgressDraft {
  const next = pairedProgressDraft(draft), record = next.positive;
  // A type switch replaces shared text, while independent old boxes stay in the recovery queue.
  const id = content !== record.content && next.legacy?.some(item => item.record.id === record.id) ? toolId() : record.id;
  return { ...next, positive: { ...record, id, content } };
}
export function remainingProgressDraft(draft: ProgressDraft): ProgressDraft | undefined {
  const savedIds = new Set(progressEntriesOrEmpty(draft).map(item => item.record.id));
  const rest = uniqueEntries(draft.legacy || []).filter(item => !savedIds.has(item.record.id));
  if (!rest.length) return undefined;
  const next = newProgressDraft(draft.domainId);
  return { ...next, positive: rest[0].record, negative: rest[1]?.record || next.negative,
    kinds: [rest[0].kind, rest[1]?.kind || 'negative'], legacy: rest };
}
function progressEntriesOrEmpty(draft: ProgressDraft) {
  return progressRows(draft).filter(({ record }) => hasContent(record)).map(({ kind, record }) => ({ kind, record }));
}
export function progressEntries(draft: ProgressDraft) {
  if (!isProgressDraft(draft)) throw new Error('记录草稿格式不正确，请重试');
  const candidates = progressRows(draft);
  const entries = candidates.flatMap(({ kind, record }) => {
    if (record.content.length > MAX_DOMAIN_RECORD_LENGTH) throw new Error('每个记录框最多 6000 字');
    return record.content.trim() || record.images?.length ? [{ kind, record: { ...record, content: record.content.trim() } }] : [];
  });
  if (!entries.length) throw new Error('请先输入记录内容');
  return entries;
}
export function saveProgressDraft(state: DomainState, draft: ProgressDraft, retry = false) {
  return saveDomainRecords(state, draft.domainId, progressEntries(draft), retry);
}
