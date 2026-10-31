// Explicit historical test fixtures. Never imported by application code.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.demoTodos = demoTodos;
exports.demoMemos = demoMemos;
function demoTodos(now = new Date()) {
    const stamp = now.toISOString();
    const day = (offset) => {
        const date = new Date(now);
        date.setDate(date.getDate() + offset);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };
    return [
        { title: '整理本周的工作重点', categoryId: 'work', important: true, urgent: true, dueDate: day(0), description: '选出最值得推进的三件事，先完成其中一件。', tags: ['示例', '工作'] },
        { title: '练习二十分钟英语口语', categoryId: 'study', important: true, urgent: false, dueDate: day(0), description: '选一个生活话题，录一段自己的表达。', tags: ['示例', '英语'] },
        { title: '给周末的摄影散步选条路线', categoryId: 'life', important: true, urgent: false, dueDate: day(2), description: '找一条有树影、街角和咖啡店的路线。', tags: ['示例', '摄影'] },
        { title: '下班顺路买水果和酸奶', categoryId: 'life', important: false, urgent: true, dueDate: day(0), description: '苹果、香蕉、无糖酸奶。', tags: ['示例', '采购'] },
        { title: '收拾书桌上的小物件', categoryId: 'life', important: false, urgent: false, dueDate: '', description: '留下一块可以安心阅读和写字的位置。', tags: ['示例', '整理'] },
        { title: '记下三个自媒体选题', categoryId: 'work', important: false, urgent: false, dueDate: day(3), description: '从最近学到的东西、踩过的坑和日常观察里找灵感。', tags: ['示例', '创作'] },
    ].map((task, index) => ({ ...task, id: `demo-todo-${index + 1}`, completedAt: null, createdAt: stamp, updatedAt: stamp }));
}
function demoMemos(now = new Date()) {
    const notes = [
        { title: '这一周，想慢慢做好三件事', body: '把工作推进一点，把身体照顾好一点，也留一点时间给喜欢的事。\n\n这些是可以自由编辑或删除的示例便签。', color: 'sage', tags: ['示例', '生活'], iconId: 'goal', pinned: true },
        { title: '周末的摄影灵感', body: '雨后的倒影、傍晚的树影、路边亮起的第一盏灯。\n带一支轻便镜头，走慢一点。', color: 'blue', tags: ['示例', '摄影'], iconId: 'camera', pinned: false },
        { title: '读书时想留下的一句话', body: '把注意力放回今天能做的小事，让答案在行动里慢慢变清楚。', color: 'sand', tags: ['示例', '阅读'], iconId: 'book', pinned: false },
        { title: '下次想做的晚餐', body: '番茄炒蛋、清炒西兰花，再煮一小锅米饭。\n饭后出去散步十分钟。', color: 'rose', tags: ['示例', '饮食'], iconId: 'cook', pinned: false },
        { title: '英语表达随手记', body: 'One step at a time.\n一步一步来。\n\n今天试着用这句话描述一个正在推进的小目标。', color: 'violet', tags: ['示例', '英语'], iconId: 'language', pinned: false },
        { title: '一个内容选题的开头', body: '如果只用一分钟，怎么讲清楚最近学会的一件事？\n先写一个具体场景，再分享自己的做法。', color: 'sage', tags: ['示例', '创作'], iconId: 'write', pinned: false },
    ];
    return notes.map((note, index) => {
        const stamp = new Date(now.getTime() - index * 30 * 60 * 1000).toISOString();
        return { ...note, id: `demo-memo-${index + 1}`, createdAt: stamp, updatedAt: stamp };
    });
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.demoGrowthState = demoGrowthState;
const previewGrowthTemplate = {
    version: 1,
    domains: [
        { id: 'work', name: '工作', iconId: 'work', archived: false },
        { id: 'health', name: '健康', iconId: 'pulse', archived: false },
        { id: 'mind', name: '精神', iconId: 'plant', archived: false },
        { id: 'fitness', name: '健身', iconId: 'exercise', archived: false },
        { id: 'photo', name: '摄影', iconId: 'camera', archived: false },
        { id: 'english', name: '英语', iconId: 'language', archived: false },
        { id: 'media', name: '自媒体', iconId: 'film', archived: false },
    ],
    events: [],
    completedGoals: [],
};
function demoGrowthState(now = new Date()) {
    const at = (daysAgo) => {
        const date = new Date(now);
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString();
    };
    const samples = [
        { goal: '完成项目第一版并收集反馈', done: '梳理本月工作重点', notes: ['推进核心功能', '整理用户反馈', '完成一次项目复盘'], count: 28 },
        { goal: '本周有五天在十一点前休息', done: '连续一周坚持饭后散步', notes: ['提前半小时休息', '准备一份均衡午餐', '饭后散步二十分钟'], count: 22 },
        { goal: '读完一本书并写下三点感受', done: '完成七天睡前阅读', notes: ['安静阅读二十分钟', '写下今天的感受', '留出十分钟冥想'], count: 18 },
        { goal: '完成本周三次力量训练', done: '学会一组基础拉伸动作', notes: ['完成全身力量训练', '练习深蹲动作', '跑步后认真拉伸'], count: 25 },
        { goal: '拍一组有故事感的街头照片', done: '整理十张满意的作品', notes: ['练习捕捉傍晚光线', '尝试新的街头构图', '整理照片并记录思路'], count: 15 },
        { goal: '用英语做一次三分钟分享', done: '完成十次口语跟读', notes: ['跟读一段英文播客', '录制一分钟口语', '复习今天的新表达'], count: 24 },
        { goal: '发布一篇完整的图文作品', done: '整理出五个内容选题', notes: ['打磨文章开头', '整理选题素材', '完成图文内容初稿'], count: 12 },
    ];
    const events = [];
    const completedGoals = [];
    const domains = previewGrowthTemplate.domains.map((domain, index) => {
        const sample = samples[index];
        for (let entry = 0; entry < sample.count; entry++) {
            // Recent entries populate this week/month; the rest span three months.
            const daysAgo = entry < 3 ? entry : 4 + (entry - 3) * 3;
            events.push({ id: `demo-growth-${domain.id}-${entry + 1}`, domainId: domain.id,
                size: ['small', 'medium', 'large'][(entry + index) % 3],
                createdAt: at(daysAgo), note: `示例：${sample.notes[entry % sample.notes.length]}` });
        }
        completedGoals.push({ id: `demo-completed-${domain.id}`, domainId: domain.id,
            title: sample.done, createdAt: at(28 + index), completedAt: at(8 + index) });
        return { ...domain, currentGoal: { id: `demo-goal-${domain.id}`, title: sample.goal, createdAt: at(7) } };
    });
    return { version: 1, domains, events, completedGoals };
}
