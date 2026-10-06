using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Ottlog.Api.Data;
using Ottlog.Api.Services;

namespace Ottlog.Api.Controllers;

[ApiController, Route("api/wechat/pomodoro"), Authorize(Roles = "admin,reader"), AutoValidateAntiforgeryToken]
[ResponseCache(Location = ResponseCacheLocation.None, NoStore = true)]
public sealed class WeChatPomodoroController(BlogDb db, WeChatReminderGate gate, IOptions<WeChatReminderOptions> configured,
    IPersonalToolStore? toolStore = null) : ControllerBase
{
    private readonly IPersonalToolStore tools = toolStore ?? new SqlitePersonalToolStore(db);
    private readonly WeChatReminderOptions options = configured.Value;
    private string Owner => (User.IsInRole("admin") ? "admin:" : "reader:") + User.FindFirstValue(ClaimTypes.NameIdentifier);

    [AllowAnonymous, HttpGet("config")]
    public IActionResult Config() => Ok(new { enabled = options.PomodoroEnabled, reason = options.PomodoroDisabledReason,
        templates = options.PomodoroEnabled ? PomodoroEvents.All.Select(e => new { @event = e, templateId = options.PomodoroTemplate(e) }).ToArray() : [],
        requiresSubscription = true });

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var rows = await db.WeChatPomodoroReminders.AsNoTracking().Where(r => r.Owner == Owner)
            .OrderByDescending(r => r.UpdatedAtEpoch).Take(300).ToListAsync(cancellationToken);
        return Ok(new { reminders = rows.Select(r => r.View()) });
    }

    [HttpPost, EnableRateLimiting("wechat-reminders"), RequestSizeLimit(4096)]
    public async Task<IActionResult> Schedule(WeChatPomodoroInput input, CancellationToken cancellationToken)
    {
        if (!options.PomodoroEnabled) return StatusCode(503, new { title = options.PomodoroDisabledReason });
        if (input.Events is null || input.Events.Length is < 1 or > 3 || input.Events.Distinct(StringComparer.Ordinal).Count() != input.Events.Length ||
            input.Events.Any(e => !PomodoroEvents.All.Contains(e, StringComparer.Ordinal)))
            return BadRequest(new { title = "请选择本次已同意订阅的番茄钟事件" });
        await gate.Semaphore.WaitAsync(cancellationToken);
        try
        {
            var binding = await db.WeChatBindings.AsNoTracking().SingleOrDefaultAsync(b => b.Owner == Owner && b.AppId == options.AppId, cancellationToken);
            if (binding is null) return Conflict(new { title = "请先绑定当前微信身份" });
            var json = await tools.ReadAsync(Owner, "pomodoro", cancellationToken);
            if (!WeChatPomodoroSnapshot.CanSchedule(json, input.RunId))
                return Conflict(new { title = "请先保存同步正在进行的这一轮番茄钟" });
            var plans = input.Events.ToDictionary(e => e, e => WeChatPomodoroSnapshot.Find(json, input.RunId, e));
            if (plans.Values.Any(p => p is null || p.Paused || p.RemindAtEpoch is null || p.SourceDeadline is null))
                return Conflict(new { title = "当前计时阶段不支持所选提醒，请重新选择" });
            await new WeChatPomodoroQueue(db).ReconcileAsync(Owner, json, cancellationToken);
            var existing = await db.WeChatPomodoroReminders.Where(r => r.Owner == Owner && r.RunId == input.RunId).ToListAsync(cancellationToken);
            var missing = input.Events.Count(e => existing.All(r => r.Event != e));
            if (await db.WeChatPomodoroReminders.CountAsync(r => r.Owner == Owner && (r.Status == "pending" || r.Status == "paused"), cancellationToken) + missing >
                Math.Clamp(options.MaximumPendingPerAccount, 3, 500))
                return Conflict(new { title = "待发送提醒已达上限，请先结束其他计时" });
            var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            foreach (var eventName in input.Events)
            {
                if (existing.Any(r => r.Event == eventName)) continue; // Grant ledger: terminal events cannot be replayed.
                var plan = plans[eventName]!;
                var row = new WeChatPomodoroReminder { Owner = Owner, RunId = input.RunId, Event = eventName,
                    AppId = options.AppId, OpenId = binding.OpenId, TemplateId = options.PomodoroTemplate(eventName),
                    RemindAtEpoch = plan.RemindAtEpoch!.Value, SourceDeadline = plan.SourceDeadline!.Value, UpdatedAtEpoch = now };
                WeChatPomodoroQueue.Apply(row, plan, now);
                db.WeChatPomodoroReminders.Add(row);
                existing.Add(row);
            }
            await db.SaveChangesAsync(cancellationToken);
            return Ok(new { reminders = existing.Select(r => r.View()) });
        }
        finally { gate.Semaphore.Release(); }
    }

    [HttpDelete("{runId}"), EnableRateLimiting("wechat-reminders")]
    public async Task<IActionResult> Cancel([StringLength(100, MinimumLength = 1)] string runId, CancellationToken cancellationToken,
        [FromQuery, Range(1, 253402300799999)] long? expectedDeadline = null)
    {
        await gate.Semaphore.WaitAsync(cancellationToken);
        try
        {
            var pending = db.WeChatPomodoroReminders.Where(r => r.Owner == Owner && r.RunId == runId && (r.Status == "pending" || r.Status == "paused"));
            if (expectedDeadline is not null) pending = pending.Where(r => r.SourceDeadline == expectedDeadline.Value);
            await pending.ExecuteUpdateAsync(s => s.SetProperty(r => r.Status, "cancelled").SetProperty(r => r.ErrorCode, "user_cancelled")
                .SetProperty(r => r.Revision, Guid.NewGuid().ToString("N")).SetProperty(r => r.UpdatedAtEpoch, DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()), cancellationToken);
            return NoContent();
        }
        finally { gate.Semaphore.Release(); }
    }
}

public sealed class WeChatPomodoroInput
{
    [Required, StringLength(100, MinimumLength = 1), RegularExpression(@"^[A-Za-z0-9_:-]+$")] public string RunId { get; set; } = "";
    // Each name represents an individual template accepted in the gesture that
    // triggered this request. A partial WeChat acceptance only grants that subset.
    [Required, MinLength(1), MaxLength(3)] public string[] Events { get; set; } = [];
}
