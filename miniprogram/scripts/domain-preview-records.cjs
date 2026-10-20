'use strict';

// Fictional display samples only. This factory never reads or writes storage.
// Stable domain IDs and icons match src/lib/domain-data.ts; habits stay shared
// through reminders and are deliberately not duplicated into these domains.
const DAY = 24 * 60 * 60 * 1000;
const SAMPLE_DOMAINS = [
  {
    id: 'growth', name: '成长', iconId: 'plant',
    longTerm: '整理一套自己的学习方法', shortTerm: '完成本周阅读与复盘', completed: '整理第一份阅读笔记',
    longDone: ['完成基础阅读计划', '建立知识笔记目录', '形成每月复盘安排'],
    shortDone: ['读完一本短篇作品', '整理常用学习工具', '写下一次学习复盘', '完成一周阅读练习', '梳理下阶段学习主题'],
    positive: ['读完一章，记下三个有启发的想法。', '把零散笔记整理成了清晰的提纲。', '尝试用自己的话解释新概念。', '给下周留出了固定的阅读时间。', '完成本周复盘，选好下一步的小目标。'],
    negative: ['阅读计划安排得太满，准备减少一点。', '笔记只摘抄没有整理，下次补上自己的理解。', '复盘拖到了晚上，准备提前留出时间。'],
  },
  {
    id: 'work', name: '工作', iconId: 'work',
    longTerm: '形成清晰稳定的项目推进节奏', shortTerm: '完成本周项目提纲', completed: '整理项目资料目录',
    longDone: ['完成一个项目交付', '建立项目资料归档流程'],
    shortDone: ['完成一版需求清单', '整理讨论结论', '完成本周方案检查'],
    positive: ['整理了项目资料，找到了下一步的重点。', '把一个大任务拆成了三个小步骤。', '提前准备了讨论需要的提纲。', '完成第一版方案，并记录待确认的问题。', '更新本周计划，留出检查与修改的时间。'],
    negative: ['任务切换太频繁，准备集中处理相似事项。', '方案缺少一个例子，下次补充。', '给修改预留的时间不够，调整了后续安排。'],
  },
  {
    id: 'english', name: '英语', iconId: 'language',
    longTerm: '能够自然表达日常想法', shortTerm: '完成本周听读练习', completed: '整理常用表达清单',
    longDone: ['完成第一阶段听读练习'], shortDone: ['读完一篇英文短文', '完成一组日常对话练习'],
    positive: ['听完一段短音频，记下熟悉的表达。', '用新学的词写了三句简单的话。', '朗读一篇短文，标出不熟悉的部分。', '复习旧词，并补上自己的例句。', '完成一次短对话练习，记录想继续练习的句子。'],
    negative: ['只看单词没有放进句子，下次加上例句。', '材料难度偏高，换成更短的内容。', '练习间隔有些长，准备安排更短的每日练习。'],
  },
  {
    id: 'fitness', name: '健身', iconId: 'exercise',
    longTerm: '建立适合自己的运动安排', shortTerm: '整理一周运动计划', completed: '准备好运动记录模板',
    longDone: ['完成一个运动记录周期', '建立力量与有氧分开的计划'], shortDone: ['完成本周运动复盘'],
    positive: ['整理了运动记录，安排好本周计划。', '按计划完成一次轻松散步。', '检查了运动用品，收好需要的物品。', '为力量训练和有氧运动分别留出时间。', '复盘本周安排，保留适合自己的节奏。'],
    negative: ['计划排得太密，准备留出休息时间。', '运动用品没有提前准备，下次先检查。', '记录遗漏了两次，下次结束后及时补上。'],
  },
  {
    id: 'life', name: '生活', iconId: 'home',
    longTerm: '让日常空间保持舒适有序', shortTerm: '完成一次小范围整理', completed: '整理桌面收纳区域',
    longDone: [], shortDone: ['整理衣柜的一层', '更新常用物品清单', '完成一次厨房整理', '安排一周采购计划'],
    positive: ['清理了一层抽屉，只留下常用物品。', '写好采购清单，减少临时决定。', '为常用物品安排了固定位置。', '提前准备第二天需要的东西。', '整理桌面，留下了一块清爽的工作空间。'],
    negative: ['整理范围定得太大，改为一次处理一个角落。', '买了重复的物品，下次先核对清单。', '收纳位置不方便，准备换到更顺手的地方。'],
  },
  {
    id: 'mind', name: '心理', iconId: 'breathe',
    longTerm: '给自己留出安静记录的时间', shortTerm: '写下本周的日常感受', completed: '准备好日常记录页面',
    longDone: ['完成一个月的感受记录'], shortDone: [],
    positive: ['留出几分钟，写下当天注意到的小事。', '把脑中的想法写下来，暂时不急着判断。', '给繁忙的一天安排了一小段安静时间。', '记录了一个值得感谢的日常瞬间。', '回看本周记录，选出想继续保留的安排。'],
    negative: ['日程排满，没有留下记录时间，准备调整。', '记录写得太复杂，改为从一句话开始。', '忘了回看旧记录，下次安排一个固定时段。'],
  },
  {
    id: 'photo', name: '摄影', iconId: 'camera',
    longTerm: '完成一组有主题的日常照片', shortTerm: '选出本周满意的三张照片', completed: '整理第一组练习照片',
    longDone: [], shortDone: [],
    positive: ['观察窗边的光线，拍了几张练习照片。', '为同一场景尝试了不同角度。', '整理照片，挑出构图清晰的一张。', '给本周练习选好了一个简单主题。', '完成照片筛选，写下下次想尝试的角度。'],
    negative: ['拍摄前没有明确主题，下次先选一个重点。', '照片数量太多，准备及时筛选。', '整理时忘记标注练习想法，下次补上。'],
  },
  {
    id: 'media', name: '自媒体', iconId: 'film',
    longTerm: '形成稳定清晰的内容创作流程', shortTerm: '完成一篇短内容草稿', completed: '整理第一份选题清单',
    longDone: ['完成第一组系列内容', '建立草稿到发布的检查流程'], shortDone: ['完成一篇短文修改', '整理一组配图素材'],
    positive: ['整理了几个选题，选出最想先写的一个。', '写完开头，明确内容想回答的问题。', '把草稿分成三个清楚的小段落。', '删掉重复的表达，补上一个具体例子。', '完成草稿检查，记录后续修改方向。'],
    negative: ['选题范围太大，准备聚焦一个问题。', '草稿开头太长，下次先说明重点。', '修改时反复切换方向，准备先列好检查清单。'],
  },
];

