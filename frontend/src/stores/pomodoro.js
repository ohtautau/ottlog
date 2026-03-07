import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { startPomodoro, completePomodoro, cancelPomodoro } from '../api/pomodoro'

export const usePomodoroStore = defineStore('pomodoro', () => {
  const current = ref(null)
  const timeLeft = ref(0)
  const isRunning = ref(false)
  const isBreak = ref(false)
  let timer = null

  const formattedTime = computed(() => {
    const min = Math.floor(timeLeft.value / 60)
    const sec = timeLeft.value % 60
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  })

  const progress = computed(() => {
    if (!current.value) return 0
    const total = (isBreak.value ? current.value.break_time : current.value.duration) * 60
    return total > 0 ? ((total - timeLeft.value) / total) * 100 : 0
  })

  async function start(duration = 25, breakTime = 5, todoId = null) {
    const data = { duration, break_time: breakTime }
    if (todoId) data.todo_id = todoId

    current.value = await startPomodoro(data)
    timeLeft.value = duration * 60
    isRunning.value = true
    isBreak.value = false
    startTimer()
    return current.value
  }

  function startTimer() {
    clearInterval(timer)
    timer = setInterval(() => {
      if (timeLeft.value > 0) {
        timeLeft.value--
      } else {
        clearInterval(timer)
        onTimerEnd()
      }
    }, 1000)
  }

  async function onTimerEnd() {
    if (!isBreak.value) {
      // Work session ended, start break
      if (current.value) {
        await completePomodoro(current.value.id)
      }
      uni.showToast({ title: '专注结束，休息一下！', icon: 'none' })
      isBreak.value = true
      timeLeft.value = (current.value?.break_time || 5) * 60
      startTimer()
    } else {
      // Break ended
      uni.showToast({ title: '休息结束！', icon: 'none' })
      reset()
    }
  }

  async function cancel() {
    if (current.value) {
      await cancelPomodoro(current.value.id)
    }
    reset()
  }

  function pause() {
    clearInterval(timer)
    isRunning.value = false
  }

  function resume() {
    if (timeLeft.value > 0) {
      isRunning.value = true
      startTimer()
    }
  }

  function reset() {
    clearInterval(timer)
    current.value = null
    timeLeft.value = 0
    isRunning.value = false
    isBreak.value = false
  }

  return {
    current, timeLeft, isRunning, isBreak,
    formattedTime, progress,
    start, cancel, pause, resume, reset,
  }
})
