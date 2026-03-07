import { get, post, patch } from '../utils/request'

export function startPomodoro(data) {
  return post('/pomodoro/start', data)
}

export function completePomodoro(id) {
  return patch(`/pomodoro/${id}/complete`)
}

export function cancelPomodoro(id) {
  return patch(`/pomodoro/${id}/cancel`)
}

export function getPomodoros(params) {
  return get('/pomodoro', params)
}
