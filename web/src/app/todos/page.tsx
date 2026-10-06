import type { Metadata } from "next";
import TodoExperience from "./todo-experience";

export const metadata: Metadata = { title: "待办清单", description: "用四象限整理轻重缓急，在日历里安排下一步。", robots: { index: false, follow: false } };

export default function TodosPage() {
  return <TodoExperience />;
}
