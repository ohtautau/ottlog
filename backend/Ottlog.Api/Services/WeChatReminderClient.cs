using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Ottlog.Api.Data;

namespace Ottlog.Api.Services;

public interface IWeChatReminderClient
{
    Task<string> ExchangeCodeAsync(string code, CancellationToken cancellationToken);
    Task<WeChatSendResult> SendAsync(WeChatReminder reminder, WeChatTodoSnapshot task, CancellationToken cancellationToken);
    Task<WeChatSendResult> SendPomodoroAsync(WeChatPomodoroReminder reminder, WeChatPomodoroPlan plan, CancellationToken cancellationToken);
}

public sealed record WeChatSendResult(string Status, string? ErrorCode = null);
public sealed class WeChatApiException(string code) : Exception("WeChat API request failed")
{
    public string Code { get; } = code;
}

public sealed class WeChatReminderClient(IHttpClientFactory factory, IOptions<WeChatReminderOptions> configured) : IWeChatReminderClient
{
    private readonly WeChatReminderOptions options = configured.Value;
    private readonly SemaphoreSlim tokenGate = new(1, 1);
    private string? accessToken;
    private DateTimeOffset tokenExpiresAt;

    public async Task<string> ExchangeCodeAsync(string code, CancellationToken cancellationToken)
    {
        using var client = factory.CreateClient("wechat-reminders");
        using var response = await client.GetAsync("sns/jscode2session?appid=" + Uri.EscapeDataString(options.AppId) +
            "&secret=" + Uri.EscapeDataString(options.AppSecret) + "&js_code=" + Uri.EscapeDataString(code) +
            "&grant_type=authorization_code", cancellationToken);
        using var json = await ReadAsync(response, cancellationToken);
        ThrowIfError(json.RootElement);
        if (!json.RootElement.TryGetProperty("openid", out var id) || id.ValueKind != JsonValueKind.String || string.IsNullOrWhiteSpace(id.GetString()))
            throw new WeChatApiException("invalid_login_response");
        return id.GetString()!;
    }

    private async Task<string> TokenAsync(CancellationToken cancellationToken)
    {
        await tokenGate.WaitAsync(cancellationToken);
        try
        {
            if (accessToken is not null && tokenExpiresAt > DateTimeOffset.UtcNow) return accessToken;
            using var client = factory.CreateClient("wechat-reminders");
            using var response = await client.GetAsync("cgi-bin/token?grant_type=client_credential&appid=" + Uri.EscapeDataString(options.AppId) +
                "&secret=" + Uri.EscapeDataString(options.AppSecret), cancellationToken);
            using var json = await ReadAsync(response, cancellationToken);
            ThrowIfError(json.RootElement);
            if (!json.RootElement.TryGetProperty("access_token", out var token) || token.ValueKind != JsonValueKind.String ||
                string.IsNullOrWhiteSpace(token.GetString()) || !json.RootElement.TryGetProperty("expires_in", out var expiry) ||
                !expiry.TryGetInt32(out var expiresIn) || expiresIn <= 0) throw new WeChatApiException("invalid_token_response");
            accessToken = token.GetString()!;
            tokenExpiresAt = DateTimeOffset.UtcNow.AddSeconds(Math.Max(1, expiresIn - 120));
            return accessToken;
        }
        finally { tokenGate.Release(); }
    }

    public Task<WeChatSendResult> SendAsync(WeChatReminder reminder, WeChatTodoSnapshot task, CancellationToken cancellationToken) =>
        SendMessageAsync(reminder.OpenId, reminder.TemplateId, reminder.RemindAtEpoch, "pages/todos/index", task.Title,
            string.IsNullOrWhiteSpace(task.Note) ? "请打开小程序查看任务" : task.Note,
            new() { TitleField = options.TitleField, TimeField = options.TimeField, NoteField = options.NoteField, ReasonField = options.ReasonField }, cancellationToken,
            options.TimeField.StartsWith("character_string", StringComparison.Ordinal) ? task.DeadlineText : null);

    public Task<WeChatSendResult> SendPomodoroAsync(WeChatPomodoroReminder reminder, WeChatPomodoroPlan plan, CancellationToken cancellationToken) =>
        SendMessageAsync(reminder.OpenId, reminder.TemplateId, reminder.RemindAtEpoch, "pages/pomodoro/index", plan.Title,
            plan.Note, options.PomodoroFields(reminder.Event), cancellationToken);

    private async Task<WeChatSendResult> SendMessageAsync(string openId, string templateId, long remindAt, string page,
        string title, string note, WeChatTemplateFields fields, CancellationToken cancellationToken, string? displayTime = null)
    {
        string token;
        try { token = await TokenAsync(cancellationToken); }
        catch (WeChatApiException e) { return new("failed", e.Code); }
        catch (Exception e) when (e is HttpRequestException or OperationCanceledException or JsonException)
        { return new("failed", "token_unavailable"); }

        var time = TimeZoneInfo.ConvertTime(DateTimeOffset.FromUnixTimeMilliseconds(remindAt),
            TimeZoneInfo.FindSystemTimeZoneById(options.TimeZone));
        var data = new Dictionary<string, object>
        {
            [fields.TitleField] = new { value = ShortText(title) },
            [fields.TimeField] = new { value = displayTime ?? time.ToString(fields.TimeField.StartsWith("character_string", StringComparison.Ordinal)
                ? "yyyy-MM-dd'T'HH:mm" : "yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture) }
        };
        if (fields.NoteField.Length > 0) data[fields.NoteField] = new { value = ShortText(note) };
        if (fields.ReasonField.Length > 0) data[fields.ReasonField] = new { value = "已到你设置的提醒时间" };
        try
        {
            using var client = factory.CreateClient("wechat-reminders");
            // Never retry a send after a timeout: WeChat may already have delivered it.
            using var response = await client.PostAsJsonAsync("cgi-bin/message/subscribe/send?access_token=" + Uri.EscapeDataString(token),
                new { touser = openId, template_id = templateId, page, data,
                    miniprogram_state = options.MiniProgramState, lang = "zh_CN" }, cancellationToken);
            if (!response.IsSuccessStatusCode) return new("unknown", "http_" + (int)response.StatusCode);
            using var json = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
            if (!json.RootElement.TryGetProperty("errcode", out var code) || !code.TryGetInt32(out var error)) return new("unknown", "invalid_send_response");
            if (error == 0) return new("sent");
            if (error is 40001 or 40014 or 42001) accessToken = null;
            return new("failed", error.ToString(CultureInfo.InvariantCulture));
        }
        catch (Exception e) when (e is HttpRequestException or OperationCanceledException or JsonException)
        { return new("unknown", "delivery_unconfirmed"); }
    }

    private static string ShortText(string text) => string.Concat(text.Replace('\r', ' ').Replace('\n', ' ').EnumerateRunes().Take(20).Select(r => r.ToString()));
    private static async Task<JsonDocument> ReadAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        if (!response.IsSuccessStatusCode) throw new WeChatApiException("http_" + (int)response.StatusCode);
        return await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
    }
    private static void ThrowIfError(JsonElement json)
    {
        if (json.TryGetProperty("errcode", out var code) && code.TryGetInt32(out var error) && error != 0)
            throw new WeChatApiException(error.ToString(CultureInfo.InvariantCulture));
    }
}
