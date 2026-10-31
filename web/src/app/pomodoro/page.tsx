import type { Metadata } from "next";
import ToolWorkspace from '@/components/tool-workspace';

export const metadata: Metadata = { title: "番茄钟", description: "给眼前的一件事留一点时间。专注计时、关联待办与日历统计。" };
export default async function PomodoroPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const query = new URLSearchParams(Object.entries(params).flatMap(([key, value]) => value === undefined ? [] : [[key, Array.isArray(value) ? value[0] : value]])).toString();
  return <ToolWorkspace page='pomodoro' query={query} />;
}
