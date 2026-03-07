<template>
  <view class="page">
    <view class="header">
      <text class="title">数据统计</text>
    </view>

    <!-- Overview Cards -->
    <view class="stats-grid">
      <view class="stat-card blue">
        <text class="stat-num">{{ stats.today_todos || 0 }}</text>
        <text class="stat-label">今日任务</text>
      </view>
      <view class="stat-card green">
        <text class="stat-num">{{ stats.completed_todos || 0 }}</text>
        <text class="stat-label">已完成</text>
      </view>
      <view class="stat-card orange">
        <text class="stat-num">{{ stats.today_pomodoros || 0 }}</text>
        <text class="stat-label">今日番茄</text>
      </view>
      <view class="stat-card purple">
        <text class="stat-num">{{ stats.weekly_pomodoros || 0 }}</text>
        <text class="stat-label">本周番茄</text>
      </view>
    </view>

    <!-- Completion Rate -->
    <view class="card">
      <text class="card-title">任务完成率</text>
      <view class="rate-bar">
        <view class="rate-fill" :style="{ width: completionRate + '%' }"></view>
      </view>
      <text class="rate-text">{{ completionRate }}%</text>
    </view>

    <!-- Notes Stats -->
    <view class="card">
      <text class="card-title">笔记总数</text>
      <text class="big-num">{{ stats.total_notes || 0 }}</text>
      <text class="card-sub">篇文章</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getOverview } from '../../api/stats'

const stats = ref({})

const completionRate = computed(() => {
  const total = stats.value.today_todos || 0
  const done = stats.value.completed_todos || 0
  if (total === 0) return 0
  return Math.round((done / total) * 100)
})

onMounted(async () => {
  try {
    stats.value = await getOverview()
  } catch {}
})
</script>

<style scoped>
.page {
  padding: 16px;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
}

.header {
  margin-bottom: 20px;
}

.title {
  font-size: 20px;
  font-weight: 700;
  color: #e0e0e0;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.stat-card.blue { border-left: 3px solid #64b5f6; }
.stat-card.green { border-left: 3px solid #4caf50; }
.stat-card.orange { border-left: 3px solid #ff9800; }
.stat-card.purple { border-left: 3px solid #ce93d8; }

.stat-num {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #e0e0e0;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #888;
  margin-top: 4px;
}

.card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.card-title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #aaa;
  margin-bottom: 12px;
}

.rate-bar {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.rate-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  border-radius: 4px;
  transition: width 0.5s;
}

.rate-text {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #4caf50;
  text-align: center;
}

.big-num {
  display: block;
  font-size: 36px;
  font-weight: 700;
  color: #64b5f6;
  text-align: center;
}

.card-sub {
  display: block;
  font-size: 13px;
  color: #666;
  text-align: center;
}
</style>
