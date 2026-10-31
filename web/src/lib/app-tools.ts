export const toolGroupName = "日常工具";
export const appTools = [
  { key: "home", href: "/today", title: "今日", caption: "TODAY", description: "快捷记录与常用功能。" },
  { key: "todos", href: "/todos", title: "任务", caption: "TO DO", description: "分清轻重缓急，安排下一步。" },
  { key: "pomodoro", href: "/pomodoro", title: "专注", caption: "FOCUS TIME", description: "留一段时间，只做眼前这一件事。" },
  { key: "domains", href: "/domains", title: "领域", caption: "DOMAINS", description: "目标、习惯与正负记录。" },
  { key: "reminders", href: "/daily", title: "习惯", caption: "DAILY PRACTICE", description: "让日常慢慢发生。" },
  { key: "memos", href: "/memos", title: "便签", caption: "QUICK NOTES", description: "给零碎想法留个位置。" },
  { key: "mottos", href: "/mottos", title: "格言", caption: "MOTTOS", description: "管理首页轮播格言。" },
  { key: "articles", href: "/articles", title: "文章", caption: "ARTICLES", description: "管理自己的文章与阅读记录。" },
  { key: "statistics", href: "/statistics", title: "统计", caption: "INSIGHTS", description: "查看六类记录的变化。" },
] as const;
