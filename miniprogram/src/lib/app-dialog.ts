export type AppConfirmationOptions = {
  title?: string; content?: string; confirmText?: string; cancelText?: string; intent?: 'default' | 'danger';
  confirmColor?: string; showCancel?: boolean;
};
export type AppConfirmationResult = { confirm: boolean; cancel: boolean };
export type AppMessageOptions = { title: string; icon?: string; duration?: number; mask?: boolean };
type Confirmation = { id: number; options: AppConfirmationOptions; resolve: (result: AppConfirmationResult) => void };
type Message = { id: number; options: AppMessageOptions };
export type AppDialogSnapshot = { confirmation: Confirmation | null; message: Message | null };
type Host = { id: number; path: string; visible: boolean; update: (snapshot: AppDialogSnapshot) => void; confirmations: Confirmation[]; message: Message | null; timer?: ReturnType<typeof setTimeout> };
const hosts = new Map<number, Host>();
let sequence = 0;
let currentPath = '';
const snapshot = (host: Host): AppDialogSnapshot => ({ confirmation: host.confirmations[0] || null, message: host.message });
const activeHost = () => [...hosts.values()].reverse().find(host => host.visible && host.path === currentPath) || [...hosts.values()].reverse().find(host => host.visible);
function clear(host: Host) {
  if (host.timer) clearTimeout(host.timer);
  for (const request of host.confirmations.splice(0)) request.resolve({ confirm: false, cancel: true });
  host.message = null; host.update(snapshot(host));
}

/** Each visible page owns its layer; hidden pages never receive later prompts. */
export function registerAppDialogHost(path: string, update: Host['update']) {
  const id = ++sequence;
  const host: Host = { id, path, visible: true, update, confirmations: [], message: null };
  hosts.set(id, host); currentPath = path;
  return {
    activate() { host.visible = true; currentPath = path; update(snapshot(host)); },
    hide() { host.visible = false; clear(host); },
    dispose() { clear(host); hosts.delete(id); },
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
  return new Promise(resolve => { host.confirmations.push({ id: ++sequence, options, resolve }); host.update(snapshot(host)); });
}

/** Brief feedback stays inside the current page and uses no platform toast. */
export function showAppMessage(options: AppMessageOptions): Promise<void> {
  const host = activeHost();
  if (!host) return Promise.resolve();
  if (host.timer) clearTimeout(host.timer);
  host.message = { id: ++sequence, options }; host.update(snapshot(host));
  host.timer = setTimeout(() => { host.message = null; host.update(snapshot(host)); }, options.duration ?? 2400);
  return Promise.resolve();
}
