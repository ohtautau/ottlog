<template>
  <view class="page">
    <view class="header">
      <text class="title">每日清单</text>
      <text class="date">{{ today }}</text>
    </view>

    <!-- Add Todo -->
    <view class="add-bar">
      <input
        v-model="newTitle"
        class="add-input"
        placeholder="添加新任务..."
        placeholder-class="placeholder"
        @confirm="addTodo"
      />
      <view class="priority-selector">
        <text
          v-for="p in priorities"
          :key="p.value"
          :class="['priority-dot', newPriority === p.value && 'active']"
          :style="{ background: p.color }"
          @click="newPriority = p.value"
        >
        </text>
      </view>
    </view>

    <!-- Todo List -->
    <view v-for="todo in todoStore.todos" :key="todo.id" class="todo-item">
      <view class="todo-check" @click="todoStore.toggle(todo.id)">
        <view :class="['checkbox', todo.completed && 'checked']">
          <text v-if="todo.completed" class="checkmark">✓</text>
        </view>
      </view>
      <view class="todo-content">
        <text :class="['todo-title', todo.completed && 'completed']">{{ todo.title }}</text>
        <text v-if="todo.description" class="todo-desc">{{ todo.description }}</text>
      </view>
      <view :class="['priority-indicator', `p-${todo.priority}`]"></view>
      <text class="delete-btn" @click="todoStore.remove(todo.id)">×</text>
    </view>

    <view v-if="todoStore.todos.length === 0 && !todoStore.loading" class="empty">
      <text class="empty-text">今天还没有任务，添加一个吧</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTodoStore } from '../../stores/todo'

const todoStore = useTodoStore()
const newTitle = ref('')
const newPriority = ref(0)

const today = computed(() => {
  const d = new Date()
  return `${d.getMonth() + 1}月${d.getDate()}日`
})

const priorities = [
  { value: 0, color: '#555', label: '无' },
  { value: 1, color: '#4caf50', label: '低' },
  { value: 2, color: '#ff9800', label: '中' },
  { value: 3, color: '#f44336', label: '高' },
]

async function addTodo() {
  if (!newTitle.value.trim()) return
  await todoStore.addTodo({ title: newTitle.value, priority: newPriority.value })
  newTitle.value = ''
  newPriority.value = 0
}

onMounted(() => {
  todoStore.fetchToday()
})
</script>

<style scoped>
.page {
  padding: 16px;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.title {
  font-size: 20px;
  font-weight: 700;
  color: #e0e0e0;
}

.date {
  font-size: 14px;
  color: #888;
}

.add-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 8px 12px;
}

.add-input {
  flex: 1;
  height: 36px;
  background: transparent;
  border: none;
  color: #e0e0e0;
  font-size: 14px;
}

.placeholder { color: #555; }

.priority-selector {
  display: flex;
  gap: 6px;
}

.priority-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  opacity: 0.4;
}

.priority-dot.active {
  opacity: 1;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.checkbox {
  width: 22px;
  height: 22px;
  border: 2px solid #555;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkbox.checked {
  background: #64b5f6;
  border-color: #64b5f6;
}

.checkmark {
  color: #fff;
  font-size: 14px;
}

.todo-content {
  flex: 1;
}

.todo-title {
  display: block;
  font-size: 15px;
  color: #e0e0e0;
}

.todo-title.completed {
  text-decoration: line-through;
  color: #666;
}

.todo-desc {
  display: block;
  font-size: 12px;
  color: #777;
  margin-top: 2px;
}

.priority-indicator {
  width: 4px;
  height: 20px;
  border-radius: 2px;
}

.p-0 { background: transparent; }
.p-1 { background: #4caf50; }
.p-2 { background: #ff9800; }
.p-3 { background: #f44336; }

.delete-btn {
  font-size: 20px;
  color: #555;
  padding: 4px;
}

.empty {
  text-align: center;
  padding: 60px 0;
}

.empty-text {
  color: #555;
  font-size: 14px;
}
</style>