// Extra history uses new IDs; an existing preview keeps its original samples.
for (const domain of SAMPLE_DOMAINS) {
  domain.positive.push(`完成一次${domain.name}的小练习，留下了下一步的线索。`, `回看${domain.name}的旧记录，确认了想继续保留的安排。`);
  domain.negative.push(`${domain.name}计划有一项没有完成，准备拆成更小的步骤。`);
}
const SAMPLE_HABITS = [
  ['growth', '每日阅读', 'explore'], ['work', '整理今日计划', 'focus'], ['english', '口语练习', 'language'],
  ['fitness', '力量练习', 'exercise'], ['fitness', '轻松有氧', 'walk'], ['life', '整理房间', 'tidy'],
  ['mind', '晚间感受', 'write'], ['photo', '摄影练习', 'camera'], ['media', '写作练习', 'film'],
];

function createDomainPreviewRecords(now = Date.now()) {
  if (typeof now !== 'number' || !Number.isFinite(now)) throw new TypeError('Preview clock must be a finite millisecond timestamp');
  const iso = daysAgo => new Date(now - daysAgo * DAY).toISOString();
  const goal = (domain, kind, text, daysAgo) => ({
    id: `preview-${domain.id}-${kind}`, content: text, status: 'active', createdAt: iso(daysAgo),
  });
  const records = (domain, kind, texts, offsets) => texts.map((text, index) => ({
    id: `preview-${domain.id}-${kind}-${index + 1}`,
    content: text, createdAt: iso(offsets[index]),
  }));
  return {
    version: 1,
    domains: SAMPLE_DOMAINS.map(domain => ({
      id: domain.id, name: domain.name, iconId: domain.iconId,
      longTermGoal: goal(domain, 'long-term', domain.longTerm, 30),
      shortTermGoal: goal(domain, 'short-term', domain.shortTerm, 7),
      habits: [],
      // Store oldest first, matching normal appended records. The UI sorts a copy.
      positiveRecords: records(domain, 'positive', domain.positive, [8.5, 6.25, 4.5, 2.25, 0.05, 0.025, 0.005]),
      negativeRecords: records(domain, 'negative', domain.negative, [7.5, 3.5, 1.25, 0.5]),
    })),
    completedGoals: SAMPLE_DOMAINS.flatMap(domain => [{
      id: `preview-${domain.id}-completed`, domainId: domain.id, kind: 'shortTerm',
      content: domain.completed, status: 'completed', createdAt: iso(14), completedAt: iso(9),
    }, ...['longTerm', 'shortTerm'].flatMap(kind => domain[kind === 'longTerm' ? 'longDone' : 'shortDone'].map((content, index) => ({
      id: `preview-v2-${domain.id}-${kind}-${index + 1}`, domainId: domain.id, kind, content, status: 'completed',
      createdAt: iso(90 - index * 5), completedAt: iso((kind === 'longTerm' ? 8 : 5) - index * 0.5),
    })))]),
  };
}

