import type { Metadata } from "next";
import ToolWorkspace from '@/components/tool-workspace';

export const metadata: Metadata = {
  title: "便签",
  description: "把一闪而过的想法留在这里。支持 Markdown、搜索、置顶和标签的个人便签。",
};

export default function MemosPage() {
  return <ToolWorkspace page='memos' />;
}
