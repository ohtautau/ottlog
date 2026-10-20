import type { Reminder, Scene } from './reminder-data';

export const iconCategories = ['运动健康', '学习工作', '生活家务', '饮食', '心情休息', '创作兴趣', '社交家庭', '出行财务'] as const;
export type IconCategory = typeof iconCategories[number];
const habit = (id: Scene, label: string, category: IconCategory, keywords: string) => ({ id, label, category, keywords, src: `/assets/habits/${id}.png`, fallback: id });
const extra = <Id extends string>(id: Id, label: string, category: IconCategory, keywords: string, fallback: Scene) => ({ id, label, category, keywords, src: `/assets/icons/${id}.png`, fallback });

export const iconLibrary = [
  habit('exercise', '运动', '运动健康', '健身 力量 哑铃 训练 有氧 锻炼 举重 健身房 exercise fitness workout gym dumbbell strength weight training cardio'),
  extra('run', '跑步', '运动健康', '晨跑 夜跑 马拉松 运动 慢跑 跑鞋 running jogging runner marathon sprint', 'walk'),
  extra('cycle', '骑行', '运动健康', '自行车 单车 运动 骑车 脚踏车 cycling bicycle bike biking cyclist', 'exercise'),
  extra('swim', '游泳', '运动健康', '泳池 水上 运动 泳帽 泳镜 swimming pool goggles aquatic', 'exercise'),
  extra('yoga', '瑜伽', '运动健康', '普拉提 柔韧 冥想 运动 瑜伽垫 体式 yoga pilates flexibility pose mat meditation', 'stretch'),
  extra('basketball', '篮球', '运动健康', '球类 球赛 运动 投篮 篮筐 basketball hoop dribble court ball', 'exercise'),
  extra('badminton', '羽毛球', '运动健康', '球拍 球类 运动 羽球 羽毛 badminton shuttlecock racket racquet', 'exercise'),
  extra('hike', '徒步', '运动健康', '登山 户外 远足 运动 爬山 山峰 hiking trekking mountain trail outdoors', 'walk'),
  habit('stretch', '伸展', '运动健康', '拉伸 肩颈 热身 运动 舒展 伸懒腰 stretching warmup warm up mobility flexibility'),
  habit('walk', '散步', '运动健康', '走路 步行 运动 漫步 散心 walking stroll steps pedestrian'),
  habit('breathe', '呼吸', '运动健康', '心跳 深呼吸 冥想 呼吸练习 呼气 吸气 breathing breath inhale exhale deep breathing mindfulness'),
  habit('pulse', '心率', '运动健康', '脉搏 晨脉 心跳 健康 心脏 心电 heart heartbeat heart rate pulse bpm ecg'),
  habit('measure', '身体记录', '运动健康', '测量 体重 体脂 健康 体重秤 身高 围度 weight scale measurement body fat bmi height'),
  habit('supplement', '补剂安排', '运动健康', '药品 药物 服药 健康 吃药 维生素 营养补充 supplement supplements vitamin medicine medication pill capsule'),
  habit('focus', '专注', '学习工作', '番茄钟 计时 工作 学习 集中 注意力 效率 focus concentration pomodoro timer productivity deep work'),
  extra('book', '阅读', '学习工作', '读书 书籍 学习 书本 图书 看书 reading read books novel literature library', 'notes'),
  habit('language', '语言', '学习工作', '英语 单词 外语 学习 词汇 口语 翻译 language languages english vocabulary translation speaking'),
  habit('notes', '笔记', '学习工作', '记录 复习 摘录 学习 笔记本 学习笔记 notebook note notes revision review study'),
  extra('graduate', '考试', '学习工作', '毕业 课程 学校 学习 学位 学生 毕业帽 exam examination graduation education school university degree', 'language'),
  extra('work', '工作', '学习工作', '办公 职业 项目 公文包 上班 事业 work job office career business briefcase project', 'focus'),
  extra('meeting', '会议', '学习工作', '讨论 沟通 团队 工作 开会 协作 meeting conference discussion team teamwork collaboration', 'connect'),
  extra('computer', '电脑', '学习工作', '设备 办公 数码 工作 计算机 笔记本电脑 显示器 computer laptop desktop monitor pc device', 'focus'),
  extra('code', '编程', '学习工作', '代码 开发 软件 技术 工作 程序 程序员 coding programming development developer software programmer', 'focus'),
  extra('calendar', '日程', '学习工作', '日历 计划 预约 待办 日期 安排 提醒 calendar schedule date planner appointment agenda reminder todo', 'notes'),
  extra('goal', '目标', '学习工作', '计划 任务 成长 挑战 靶心 达标 目的 goal target aim objective milestone achievement task', 'celebrate'),
  habit('explore', '探索', '学习工作', '研究 好奇 学习 灵感 发现 求知 探究 exploration discover discovery research curiosity investigate'),
  extra('home', '居家', '生活家务', '房屋 家庭 生活 家务 房子 住宅 在家 home house household housing residence', 'tidy'),
  extra('clean', '清洁', '生活家务', '打扫 卫生 家务 扫地 擦拭 清扫 cleaning cleanup sweep broom hygiene chores', 'tidy'),
  extra('laundry', '洗衣', '生活家务', '衣物 晾晒 家务 洗衣机 衣服 洗涤 laundry washing clothes garment detergent wash', 'shower'),
  habit('tidy', '整理', '生活家务', '收纳 桌面 房间 家务 整理房间 断舍离 tidy organize organise organization organisation declutter storage'),
  habit('plant', '植物', '生活家务', '浇水 园艺 养花 生活 花草 盆栽 绿植 plant plants gardening garden flower watering greenery'),
  extra('shopping', '购物', '生活家务', '采购 超市 清单 消费 买东西 购物袋 shopping purchase buy groceries supermarket retail', 'bag'),
  extra('pet', '宠物', '生活家务', '猫 狗 喂食 动物 小猫 小狗 养宠 pet pets cat dog kitten puppy animal feeding', 'plant'),
  habit('shower', '洗澡', '生活家务', '淋浴 清洁 生活 沐浴 泡澡 洗浴 shower bath bathing bathroom wash'),
  habit('brush', '刷牙', '生活家务', '牙齿 口腔 清洁 生活 牙刷 牙膏 护牙 toothbrush toothpaste teeth tooth dental oral brushing'),
  habit('food', '饮食', '饮食', '餐盘 吃饭 早餐 午餐 晚餐 餐具 三餐 food meal meals eating breakfast lunch dinner plate nutrition'),
  extra('cook', '烹饪', '饮食', '做饭 下厨 食谱 厨房 烧菜 炒菜 cooking chef recipe kitchen cuisine prepare food', 'food'),
  extra('fruit', '水果', '饮食', '苹果 蔬果 营养 健康 果蔬 鲜果 fruit fruits apple produce vitamin nutrition', 'food'),
  extra('cake', '甜点', '饮食', '蛋糕 烘焙 生日 甜品 点心 dessert cake baking pastry sweets birthday', 'food'),
  habit('water', '喝水', '饮食', '饮水 补水 水杯 水瓶 饮用水 water hydration hydrate drinking water bottle glass'),
  habit('coffee', '咖啡', '饮食', '茶 饮料 休息 咖啡杯 拿铁 浓缩 coffee tea drink beverage espresso latte cup mug'),
  habit('slow', '慢慢吃', '饮食', '细嚼慢咽 正念 用餐 慢食 咀嚼 mindful eating slow eating chew chewing savor savour'),
  extra('sleep', '睡眠', '心情休息', '睡觉 早睡 午睡 作息 入睡 睡眠质量 床 sleep sleeping bedtime nap rest bed snooze', 'moon'),
  habit('moon', '夜晚', '心情休息', '月亮 晚安 睡前 月光 夜间 月牙 moon lunar night evening moonlight crescent'),
  habit('sun', '阳光', '心情休息', '晒太阳 天气 户外 太阳 日光 晴天 sun sunshine sunlight sunny daylight weather'),
  extra('relax', '放松', '心情休息', '冥想 情绪 心情 舒缓 减压 静心 relax relaxation meditation calm stress relief mood', 'breathe'),
  habit('pause', '休息', '心情休息', '暂停 放空 小憩 歇一会 间歇 pause break rest downtime stop recovery'),
  habit('unplug', '放下手机', '心情休息', '戒手机 戒游戏 数码 排毒 屏幕时间 断网 少刷手机 unplug digital detox offline screen time phone smartphone disconnect'),
  habit('celebrate', '庆祝', '心情休息', '奖励 鼓励 开心 成就 祝贺 庆功 欢乐 celebrate celebration reward success joy happy party'),
  extra('star', '心愿', '心情休息', '梦想 收藏 喜欢 星星 许愿 愿望 星标 star wish dream favorite favourite bookmark', 'celebrate'),
  habit('music', '音乐', '创作兴趣', '听歌 乐器 演奏 歌曲 耳机 旋律 music song songs audio headphones instrument melody listening'),
  habit('film', '影像', '创作兴趣', '视频 电影 剪辑 创作 影片 观影 录像 film movie movies cinema video editing footage'),
  habit('camera', '摄影', '创作兴趣', '相机 照片 拍照 拍摄 摄像 镜头 photography photo photograph camera picture lens shooting'),
  habit('write', '写作', '创作兴趣', '日记 文字 备忘 记录 写字 文章 随笔 writing write diary journal essay pen author'),
  extra('idea', '灵感', '创作兴趣', '想法 创意 灯泡 点子 思考 创新 idea inspiration creativity brainstorm lightbulb innovation', 'explore'),
  extra('game', '游戏', '创作兴趣', '娱乐 手柄 放松 玩游戏 游戏机 电子游戏 game gaming videogame video game controller console play', 'celebrate'),
  habit('connect', '联系朋友', '社交家庭', '社交 电话 聊天 友情 朋友 联络 交流 connect friend friends friendship social chat call communication'),
  extra('family', '家人', '社交家庭', '家庭 亲子 孩子 陪伴 父母 亲人 育儿 family parent parents child children parenting together', 'connect'),
  extra('gift', '礼物', '社交家庭', '生日 节日 感谢 纪念 送礼 礼盒 礼品 gift present surprise birthday holiday gratitude thanks', 'celebrate'),
  habit('bag', '背包', '出行财务', '收拾 行李 装备 出门 书包 打包 包 backpack bag luggage packing equipment suitcase'),
  extra('travel', '旅行', '出行财务', '旅游 飞机 出差 假期 出游 航班 旅途 travel trip journey vacation holiday tourism flight airplane aeroplane', 'explore'),
  extra('car', '交通', '出行财务', '汽车 通勤 出行 驾驶 开车 车辆 小车 car vehicle driving commute transport transportation automobile', 'bag'),
  extra('money', '理财', '出行财务', '存钱 储蓄 收入 财务 金钱 投资 储蓄罐 money savings saving finance investment income piggy bank', 'notes'),
  extra('wallet', '记账', '出行财务', '钱包 支出 预算 消费 财务 账单 费用 收支 wallet budget expense expenses spending accounting bookkeeping bill', 'notes'),
] as const;

export type LibraryIconId = typeof iconLibrary[number]['id'];
export type LibraryIconEntry = { id: LibraryIconId; label: string; category: IconCategory; keywords: string; src: string; fallback: Scene };
const byId = new Map<string, LibraryIconEntry>(iconLibrary.map(icon => [icon.id, icon]));
export function getLibraryIcon(id: unknown): LibraryIconEntry | undefined { return typeof id === 'string' ? byId.get(id) : undefined; }
export function habitIconId(item: Pick<Reminder, 'kind' | 'backgroundKind' | 'iconId'>): LibraryIconId {
  return getLibraryIcon(item.iconId)?.id ?? getLibraryIcon(item.backgroundKind)?.id ?? getLibraryIcon(item.kind)?.id ?? 'plant';
}
export function findLibraryIcons(category: IconCategory | '全部', query: string): LibraryIconEntry[] {
  const needle = query.trim().toLocaleLowerCase();
  return iconLibrary.filter(icon => (category === '全部' || icon.category === category) && `${icon.label} ${icon.category} ${icon.keywords} ${icon.id}`.toLocaleLowerCase().includes(needle));
}