function createReminderPreviewRecords(initial, now = Date.now()) {
  const state = JSON.parse(JSON.stringify(initial));
  const items = SAMPLE_HABITS.map(([domainId, title, kind], index) => ({
    id: `preview-v2-habit-${domainId}-${index + 1}`, title, domainId,
    group: SAMPLE_DOMAINS.find(domain => domain.id === domainId).name, kind,
    note: `给${title}留一点时间，完成后记录今天的进展。`, minutes: 0, enabled: true,
    priority: ['high', 'medium', 'low', 'none'][index % 4], createdAt: now - (30 + index) * DAY,
  }));
  const done = {}, checkInTimes = {};
  for (let ago = 14; ago >= 0; ago--) {
    const date = new Date(now); date.setDate(date.getDate() - ago);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const selected = items.filter((item, index) => ago === 0 ? item.domainId !== 'photo' : (ago + index) % (index % 3 + 2) !== 0);
    done[key] = selected.map(item => item.id);
    checkInTimes[key] = Object.fromEntries(selected.map((item, index) => {
      const time = new Date(date); time.setHours(8 + index % 5, 15, 0, 0);
      return [item.id, Math.min(now, time.getTime())];
    }));
  }
  return { ...state, items: [...state.items, ...items], done: { ...state.done, ...done }, checkInTimes: { ...state.checkInTimes, ...checkInTimes } };
}

function createHabitCommentPreviewRecords(initial, now = Date.now()) {
  if (typeof now !== 'number' || !Number.isFinite(now)) throw new TypeError('Preview clock must be a finite millisecond timestamp');
  const state = JSON.parse(JSON.stringify(initial)), today = new Date(now);
  const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1, 7);
  const habit = {
    id: 'preview-v3-habit-morning-writing', title: '晨间书写', domainId: 'mind', group: '心理', kind: 'write',
    note: '写下清晨注意到的小事，给今天留一个平静的开始。', minutes: 0, enabled: true,
    priority: 'none', createdAt: previousMonth.getTime(),
  };
  const sentences = [
    '窗边的光线很柔和，写下今天最想完成的一件事。', '先把零散想法写下来，再慢慢整理顺序。',
    '没有急着打开消息，给自己留了几分钟安静时间。', '记下一个想继续学习的问题。',
    '把今天的计划减为三个小步骤，开始起来轻松了一些。', '回看昨天的文字，发现有一件小事值得继续。',
    '写了一段感谢的话，记住那个普通的温暖瞬间。', '想到一个新的办法，先留在纸上。',
    '今天写得不多，但已经找到了想做的第一步。', '听到窗外的声音，提醒自己放慢一点。',
    '整理了一个困扰自己的想法，暂时不需要立即得出答案。', '给接下来的阅读留下一个问题。',
    '把昨天没完成的事拆小，今天先试其中一段。', '写下想联系的人，准备找个时间问候。',
    '记录了一次小小的进步，之后也想这样耐心开始。', '试着用更简单的话说明今天的重点。',
    '提醒自己在忙碌中安排休息。', '写下了一个可以马上尝试的改进。',
    '把想法按顺序排列，今天的安排清楚了一点。', '留下一句鼓励自己的话。',
    '回顾这段时间的记录，选出想继续保留的习惯。',
  ];
  const done = { ...state.done }, checkInTimes = { ...state.checkInTimes }, reflections = [...(state.reflections || [])];
  const add = (date, text) => {
    const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    done[day] = [...new Set([...(done[day] || []), habit.id])];
    checkInTimes[day] = { ...checkInTimes[day], [habit.id]: date.getTime() };
    if (text) reflections.push({ id: `preview-v3-writing-${day}`, habitId: habit.id, day, text, createdAt: date.getTime() });
  };
  for (let day = 1; day <= 26; day++) {
    let text = sentences[day - 1];
    if (day === 25) text = '清晨回看这个月的书写，发现一些普通的小事也值得留下。把没有完成的计划拆成更小的步骤，给安静思考和休息留出时间。今天不急着把所有问题解决，只选择一个可以开始的动作，完成之后再慢慢记录新的感受。';
    if (day === 26) text = '今天先写下一个小目标。\n留一点时间给阅读。\n晚上再回来看看完成了什么。';
    add(new Date(today.getFullYear(), today.getMonth() - 1, day, 7, 20), text);
  }
  // Only completed local days: early-month previews never fabricate future check-ins.
  for (let day = 1; day <= Math.min(today.getDate() - 1, 7); day++) {
    add(new Date(today.getFullYear(), today.getMonth(), day, 7, 20), [3, 6, 7].includes(day) ? undefined : sentences[day - 1]);
  }
  return { ...state, items: [...state.items, habit], done, checkInTimes, reflections };
}

