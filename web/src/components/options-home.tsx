'use client';
import { useRouter } from 'next/navigation';
import OptionField from './option-field';
const options = [
  { id: '/eat', label: '吃什么', caption: '比较一下，或跟着问题找灵感', mark: 0 },
  { id: '/tasks/new', label: '创建任务', caption: '写下来，再放进四象限', mark: 3 },
  { id: '/todos', label: '待办清单', caption: '看看下一件重要的事', mark: 6 },
  { id: '/pomodoro', label: '番茄钟', caption: '留一段专注的时间', mark: 4 },
  { id: '/daily', label: '习惯养成', caption: '让日常慢慢发生', mark: 5 },
  { id: '/memos', label: '备忘录', caption: '接住一个零碎念头', mark: 7 },
  { id: '/choose', label: '选境', caption: '让直觉留下形状', mark: 2 },
  { id: '/posts', label: '读文章', caption: '翻翻 Tau 的记录', mark: 1 },
];
export default function OptionsHome() {
  const router = useRouter();
  return <OptionField title='Tau，现在想做什么？' options={options} onChoose={href => router.push(href)} backHref='/account' backLabel='账号' footer='点一块颜色，开始一件小事。'/>;
}
