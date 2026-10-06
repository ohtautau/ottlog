import type { Metadata } from 'next';
import TaskCapture from './task-capture';
export const metadata: Metadata = { title: '创建任务' };
export default function NewTaskPage() { return <TaskCapture />; }
