using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Ottlog.Api.Services;

public sealed record WeChatTodoSnapshot(string Title, string Note, string DeadlineText = "-")
{
    public static bool TryDate(string? value, out DateTimeOffset date)
    {
        date = default;
        return value is not null && value.Length <= 40 &&
            Regex.IsMatch(value, @"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,7})?)?(?:Z|[+-]\d{2}:\d{2})$") &&
            DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out date);
    }

    public static WeChatTodoSnapshot? Find(string? json, string taskId, long remindAtEpoch)
    {
        if (json is null) return null;
        try
        {
            using var document = JsonDocument.Parse(json);
            if (document.RootElement.ValueKind != JsonValueKind.Object ||
                !document.RootElement.TryGetProperty("tasks", out var tasks) || tasks.ValueKind != JsonValueKind.Array) return null;
            WeChatTodoSnapshot? result = null;
            var matches = 0;
            foreach (var task in tasks.EnumerateArray())
            {
                if (task.ValueKind != JsonValueKind.Object || Text(task, "id") != taskId) continue;
                if (++matches > 1) return null;
                if (!task.TryGetProperty("completedAt", out var completed) || completed.ValueKind != JsonValueKind.Null ||
                    !TryDate(Text(task, "reminderAt"), out var reminderAt) || reminderAt.ToUnixTimeMilliseconds() != remindAtEpoch) continue;
                var title = Text(task, "title").Trim();
                if (title.Length > 0) result = new(title, Text(task, "description"), Deadline(task));
            }
            return result;
        }
        catch (JsonException) { return null; }
    }

    // Task dates are local wall-clock values, independent of the reminder's UTC instant.
    private static string Deadline(JsonElement task)
    {
        if (!DateOnly.TryParseExact(Text(task, "dueDate"), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date)) return "-";
        var value = date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        return TimeOnly.TryParseExact(Text(task, "dueTime"), "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var time)
            ? value + "T" + time.ToString("HH:mm", CultureInfo.InvariantCulture) : value;
    }

    private static string Text(JsonElement value, string field) => value.TryGetProperty(field, out var property) &&
        property.ValueKind == JsonValueKind.String ? property.GetString() ?? "" : "";
}
