<template>
  <view class="page">
    <view class="header">
      <text class="title">空闲事项池</text>
    </view>

    <!-- Random Pick -->
    <view class="pick-area" @click="pickRandom">
      <view :class="['pick-card', picking && 'animating']">
        <text v-if="pickedItem" class="pick-result">{{ pickedItem.title }}</text>
        <text v-else class="pick-hint">点击随机推荐</text>
        <text class="pick-sub">{{ pickedItem ? `预计 ${pickedItem.estimated_min} 分钟` : '让命运决定做什么' }}</text>
      </view>
    </view>

    <!-- Add Item -->
    <view class="add-bar">
      <input
        v-model="newTitle"
        class="add-input"
        placeholder="添加新事项..."
        placeholder-class="placeholder"
        @confirm="addItem"
      />
      <input
        v-model.number="newMinutes"
        class="minutes-input"
        type="number"
        placeholder="分钟"
        placeholder-class="placeholder"
      />
    </view>

    <!-- Items List -->
    <view class="section-title">
      <text class="label">事项库</text>
      <text class="count">{{ items.length }} 项</text>
    </view>

    <view v-for="item in items" :key="item.id" class="item-card">
      <view class="item-info">
        <text class="item-title">{{ item.title }}</text>
        <text class="item-meta">{{ item.estimated_min }}分钟 · 已选 {{ item.times_chosen }} 次</text>
      </view>
      <text class="delete-btn" @click="removeItem(item.id)">×</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getPoolItems, createPoolItem, randomPick, deletePoolItem } from '../../api/pool'

const items = ref([])
const pickedItem = ref(null)
const picking = ref(false)
const newTitle = ref('')
const newMinutes = ref(30)

async function fetchItems() {
  try {
    items.value = await getPoolItems() || []
  } catch {}
}

async function addItem() {
  if (!newTitle.value.trim()) return
  const item = await createPoolItem({ title: newTitle.value, estimated_min: newMinutes.value })
  items.value.unshift(item)
  newTitle.value = ''
}

async function pickRandom() {
  picking.value = true
  pickedItem.value = null
  // Simple animation delay
  setTimeout(async () => {
    try {
      pickedItem.value = await randomPick()
    } catch {
      uni.showToast({ title: '事项池为空', icon: 'none' })
    }
    picking.value = false
  }, 600)
}

async function removeItem(id) {
  await deletePoolItem(id)
  items.value = items.value.filter(i => i.id !== id)
}

onMounted(() => {
  fetchItems()
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

.pick-area {
  margin-bottom: 20px;
}

.pick-card {
  background: linear-gradient(135deg, rgba(206, 147, 216, 0.08), rgba(100, 181, 246, 0.08));
  border: 1px solid rgba(206, 147, 216, 0.2);
  border-radius: 16px;
  padding: 30px 20px;
  text-align: center;
  transition: transform 0.3s;
}

.pick-card.animating {
  transform: scale(0.95);
}

.pick-result {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #ce93d8;
  margin-bottom: 6px;
}

.pick-hint {
  display: block;
  font-size: 18px;
  color: #888;
  margin-bottom: 6px;
}

.pick-sub {
  display: block;
  font-size: 13px;
  color: #666;
}

.add-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.add-input {
  flex: 1;
  height: 40px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 0 14px;
  color: #e0e0e0;
  font-size: 14px;
}

.minutes-input {
  width: 70px;
  height: 40px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 0 10px;
  color: #e0e0e0;
  font-size: 14px;
  text-align: center;
}

.placeholder { color: #555; }

.section-title {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.label {
  font-size: 14px;
  font-weight: 600;
  color: #aaa;
}

.count {
  font-size: 13px;
  color: #666;
}

.item-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.item-title {
  display: block;
  font-size: 14px;
  color: #e0e0e0;
}

.item-meta {
  display: block;
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}

.delete-btn {
  font-size: 20px;
  color: #555;
  padding: 4px 8px;
}
</style>
