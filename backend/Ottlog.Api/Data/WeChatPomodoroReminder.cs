namespace Ottlog.Api.Data;

// The composite key is also a durable subscription-use ledger. Terminal rows are
// deliberately retained: replaying a run/event can never send a second message.
public sealed class WeChatPomodoroReminder
{
    public string Owner { get; set; } = "";
    public string RunId { get; set; } = "";
    public string Event { get; set; } = "";
    public string AppId { get; set; } = "";
    public string OpenId { get; set; } = "";
    public string TemplateId { get; set; } = "";
    public long RemindAtEpoch { get; set; }
    public long SourceDeadline { get; set; }
    public long UpdatedAtEpoch { get; set; }
    public string Status { get; set; } = "pending";
    public string? ErrorCode { get; set; }
    public string Revision { get; set; } = Guid.NewGuid().ToString("N");
    public object View() => new { RunId, Event, remindAt = DateTimeOffset.FromUnixTimeMilliseconds(RemindAtEpoch).ToString("O"), Status, ErrorCode };
}
