import type { Metadata } from "next";
import ToolWorkspace from '@/components/tool-workspace';

export const metadata: Metadata = {
  title: "备忘录",
  description: "把一闪而过的想法留在这里。支持 Markdown、搜索、置顶和颜色分类的个人备忘录。",
};

export default function MemosPage() {
  return <ToolWorkspace page='memos' />;
}
