import Taro from '@tarojs/taro';
import { api, type Session } from '../api';
import { syncPersonalTool } from './use-personal-tool-state';
import type { ActiveTimer, TimerSettings } from './pomodoro-data';

export type PomodoroEvent = 'focus_start' | 'break_start' | 'break_end';
export type PomodoroReminderConfig = {
  enabled: boolean; reason?: string; requiresSubscription: boolean;
  templates: Array<{ event: PomodoroEvent; templateId: string }>;
};
export type PomodoroReminder = {
  runId: string; event: PomodoroEvent; remindAt: string;
  status: 'pending' | 'paused' | 'dispatching' | 'sent' | 'failed' | 'cancelled' | 'unknown';
  errorCode: string | null;
};
export type PomodoroReminderResult = { reminders: PomodoroReminder[]; acceptedEvents: PomodoroEvent[] };
const eventNames: PomodoroEvent[] = ['focus_start', 'break_start', 'break_end'];
export function eligiblePomodoroReminderTemplates(timer: ActiveTimer | null, settings: TimerSettings, templates = eventNames.map(event => ({ event, templateId: '' })), now = Date.now()) {
  if (!timer) return [];
  const startWindowOpen = now < Math.min(Date.parse(timer.startedAt) + 120000, timer.deadline ?? Infinity);
  return templates.filter(template => template.event === 'focus_start' ? timer.mode === 'focus' && startWindowOpen : timer.mode === 'focus' ? settings.transitionMode !== 'manual' : template.event === 'break_end' || startWindowOpen);
}
export function pomodoroReminderMessage(result: PomodoroReminderResult) {
  if (!result.reminders.length) return '本轮没有可发送的微信提醒，计时照常继续。';
  return result.reminders.some(item => ['failed', 'unknown', 'cancelled'].includes(item.status)) ? '部分微信提醒未安排成功，请查看各项状态。' : '微信授权已处理，请查看本轮各项提醒状态。';
}
const subscribe = Taro.requestSubscribeMessage as unknown as (options: { tmplIds: string[] }) => Promise<Record<string, unknown>>;
const cancellations = new Map<string, Promise<void>>();
const launches = new Map<string, { owner: string; at: number; consent: Promise<{ events: PomodoroEvent[]; error?: string }> }>();
let launchNumber = 0;

export function getPomodoroReminderConfig(): Promise<PomodoroReminderConfig> { return api('/wechat/pomodoro/config'); }

async function confirmOwner(owner: string) {
  const session = await api<Session>('/account/profile');
  const actual = session.authenticated ? `${session.isAdmin ? 'admin' : 'reader'}:${session.userName}` : 'guest';
  if (actual !== owner) throw new Error('账号已切换，请重新打开番茄钟');
}

export async function getPomodoroReminders(owner: string): Promise<{ reminders: PomodoroReminder[] }> {
  if (!owner || owner === 'guest') return { reminders: [] };
  await confirmOwner(owner);
  const result = await api<{ reminders: PomodoroReminder[] }>('/wechat/pomodoro');
  await confirmOwner(owner);
  return result;
}

async function requestConsent(owner: string, config: PomodoroReminderConfig): Promise<PomodoroEvent[]> {
  if (!owner || owner === 'guest') throw new Error('请先到「我的」登录，再开启微信通知');
  if (!config.enabled) throw new Error(config.reason || '番茄钟微信通知尚未配置');
  const templates = config.templates || [];
  if (!templates.length || templates.length > 3 || new Set(templates.map(item => item.templateId)).size !== templates.length
    || new Set(templates.map(item => item.event)).size !== templates.length
    || templates.some(item => !eventNames.includes(item.event) || !item.templateId)) {
    throw new Error('番茄钟需要分别配置三种通知模板');
  }
  // Must run within the original tap, before login, navigation or any network await.
  let result: Record<string, unknown>;
  try { result = await subscribe({ tmplIds: templates.map(item => item.templateId) }); }
  catch { throw new Error('未完成微信订阅授权，番茄钟会继续计时'); }
  const accepted = templates.filter(item => result[item.templateId] === 'accept').map(item => item.event);
  if (!accepted.length) throw new Error('未同意订阅，番茄钟会继续计时，但不会发送微信通知');
  return accepted;
}

async function schedule(runId: string, owner: string, events: PomodoroEvent[]): Promise<PomodoroReminderResult> {
  if (!/^[A-Za-z0-9_:-]{1,100}$/.test(runId)) throw new Error('请先开始一轮番茄钟');
  await cancellations.get(`${owner}:${runId}`);
  await syncPersonalTool('pomodoro', owner);
  const login = await Taro.login();
  if (!login.code) throw new Error('无法获取微信身份，请稍后重试');
  await api('/wechat/reminders/bind', 'POST', { code: login.code }, owner);
  const result = await api<{ reminders: PomodoroReminder[] }>('/wechat/pomodoro', 'POST', { runId, events }, owner);
  return { ...result, acceptedEvents: events };
}

/** Called directly from the reminder button's tap, with preloaded configuration. */
export async function requestPomodoroReminders(runId: string, owner: string, config: PomodoroReminderConfig): Promise<PomodoroReminderResult> {
  if (!/^[A-Za-z0-9_:-]{1,100}$/.test(runId)) throw new Error('请先开始一轮番茄钟');
  const accepted = await requestConsent(owner, config);
  return schedule(runId, owner, accepted);
}

/** Capture consent in the home-page gesture; only ephemeral results cross navigation. */
export function preparePomodoroLaunch(owner: string, config: PomodoroReminderConfig | null): string {
  const now = Date.now();
  for (const [token, launch] of launches) if (now - launch.at > 300_000) launches.delete(token);
  const token = `start-${now.toString(36)}-${++launchNumber}`;
  if (owner && owner !== 'guest' && config?.enabled) {
    const consent = requestConsent(owner, config).then(events => ({ events }), error => ({ events: [] as PomodoroEvent[], error: error instanceof Error ? error.message : '微信订阅未完成' }));
    launches.set(token, { owner, at: now, consent });
  }
  return token;
}

export async function consumePomodoroLaunch(token: string, runId: string, owner: string, allowedEvents?: PomodoroEvent[]): Promise<PomodoroReminderResult | null> {
  const launch = launches.get(token);
  launches.delete(token);
  if (!launch) return null;
  if (launch.owner !== owner || Date.now() - launch.at > 300_000) throw new Error('本次订阅已失效，请在番茄钟页面重新开启通知');
  const result = await launch.consent;
  if (result.error) throw new Error(result.error);
  const events = allowedEvents ? result.events.filter(event => allowedEvents.includes(event)) : result.events;
  return events.length ? schedule(runId, owner, events) : { reminders: [], acceptedEvents: [] };
}

export function cancelPomodoroReminders(runId: string, owner: string, expectedDeadline?: number): Promise<void> {
  if (!owner || owner === 'guest') return Promise.resolve();
  const key = `${owner}:${runId}`;
  const query = Number.isFinite(expectedDeadline) ? `?expectedDeadline=${expectedDeadline}` : '';
  const request = api<void>(`/wechat/pomodoro/${encodeURIComponent(runId)}${query}`, 'DELETE', undefined, owner);
  const settled = Promise.all([cancellations.get(key), request.then(() => undefined, () => undefined)]).then(() => undefined);
  cancellations.set(key, settled);
  void settled.then(() => { if (cancellations.get(key) === settled) cancellations.delete(key); });
  return request;
}
