<template>
  <view class="page">
    <view class="timer-area">
      <view class="timer-ring">
        <text class="timer-text">{{ pomodoroStore.formattedTime || '25:00' }}</text>
        <text class="timer-label">{{ statusLabel }}</text>
      </view>

      <!-- Progress bar -->
      <view class="progress-bar">
        <view class="progress-fill" :style="{ width: pomodoroStore.progress + '%' }"></view>
      </view>
    </view>

    <!-- Duration Options -->
    <view v-if="!pomodoroStore.isRunning && !pomodoroStore.current" class="duration-options">
      <view
        v-for="opt in durations"
        :key="opt.value"
        :class="['duration-btn', selectedDuration === opt.value && 'active']"
        @click="selectedDuration = opt.value"
      >
        <text class="duration-text">{{ opt.label }}</text>
      </view>
    </view>

    <!-- Controls -->
    <view class="controls">
      <view v-if="!pomodoroStore.current" class="btn-start" @click="startFocus">
        <text class="btn-text">开始专注</text>
      </view>

      <template v-else>
        <view v-if="pomodoroStore.isRunning" class="btn-pause" @click="pomodoroStore.pause()">
          <text class="btn-text">暂停</text>
        </view>
        <view v-else class="btn-resume" @click="pomodoroStore.resume()">
          <text class="btn-text">继续</text>
        </view>
        <view class="btn-cancel" @click="pomodoroStore.cancel()">
          <text class="btn-text">放弃</text>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePomodoroStore } from '../../stores/pomodoro'

const pomodoroStore = usePomodoroStore()
const selectedDuration = ref(25)

const durations = [
  { value: 15, label: '15 分钟' },
  { value: 25, label: '25 分钟' },
  { value: 45, label: '45 分钟' },
  { value: 60, label: '60 分钟' },
]

const statusLabel = computed(() => {
  if (!pomodoroStore.current) return '准备开始'
  if (pomodoroStore.isBreak) return '休息中'
  if (pomodoroStore.isRunning) return '专注中'
  return '已暂停'
})

async function startFocus() {
  await pomodoroStore.start(selectedDuration.value)
}
</script>

<style scoped>
.page {
  padding: 24px 16px;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.timer-area {
  margin-top: 40px;
  margin-bottom: 32px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.timer-ring {
  width: 220px;
  height: 220px;
  border-radius: 50%;
  border: 3px solid rgba(100, 181, 246, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.timer-text {
  font-size: 48px;
  font-weight: 200;
  color: #e0e0e0;
  font-variant-numeric: tabular-nums;
}

.timer-label {
  font-size: 14px;
  color: #888;
  margin-top: 4px;
}

.progress-bar {
  width: 80%;
  height: 4px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #64b5f6, #42a5f5);
  border-radius: 2px;
  transition: width 1s linear;
}

.duration-options {
  display: flex;
  gap: 10px;
  margin-bottom: 32px;
}

.duration-btn {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
}

.duration-btn.active {
  background: rgba(100, 181, 246, 0.12);
  border-color: rgba(100, 181, 246, 0.4);
}

.duration-text {
  font-size: 13px;
  color: #bbb;
}

.duration-btn.active .duration-text {
  color: #64b5f6;
}

.controls {
  display: flex;
  gap: 12px;
}

.btn-start, .btn-resume {
  padding: 14px 40px;
  background: linear-gradient(135deg, #64b5f6, #42a5f5);
  border-radius: 25px;
}

.btn-pause {
  padding: 14px 40px;
  background: rgba(255, 152, 0, 0.15);
  border: 1px solid rgba(255, 152, 0, 0.3);
  border-radius: 25px;
}

.btn-cancel {
  padding: 14px 24px;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 25px;
}

.btn-text {
  font-size: 16px;
  font-weight: 600;
  color: #e0e0e0;
}
</style>
