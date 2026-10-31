import { View } from '@tarojs/components';
import { todoQuadrant, type Todo } from '../lib/tool-records';
import TodoTaskCard from './todo-task-card';
import './todo-drag-card.css';

/** The lifted row uses the same content and dimensions as its original card. */
export default function TodoDragCard({ task, x, y, width, height, offsetX, offsetY, overTrash = false }: {
  task: Todo; x: number; y: number; width: number; height: number; offsetX: number; offsetY: number; overTrash?: boolean;
}) {
  return <View className={`todo-drag-ghost todo-drag-${todoQuadrant(task).id}${overTrash ? ' is-over-trash' : ''}`} aria-hidden style={{ left: `${x - offsetX}px`, top: `${y - offsetY}px`, width: `${width}px`, height: `${height}px` }}>
    <TodoTaskCard task={task} now={Date.now()} disabled ariaLabel={`正在拖动任务：${task.title}`} onOpen={() => {}}
      leading={check => <View className='todo-complete todo-drag-complete'>{check}</View>} />
  </View>;
}
