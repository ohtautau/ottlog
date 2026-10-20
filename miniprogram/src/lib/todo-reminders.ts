import Taro from '@tarojs/taro';
import { api } from '../api';
import { syncPersonalTool } from './use-personal-tool-state';

export type ReminderConfig = { enabled: boolean; templateId?: string; reason?: string; requiresSubscription?: boolean };
export type TodoReminder = { taskId: string; remindAt: string; status: 'pending' | 'dispatching' | 'sent' | 'failed' | 'cancelled' | 'unknown'; errorCode: string | null };
// Taro's shared declaration also requires Alipay's entityIds; this client targets WeChat only.
const requestWechatSubscription = Taro.requestSubscribeMessage as unknown as (options: { tmplIds: string[] }) => Promise<Record<string, unknown>>;
const cancellations = new Map<string, Promise<void>>();

export function getReminderConfig(): Promise<ReminderConfig> {
  return api('/wechat/reminders/config');
}

export async function getTodoReminders(owner: string): Promise<{ reminders: TodoReminder[] }> {
  if (!owner || owner === 'guest') return { reminders: [] };
  // Verify the identity around this read, since GET does not include the mutation owner check.
  const session = await api<{ authenticated: boolean; isAdmin?: boolean; userName?: string }>('/account/profile');
  const current = session.authenticated ? `${session.isAdmin ? 'admin' : 'reader'}:${session.userName}` : 'guest';
  if (current !== owner) throw new Error('账号已切换，请重新打开任务');
  const result = await api<{ reminders: TodoReminder[] }>('/wechat/reminders');
  const confirmed = await api<{ authenticated: boolean; isAdmin?: boolean; userName?: string }>('/account/profile');
  const confirmedOwner = confirmed.authenticated ? `${confirmed.isAdmin ? 'admin' : 'reader'}:${confirmed.userName}` : 'guest';
  if (confirmedOwner !== owner) throw new Error('账号已切换，请重新打开任务');
  return result;
}

/** Call directly from a tap, with config fetched before the button is enabled. */
export async function requestTodoReminder(taskId: string, remindAt: string, owner: string, config: ReminderConfig): Promise<TodoReminder> {
  if (!owner || owner === 'guest') throw new Error('请先到「我的」登录，再开启微信提醒');
  if (!config.enabled || !config.templateId) throw new Error(config.reason || '微信提醒尚未配置');
  if (!taskId || !Number.isFinite(Date.parse(remindAt)) || Date.parse(remindAt) <= Date.now()) throw new Error('请选择未来的提醒时间');
  if (Date.parse(remindAt) - Date.now() > 366 * 86400000) throw new Error('微信提醒最多提前 366 天设置');
  // Do not perform network requests before this call: WeChat requires a user gesture.
  let result: Record<string, unknown>;
  try { result = await requestWechatSubscription({ tmplIds: [config.templateId] }); }
  catch { throw new Error('未完成微信订阅授权，任务已保存，可以稍后重试'); }
  if (result[config.templateId] !== 'accept') throw new Error('未同意订阅，任务已保存，但不会发送微信提醒');
  await cancellations.get(`${owner}:${taskId}`);
  await syncPersonalTool('todos', owner);
  const login = await Taro.login();
  if (!login.code) throw new Error('无法获取微信身份，请稍后重试');
  await api('/wechat/reminders/bind', 'POST', { code: login.code }, owner);
  return api('/wechat/reminders', 'POST', { taskId, remindAt, subscriptionGranted: true }, owner);
}

export function cancelTodoReminder(taskId: string, owner: string, expectedRemindAt?: string): Promise<void> {
  if (!owner || owner === 'guest') return Promise.resolve();
  const key = `${owner}:${taskId}`;
  const query = expectedRemindAt ? `?expectedRemindAt=${encodeURIComponent(expectedRemindAt)}` : '';
  const request = api<void>(`/wechat/reminders/${encodeURIComponent(taskId)}${query}`, 'DELETE', undefined, owner);
  // Wait for every outstanding cancellation, including an earlier slower request.
  // A settled failure is reported to the caller, but must not permanently block a
  // later subscription: syncing the task before scheduling also invalidates stale reminders.
  const settled = Promise.all([cancellations.get(key), request.then(() => undefined, () => undefined)]).then(() => undefined);
  cancellations.set(key, settled);
  void settled.then(() => { if (cancellations.get(key) === settled) cancellations.delete(key); });
  return request;
}
