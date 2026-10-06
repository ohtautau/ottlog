using System.Text.Json;

namespace Ottlog.Api.Services;

public sealed record WeChatPomodoroPlan(long? RemindAtEpoch, long? SourceDeadline, long? ExpiresAtEpoch,
    bool Paused, string Title, string Note);

public static class WeChatPomodoroSnapshot
{
    private const long Grace = 120_000;

    public static bool CanSchedule(string? json, string runId)
    {
        try
        {
            using var document = JsonDocument.Parse(json ?? "null");
            var state = document.RootElement;
            return Object(state, "active", out var active) && RootId(active) == runId &&
                Boolean(active, "running") == true && Epoch(active, "deadline") is not null;
        }
        catch (JsonException) { return false; }
    }

    // All timestamps and labels come from the saved timer, never from the
    // notification request. Suspended clients may still hold an overdue focus:
    // its automatic rest is derived from the same original focus deadline.
    public static WeChatPomodoroPlan? Find(string? json, string runId, string eventName)
    {
        if (!PomodoroEvents.All.Contains(eventName, StringComparer.Ordinal)) return null;
        try
        {
            using var document = JsonDocument.Parse(json ?? "null");
            var state = document.RootElement;
            if (state.ValueKind != JsonValueKind.Object || !Object(state, "settings", out var settings)) return null;
            var shortMinutes = Integer(settings, "shortBreak", 1, 60);
            var longMinutes = Integer(settings, "longBreak", 1, 120);
            var longEvery = Integer(settings, "longEvery", 1, 12);
            if (shortMinutes is null || longMinutes is null || longEvery is null) return null;
            var sessions = state.TryGetProperty("sessions", out var history) && history.ValueKind == JsonValueKind.Array
                ? history.EnumerateArray().Where(s => s.ValueKind == JsonValueKind.Object).ToArray() : [];
            if (Object(state, "active", out var active) && RootId(active) == runId)
            {
                var mode = Text(active, "mode");
                var start = Date(active, "startedAt");
                var running = Boolean(active, "running");
                var deadline = Epoch(active, "deadline");
                if (start is null || running is null || Integer(active, "totalSeconds", 1, 7200) is null ||
                    running == true && (deadline is null || deadline <= start)) return null;
                var paused = running != true;
                var title = Object(active, "selection", out var selected) ? Text(selected, "title") : "";
                if (mode == "focus")
                {
                    if (eventName == "focus_start") return Plan(start, deadline, Min(start + Grace, deadline), paused,
                        "专注开始", string.IsNullOrWhiteSpace(title) ? "留一段时间专注眼前的事情" : title);
                    if (Text(settings, "transitionMode") == "manual") return null;
                    var historicalCount = sessions.Count(s => Text(s, "mode") == "focus" && Boolean(s, "completed") == true);
                    var completed = Math.Max(historicalCount, Counter(state, "completedFocusCount") ?? historicalCount);
                    var isLong = (completed + 1L) % longEvery == 0;
                    var breakMilliseconds = (isLong ? longMinutes.Value : shortMinutes.Value) * 60_000L;
                    var end = deadline + breakMilliseconds;
                    return eventName == "break_start"
                        ? Plan(deadline, deadline, Min(deadline + Grace, end), paused, isLong ? "长休息开始" : "休息开始", "这一段专注完成了，放松一下")
                        : Plan(end, deadline, end + Grace, paused, "休息结束", "休息结束了，准备好再开始下一段专注");
                }
                if (mode is "shortBreak" or "longBreak")
                {
                    if (eventName == "focus_start") return FromFocusHistory(sessions, runId);
                    return eventName == "break_start"
                        ? Plan(start, deadline, Min(start + Grace, deadline), paused, mode == "longBreak" ? "长休息开始" : "休息开始", "这一段专注完成了，放松一下")
                        : Plan(deadline, deadline, deadline + Grace, paused, "休息结束", "休息结束了，准备好再开始下一段专注");
                }
                return null;
            }
            // The client may finish the rest and save its session before this
            // worker wakes. A naturally completed rest is evidence for its end;
            // early-stop/reset records never authorize a predicted end.
            var completedBreaks = sessions.Where(s => RootId(s) == runId && Text(s, "mode") is "shortBreak" or "longBreak" &&
                Boolean(s, "completed") == true).Take(2).ToArray();
            if (completedBreaks.Length != 1) return null;
            var session = completedBreaks[0];
            var began = Date(session, "startedAt");
            var ended = Date(session, "endedAt");
            if (began is null || ended is null || ended < began) return null;
            if (eventName == "focus_start") return FromFocusHistory(sessions, runId);
            return eventName == "break_start"
                ? Plan(began, ended, Min(began + Grace, ended), false, "休息开始", "这一段专注完成了，放松一下")
                : Plan(ended, ended, ended + Grace, false, "休息结束", "休息结束了，准备好再开始下一段专注");
        }
        catch (JsonException) { return null; }
    }

    private static WeChatPomodoroPlan? FromFocusHistory(JsonElement[] sessions, string runId)
    {
        var matches = sessions.Where(s => RootId(s) == runId && Text(s, "mode") == "focus" && Boolean(s, "completed") == true).Take(2).ToArray();
        if (matches.Length != 1) return null;
        var start = Date(matches[0], "startedAt");
        var end = Date(matches[0], "endedAt");
        return start is null || end is null ? null : Plan(start, end, Min(start + Grace, end), false, "专注开始", Text(matches[0], "title"));
    }
    private static WeChatPomodoroPlan? Plan(long? at, long? deadline, long? expires, bool paused, string title, string note) =>
        at is < -62135596800000 or > 253402300799999 ? null : new(at, deadline, expires, paused, title, note);
    private static long? Min(long? left, long? right) => left is null ? right : right is null ? left : Math.Min(left.Value, right.Value);
    private static string RootId(JsonElement item) => string.IsNullOrWhiteSpace(Text(item, "rootRunId")) ? Text(item, "id") : Text(item, "rootRunId");
    private static bool Object(JsonElement value, string name, out JsonElement item)
    {
        item = default;
        return value.ValueKind == JsonValueKind.Object && value.TryGetProperty(name, out item) && item.ValueKind == JsonValueKind.Object;
    }
    private static string Text(JsonElement value, string name) => value.TryGetProperty(name, out var item) && item.ValueKind == JsonValueKind.String ? item.GetString() ?? "" : "";
    private static bool? Boolean(JsonElement value, string name) => value.TryGetProperty(name, out var item) && item.ValueKind is JsonValueKind.True or JsonValueKind.False ? item.GetBoolean() : null;
    private static long? Epoch(JsonElement value, string name) => value.TryGetProperty(name, out var item) && item.ValueKind == JsonValueKind.Number && item.TryGetInt64(out var number) && number > 0 && number <= 253402300799999 ? number : null;
    private static int? Integer(JsonElement value, string name, int min, int max) => value.TryGetProperty(name, out var item) && item.ValueKind == JsonValueKind.Number && item.TryGetInt32(out var number) && number >= min && number <= max ? number : null;
    private static long? Counter(JsonElement value, string name) => value.TryGetProperty(name, out var item) && item.ValueKind == JsonValueKind.Number && item.TryGetInt64(out var number) && number >= 0 && number <= 9007199254740991 ? number : null;
    private static long? Date(JsonElement value, string name) => WeChatTodoSnapshot.TryDate(Text(value, name), out var date) ? date.ToUnixTimeMilliseconds() : null;
}
