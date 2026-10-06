export type TodoSubtask = { id: string; title: string; completed: boolean };

export type Todo = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  important: boolean;
  urgent: boolean;
  dueDate: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  subtasks?: TodoSubtask[];
};

export type TodoCategory = { id: string; name: string; color: string };
export type TodoState = { version: 1; tasks: Todo[]; categories: TodoCategory[] };

export const todoColors = ["#8aafff", "#a8ceae", "#dfd4b4", "#e8aa93", "#c6b1e8", "#87cfda"];
export const initialTodoState: TodoState = {
  version: 1,
  tasks: [],
  categories: [
    { id: "work", name: "工作", color: todoColors[0] },
    { id: "life", name: "生活", color: todoColors[1] },
    { id: "study", name: "学习", color: todoColors[2] },
  ],
};

const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown, length: number) => typeof value === "string" ? value.slice(0, length).trim() : "";
const timestamp = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : "";
export function validTodoDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : "";
}

/** Treat personal tool storage as untrusted input, including older browser caches. */
export function normalizeTodoState(value: unknown): TodoState {
  const source = record(value);
  const seenCategories = new Set<string>();
  const categories = (Array.isArray(source.categories) ? source.categories : initialTodoState.categories).flatMap(item => {
    const row = record(item), id = text(row.id, 100), name = text(row.name, 30);
    if (!id || !name || seenCategories.has(id)) return [];
    seenCategories.add(id);
    return [{ id, name, color: typeof row.color === "string" && /^#[0-9a-f]{6}$/i.test(row.color) ? row.color : todoColors[0] }];
  }).slice(0, 30);
  const categoryIds = new Set(categories.map(category => category.id));
  const seenTasks = new Set<string>();
  const tasks = (Array.isArray(source.tasks) ? source.tasks : []).flatMap(item => {
    const row = record(item), id = text(row.id, 100), title = text(row.title, 100);
    if (!id || !title || seenTasks.has(id)) return [];
    seenTasks.add(id);
    const createdAt = timestamp(row.createdAt) || "1970-01-01T00:00:00.000Z";
    const seenSubtasks = new Set<string>();
    const subtasks = Array.isArray(row.subtasks) ? row.subtasks.flatMap(item => {
      const child = record(item), id = text(child.id, 100), title = text(child.title, 160);
      if (!id || !title || seenSubtasks.has(id)) return [];
      seenSubtasks.add(id);
      return [{ id, title, completed: child.completed === true }];
    }).slice(0, 50) : [];
    // Preserve newer mini-program fields when this client edits or reorders a task.
    return [{ ...row, id, title, description: text(row.description, 10000), categoryId: categoryIds.has(text(row.categoryId, 100)) ? text(row.categoryId, 100) : "", important: row.important === true, urgent: row.urgent === true, dueDate: validTodoDate(row.dueDate), completedAt: timestamp(row.completedAt) || null, createdAt, updatedAt: timestamp(row.updatedAt) || createdAt, ...(row.subtasks !== undefined ? { subtasks } : {}) }];
  }).slice(0, 200);
  return { ...source, version: 1, tasks, categories };
}

export const todoQuadrants = [
  { id: "do", title: "现在就做", caption: "重要 · 紧急", important: true, urgent: true, color: "#e8aa93", symbol: "!" },
  { id: "plan", title: "留出时间", caption: "重要 · 不紧急", important: true, urgent: false, color: "#a8ceae", symbol: "◷" },
  { id: "delegate", title: "灵活安排", caption: "不重要 · 紧急", important: false, urgent: true, color: "#8aafff", symbol: "⇄" },
  { id: "later", title: "慢慢再说", caption: "不重要 · 不紧急", important: false, urgent: false, color: "#c6b1e8", symbol: "∿" },
] as const;

export function todoQuadrant(task: Pick<Todo, "important" | "urgent">) {
  return todoQuadrants.find(q => q.important === task.important && q.urgent === task.urgent)!;
}
