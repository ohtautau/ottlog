import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi, register as registerApi, getProfile } from '../api/auth'

export const useUserStore = defineStore('user', () => {
  const token = ref(uni.getStorageSync('token') || '')
  const user = ref(JSON.parse(uni.getStorageSync('user') || 'null'))

  const isLoggedIn = computed(() => !!token.value)

  async function login(username, password) {
    const res = await loginApi({ username, password })
    token.value = res.token
    user.value = res.user
    uni.setStorageSync('token', res.token)
    uni.setStorageSync('user', JSON.stringify(res.user))
    return res
  }

  async function register(username, password, nickname) {
    const res = await registerApi({ username, password, nickname })
    token.value = res.token
    user.value = res.user
    uni.setStorageSync('token', res.token)
    uni.setStorageSync('user', JSON.stringify(res.user))
    return res
  }

  function logout() {
    token.value = ''
    user.value = null
    uni.removeStorageSync('token')
    uni.removeStorageSync('user')
    uni.reLaunch({ url: '/pages/login/index' })
  }

  async function checkAuth() {
    if (!token.value) return
    try {
      const profile = await getProfile()
      user.value = profile
      uni.setStorageSync('user', JSON.stringify(profile))
    } catch {
      logout()
    }
  }

  return { token, user, isLoggedIn, login, register, logout, checkAuth }
})
