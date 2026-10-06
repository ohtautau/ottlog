namespace Ottlog.Api.Data;

public sealed class WeChatBinding
{
    public string Owner { get; set; } = "";
    public string AppId { get; set; } = "";
    public string OpenId { get; set; } = "";
}

public sealed class WeChatReminder
{
    public string Owner { get; set; } = "";
    public string TaskId { get; set; } = "";
    public string AppId { get; set; } = "";
    public string OpenId { get; set; } = "";
    public string TemplateId { get; set; } = "";
    public long RemindAtEpoch { get; set; }
    public long UpdatedAtEpoch { get; set; }
    public string Status { get; set; } = "pending";
    public string? ErrorCode { get; set; }
    // A revision prevents an earlier dispatch from overwriting a later schedule/cancellation.
    public string Revision { get; set; } = Guid.NewGuid().ToString("N");

    public object View() => new { TaskId, remindAt = DateTimeOffset.FromUnixTimeMilliseconds(RemindAtEpoch).ToString("O"), Status, ErrorCode };
}
