import { MAX_DOMAIN_RECORD_LENGTH, applyDomainRecordChanges, isDomainState, saveDomain, saveDomainRecords, type DomainState, type RecordItem, type RecordKind } from './domain-data';
import { validNoteImages } from './note-image-data';
import { toolId } from './tool-records';
import { findFallbackDomain, OTHER_DOMAIN_NAME } from './domain-fallback';

export type ProgressEntry = { kind: RecordKind; record: RecordItem };
export type ProgressPair = { positive: RecordItem; negative: RecordItem; kinds: [RecordKind, RecordKind] };
export const MAX_PROGRESS_PAIRS = 20;
export type ProgressDraft = { domainId: string; positive: RecordItem; negative: RecordItem; pair?: true; kinds?: [RecordKind, RecordKind]; pairs?: ProgressPair[]; extraRecords?:ProgressEntry[]; single?: true; kind?: RecordKind; legacy?: ProgressEntry[] };
export type ProgressRow = ProgressEntry & { slot: 'positive' | 'negative'; pairIndex: number };
function newProgressPair(): ProgressPair {
  const createdAt = new Date().toISOString();
  return { kinds: ['positive', 'negative'], positive: { id: toolId(), content: '', images: [], createdAt }, negative: { id: toolId(), content: '', images: [], createdAt } };
}
export function newProgressDraft(domainId = ''): ProgressDraft {
  return { domainId, pair: true, ...newProgressPair() };
}
const isKind = (kind: unknown): kind is RecordKind => kind === 'positive' || kind === 'negative';
export function isProgressDraft(value: unknown): value is ProgressDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as ProgressDraft;
  const valid = (record: RecordItem) => !!record && typeof record.id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(record.id)
    && typeof record.content === 'string' && typeof record.createdAt === 'string' && Number.isFinite(Date.parse(record.createdAt)) && validNoteImages(record.images);
  const validKinds = (kinds: unknown): kinds is [RecordKind, RecordKind] => Array.isArray(kinds) && kinds.length === 2 && Array.from(kinds).every(isKind);
  const validPairs = draft.pairs === undefined || draft.pair === true && Array.isArray(draft.pairs) && draft.pairs.length < MAX_PROGRESS_PAIRS
    && Array.from(draft.pairs).every(item => !!item && valid(item.positive) && valid(item.negative) && validKinds(item.kinds));
  const extraValid=draft.extraRecords===undefined || Array.isArray(draft.extraRecords) && draft.extraRecords.length<=MAX_PROGRESS_PAIRS*2 && Array.from(draft.extraRecords).every(item=>!!item && isKind(item.kind) && valid(item.record));
  const records = [draft.positive, draft.negative, ...(Array.isArray(draft.pairs) ? draft.pairs.flatMap(item => item ? [item.positive, item.negative] : []) : []),...(Array.isArray(draft.extraRecords)?draft.extraRecords.map(item=>item?.record):[])];
  return typeof draft.domainId === 'string' && valid(draft.positive) && valid(draft.negative) && validPairs && extraValid
    && new Set(records.map(record => record?.id)).size === records.length
    && (draft.single === undefined || draft.single === true) && (draft.kind === undefined || isKind(draft.kind))
    && (draft.pair === undefined ? draft.kinds === undefined : draft.pair === true && draft.single === undefined && draft.kind === undefined
      && validKinds(draft.kinds))
    && (draft.legacy === undefined || Array.isArray(draft.legacy) && Array.from(draft.legacy).every(item => !!item && isKind(item.kind) && valid(item.record)));
}
const hasContent = (record: RecordItem) => !!record.content.trim() || !!record.images?.length;
export const progressRecord = (draft: ProgressDraft) => draft.pair || draft.single || hasContent(draft.positive) ? draft.positive : draft.negative;
/** A read-only view also keeps the unused lower box empty for old single-record retries. */
export function progressRows(draft: ProgressDraft): ProgressRow[] {
  return [
    { pairIndex: 0, slot: 'positive', kind: draft.pair ? draft.kinds![0] : draft.single ? draft.kind || 'positive' : 'positive', record: draft.positive },
    { pairIndex: 0, slot: 'negative', kind: draft.pair ? draft.kinds![1] : 'negative', record: draft.single ? { ...draft.negative, content: '', images: [] } : draft.negative },
    ...(draft.pair ? (draft.pairs || []).flatMap((pair, index): ProgressRow[] => [
      { pairIndex: index + 1, slot: 'positive', kind: pair.kinds[0], record: pair.positive },
      { pairIndex: index + 1, slot: 'negative', kind: pair.kinds[1], record: pair.negative },
    ]) : []),
    ...(draft.extraRecords || []).map((entry,index)=>({...entry,slot:entry.kind,pairIndex:MAX_PROGRESS_PAIRS+index})),
  ];
}
export function newProgressInput():RecordItem {return {id:toolId(),content:'',images:[],createdAt:new Date().toISOString()};}
/** Independent UI rows preserve old paired draft IDs and never re-sign old records. */
export function writeProgressInput(draft:ProgressDraft,kind:RecordKind,record:RecordItem):ProgressDraft {
  let next=pairedProgressDraft(draft);
  const existing=progressRows(next).find(row=>row.record.id===record.id);
  if(existing && existing.kind!==kind)throw new Error('记录类型已变化，请重新打开');
  if(existing?.pairIndex===0)next={...next,[existing.slot]:record};
  else if(existing && existing.pairIndex<MAX_PROGRESS_PAIRS)next={...next,pairs:next.pairs!.map((pair,index)=>index+1===existing.pairIndex?{...pair,[existing.slot]:record}:pair)};
  else next={...next,extraRecords:existing ? next.extraRecords!.map(item=>item.record.id===record.id?{...item,record}:item) : [...(next.extraRecords || []),{kind,record}]};
  if(!isProgressDraft(next) || progressRows(next).filter(row=>hasContent(row.record)).length>MAX_PROGRESS_PAIRS*2)throw new Error('最多同时填写40条记录');
  return next;
}
/** Root/legacy slots remain compatible; independently added blank rows can be removed. */
export function clearProgressInput(draft:ProgressDraft,id:string):ProgressDraft {
  const row=progressRows(draft).find(item=>item.record.id===id);
  if(!row)return draft;
  if(row.pairIndex>=MAX_PROGRESS_PAIRS)return {...draft,extraRecords:draft.extraRecords?.filter(item=>item.record.id!==id)};
  return writeProgressInput(draft,row.kind,{...row.record,content:'',images:[]});
}
/** Allocate a pair once per explicit add action; blank rows remain draft-only. */
export function appendProgressPair(draft: ProgressDraft): ProgressDraft {
  const next = pairedProgressDraft(draft);
  if ((next.pairs?.length || 0) + 1 >= MAX_PROGRESS_PAIRS) throw new Error(`最多同时填写 ${MAX_PROGRESS_PAIRS} 组记录`);
  return { ...next, pairs: [...(next.pairs || []), newProgressPair()] };
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
  const { pair, kinds, pairs, ...base } = draft;
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

/** Save only the edited fields of the displayed creator rows, preserving all other records. */
export function saveAutoProgressDraft(state: DomainState, baselineDraft: ProgressDraft | null, draft: ProgressDraft, retryLocalClear = false): DomainState {
  if (!isDomainState(state) || !isProgressDraft(draft) || baselineDraft && !isProgressDraft(baselineDraft)) throw new Error('记录草稿格式不正确，请重新打开');
  const baselineRows = new Map((baselineDraft ? progressRows(baselineDraft) : []).map(row => [row.record.id, row]));
  const baselineDomain = baselineDraft?.domainId || findFallbackDomain(state.domains)?.id;
  const all = new Map(state.domains.flatMap(domain => (['positive', 'negative'] as const).flatMap(kind => domain[`${kind}Records`].map(record => [record.id, { domainId: domain.id, kind, record }] as const))));
  const changes: { id: string; domainId: string; kind: RecordKind; record: RecordItem | null }[] = [];
  const currentIds=new Set(progressRows(draft).map(row=>row.record.id));
  for(const [id,previous] of baselineRows) {
    if(currentIds.has(id) || !hasContent(previous.record))continue;
    const latest=all.get(id);
    if(!latest && retryLocalClear)continue;
    if(!latest || latest.domainId!==baselineDomain || latest.kind!==previous.kind || JSON.stringify({...latest.record,content:latest.record.content.trim(),images:latest.record.images||[]})!==JSON.stringify({...previous.record,content:previous.record.content.trim(),images:previous.record.images||[]}))throw new Error('原记录已修改、删除或移动，未覆盖其他内容');
    changes.push({id,domainId:latest.domainId,kind:latest.kind,record:null});
  }
  for (const row of progressRows(draft)) {
    const previous = baselineRows.get(row.record.id), latest = all.get(row.record.id);
    if (previous && hasContent(previous.record) && (!latest || latest.domainId !== baselineDomain || latest.kind !== previous.kind)) {
      // Only the host can confirm that an identical clear lives in volatile local memory.
      if (retryLocalClear && !latest && !hasContent(row.record)) continue;
      throw new Error('原记录已删除或移动，未覆盖其他内容');
    }
    if (latest && !previous && latest.record.createdAt !== row.record.createdAt) throw new Error('记录编号已存在，请重新打开');
    if (latest && previous && !hasContent(previous.record) && latest.record.createdAt !== row.record.createdAt) throw new Error('记录编号已变化，请重新打开');
    const base = previous?.record || { ...row.record, content: '', images: [] };
    const content = latest && row.record.content === base.content ? latest.record.content : row.record.content;
    const images = latest && JSON.stringify(row.record.images || []) === JSON.stringify(base.images || []) ? latest.record.images : row.record.images;
    const record = { ...(latest?.record || row.record), content: content.trim(), images, createdAt: latest?.record.createdAt || row.record.createdAt };
    if (record.content.length > MAX_DOMAIN_RECORD_LENGTH) throw new Error('每个记录框最多 6000 字');
    if (!hasContent(record)) {
      if (latest) changes.push({ id: row.record.id, domainId: latest.domainId, kind: latest.kind, record: null });
      continue;
    }
    const target = draft.domainId || findFallbackDomain(state.domains)?.id || '';
    if (latest && latest.domainId === target && latest.kind === row.kind && JSON.stringify(record) === JSON.stringify(latest.record)) continue;
    changes.push({ id: row.record.id, domainId: target, kind: row.kind, record });
  }
  if (!changes.length) return state;
  let next = state;
  if (changes.some(change => change.record && !change.domainId)) {
    next = saveDomain(state, { name: OTHER_DOMAIN_NAME, iconId: 'notes' });
    const fallbackId = findFallbackDomain(next.domains)!.id;
    for (const change of changes) if (change.record && !change.domainId) change.domainId = fallbackId;
  }
  return applyDomainRecordChanges(next, changes);
}
