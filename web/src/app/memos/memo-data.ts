export const memoColors = {
  blue: { label: "雾蓝", value: "#94b6e2", surface: "#233b55" },
  sage: { label: "鼠尾草", value: "#abd0b2", surface: "#2c443e" },
  sand: { label: "麦纸", value: "#e1c699", surface: "#453e34" },
  rose: { label: "落日粉", value: "#dba8ad", surface: "#453641" },
  violet: { label: "淡紫", value: "#b5ade1", surface: "#383b53" },
} as const;

export type MemoColor = keyof typeof memoColors;
export type Memo = { id: string; title: string; body: string; color: MemoColor; iconId?: string; tags: string[]; pinned: boolean; createdAt: string; updatedAt: string };
export type MemoState = { version: 1; notes: Memo[] };
export type MemoSort = "updated" | "created" | "title";
export const initialMemoState: MemoState = { version: 1, notes: [] };
export const maxMemos = 50;
export const maxBodyLength = 6000;

export function isMemo(value: unknown): value is Memo {
  if (!value || typeof value !== "object") return false;
  const m = value as Record<string, unknown>;
  return typeof m.id === "string" && m.id.length > 0 && m.id.length <= 100
    && typeof m.title === "string" && m.title.length <= 80
    && typeof m.body === "string" && m.body.length <= maxBodyLength
    && typeof m.color === "string" && Object.hasOwn(memoColors, m.color)
    && (m.iconId === undefined || typeof m.iconId === "string")
    && typeof m.pinned === "boolean"
    && Array.isArray(m.tags) && m.tags.length <= 5 && new Set(m.tags).size === m.tags.length && m.tags.every((t) => typeof t === "string" && t.trim().length > 0 && t.length <= 20)
    && typeof m.createdAt === "string" && /^\d{4}-\d\d-\d\dT/.test(m.createdAt) && Number.isFinite(Date.parse(m.createdAt))
    && typeof m.updatedAt === "string" && /^\d{4}-\d\d-\d\dT/.test(m.updatedAt) && Number.isFinite(Date.parse(m.updatedAt));
}

export function isMemoState(value: unknown): value is MemoState {
  if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1 || !("notes" in value) || !Array.isArray(value.notes) || value.notes.length > maxMemos) return false;
  const ids = new Set<string>();
  return value.notes.every((memo) => {
    if (!isMemo(memo) || ids.has(memo.id)) return false;
    ids.add(memo.id); return true;
  });
}

export function makeMemo(id: string, now: string): Memo {
  return { id, title: "", body: "", color: "sand", tags: [], pinned: false, createdAt: now, updatedAt: now };
}

export function findMemos(notes: Memo[], query: string, color: MemoColor | "all", sort: MemoSort): Memo[] {
  const term = query.trim().toLocaleLowerCase();
  return notes.filter((m) => (color === "all" || m.color === color) && `${m.title}\n${m.body}\n${m.tags.join(" ")}`.toLocaleLowerCase().includes(term))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (sort === "title" ? a.title.localeCompare(b.title, "zh-Hans-CN") : Date.parse(sort === "created" ? b.createdAt : b.updatedAt) - Date.parse(sort === "created" ? a.createdAt : a.updatedAt)) || a.id.localeCompare(b.id));
}

export function memoExcerpt(body: string): string {
  return body.replace(/```[\s\S]*?```/g, " [代码] ").replace(/!\[[^\]]*\]\([^)]*\)/g, " [图片] ").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[#>*_`~|]/g, "").replace(/\s+/g, " ").trim().slice(0, 130);
}

export function sameMemoContent(a: Memo | null, b: Memo | null): boolean {
  if (!a || !b) return a === b;
  return a.id === b.id && a.title === b.title && a.body === b.body && a.color === b.color && a.iconId === b.iconId && a.pinned === b.pinned && a.tags.join("\u0000") === b.tags.join("\u0000");
}
