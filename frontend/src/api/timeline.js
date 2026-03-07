import { get, post, del } from '../utils/request'

export function getTimeline(date) {
  return get(`/timeline/${date}`)
}

export function createTimeBlock(data) {
  return post('/timeline', data)
}

export function deleteTimeBlock(id) {
  return del(`/timeline/${id}`)
}
