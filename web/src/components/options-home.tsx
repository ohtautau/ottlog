'use client';
import { useRouter } from 'next/navigation';
import OptionField from './option-field';
const options = [
  { id: '/today', label: '今日', caption: '快速记录，看看今天的安排', mark: 3 },
  { id: '/todos', label: '任务', caption: '看看下一件重要的事', mark: 6 },
  { id: '/domains', label: '领域', caption: '目标、习惯与日常进展', mark: 0 },
  { id: '/daily', label: '习惯', caption: '让日常慢慢发生', mark: 5 },
  { id: '/memos', label: '便签', caption: '接住一个零碎念头', mark: 7 },
  { id: '/pomodoro', label: '专注', caption: '留一段完整的时间', mark: 4 },
  { id: '/posts', label: '读文章', caption: '翻翻 Tau 的记录', mark: 1 },
];
export default function OptionsHome() {
  const router = useRouter();
  return <OptionField title='Tau，现在想做什么？' options={options} onChoose={href => router.push(href)} backHref='/account' backLabel='账号' footer='点一块颜色，开始一件小事。'/>;
}
