<template>
  <view class="page">
    <view class="logo-area">
      <text class="logo-title">Life Station</text>
      <text class="logo-sub">个人数字工作站</text>
    </view>

    <view class="form">
      <view class="tab-bar">
        <text :class="['tab', mode === 'login' && 'tab-active']" @click="mode = 'login'">登录</text>
        <text :class="['tab', mode === 'register' && 'tab-active']" @click="mode = 'register'">注册</text>
      </view>

      <view class="input-group">
        <input
          v-model="form.username"
          class="input"
          placeholder="用户名"
          placeholder-class="placeholder"
        />
      </view>

      <view class="input-group">
        <input
          v-model="form.password"
          class="input"
          type="password"
          placeholder="密码"
          placeholder-class="placeholder"
        />
      </view>

      <view v-if="mode === 'register'" class="input-group">
        <input
          v-model="form.nickname"
          class="input"
          placeholder="昵称（可选）"
          placeholder-class="placeholder"
        />
      </view>

      <button class="btn-primary" :loading="loading" @click="submit">
        {{ mode === 'login' ? '登录' : '注册' }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()
const mode = ref('login')
const loading = ref(false)

const form = reactive({
  username: '',
  password: '',
  nickname: '',
})

async function submit() {
  if (!form.username || !form.password) {
    uni.showToast({ title: '请填写用户名和密码', icon: 'none' })
    return
  }

  loading.value = true
  try {
    if (mode.value === 'login') {
      await userStore.login(form.username, form.password)
    } else {
      await userStore.register(form.username, form.password, form.nickname)
    }
    uni.switchTab({ url: '/pages/index/index' })
  } catch {
    // Error already handled by request interceptor
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 60px 24px 24px;
  background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.logo-area {
  text-align: center;
  margin-bottom: 48px;
}

.logo-title {
  display: block;
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(90deg, #64b5f6, #ce93d8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 8px;
}

.logo-sub {
  display: block;
  font-size: 14px;
  color: #888;
}

.form {
  width: 100%;
  max-width: 360px;
}

.tab-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  justify-content: center;
}

.tab {
  font-size: 16px;
  color: #888;
  padding-bottom: 6px;
  border-bottom: 2px solid transparent;
}

.tab-active {
  color: #64b5f6;
  border-bottom-color: #64b5f6;
}

.input-group {
  margin-bottom: 16px;
}

.input {
  width: 100%;
  height: 48px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 0 16px;
  color: #e0e0e0;
  font-size: 15px;
  box-sizing: border-box;
}

.placeholder {
  color: #555;
}

.btn-primary {
  width: 100%;
  height: 48px;
  background: linear-gradient(135deg, #64b5f6, #42a5f5);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  margin-top: 8px;
}
</style>
