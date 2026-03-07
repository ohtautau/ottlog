<template>
  <view class="page">
    <view class="header">
      <text class="greeting">{{ greetingText }}</text>
      <text class="username">{{ userStore.user?.nickname || '未登录' }}</text>
    </view>

    <!-- Quick Stats -->
    <view class="stats-grid">
      <view class="stat-card">
        <text class="stat-num">{{ stats.today_todos || 0 }}</text>
        <text class="stat-label">今日任务</text>
      </view>
      <view class="stat-card">
        <text class="stat-num">{{ stats.completed_todos || 0 }}</text>
        <text class="stat-label">已完成</text>
      </view>
      <view class="stat-card">
        <text class="stat-num">{{ stats.today_pomodoros || 0 }}</text>
        <text class="stat-label">番茄钟</text>
      </view>
      <view class="stat-card">
        <text class="stat-num">{{ stats.total_notes || 0 }}</text>
        <text class="stat-label">笔记</text>
      </view>
    </view>

    <!-- Quick Actions -->
    <view class="section">
      <text class="section-title">快捷操作</text>
      <view class="action-grid">
        <view class="action-card" @click="goTo('/pages/blog/edit')">
          <text class="action-icon">✏️</text>
          <text class="action-text">写笔记</text>
        </view>
        <view class="action-card" @click="goTo('/pages/todo/index')">
          <text class="action-icon">✅</text>
          <text class="action-text">添加任务</text>
        </view>
        <view class="action-card" @click="goTo('/pages/pomodoro/index')">
          <text class="action-icon">🍅</text>
          <text class="action-text">开始专注</text>
        </view>
        <view class="action-card" @click="goTo('/pages/pool/index')">
          <text class="action-icon">🎲</text>
          <text class="action-text">随机事项</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../../stores/user'
import { getOverview } from '../../api/stats'

const userStore = useUserStore()
const stats = ref({})

const greetingText = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

function goTo(url) {
  uni.navigateTo({ url })
}

onMounted(async () => {
  if (userStore.isLoggedIn) {
    try {
      stats.value = await getOverview()
    } catch {}
  }
})
</script>

<style scoped>
.page {
  padding: 20px 16px;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
}

.header {
  margin-bottom: 24px;
}

.greeting {
  display: block;
  font-size: 14px;
  color: #9e9e9e;
  margin-bottom: 4px;
}

.username {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #e0e0e0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 24px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 12px 8px;
  text-align: center;
}

.stat-num {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: #64b5f6;
}

.stat-label {
  display: block;
  font-size: 11px;
  color: #888;
  margin-top: 2px;
}

.section {
  margin-bottom: 24px;
}

.section-title {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #e0e0e0;
  margin-bottom: 12px;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.action-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.action-icon {
  font-size: 24px;
}

.action-text {
  font-size: 14px;
  color: #bbb;
}
</style>
