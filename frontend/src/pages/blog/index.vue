<template>
  <view class="page">
    <!-- Search Bar -->
    <view class="search-bar">
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索笔记..."
        placeholder-class="placeholder"
        @confirm="fetchNotes"
      />
      <view class="add-btn" @click="goEdit()">+</view>
    </view>

    <!-- Notes List -->
    <view v-if="loading" class="loading">
      <text class="loading-text">加载中...</text>
    </view>

    <view v-else>
      <view
        v-for="note in notes"
        :key="note.id"
        class="note-card"
        @click="goDetail(note.id)"
      >
        <view class="note-header">
          <text class="note-title">{{ note.title }}</text>
          <text v-if="note.is_public" class="badge">公开</text>
        </view>
        <text class="note-summary">{{ note.summary || truncate(note.content) }}</text>
        <view class="note-footer">
          <text class="note-date">{{ formatDate(note.created_at) }}</text>
          <view class="tags">
            <text v-for="tag in note.tags" :key="tag.id" class="tag">{{ tag.name }}</text>
          </view>
        </view>
      </view>

      <view v-if="notes.length === 0" class="empty">
        <text class="empty-text">暂无笔记，点击右上角创建</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getNotes } from '../../api/note'

const notes = ref([])
const keyword = ref('')
const loading = ref(false)
const page = ref(1)

async function fetchNotes() {
  loading.value = true
  try {
    const res = await getNotes({ page: page.value, size: 20, keyword: keyword.value })
    notes.value = res?.list || []
  } catch {} finally {
    loading.value = false
  }
}

function goDetail(id) {
  uni.navigateTo({ url: `/pages/blog/detail?id=${id}` })
}

function goEdit(id) {
  const url = id ? `/pages/blog/edit?id=${id}` : '/pages/blog/edit'
  uni.navigateTo({ url })
}

function truncate(text) {
  if (!text) return ''
  return text.length > 80 ? text.slice(0, 80) + '...' : text
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return dateStr.slice(0, 10)
}

onMounted(() => {
  fetchNotes()
})
</script>

<style scoped>
.page {
  padding: 16px;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
}

.search-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.search-input {
  flex: 1;
  height: 40px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 0 14px;
  color: #e0e0e0;
  font-size: 14px;
}

.placeholder { color: #555; }

.add-btn {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #64b5f6, #42a5f5);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 22px;
  font-weight: 300;
}

.note-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 10px;
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.note-title {
  font-size: 16px;
  font-weight: 600;
  color: #e0e0e0;
}

.badge {
  font-size: 11px;
  color: #4caf50;
  background: rgba(76, 175, 80, 0.12);
  padding: 2px 8px;
  border-radius: 6px;
}

.note-summary {
  display: block;
  font-size: 13px;
  color: #888;
  margin-bottom: 8px;
  line-height: 1.5;
}

.note-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.note-date {
  font-size: 12px;
  color: #555;
}

.tags {
  display: flex;
  gap: 4px;
}

.tag {
  font-size: 11px;
  color: #64b5f6;
  background: rgba(100, 181, 246, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.loading, .empty {
  text-align: center;
  padding: 60px 0;
}

.loading-text, .empty-text {
  color: #666;
  font-size: 14px;
}
</style>
