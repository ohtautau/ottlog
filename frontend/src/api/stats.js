import { get } from '../utils/request'

export function getOverview() {
  return get('/stats/overview')
}
