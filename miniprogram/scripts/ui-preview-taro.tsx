// Isolated browser test adapter. This is not a WeChat runtime or application code.
import React, { useEffect, useRef } from 'react';

declare global { interface Window { __miniFixture: any; __miniRequests: Array<{ path: string; method: string; query?: string; data?: any }>; __miniNotices: string[]; __miniPreviewControl: { emit: (name: string, ...args: any[]) => void; readStorage: (key: string) => any }; } }
const fixture = () => window.__miniFixture;
// WeChat/Taro exposes query values to the page; the destination decodes them once.
const params = () => Object.fromEntries((location.hash.split('?')[1] || '').split('&').filter(Boolean).map(pair => { const index = pair.indexOf('='); return index < 0 ? [pair, ''] : [pair.slice(0, index), pair.slice(index + 1)]; }));
const pagePath = () => location.hash.replace(/^#\/?/, '').split('?')[0];
function callbackEffect(callback: (...args: any[]) => any, args: any[] = []) {
  const ref = useRef(callback); ref.current = callback;
  useEffect(() => { const result = ref.current(...args); return typeof result === 'function' ? result : undefined; }, []);
}
export const useLoad = (callback: (p: Record<string, string>) => any) => callbackEffect(callback, [params()]);
export const useDidShow = (callback: () => any) => callbackEffect(callback);
export const useReady = useDidShow;
export const useDidHide = (callback: () => any) => { const ref = useRef(callback); ref.current = callback; useEffect(() => () => { ref.current(); }, []); };
export const useUnload = useDidHide;
export const usePullDownRefresh = () => {};
export const useReachBottom = () => {};
export const usePageScroll = () => {};
export const useShareAppMessage = () => {};
export const useShareTimeline = () => {};
export const useLaunch = useDidShow;
export const useRouter = () => ({ params: params(), path: pagePath() });
const storage = new Map<string, any>();
const persistEntryStorage = (key: string) => key.startsWith('ottlog-mini-preview-v1:') || key.startsWith('ottlog-mini-domain-record-edit-v1:') || fixture().persistEntryTools && (key.startsWith('ottlog-mini-tool-v1:') || key.startsWith('ottlog-mini-entry-draft-v1:') || key.startsWith('ottlog-mini-home-entry-mode-v1:'));
let loggedIn = false;
const saved = new Set<string>();
const navigate = ({ url }: { url: string }) => { location.hash = url; return Promise.resolve({ errMsg: 'ok' }); };
const tabPages = new Set(['/pages/index/index', '/pages/todos/index', '/pages/domains/index', '/pages/daily/index', '/pages/favorites/index']);
const personalStates = new Map<string, any>();
const scheduledReminders = new Map<string, any>();
const pomodoroReminders = new Map<string, any>();
function pomodoroEventTime(state: any, event: string) {
  const active = state?.active;
  if (!active) return null;
  if (event === 'focus_start') return active.mode === 'focus' ? Date.parse(active.startedAt) : null;
  if (active.mode !== 'focus') return event === 'break_start' ? Date.parse(active.startedAt) : active.deadline;
  if (state.settings.transitionMode === 'manual') return null;
  const rounds = Math.max(state.completedFocusCount || 0, state.sessions.filter((item: any) => item.mode === 'focus' && item.completed).length) + 1;
  const rest = rounds % state.settings.longEvery === 0 ? state.settings.longBreak : state.settings.shortBreak;
  return active.deadline === null ? null : active.deadline + (event === 'break_end' ? rest * 60000 : 0);
}
function syncPomodoroFixture(state: any) {
  for (const reminder of pomodoroReminders.values()) {
    if (!['pending', 'paused'].includes(reminder.status)) continue;
    const active = state?.active;
    if (!active || (active.rootRunId || active.id) !== reminder.runId) reminder.status = 'cancelled';
    else {
      reminder.status = active.running ? 'pending' : 'paused';
      reminder.expectedDeadline = active.deadline;
      const at = pomodoroEventTime(state, reminder.event);
      if (at !== null) reminder.remindAt = new Date(at).toISOString();
    }
  }
  fixture().pomodoroState = structuredClone(state);
  fixture().pomodoroReminders = structuredClone([...pomodoroReminders.values()]);
}
const events = new Map<string, Set<(...args: any[]) => void>>();
window.__miniPreviewControl = {
  emit: (name, ...args) => events.get(name)?.forEach(callback => callback(...args)),
  readStorage: key => {
    const raw = persistEntryStorage(key) ? localStorage.getItem(key) : null;
    return structuredClone(storage.get(key) ?? (raw ? JSON.parse(raw) : undefined));
  },
};
const scrollContexts = new WeakMap<Element, any>();
function scrollContext(node: Element) {
  if (!node.hasAttribute('data-enhanced-scroll')) return null;
  let context = scrollContexts.get(node);
  if (!context) {
    context = {
      get scrollEnabled() { return node.getAttribute('data-scroll-enabled') !== 'false'; },
      set scrollEnabled(value: boolean) {
        node.setAttribute('data-scroll-enabled', String(value));
        (fixture().nativeScrollChanges ||= []).push({ id: node.id, enabled: value, connected: node.isConnected, scrollTop: node.scrollTop });
      },
    };
    scrollContexts.set(node, context);
  }
  return context;
}
const Taro = {
  navigateTo: ({ url }: { url: string }) => tabPages.has(url.split('?')[0]) ? Promise.reject(new Error('navigateTo cannot open a tabBar page')) : navigate({ url }),
  switchTab: ({ url }: { url: string }) => !tabPages.has(url) ? Promise.reject(new Error('switchTab requires a tabBar path without query parameters')) : navigate({ url }),
  reLaunch: navigate, redirectTo: navigate,
  navigateBack: () => { history.back(); return Promise.resolve(); },
  getCurrentInstance: () => ({ router: { params: params(), path: pagePath() } }),
  getStorageSync: (key: string) => {
    if (fixture().domainPreview) (fixture().storageReads ||= []).push(key);
    if (persistEntryStorage(key) && !storage.has(key)) {
      const raw = localStorage.getItem(key);
      if (raw) storage.set(key, JSON.parse(raw));
    }
    if (key.startsWith('ottlog-mini-tool-v1:') && (key.endsWith(':domains') || key.endsWith(':reminders')) && !storage.has(key)) {
      const raw = localStorage.getItem(key);
      if (raw) storage.set(key, JSON.parse(raw));
    }
    if (key === 'ottlog.home-shortcuts.v1' || key === 'ottlog.home-feature-order.v1') {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : undefined;
    }
    const guestTool = key.startsWith('ottlog-mini-tool-v1:guest:') ? key.slice('ottlog-mini-tool-v1:guest:'.length) : '';
    // Tests may seed a fresh document before opening a tool. Once read, ordinary
    // application writes own the cache; the fixture never replaces edited data.
    if (!storage.has(key) && guestTool && fixture().guestToolStates?.[guestTool]) {
      storage.set(key, { data: structuredClone(fixture().guestToolStates[guestTool]), pending: false, revision: 0 });
    }
    if (!storage.has(key) && key.startsWith('ottlog.habit-openings.v1.') && fixture().habitOpenLogs?.[key]) {
      storage.set(key, structuredClone(fixture().habitOpenLogs[key]));
    }
    return storage.get(key);
  }, setStorageSync: (key: string, value: any) => {
    if (fixture().domainPreview) (fixture().storageWrites ||= []).push(key);
    if (/^(?:ottlog-mini-preview-v1:)?ottlog-mini-tool-v1:/.test(key) && fixture().failToolWrites?.some((tool: string) => key.endsWith(`:${tool}`))) throw new Error('Preview tool storage unavailable');
    if (/^(?:ottlog-mini-preview-v1:)?ottlog-mini-home-entry-mode-v1:/.test(key) && fixture().failHomeEntryModeWrites) throw new Error('Preview home entry preference storage unavailable');
    if (persistEntryStorage(key)) localStorage.setItem(key, JSON.stringify(value));
    if (key.startsWith('ottlog-mini-tool-v1:') && key.endsWith(':domains')) {
      if (fixture().failDomainWrites) throw new Error('Preview domain storage unavailable');
      localStorage.setItem(key, JSON.stringify(value));
      if (value?.data) fixture().domainLocalState = structuredClone(value.data);
    }
    if (key === 'ottlog.home-shortcuts.v1') {
      if (fixture().failHomeShortcutWrites) throw new Error('Preview storage unavailable');
      localStorage.setItem(key, JSON.stringify(value));
    }
    if (key === 'ottlog.home-feature-order.v1') {
      if (fixture().failHomeFeatureOrderWrites) throw new Error('Preview directory order storage unavailable');
      localStorage.setItem(key, JSON.stringify(value));
    }
    storage.set(key, value);
    if (key.startsWith('ottlog-mini-tool-v1:') && key.endsWith(':pomodoro') && value?.data) fixture().pomodoroLocalState = structuredClone(value.data);
    if (key.startsWith('ottlog-mini-tool-v1:') && key.endsWith(':todos') && value?.data) fixture().todoLocalState = structuredClone(value.data);
    if (key.startsWith('ottlog-mini-tool-v1:') && key.endsWith(':reminders') && value?.data) { localStorage.setItem(key, JSON.stringify(value)); fixture().reminderLocalState = structuredClone(value.data); }
    if (key.startsWith('ottlog-mini-tool-v1:') && key.endsWith(':memos') && value?.data) fixture().memoLocalState = structuredClone(value.data);
    if (key.startsWith('ottlog-mini-tool-v1:') && key.endsWith(':growth') && value?.data) fixture().growthLocalState = structuredClone(value.data);
    if (key.startsWith('ottlog.habit-openings.v1.')) (fixture().habitOpenLogs ||= {})[key] = structuredClone(value);
  }, removeStorageSync: (key: string) => {
    if (fixture().domainPreview) (fixture().storageRemovals ||= []).push(key);
    if (persistEntryStorage(key)) localStorage.removeItem(key);
    if (key.startsWith('ottlog-mini-tool-v1:') && key.endsWith(':domains')) localStorage.removeItem(key);
    storage.delete(key);
  },
  setNavigationBarTitle: () => Promise.resolve(), stopPullDownRefresh: () => Promise.resolve(),
  hideKeyboard: () => Promise.resolve(),
  showToast: ({ title }: { title: string }) => { window.__miniNotices.push(title); return Promise.resolve(); },
  showModal: async (options: { confirmText?: string; cancelText?: string }) => {
    (fixture().modalCalls ||= []).push({ ...options });
    // Enforce the native API contract instead of accepting invalid dialogs.
    if ([options.confirmText, options.cancelText].some(text => text && Array.from(text).length > 4)) throw new Error('showModal: button text exceeds 4 characters');
    if (fixture().modalFailure) throw new Error('showModal: unavailable');
    return { confirm: fixture().modalConfirm !== false, cancel: fixture().modalConfirm === false };
  },
  login: async () => ({ code: 'preview-wechat-code' }),
  requestSubscribeMessage: async ({ tmplIds }: { tmplIds: string[] }) => {
    (fixture().subscriptionCalls ||= []).push([...tmplIds]);
    return Object.fromEntries(tmplIds.map(id => [id, fixture().subscriptionResults?.[id] || fixture().subscriptionResult || 'accept']));
  },
  setClipboardData: async ({ data }: { data: string }) => { window.__miniNotices.push(data); return {}; },
  previewImage: async (options: any) => { fixture().imagePreview = options; return {}; },
  env: { USER_DATA_PATH: '/preview-user-files' },
  chooseMedia: async (options: any) => {
    fixture().mediaOptions = options;
    if (fixture().deferChooseMedia) await new Promise<void>(resolve => { fixture().resolveChooseMedia = resolve; });
    if (fixture().cancelChooseMedia) throw { errMsg: 'chooseMedia:fail cancel' };
    return { tempFiles: [{ tempFilePath: '/preview-photo.png', size: 2000 }] };
  },
  getImageInfo: async () => ({ width: 1200, height: 800, type: 'png' }),
  compressImage: async (options: any) => { (fixture().compressionCalls ||= []).push(options); return { tempFilePath: '/preview-compressed.png' }; },
  getFileSystemManager: () => ({
    readFile: ({ success, fail }: any) => fixture().failImageRead ? fail({ errMsg: 'readFile:fail' }) : success({ data: fixture().memoImageBase64 || 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jU1cAAAAASUVORK5CYII=' }),
    writeFile: ({ filePath, data, success }: any) => { (fixture().previewFiles ||= {})[filePath] = data; success({}); },
  }),
  vibrateShort: async () => ({}), setKeepScreenOn: async () => ({}),
  getSystemInfoSync: () => ({ windowWidth: innerWidth, windowHeight: innerHeight, safeArea: { bottom: innerHeight }, statusBarHeight: 0 }),
  getWindowInfo: () => ({ windowWidth: innerWidth, windowHeight: innerHeight, safeArea: { bottom: innerHeight }, statusBarHeight: 0 }),
  createSelectorQuery: () => {
    const selectors: { value: string; all: boolean; scroll?: boolean; node?: boolean; callback?: (value: any) => void }[] = [];
    const query = {
      selectAll(value: string) { selectors.push({ value, all: true }); return query; },
      select(value: string) { selectors.push({ value, all: false }); return query; },
      boundingClientRect() { return query; },
      scrollOffset() { selectors[selectors.length - 1].scroll = true; return query; },
      node(callback?: (value: any) => void) { Object.assign(selectors[selectors.length - 1], { node: true, callback }); return query; },
      exec(callback?: (values: any[]) => void) {
        const values = selectors.map(selector => {
          if (selector.node) {
            const nodes = [...document.querySelectorAll(selector.value)].map(node => ({ node: scrollContext(node) }));
            return selector.all ? nodes : nodes[0] || null;
          }
          if (selector.scroll) {
            const node = document.querySelector(selector.value);
            return node ? { scrollTop: node.scrollTop, scrollLeft: node.scrollLeft } : null;
          }
          const rects = [...document.querySelectorAll(selector.value)].map(node => ({ id: node.id, ...node.getBoundingClientRect().toJSON() }));
          return selector.all ? rects : rects[0] || null;
        });
        const delay = selectors.some(selector => selector.node) ? fixture().scrollNodeQueryDelay || 0 : 0;
        setTimeout(() => {
          selectors.forEach((selector, index) => selector.callback?.(values[index]));
          callback?.(values);
        }, delay);
      },
    };
    return query;
  },
  getMenuButtonBoundingClientRect: () => ({ top: 0, bottom: 32, left: innerWidth - 90, right: innerWidth - 8, width: 82, height: 32 }),
  pageScrollTo: async ({ selector, scrollTop = 0 }: { selector?: string; scrollTop?: number }) => selector ? document.querySelector(selector)?.scrollIntoView() : window.scrollTo(0, scrollTop),
  eventCenter: {
    on(name: string, cb: (...args: any[]) => void) { if (!events.has(name)) events.set(name, new Set()); events.get(name)!.add(cb); },
    off(name: string, cb?: (...args: any[]) => void) { if (cb) events.get(name)?.delete(cb); else events.delete(name); },
    trigger(name: string, ...args: any[]) { events.get(name)?.forEach(cb => cb(...args)); },
  },
  request: async ({ url, method = 'GET', data }: { url: string; method?: string; data?: any }) => {
    const parsed = new URL(url); const path = parsed.pathname.replace(/^\/api/, '');
    const sessionProfile = fixture().sessionProfile;
    const requestAuthenticated = sessionProfile?.authenticated ?? loggedIn;
    window.__miniRequests.push({ path, method, query: parsed.search, data: data === undefined ? undefined : structuredClone(data) });
    let body: any; let statusCode = 200;
    if (path === '/posts') {
      body = fixture().posts.filter((p: any) => (!parsed.searchParams.get('category') || parsed.searchParams.get('category') === p.category) && (!parsed.searchParams.get('q') || JSON.stringify(p).includes(parsed.searchParams.get('q'))));
    } else if (/^\/posts\/[^/]+\/comments$/.test(path)) {
      if (method === 'GET') body = fixture().comments; else { body = { message: '评论已提交，审核通过后展示' }; statusCode = 202; }
    } else if (path.startsWith('/posts/')) {
      body = fixture().posts.find((p: any) => p.slug === decodeURIComponent(path.slice(7)));
      if (!body) { statusCode = 404; body = { title: '文章不存在' }; }
    } else if (path === '/categories') body = Array.from(new Set(fixture().posts.map((p: any) => p.category)));
    else if (path === '/mottos') body = { mottos: fixture().mottos };
    else if (path.startsWith('/motto-likes')) body = { count: 4, likes: 4 };
    else if (path === '/account/session' || path === '/account/profile') body = sessionProfile ? { ...sessionProfile, csrfToken: 'preview-only' } : { authenticated: loggedIn, userName: loggedIn ? 'preview-reader' : null, isAdmin: loggedIn && fixture().adminProfile === true, csrfToken: 'preview-only' };
    else if (path === '/account/login' || path === '/account/register') { loggedIn = true; body = { authenticated: true, userName: 'preview-reader', isAdmin: fixture().adminProfile === true, csrfToken: 'preview-only' }; }
    else if (path === '/account/logout') { loggedIn = false; body = {}; }
    else if (path === '/wechat/reminders/config') body = fixture().reminderConfig || { enabled: false, reason: '微信提醒尚未配置，请先在服务端设置订阅模板', requiresSubscription: true };
    else if (path === '/wechat/pomodoro/config') body = fixture().pomodoroConfig || { enabled: false, reason: '番茄钟微信通知尚未配置', requiresSubscription: true, templates: [] };
    else if (path === '/wechat/pomodoro') {
      statusCode = loggedIn ? 200 : 401;
      const state = personalStates.get('/personal-tools/pomodoro');
      if (loggedIn && method === 'POST') {
        if (!fixture().pomodoroConfig?.enabled) { statusCode = 503; body = { title: '番茄钟微信通知尚未配置' }; }
        else if (!state?.active || (state.active.rootRunId || state.active.id) !== data.runId) { statusCode = 409; body = { title: '请先同步当前计时' }; }
        else {
          for (const event of data.events) {
            const at = pomodoroEventTime(state, event), key = `${data.runId}:${event}`;
            if (at !== null && !pomodoroReminders.has(key)) pomodoroReminders.set(key, { runId: data.runId, event, remindAt: new Date(at).toISOString(), status: state.active.running ? 'pending' : 'paused', errorCode: null, expectedDeadline: state.active.deadline });
          }
          body = { reminders: [...pomodoroReminders.values()].filter(item => item.runId === data.runId) };
        }
      } else body = { reminders: loggedIn ? [...pomodoroReminders.values()] : [] };
      fixture().pomodoroReminders = structuredClone([...pomodoroReminders.values()]);
    }
    else if (path.startsWith('/wechat/pomodoro/') && method === 'DELETE') {
      statusCode = loggedIn ? 204 : 401;
      const runId = decodeURIComponent(path.slice('/wechat/pomodoro/'.length));
      const expected = parsed.searchParams.get('expectedDeadline');
      if (loggedIn) for (const reminder of pomodoroReminders.values()) {
        if (reminder.runId === runId && ['pending', 'paused'].includes(reminder.status) && (!expected || Number(expected) === reminder.expectedDeadline)) reminder.status = 'cancelled';
      }
      fixture().pomodoroReminders = structuredClone([...pomodoroReminders.values()]);
      body = loggedIn ? undefined : { title: '请登录' };
    }
    else if (path === '/wechat/reminders/bind') { statusCode = loggedIn ? 200 : 401; body = loggedIn ? { bound: true } : { title: '请登录' }; }
    else if (path === '/wechat/reminders') {
      statusCode = loggedIn ? 200 : 401;
      if (loggedIn && method === 'POST') {
        const task = personalStates.get('/personal-tools/todos')?.tasks?.find((task: any) => task.id === data.taskId);
        if (!data.subscriptionGranted || !fixture().reminderConfig?.enabled) { statusCode = 400; body = { title: '未授权订阅提醒' }; }
        else if (!task || task.completedAt || task.reminderAt !== data.remindAt) { statusCode = 409; body = { title: '任务尚未同步' }; }
        else { body = { taskId: data.taskId, remindAt: data.remindAt, status: 'pending', errorCode: null }; scheduledReminders.set(data.taskId, body); }
      } else body = { reminders: loggedIn ? [...scheduledReminders.values()] : [] };
      fixture().scheduledReminders = structuredClone([...scheduledReminders.values()]);
    }
    else if (path.startsWith('/wechat/reminders/') && method === 'DELETE') {
      statusCode = loggedIn ? 204 : 401;
      const taskId = decodeURIComponent(path.slice('/wechat/reminders/'.length));
      const reminder = scheduledReminders.get(taskId), expected = parsed.searchParams.get('expectedRemindAt');
      if (loggedIn && reminder && (!expected || new Date(expected).getTime() === new Date(reminder.remindAt).getTime())) scheduledReminders.delete(taskId);
      fixture().scheduledReminders = structuredClone([...scheduledReminders.values()]); body = loggedIn ? undefined : { title: '请登录' };
    }
    else if (path.startsWith('/personal-tools/')) {
      statusCode = requestAuthenticated ? 200 : 401;
      if (requestAuthenticated && path === '/personal-tools/domains' && fixture().failDomainSync) throw new Error('Preview domain sync unavailable');
      if (sessionProfile) {
        const tool = path.slice('/personal-tools/'.length);
        const account = (fixture().accountToolStates ||= {})[sessionProfile.userName] ||= {};
        if (requestAuthenticated && method === 'PUT') account[tool] = structuredClone(data.data);
        body = requestAuthenticated ? { data: account[tool] ?? null } : { title: '请登录' };
        if (requestAuthenticated && method === 'GET' && fixture().deferToolReads?.includes(tool)) {
          await new Promise(resolve => { (fixture().pendingToolReads ||= []).push({ tool, userName: sessionProfile.userName, resolve }); });
        }
      } else if (loggedIn && method === 'PUT') {
        personalStates.set(path, structuredClone(data.data));
        if (path === '/personal-tools/pomodoro') syncPomodoroFixture(data.data);
      }
      if (!sessionProfile) body = loggedIn ? { data: personalStates.get(path) ?? null } : { title: '请登录' };
    }
    else if (path === '/favorites') { statusCode = loggedIn ? 200 : 401; body = loggedIn ? fixture().posts.filter((p: any) => saved.has(p.slug)) : {}; }
    else if (path.startsWith('/favorites/')) { statusCode = loggedIn ? 200 : 401; const slug = decodeURIComponent(path.slice(11)); if (loggedIn) { if (method === 'DELETE') saved.delete(slug); else saved.add(slug); } body = {}; }
    else throw new Error(`Preview API adapter missing ${method} ${path}`);
    await new Promise(resolve => setTimeout(resolve, 15));
    return { data: body, statusCode, header: {}, cookies: [] };
  },
};
export default Taro;

const basic = (tag: string) => function Element({ children, onTap, onLongPress, hoverClass, hoverStartTime, hoverStayTime, catchMove, ariaLabel, ...props }: any) {
  // Taro switches native templates when catchMove changes. Replacing this root
  // also replaces the pressed child, exposing lost-touch regressions in tests.
  return React.createElement(tag, { ...props, 'aria-label': ariaLabel || props['aria-label'], key: catchMove ? 'catch-view' : 'view', onClick: props.onClick || onTap,
    onContextMenu: onLongPress ? (event: React.MouseEvent) => { event.preventDefault(); onLongPress(event); } : undefined }, children);
};
export const View = basic('div');
export function ScrollView({ children, scrollY, scrollX, scrollIntoView, scrollTop, scrollLeft, onScroll, scrollWithAnimation, enhanced, bounces, showScrollbar, lowerThreshold = 50, onScrollToLower, ...props }: any) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => { if (element.current && scrollTop !== undefined) element.current.scrollTop = scrollTop; }, [scrollTop]);
  useEffect(() => { if (element.current && scrollLeft !== undefined) element.current.scrollLeft = scrollLeft; }, [scrollLeft]);
  useEffect(() => {
    const container = element.current, target = scrollIntoView && document.getElementById(scrollIntoView);
    if (!container || !target || !container.contains(target)) return;
    const viewport = container.getBoundingClientRect(), child = target.getBoundingClientRect();
    // Native ScrollView moves only its own content, not the preview's navigation ancestors.
    if (scrollY) container.scrollTop += child.top - viewport.top;
    if (scrollX) container.scrollLeft += child.left - viewport.left;
  }, [scrollIntoView, scrollY, scrollX]);
  return <div {...props} ref={element} data-enhanced-scroll={enhanced ? 'true' : undefined} data-scroll-enabled={enhanced ? 'true' : undefined} style={{ ...props.style, overflowY: scrollY ? 'auto' : undefined, overflowX: scrollX ? 'auto' : undefined }} onScroll={event => {
    const node = event.currentTarget;
    onScroll?.({ detail: { scrollTop: node.scrollTop, scrollLeft: node.scrollLeft } });
    if (node.scrollHeight - node.scrollTop - node.clientHeight < lowerThreshold) onScrollToLower?.();
  }}>{children}</div>;
}
export const Text = basic('span');
export function Button({ children, loading, disabled, openType, formType, hoverClass, onClick, onLongPress, ariaLabel, ...props }: any) {
  // Context menu is the preview's deterministic stand-in for native long press.
  return <button {...props} aria-label={ariaLabel || props['aria-label']} disabled={disabled} onClick={onClick} onContextMenu={onLongPress ? event => { event.preventDefault(); onLongPress(event); } : undefined} type='button'>{children}</button>;
}
export function Image({ src, mode, lazyLoad, webp, showMenuByLongpress, ...props }: any) {
  return <img {...props} src={src} style={{ objectFit: mode === 'aspectFill' ? 'cover' : 'contain', ...(props.style || {}) }} />;
}
export function Input({ onInput, onConfirm, maxlength, password, type, confirmType, cursorSpacing, adjustPosition, focus, selectionStart, selectionEnd, ariaLabel, ...props }: any) {
  const ref = useRef<HTMLInputElement>(null);
  // Native numeric inputs support selection; HTML number inputs do not.
  const selectableNumber = type === 'number' && (selectionStart !== undefined || selectionEnd !== undefined);
  useEffect(() => {
    if (!focus || !ref.current) return;
    ref.current.focus();
    if (selectionStart >= 0 && selectionEnd >= 0) ref.current.setSelectionRange(selectionStart, selectionEnd);
  }, [focus, selectionStart, selectionEnd]);
  return <input {...props} aria-label={ariaLabel || props['aria-label']} ref={ref} maxLength={maxlength} type={password ? 'password' : selectableNumber ? 'text' : type || 'text'} inputMode={selectableNumber ? 'numeric' : undefined} onChange={event => onInput?.({ detail: { value: event.currentTarget.value } })} onKeyDown={event => { if (event.key === 'Enter') onConfirm?.({ detail: { value: event.currentTarget.value } }); }} />;
}
export function Textarea({ onInput, onConfirm, maxlength, autoHeight, showConfirmBar, fixed, ariaLabel, focus, confirmType, cursorSpacing, disableDefaultPadding, placeholderStyle, ...props }: any) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => { if (focus) ref.current?.focus(); }, [focus]);
  React.useLayoutEffect(() => {
    if (!autoHeight || !ref.current) return;
    const node = ref.current;
    node.style.height = '0px';
    node.style.height = `${Math.max(node.scrollHeight, parseFloat(getComputedStyle(node).minHeight) || 0)}px`;
  }, [autoHeight, props.value]);
  return <textarea {...props} ref={ref} aria-label={ariaLabel || props['aria-label']} maxLength={maxlength} onChange={event => onInput?.({ detail: { value: event.currentTarget.value } })} onKeyDown={event => {
    if (event.key === 'Enter' && !event.shiftKey && confirmType === 'done') {
      event.preventDefault(); onConfirm?.({ detail: { value: event.currentTarget.value } });
    }
  }} />;
}
export function Picker({ range = [], rangeKey, value = 0, onChange, children, mode, start, end, disabled, ...props }: any) {
  // Native Picker owns precisely its child hitbox; global Input sizing must not expand this adapter overlay.
  if (mode === 'date' || mode === 'time') return <div {...props} style={{ position: 'relative' }}>{children}<input aria-label={mode === 'date' ? '选择日期' : '选择时间'} type={mode} disabled={disabled} value={value || ''} min={start} max={end} onChange={event => onChange?.({ detail: { value: event.currentTarget.value } })} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', minHeight: 0, minWidth: 0, padding: 0, border: 0, boxSizing: 'border-box', opacity: 0, margin: 0 }} /></div>;
  return <div {...props} style={{ position: 'relative' }}>{children}<select aria-label='筛选选择' disabled={disabled} value={value} onChange={event => onChange?.({ detail: { value: Number(event.currentTarget.value) } })} style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0 }}>
    {range.map((item: any, i: number) => <option key={i} value={i}>{rangeKey ? item[rangeKey] : item}</option>)}
  </select></div>;
}
export function RichText({ nodes, ...props }: any) { return <div {...props} dangerouslySetInnerHTML={{ __html: typeof nodes === 'string' ? nodes : '' }} />; }
export const Swiper = basic('div');
export const SwiperItem = basic('div');
export const Navigator = ({ url, children, ...props }: any) => <a {...props} href={`#${url}`}>{children}</a>;
export const Form = basic('form');
export const Label = basic('label');
export function Switch({ checked, disabled, onChange, color, ...props }: any) { return <input {...props} role='switch' type='checkbox' checked={checked} disabled={disabled} onChange={event => onChange?.({ detail: { value: event.currentTarget.checked } })} style={{ width: 40, minHeight: 30, accentColor: color }} />; }
