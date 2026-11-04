export type AppConfirmationOptions = {
  title?: string; content?: string; confirmText?: string; cancelText?: string; intent?: 'default' | 'danger';
  confirmColor?: string; showCancel?: boolean;
};
export type AppConfirmationResult = { confirm: boolean; cancel: boolean };
export type AppMessageOptions = { title: string; icon?: string; duration?: number; mask?: boolean; kind?: 'info' | 'error' };
type Confirmation = { id: number; options: AppConfirmationOptions; resolve: (result: AppConfirmationResult) => void };
type Message = { id: number; options: AppMessageOptions };
export type AppDialogSnapshot = { confirmation: Confirmation | null; message: Message | null };
type Host = { id: number; path: string; visible: boolean; generation: number; notices: Map<symbol, string>; update: (snapshot: AppDialogSnapshot) => void; confirmations: Confirmation[]; message: Message | null; timer?: ReturnType<typeof setTimeout> };
const listeners = new Set<() => void>();
export const subscribeAppMessages = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const currentAppMessage = () => activeHost()?.message || null;
const publish = (host: Host) => { host.update(snapshot(host)); listeners.forEach(listener => listener()); };
const hosts = new Map<number, Host>();
let sequence = 0;
let currentPath = '';
const snapshot = (host: Host): AppDialogSnapshot => ({ confirmation: host.confirmations[0] || null, message: host.message });
const activeHost = () => [...hosts.values()].reverse().find(host => host.visible && host.path === currentPath) || [...hosts.values()].reverse().find(host => host.visible);
function clear(host: Host) {
  if (host.timer) clearTimeout(host.timer);
  for (const request of host.confirmations.splice(0)) request.resolve({ confirm: false, cancel: true });
  host.message = null; host.notices.clear(); publish(host);
}

/** Each visible page owns its layer; hidden pages never receive later prompts. */
export function registerAppDialogHost(path: string, update: Host['update']) {
  const id = ++sequence;
  const host: Host = { id, path, visible: true, generation: 0, notices: new Map(), update, confirmations: [], message: null };
  hosts.set(id, host); currentPath = path;
  return {
    activate() { host.visible = true; currentPath = path; publish(host); },
    hide() { host.generation++; host.visible = false; clear(host); },
    dispose() { host.generation++; host.visible = false; clear(host); hosts.delete(id); },
    answer(requestId: number, confirm: boolean) {
      const request = host.confirmations[0];
      if (!request || request.id !== requestId || !host.visible) return;
      host.confirmations.shift(); request.resolve({ confirm, cancel: !confirm }); update(snapshot(host));
    },
  };
}

/** App-owned confirmations replace platform modal windows. */
export function requestAppConfirmation(options: AppConfirmationOptions): Promise<AppConfirmationResult> {
  const host = activeHost();
  if (!host) return Promise.resolve({ confirm: false, cancel: true });
  return new Promise(resolve => { host.confirmations.push({ id: ++sequence, options, resolve }); publish(host); });
}

/** Brief feedback stays inside the current page and uses no platform toast. */
export function showAppMessage(options: AppMessageOptions): Promise<void> {
  const host = activeHost();
  if (!host) return Promise.resolve();
  if (host.timer) clearTimeout(host.timer);
  host.message = { id: ++sequence, options }; publish(host);
  host.timer = setTimeout(() => { host.message = null; publish(host); }, options.duration ?? 5000);
  return Promise.resolve();
}

/** Session changes clear feedback only; real confirmation/save flows stay intact. */
export function clearAppMessages() { messageEpoch++; for (const host of hosts.values()) { if (host.timer) clearTimeout(host.timer); host.message = null; host.notices.clear(); publish(host); } }

let messageEpoch = 0;
export const appMessageEpoch = () => messageEpoch;
export function captureAppMessageScope() {
  const host = activeHost(), epoch = messageEpoch, generation = host?.generation;
  return (options: AppMessageOptions, source?: symbol) => {
    if (!host || activeHost() !== host || !host.visible || host.generation !== generation || epoch !== messageEpoch) return;
    if (source) {
      const duplicate = [...host.notices.entries()].some(([key, title]) => key !== source && title === options.title);
      host.notices.set(source, options.title);
      if (duplicate) return;
    } else if (host.message?.options.title === options.title) return;
    void showAppMessage(options);
  };
}
const operations = new Map<number, number>();
export const hasAppOperation = () => !!operations.get(activeHost()?.id || 0);
export function retainAppOperation() {
  const id = activeHost()?.id;
  if (!id) return () => {};
  operations.set(id, (operations.get(id) || 0) + 1);
  listeners.forEach(listener => listener());
  return () => { operations.set(id, Math.max(0, (operations.get(id) || 0) - 1)); listeners.forEach(listener => listener()); };
}

export function releaseAppNoticeSource(source: symbol) { for (const host of hosts.values()) host.notices.delete(source); }
