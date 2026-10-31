import type { Metadata } from "next";
import ToolWorkspace from '@/components/tool-workspace';

export const metadata: Metadata = { title: "待办清单", description: "用四象限整理轻重缓急，在日历里安排下一步。", robots: { index: false, follow: false } };

export default async function TodosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const query = new URLSearchParams(Object.entries(params).flatMap(([key, value]) => value === undefined ? [] : [[key, Array.isArray(value) ? value[0] : value]])).toString();
  return <ToolWorkspace page='todos' query={query} />;
}
