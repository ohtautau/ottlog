using System.Text.RegularExpressions;

namespace Ottlog.Api.Services;

public sealed class WeChatReminderOptions
{
    public string AppId { get; set; } = "";
    public string AppSecret { get; set; } = "";
    public string TodoTemplateId { get; set; } = "";
    public string PomodoroFocusTemplateId { get; set; } = "";
    public string PomodoroBreakStartTemplateId { get; set; } = "";
    public string PomodoroBreakEndTemplateId { get; set; } = "";
    public WeChatTemplateFields PomodoroFocus { get; set; } = new();
    public WeChatTemplateFields PomodoroBreakStart { get; set; } = new();
    public WeChatTemplateFields PomodoroBreakEnd { get; set; } = new();
    public string TitleField { get; set; } = "";
    public string TimeField { get; set; } = "";
    public string NoteField { get; set; } = "";
    public string ReasonField { get; set; } = "";
    public string MiniProgramState { get; set; } = "formal";
    public string TimeZone { get; set; } = "Asia/Shanghai";
    public int PollSeconds { get; set; } = 15;
    public int MaximumPendingPerAccount { get; set; } = 100;

    public string? DisabledReason
    {
        get
        {
            if (string.IsNullOrWhiteSpace(AppId) || string.IsNullOrWhiteSpace(AppSecret) || string.IsNullOrWhiteSpace(TodoTemplateId))
                return "微信提醒尚未开通，请先配置小程序凭据和待办订阅消息模板";
            if (!new WeChatTemplateFields { TitleField = TitleField, TimeField = TimeField, NoteField = NoteField, ReasonField = ReasonField }.Valid)
                return "微信提醒模板字段未配置正确";
            if (MiniProgramState is not ("formal" or "trial" or "developer")) return "微信提醒小程序版本配置无效";
            try { _ = TimeZoneInfo.FindSystemTimeZoneById(TimeZone); }
            catch (Exception e) when (e is TimeZoneNotFoundException or InvalidTimeZoneException) { return "微信提醒时区配置无效"; }
            return null;
        }
    }
    public bool Enabled => DisabledReason is null;

    public string? PomodoroDisabledReason
    {
        get
        {
            if (string.IsNullOrWhiteSpace(AppId) || string.IsNullOrWhiteSpace(AppSecret) ||
                PomodoroEvents.All.Any(e => string.IsNullOrWhiteSpace(PomodoroTemplate(e))))
                return "番茄钟微信提醒尚未开通，请先配置小程序凭据和三个订阅消息模板";
            if (PomodoroEvents.All.Select(PomodoroTemplate).Distinct(StringComparer.Ordinal).Count() != 3)
                return "番茄钟三个事件需要不同的订阅消息模板";
            if (PomodoroEvents.All.Any(e => !PomodoroFields(e).Valid)) return "番茄钟订阅消息模板字段未配置正确";
            if (MiniProgramState is not ("formal" or "trial" or "developer")) return "微信提醒小程序版本配置无效";
            try { _ = TimeZoneInfo.FindSystemTimeZoneById(TimeZone); }
            catch (Exception e) when (e is TimeZoneNotFoundException or InvalidTimeZoneException) { return "微信提醒时区配置无效"; }
            return null;
        }
    }
    public bool PomodoroEnabled => PomodoroDisabledReason is null;
    public bool BindingEnabled => Enabled || PomodoroEnabled;
    public string PomodoroTemplate(string eventName) => eventName switch
    {
        "focus_start" => PomodoroFocusTemplateId, "break_start" => PomodoroBreakStartTemplateId,
        "break_end" => PomodoroBreakEndTemplateId, _ => ""
    };
    public WeChatTemplateFields PomodoroFields(string eventName) => eventName switch
    {
        "focus_start" => PomodoroFocus, "break_start" => PomodoroBreakStart,
        "break_end" => PomodoroBreakEnd, _ => new()
    };
}

public static class PomodoroEvents
{
    public static readonly string[] All = ["focus_start", "break_start", "break_end"];
}

public sealed class WeChatTemplateFields
{
    public string TitleField { get; set; } = "";
    public string TimeField { get; set; } = "";
    public string NoteField { get; set; } = "";
    public string ReasonField { get; set; } = "";
    public bool Valid => Regex.IsMatch(TitleField, @"^thing[1-9][0-9]*$") && Regex.IsMatch(TimeField, @"^(time|character_string)[1-9][0-9]*$") &&
        (NoteField.Length == 0 || Regex.IsMatch(NoteField, @"^thing[1-9][0-9]*$") && NoteField != TitleField) &&
        (ReasonField.Length == 0 || Regex.IsMatch(ReasonField, @"^thing[1-9][0-9]*$") && ReasonField != TitleField && ReasonField != NoteField);
}

// Shared by task writes, binding, scheduling and dispatch: a completed task cannot be
// written locally halfway through sending its reminder. SQLite also claims each job atomically.
public sealed class WeChatReminderGate
{
    public SemaphoreSlim Semaphore { get; } = new(1, 1);
}
