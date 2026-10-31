import type { Metadata } from "next";
import ToolWorkspace from '@/components/tool-workspace';

export const metadata: Metadata = { title: "习惯养成", description: "翻一翻，想起一件现在可以做的小事。" };
export default function DailyPage() { return <ToolWorkspace page='daily' />; }
