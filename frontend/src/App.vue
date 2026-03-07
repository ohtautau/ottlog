<script setup>
import { onLaunch } from '@dcloudio/uni-app'
import { useUserStore } from './stores/user'

onLaunch(() => {
  const userStore = useUserStore()
  userStore.checkAuth()
})
</script>

<style>
@import './utils/theme.css';

page {
  background-color: var(--bg-color);
  color: var(--text-color);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', sans-serif;
  font-size: 14px;
  line-height: 1.6;
}
</style>
