<template>
  <view class="page">
    <view class="header">
      <text class="title">时间轴</text>
      <text class="date">{{ selectedDate }}</text>
    </view>

    <!-- Timeline -->
    <view class="timeline">
      <view v-for="block in blocks" :key="block.id" class="time-block">
        <view class="time-marker">
          <text class="time-text">{{ formatTime(block.start_time) }}</text>
          <view class="dot" :style="{ background: block.color || '#64b5f6' }"></view>
          <view class="line"></view>
        </view>
        <view class="block-content" :style="{ borderLeftColor: block.color || '#64b5f6' }">
          <text class="block-title">{{ block.title }}</text>
          <text class="block-category">{{ block.category }}</text>
          <text class="block-duration">{{ calcDuration(block.start_time, block.end_time) }}</text>
        </view>
      </view>

      <view v-if="blocks.length === 0" class="empty">
        <text class="empty-text">今日暂无记录</text>
      </view>
    </view>

    <!-- Add Button -->
    <view class="fab" @click="showAddForm = true">
      <text class="fab-text">+</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getTimeline } from '../../api/timeline'

const selectedDate = ref(new Date().toISOString().slice(0, 10))
const blocks = ref([])
const showAddForm = ref(false)

async function fetchTimeline() {
  try {
    blocks.value = await getTimeline(selectedDate.value) || []
  } catch {}
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function calcDuration(start, end) {
  if (!start || !end) return ''
  const diff = Math.round((new Date(end) - new Date(start)) / 60000)
  if (diff < 60) return `${diff} 分钟`
  return `${Math.floor(diff / 60)}h${diff % 60}m`
}

onMounted(() => {
  fetchTimeline()
})
</script>

<style scoped>
.page {
  padding: 16px;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
  position: relative;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.title {
  font-size: 20px;
  font-weight: 700;
  color: #e0e0e0;
}

.date {
  font-size: 14px;
  color: #888;
}

.time-block {
  display: flex;
  gap: 12px;
  margin-bottom: 4px;
}

.time-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 50px;
}

.time-text {
  font-size: 12px;
  color: #888;
  font-variant-numeric: tabular-nums;
  margin-bottom: 4px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.line {
  width: 2px;
  flex: 1;
  background: rgba(255, 255, 255, 0.06);
  min-height: 30px;
}

.block-content {
  flex: 1;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-left: 3px solid #64b5f6;
  border-radius: 4px 10px 10px 4px;
  padding: 10px 12px;
  margin-bottom: 8px;
}

.block-title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #e0e0e0;
  margin-bottom: 4px;
}

.block-category {
  font-size: 12px;
  color: #888;
  margin-right: 8px;
}

.block-duration {
  font-size: 12px;
  color: #64b5f6;
}

.fab {
  position: fixed;
  right: 20px;
  bottom: 100px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #64b5f6, #42a5f5);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(100, 181, 246, 0.3);
}

.fab-text {
  font-size: 28px;
  color: #fff;
  font-weight: 300;
}

.empty {
  text-align: center;
  padding: 60px 0;
}

.empty-text {
  color: #555;
  font-size: 14px;
}
</style>
