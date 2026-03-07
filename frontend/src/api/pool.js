import { get, post, del } from '../utils/request'

export function getPoolItems() {
  return get('/pool')
}

export function createPoolItem(data) {
  return post('/pool', data)
}

export function randomPick(params) {
  return get('/pool/random', params)
}

export function deletePoolItem(id) {
  return del(`/pool/${id}`)
}
