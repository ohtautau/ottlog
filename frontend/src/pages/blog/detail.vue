<template>
  <view class="page">
    <view v-if="note" class="article">
      <text class="title">{{ note.title }}</text>
      <view class="meta">
        <text class="date">{{ formatDate(note.created_at) }}</text>
        <text class="views">{{ note.view_count }} 次阅读</text>
      </view>
      <view class="content">
        <text>{{ note.content }}</text>
      </view>
    </view>
    <view v-else class="loading">
      <text class="loading-text">加载中...</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getNote } from '../../api/note'

const note = ref(null)
let noteId = null

onLoad((query) => {
  noteId = query.id
})

onMounted(async () => {
  if (noteId) {
    try {
      note.value = await getNote(noteId)
    } catch {}
  }
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  return dateStr.slice(0, 10)
}
</script>

<style scoped>
.page {
  padding: 16px;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
}

.title {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: #e0e0e0;
  margin-bottom: 12px;
  line-height: 1.4;
}

.meta {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.date, .views {
  font-size: 13px;
  color: #666;
}

.content {
  font-size: 15px;
  color: #bbb;
  line-height: 1.8;
  white-space: pre-wrap;
}

.loading {
  text-align: center;
  padding: 60px 0;
}

.loading-text {
  color: #666;
}
</style>