function extendDomainPreview(existing, samples) {
  const goalIds = new Set([...existing.completedGoals, ...existing.domains.flatMap(domain => [domain.longTermGoal, domain.shortTermGoal].filter(Boolean))].map(goal => goal.id));
  const recordIds = new Set(existing.domains.flatMap(domain => [...domain.positiveRecords, ...domain.negativeRecords]).map(record => record.id));
  const domainIds = new Set(existing.domains.map(domain => domain.id));
  return { ...existing,
    domains: existing.domains.map(domain => {
      const sample = samples.domains.find(item => item.id === domain.id);
      if (!sample) return domain;
      const extra = kind => sample[kind].filter(record => !recordIds.has(record.id) && Number(record.id.split('-').pop()) > (kind === 'positiveRecords' ? 5 : 3));
      return { ...domain, positiveRecords: [...domain.positiveRecords, ...extra('positiveRecords')], negativeRecords: [...domain.negativeRecords, ...extra('negativeRecords')] };
    }),
    completedGoals: [...existing.completedGoals, ...samples.completedGoals.filter(goal => goal.id.startsWith('preview-v2-') && domainIds.has(goal.domainId) && !goalIds.has(goal.id))],
  };
}

function extendNegativeRecordPreview(existing, now = Date.now()) {
  if (typeof now !== 'number' || !Number.isFinite(now)) throw new TypeError('Preview clock must be a finite millisecond timestamp');
  const entries = [
    ['growth', '阅读计划排得太满，今天没能完成。下次减少一点。'],
    ['work', '切换任务太频繁，项目提纲还差一段。明天先补上。'],
    ['life', '整理房间拖到了太晚，今天只完成了一小部分。'],
    ['media', '草稿还没有检查完，先记下需要修改的地方。'],
  ];
  const occupied = new Set(existing.domains.flatMap(domain => [...domain.positiveRecords, ...domain.negativeRecords].map(record => record.id)));
  return { ...existing, domains: existing.domains.map(domain => {
    const index = entries.findIndex(([domainId]) => domainId === domain.id);
    const id = `preview-v4-${domain.id}-negative`;
    if (index < 0 || occupied.has(id)) return domain;
    return { ...domain, negativeRecords: [...domain.negativeRecords, {
      id, content: entries[index][1], createdAt: new Date(now - (index + 1) * 30_000).toISOString(),
    }] };
  }) };
}

function extendEntertainmentDomainPreview(existing) {
  if (existing.domains.some(domain => domain.id === 'entertainment' || domain.name.trim() === '娱乐')) return existing;
  return { ...existing, domains: [...existing.domains, {
    id: 'entertainment', name: '娱乐', iconId: 'game',
    longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [],
  }] };
}

function appendPreviewHabits(existing, samples, domains, doneForDay, prefix) {
  const occupied = new Set([
    ...existing.items.map(item => item.id), ...Object.values(existing.done).flat(),
    ...Object.keys(existing.completionHistory || {}), ...(existing.reflections || []).map(item => item.habitId),
    ...Object.values(existing.checkInTimes || {}).flatMap(times => Object.keys(times)),
  ]);
  const domainIds = new Set(domains.domains.map(domain => domain.id));
  const added = samples.items.filter(item => item.id.startsWith(prefix) && !occupied.has(item.id) && domainIds.has(item.domainId));
  const ids = new Set(added.map(item => item.id)), done = { ...existing.done }, checkInTimes = { ...existing.checkInTimes };
  for (const [day, candidates] of Object.entries(samples.done)) {
    const extra = candidates.filter(id => ids.has(id));
    if (!extra.length) continue;
    done[day] = [...new Set([...doneForDay(day), ...extra])];
    checkInTimes[day] = { ...checkInTimes[day], ...Object.fromEntries(extra.map(id => [id, samples.checkInTimes[day][id]])) };
  }
  const reflectionIds = new Set((existing.reflections || []).map(item => item.id));
  const reflections = (samples.reflections || []).filter(item => ids.has(item.habitId) && !reflectionIds.has(item.id));
  return { ...existing, items: [...existing.items, ...added], done, checkInTimes,
    ...(reflections.length ? { reflections: [...(existing.reflections || []), ...reflections] } : {}) };
}

function extendReminderPreview(existing, samples, domains, doneForDay = day => existing.done[day] || []) {
  return appendPreviewHabits(existing, samples, domains, doneForDay, 'preview-v2-habit-');
}

function extendHabitCommentPreview(existing, samples, domains, doneForDay = day => existing.done[day] || []) {
  return appendPreviewHabits(existing, samples, domains, doneForDay, 'preview-v3-habit-');
}

module.exports = { createDomainPreviewRecords, createReminderPreviewRecords, createHabitCommentPreviewRecords,
  extendDomainPreview, extendReminderPreview, extendHabitCommentPreview, extendNegativeRecordPreview, extendEntertainmentDomainPreview };
