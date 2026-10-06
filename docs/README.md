# 项目文档目录

## 开发前阅读

- [开发约定](../AGENTS.md)：开发代理与协作者应遵循的规则。
- [设计与交互](../Design.md)：当前已确认的组件、文案和交互。
- [按钮分层与动态尺寸](button-guidelines.md)：按功能、组件和局部层级选型，尺寸／宽度自适应及状态验收规则（C60）。
- [开发说明](development.md)：目录、启动、命令、数据和验证边界。
- [决策与问题记录](decisions.md)：2026-10-04 已确认的 P01–P12 规则、实现缺口、尚待细化的冲突规则和已知工程问题。
- [项目 README](../README.md)：本地启动、账号、内容管理和部署概览。

## 按功能查阅

- [GitHub、Vercel 与 Supabase](cloud-deployment.md)：网站发布、共用账号数据、建表与安全迁移准备（C69）。

- [小程序](miniprogram.md)、[微信真机调试](device-debugging.md)、[浏览器预览](../miniprogram/scripts/UI-PREVIEW.md)。
- [首页快捷方式](home-shortcuts.md)、[小程序交互](miniprogram-interactions.md)。
- [任务](todo-miniprogram.md)、[任务订阅提醒](wechat-reminders.md)。
- [番茄钟](pomodoro-miniprogram.md)、[番茄钟通知](wechat-pomodoro.md)。
- [统计](statistics-miniprogram.md)：待办、专注、习惯、饮食、领域与成长的集中分析，原记录与账号隔离边界。
- [网页选境与食选](options-web.md)、[网页日常工具](daily-tools.md)、[效率工具](productivity-tools.md)。
- [工具数据备份](tool-backups.md)、[测试说明](testing.md)、[原设计建议](design-system.md)。

后续功能开发只修改小程序，其他端范围以用户新的明确要求为准。用户已回答全部 P01–P12，后续开发遵循确认规则；习惯持久自定义排序、内部滚动提示、系统未分类、草稿恢复、账号个性设置同步和多设备合并等尚未完整实现，文档中的已确认要求不能当作已上线功能。

原有文档部分包含历史阶段的验收结果和仅针对某端的说明。确认当前行为时，以最新用户决定、对应代码及本次实际验证为依据；历史通过记录不表示今天已重新执行。
