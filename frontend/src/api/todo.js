import { get, post, put, patch, del } from '../utils/request'

export function getTodayTodos() {
  return get('/todos/today')
}

export function getAllTodos(params) {
  return get('/todos', params)
}

export function createTodo(data) {
  return post('/todos', data)
}

export function updateTodo(id, data) {
  return put(`/todos/${id}`, data)
}

export function toggleTodo(id) {
  return patch(`/todos/${id}/toggle`)
}

export function deleteTodo(id) {
  return del(`/todos/${id}`)
}
