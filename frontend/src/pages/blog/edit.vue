<template>
  <view class="page">
    <view class="form">
      <input
        v-model="form.title"
        class="title-input"
        placeholder="笔记标题"
        placeholder-class="placeholder"
      />

      <textarea
        v-model="form.content"
        class="content-input"
        placeholder="开始书写... (支持 Markdown)"
        placeholder-class="placeholder"
        :auto-height="true"
        :maxlength="-1"
      />

      <view class="options">
        <view class="switch-row">
          <text class="switch-label">公开发布</text>
          <switch :checked="form.is_public" color="#64b5f6" @change="form.is_public = $event.detail.value" />
        </view>
      </view>

      <button class="btn-save" :loading="saving" @click="save">
        {{ isEdit ? '更新' : '发布' }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { createNote, updateNote, getNote } from '../../api/note'

const saving = ref(false)
const isEdit = ref(false)
let noteId = null

const form = reactive({
  title: '',
  content: '',
  is_public: false,
})

onLoad((query) => {
  if (query.id) {
    noteId = query.id
    isEdit.value = true
  }
})

onMounted(async () => {
  if (noteId) {
    try {
      const note = await getNote(noteId)
      form.title = note.title
      form.content = note.content
      form.is_public = note.is_public
    } catch {}
  }
})

async function save() {
  if (!form.title.trim()) {
    uni.showToast({ title: '请输入标题', icon: 'none' })
    return
  }

  saving.value = true
  try {
    if (isEdit.value) {
      await updateNote(noteId, form)
    } else {
      await createNote(form)
    }
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1000)
  } catch {} finally {
    saving.value = false
  }
}
</script>

<style scoped>
.page {
  padding: 16px;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
}

.title-input {
  width: 100%;
  height: 48px;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: #e0e0e0;
  font-size: 20px;
  font-weight: 600;
  padding: 0;
  margin-bottom: 16px;
  box-sizing: border-box;
}

.content-input {
  width: 100%;
  min-height: 300px;
  background: transparent;
  border: none;
  color: #bbb;
  font-size: 15px;
  line-height: 1.8;
  padding: 0;
  box-sizing: border-box;
}

.placeholder { color: #444; }

.options {
  margin-top: 20px;
  padding: 12px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.switch-label {
  color: #aaa;
  font-size: 14px;
}

.btn-save {
  width: 100%;
  height: 48px;
  background: linear-gradient(135deg, #64b5f6, #42a5f5);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  margin-top: 20px;
}
</style>
