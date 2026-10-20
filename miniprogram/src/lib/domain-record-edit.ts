import { deleteDomainRecord, isDomainState, MAX_DOMAIN_RECORD_LENGTH, type DomainState, type RecordItem, type RecordKind } from './domain-data';
import { isNoteImage, noteStateFits, validNoteImages } from './note-image-data';
import type { MemoImage } from './tool-records';

export type RecordEditDraft = { version: 1; domainId: string; kind: RecordKind; original: RecordItem; record: RecordItem; pending?: 'save' | 'delete' };
export const recordEditKey = (owner: string, id: string) => `ottlog-mini-domain-record-edit-v1:${owner}:${id}`;
export const sameRecord = (a: RecordItem, b: RecordItem) => JSON.stringify(a) === JSON.stringify(b);

export function editDomainRecord(state: DomainState, draft: RecordEditDraft, action: 'save' | 'delete' = 'save'): DomainState {
  if (!isDomainState(state)) throw new Error('领域记录格式不正确，请重新读取');
  const domain = state.domains.find(item => item.id === draft.domainId);
  if (!domain) throw new Error('领域已移除，请重新打开');
  const key = draft.kind === 'positive' ? 'positiveRecords' : 'negativeRecords';
  const existing = domain[key].find(item => item.id === draft.original.id);
  if (!existing && draft.pending === 'delete' && action === 'delete') return state;
  if (!existing || !sameRecord(existing, draft.original) && !(draft.pending === 'save' && sameRecord(existing, draft.record))) throw new Error('记录已变化，请关闭后重新打开');
  if (draft.pending && draft.pending !== action) throw new Error('请先重试原操作');
  if (action === 'delete') return deleteDomainRecord(state, domain.id, draft.kind, existing.id);
  if (draft.record.id !== existing.id || draft.record.createdAt !== existing.createdAt) throw new Error('记录标识已变化，请重新打开');
  const record = { ...existing, content: draft.record.content.trim(), images: draft.record.images };
  if (record.content.length > MAX_DOMAIN_RECORD_LENGTH || !validNoteImages(record.images) || !record.content && !record.images?.length) throw new Error('请输入文字或图片，文字最多 6000 字');
  const next = { ...state, domains: state.domains.map(item => item.id === domain.id ? { ...item, [key]: item[key].map(row => row.id === existing.id ? record : row) } : item) };
  if (!isDomainState(next)) throw new Error('领域记录空间不足，请减少图片后重试');
  return next;
}

/** Original and edited records share image bytes in the isolated local draft. */
export function packRecordEdit(draft: RecordEditDraft) {
  const images: MemoImage[] = [];
  const pack = (record: RecordItem) => ({ ...record, images: record.images?.map(image => {
    let index = images.findIndex(item => item.id === image.id && item.dataUrl === image.dataUrl);
    if (index < 0) { index = images.length; images.push(image); }
    return index;
  }) });
  const saved = { ...draft, original: pack(draft.original), record: pack(draft.record), images };
  if (!noteStateFits(saved)) throw new Error('编辑草稿较大，请减少图片后重试');
  return saved;
}

export function unpackRecordEdit(saved: unknown, domainId: string, kind: RecordKind, record: RecordItem): RecordEditDraft | null {
  if (!saved) return null;
  const data = saved as ReturnType<typeof packRecordEdit>;
  if (data.version !== 1 || data.domainId !== domainId || data.kind !== kind || !Array.isArray(data.images) || !data.images.every(isNoteImage)
    || data.pending !== undefined && data.pending !== 'save' && data.pending !== 'delete') throw new Error('编辑草稿格式不兼容，请重试读取');
  const unpack = (row: typeof data.record, allowEmpty = false): RecordItem => {
    if (!row || row.id !== record.id || row.createdAt !== record.createdAt || typeof row.content !== 'string' || row.content.length > MAX_DOMAIN_RECORD_LENGTH
      || row.images !== undefined && (!Array.isArray(row.images) || !row.images.every(index => Number.isInteger(index) && index >= 0 && index < data.images.length))) throw new Error('编辑草稿内容不兼容，请重试读取');
    const next = { ...row, images: row.images?.map(index => data.images[index]) };
    if (!validNoteImages(next.images) || !allowEmpty && !next.content.trim() && !next.images?.length) throw new Error('编辑草稿内容不兼容，请重试读取');
    return next;
  };
  const original = unpack(data.original);
  return { version: 1, domainId, kind, original, record: unpack(data.record, true), pending: data.pending };
}
