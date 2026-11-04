import { useEffect, useLayoutEffect, useRef } from 'react';
import { browserOwner } from './api';
import { browserRouteParams, websiteRoute } from './routes';

const listeners = new Map();
export const events = {
  on(name, fn) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); },
  off(name, fn) { if (fn) listeners.get(name)?.delete(fn); else listeners.delete(name); },
  trigger(name, ...args) { listeners.get(name)?.forEach(fn => fn(...args)); },
};
let activeHost = null, activePage = 'index', activeQuery = '';
export function setMountHost(host, page, query) { activeHost = host; activePage = page; activeQuery = query; }
export function clearMountHost(host) { if (activeHost === host) activeHost = null; }
export const toolHost = () => activeHost;
export const routePath = () => `pages/${activePage}/index`;
const params = () => browserRouteParams(activePage, activeQuery);
function useLatest(value) {
  const ref = useRef(value); useLayoutEffect(() => { ref.current = value; }, [value]); return ref;
}
function useCallbackEffect(callback, args = []) {
  const ref = useLatest(callback), initialArgs = useRef(args);
  useEffect(() => { const cleanup = ref.current(...initialArgs.current); return typeof cleanup === 'function' ? cleanup : undefined; }, [ref]);
}
export const useLoad = callback => useCallbackEffect(callback, [params()]);
export const useDidShow = callback => {
  const ref = useLatest(callback);
  useEffect(() => { if (!document.hidden) ref.current(); const show = () => { if (!document.hidden) ref.current(); }; document.addEventListener('visibilitychange', show); window.addEventListener('focus', show); return () => { document.removeEventListener('visibilitychange', show); window.removeEventListener('focus', show); }; }, []);
};
export const useReady = callback => useCallbackEffect(callback);
export const useDidHide = callback => { const ref = useLatest(callback); useEffect(() => { const hide = () => { if (document.hidden) ref.current(); }; document.addEventListener('visibilitychange', hide); return () => { document.removeEventListener('visibilitychange', hide); ref.current(); }; }, [ref]); };
export const useUnload = callback => { const ref = useLatest(callback); useEffect(() => () => ref.current(), [ref]); };
export const useRouter = () => ({ params: params(), path: routePath() });
export const useLaunch = useDidShow;
export const useShareAppMessage = () => {};
export const useShareTimeline = () => {};
export const usePullDownRefresh = () => {};
export const useReachBottom = () => {};
export const usePageScroll = () => {};

