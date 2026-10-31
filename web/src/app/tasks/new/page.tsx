import type { Metadata } from 'next';
import ToolWorkspace from '@/components/tool-workspace';
export const metadata: Metadata = { title: '创建任务' };
export default function NewTaskPage() { return <ToolWorkspace page='todos' query='create=1' />; }
