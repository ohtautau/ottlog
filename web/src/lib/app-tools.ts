export const toolGroupName = "日常工具";
export const appTools = [
  { key: "meals", href: "/eat", title: "吃什么", caption: "DAILY MENU", description: "比较餐单，或跟着问题找到今天想吃的。" },
  { key: "reminders", href: "/daily", title: "习惯养成", caption: "DAILY PRACTICE", description: "翻一翻，想起一件现在可以做的小事。" },
  { key: "todos", href: "/todos", title: "待办清单", caption: "TO DO", description: "分清轻重缓急，安排下一步。" },
  { key: "pomodoro", href: "/pomodoro", title: "番茄钟", caption: "FOCUS TIME", description: "留一段时间，只做眼前这一件事。" },
  { key: "memos", href: "/memos", title: "备忘录", caption: "QUICK NOTES", description: "先记下来，给零碎想法留个位置。" },
  { key: "choices", href: "/choose", title: "选境", caption: "CHOICE FIELD", description: "九次选择，让直觉留下形状。" },
] as const;