export function navigate({ url, success, complete }, replace = false) {
  window.dispatchEvent(new CustomEvent('ottlog:navigate', { detail: { url: websiteRoute(url), replace } }));
  success?.({ errMsg: 'ok' }); complete?.({ errMsg: 'ok' }); return Promise.resolve({ errMsg: 'ok' });
}
const cacheKey = key => key.replace(/^ottlog-mini-tool-v1:/, 'ottlog-tool-v1:');
export function readStorage(key) {
  if (key === 'ottlog.cookies') return browserOwner && browserOwner !== 'guest' ? { browser: browserOwner } : {};
  const raw = localStorage.getItem(cacheKey(key)); return raw === null ? '' : JSON.parse(raw);
}
export function writeStorage(key, value) { if (key !== 'ottlog.cookies') localStorage.setItem(cacheKey(key), JSON.stringify(value)); }
const scrollContexts = new WeakMap();
function scrollContext(node) {
  if (!node?.hasAttribute('data-enhanced-scroll')) return node;
  if (!scrollContexts.has(node)) scrollContexts.set(node, { get scrollEnabled() { return node.dataset.scrollEnabled !== 'false'; }, set scrollEnabled(value) { node.dataset.scrollEnabled = String(value); node.style.touchAction = value ? '' : 'none'; node.style.overflowY = value ? 'auto' : 'hidden'; } });
  return scrollContexts.get(node);
}
function createSelectorQuery() {
  const queries = [];
  const query = {
    select(selector) { queries.push({ selector }); return query; },
    selectAll(selector) { queries.push({ selector, all: true }); return query; },
    boundingClientRect(callback) { if (callback) queries.at(-1).callback = callback; return query; },
    scrollOffset(callback) { Object.assign(queries.at(-1), { scroll: true, callback }); return query; },
    node(callback) { Object.assign(queries.at(-1), { node: true, callback }); return query; },
    exec(callback) { const host = activeHost; requestAnimationFrame(() => { if (!host?.isConnected) return; const values = queries.map(item => { const nodes = [...host.querySelectorAll(item.selector)].map(node => item.node ? { node: scrollContext(node) } : item.scroll ? { scrollTop: node.scrollTop, scrollLeft: node.scrollLeft } : { id: node.id, ...node.getBoundingClientRect().toJSON() }); return item.all ? nodes : nodes[0] || null; }); queries.forEach((item, index) => item.callback?.(values[index])); callback?.(values); }); },
  }; return query;
}
const files = new Map();
function imageSource(path) { return files.get(path) || path; }
const loadImage = src => new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('无法读取图片')); img.src = imageSource(src); });
async function chooseMedia({ count = 1 } = {}) {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp'; input.multiple = count > 1;
    input.oncancel = () => { input.remove(); reject(new Error('cancel')); };
    input.onchange = async () => {
      try { const selected = [...input.files].slice(0, count); const tempFiles = await Promise.all(selected.map(file => new Promise((done, fail) => { if (file.size > 12 * 1024 * 1024) { fail(new Error('图片原文件过大，请选择 12MB 以内的图片')); return; } const reader = new FileReader(); reader.onerror = fail; reader.onload = () => done({ tempFilePath: String(reader.result), size: file.size }); reader.readAsDataURL(file); }))); resolve({ tempFiles }); }
      catch (error) { reject(error); } finally { input.remove(); }
    }; input.click();
  });
}
export const Taro = {
  navigateTo: navigate, switchTab: navigate, redirectTo: options => navigate(options, true), reLaunch: options => navigate(options, true),
  navigateBack: () => { if (history.length > 1) history.back(); else navigate({ url: '/pages/index/index' }); return Promise.resolve(); },
  getCurrentInstance: () => ({ router: { params: params(), path: routePath() } }),
  getStorageSync: readStorage, setStorageSync: writeStorage, removeStorageSync: key => localStorage.removeItem(cacheKey(key)),
  createSelectorQuery, eventCenter: events,
  getWindowInfo: () => ({ windowWidth: innerWidth, windowHeight: innerHeight, safeArea: { bottom: innerHeight }, statusBarHeight: 0 }),
  getSystemInfoSync: () => ({ windowWidth: innerWidth, windowHeight: innerHeight, platform: 'web' }),
  onWindowResize: fn => events.on('resize', fn), offWindowResize: fn => events.off('resize', fn),
  onNetworkStatusChange: fn => events.on('network', fn), offNetworkStatusChange: fn => events.off('network', fn),
  setNavigationBarTitle: ({ title }) => { document.title = `${title} · Ottlog`; events.trigger('title', title); return Promise.resolve(); },
  hideKeyboard: () => { if (document.activeElement?.matches('input,textarea')) document.activeElement.blur(); return Promise.resolve(); },
  showToast: ({ title }) => { events.trigger('notice', title); return Promise.resolve(); },
  vibrateShort: () => Promise.resolve(), setKeepScreenOn: () => Promise.resolve(), stopPullDownRefresh: () => Promise.resolve(),
  setClipboardData: async ({ data }) => { await navigator.clipboard.writeText(data); },
  chooseMedia,
  getEnv: () => 'WEB', ENV_TYPE: { WEB: 'WEB' },
  getImageInfo: async ({ src }) => { const img = await loadImage(src); return { width: img.naturalWidth, height: img.naturalHeight }; },
  compressImage: async ({ src, compressedWidth, compressedHeight, quality }) => { const img = await loadImage(src); const canvas = document.createElement('canvas'); canvas.width = compressedWidth; canvas.height = compressedHeight; canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height); return { tempFilePath: canvas.toDataURL(/^data:image\/(png|webp)/i.test(imageSource(src) || '') ? 'image/png' : 'image/jpeg', quality / 100) }; },
  env: { USER_DATA_PATH: '/browser-temp' },
  getFileSystemManager: () => ({
    readFile: ({ filePath, success, fail }) => { const data = imageSource(filePath); if (data?.startsWith('data:image/')) success({ data: data.slice(data.indexOf(',') + 1) }); else fail(new Error('图片不可用')); },
    writeFile: ({ filePath, data, success }) => { const mime = data.startsWith('/9j/') ? 'jpeg' : data.startsWith('iVBOR') ? 'png' : 'webp'; files.set(filePath, `data:image/${mime};base64,${data}`); success({}); },
  }),
  previewImage: async ({ current, urls }) => events.trigger('images', { current: imageSource(current), urls: urls.map(imageSource) }),
  login: () => Promise.reject(new Error('微信通知请在小程序中授权。')),
  requestSubscribeMessage: () => Promise.reject(new Error('微信通知请在小程序中授权。')),
};
window.addEventListener('resize', () => events.trigger('resize', { size: Taro.getWindowInfo() }));
window.addEventListener('storage', event => { if (event.key?.startsWith('ottlog-tool-v1:')) events.trigger('ottlog-tools-refresh'); });
window.addEventListener('online', () => events.trigger('network', { isConnected: true }));
window.addEventListener('offline', () => events.trigger('network', { isConnected: false }));
export default Taro;
