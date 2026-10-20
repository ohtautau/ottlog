const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jU1cAAAAASUVORK5CYII=';
const longTask = `今日完成的长任务标题${'与标题截断检查'.repeat(16)}`;
const longGoal = `昨天完成的长短期目标${'与目标截断检查'.repeat(16)}`;
function times(now) {
  const at = (day, hour, minute = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, hour, minute).toISOString();
  return { old: at(-6, 8), yesterday: at(-1, 11), today: at(0, 8), latest: at(0, 11), future: at(3, 8) };
}
function todoSeed(now) {
  const t = times(now);
  const task = (id, title, completedAt, overrides = {}) => ({ id, title, completedAt, description: '', categoryId: '', important: true, urgent: true, dueDate: '', createdAt: t.old, updatedAt: t.old, tags: ['摘要测试'], ...overrides });
  return { version: 1, categories: [], tasks: [
    task('old', '昨日已完成任务', t.yesterday), task('today-a', '今天完成的第一件任务', t.today), task('today-z', longTask, t.latest),
    task('future', '未来完成任务不能进入摘要', t.future), task('invalid', '无效完成时间不能进入摘要', 'invalid'),
    task('open', '稍后真实完成的任务', null),
  ] };
}
function domainSeed(now) {
  const t = times(now);
  const record = (id, content, createdAt, images) => ({ id, content, createdAt, ...(images ? { images } : {}) });
  const domain = (id, name) => ({ id, name, iconId: id === 'work' ? 'work' : 'home', longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [] });
  const work = domain('work', '工作'), life = domain('life', '生活'), extra = domain('extra', '额外领域');
  work.positiveRecords = [record('today-positive', '今日正记录', t.today), record('yesterday-positive', '昨日正记录', t.yesterday), record('future-positive', '未来正记录', t.future)];
  work.negativeRecords = [record('image-only', '', t.today, [{ id: 'photo', dataUrl: png }])];
  life.positiveRecords = [record('other-positive', '其他领域今日正记录', t.today)];
  const goal = (id, domainId, kind, content, completedAt) => ({ id, domainId, kind, content, status: 'completed', createdAt: t.old, completedAt });
  return { version: 1, domains: [work, life, extra], completedGoals: [
    goal('life-short', 'life', 'shortTerm', '生活的历史短期目标', new Date(new Date(t.yesterday).getTime() - 3600000).toISOString()),
    goal('extra-short', 'extra', 'shortTerm', '额外领域的历史短期目标', new Date(new Date(t.yesterday).getTime() - 7200000).toISOString()),
    goal('work-short', 'work', 'shortTerm', longGoal, t.yesterday),
    goal('work-long', 'work', 'longTerm', '今天长期目标不能替代短期目标', t.latest),
    goal('future-short', 'life', 'shortTerm', '未来短期目标不能进入摘要', t.future),
  ] };
}
const reminderSeed = now => {
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return { version: 1, items: [{ id: 'habit-done', title: '已完成的摘要习惯', group: '工作', kind: 'plant', minutes: 0, note: '', enabled: true, createdAt: 1 }, { id: 'habit-open', title: '待完成的摘要习惯', group: '工作', kind: 'plant', minutes: 0, note: '', enabled: true, createdAt: 2 }], done: { [key]: ['habit-done'] }, checkInTimes: { [key]: { 'habit-done': new Date(times(now).today).getTime() } } };
};
module.exports = { png, longTask, longGoal, times, todoSeed, domainSeed, reminderSeed };
