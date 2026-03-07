import { get, post, put, del } from '../utils/request'

export function getNotes(params) {
  return get('/notes', params)
}

export function getNote(id) {
  return get(`/notes/${id}`)
}

export function createNote(data) {
  return post('/notes', data)
}

export function updateNote(id, data) {
  return put(`/notes/${id}`, data)
}

export function deleteNote(id) {
  return del(`/notes/${id}`)
}

export function getPublicBlog(params) {
  return get('/blog', params)
}
