import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getTodayTodos, createTodo, toggleTodo, deleteTodo } from '../api/todo'

export const useTodoStore = defineStore('todo', () => {
  const todos = ref([])
  const loading = ref(false)

  async function fetchToday() {
    loading.value = true
    try {
      todos.value = await getTodayTodos() || []
    } finally {
      loading.value = false
    }
  }

  async function addTodo(data) {
    const todo = await createTodo(data)
    todos.value.unshift(todo)
    return todo
  }

  async function toggle(id) {
    const updated = await toggleTodo(id)
    const idx = todos.value.findIndex(t => t.id === id)
    if (idx !== -1) todos.value[idx] = updated
    return updated
  }

  async function remove(id) {
    await deleteTodo(id)
    todos.value = todos.value.filter(t => t.id !== id)
  }

  return { todos, loading, fetchToday, addTodo, toggle, remove }
})
