using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Ottlog.Api.Data;
using Ottlog.Api.Services;

namespace Ottlog.Api.Controllers;

[ApiController, Route("api/wechat/reminders"), Authorize(Roles = "admin,reader"), AutoValidateAntiforgeryToken]
[ResponseCache(Location = ResponseCacheLocation.None, NoStore = true)]
public sealed class WeChatRemindersController(BlogDb db, WeChatReminderGate gate, IWeChatReminderClient client,
    IOptions<WeChatReminderOptions> configured, IPersonalToolStore? toolStore = null) : ControllerBase
{
    private readonly IPersonalToolStore tools = toolStore ?? new SqlitePersonalToolStore(db);
    private readonly WeChatReminderOptions options = configured.Value;
    private string Owner => (User.IsInRole("admin") ? "admin:" : "reader:") + User.FindFirstValue(ClaimTypes.NameIdentifier);

    [AllowAnonymous, HttpGet("config")]
    public IActionResult Config() => Ok(new { enabled = options.Enabled, templateId = options.Enabled ? options.TodoTemplateId : "",
        reason = options.DisabledReason, requiresSubscription = true });

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var reminders = await db.WeChatReminders.AsNoTracking().Where(r => r.Owner == Owner)
            .OrderByDescending(r => r.UpdatedAtEpoch).Take(500).ToListAsync(cancellationToken);
        return Ok(new { reminders = reminders.Select(r => r.View()) });
    }

    [HttpPost("bind"), EnableRateLimiting("wechat-reminders"), RequestSizeLimit(4096)]
    public async Task<IActionResult> Bind(WeChatBindInput input, CancellationToken cancellationToken)
    {
        if (!options.BindingEnabled) return StatusCode(503, new { title = "微信提醒尚未开通，请先配置小程序凭据和订阅消息模板" });
        string openId;
        try { openId = await client.ExchangeCodeAsync(input.Code, cancellationToken); }
        catch (WeChatApiException e) { return BadRequest(new { title = "微信身份校验失败，请重新授权", code = e.Code }); }
        catch (Exception e) when (e is HttpRequestException or OperationCanceledException or JsonException)
        { return StatusCode(502, new { title = "暂时无法连接微信，请稍后重试" }); }
        await gate.Semaphore.WaitAsync(cancellationToken);
        try
        {
            if (await db.WeChatBindings.AnyAsync(b => b.AppId == options.AppId && b.OpenId == openId && b.Owner != Owner, cancellationToken))
                return Conflict(new { title = "此微信已绑定其他账号" });
            var binding = await db.WeChatBindings.SingleOrDefaultAsync(b => b.Owner == Owner, cancellationToken);
            if (binding is null) db.WeChatBindings.Add(new WeChatBinding { Owner = Owner, AppId = options.AppId, OpenId = openId });
            else if (binding.OpenId != openId || binding.AppId != options.AppId)
            {
                binding.OpenId = openId;
                binding.AppId = options.AppId;
                await db.WeChatReminders.Where(r => r.Owner == Owner && r.Status == "pending")
                    .ExecuteUpdateAsync(s => s.SetProperty(r => r.Status, "cancelled").SetProperty(r => r.ErrorCode, "binding_changed"), cancellationToken);
                await db.WeChatPomodoroReminders.Where(r => r.Owner == Owner && (r.Status == "pending" || r.Status == "paused"))
                    .ExecuteUpdateAsync(s => s.SetProperty(r => r.Status, "cancelled").SetProperty(r => r.ErrorCode, "binding_changed"), cancellationToken);
            }
            try { await db.SaveChangesAsync(cancellationToken); }
            catch (DbUpdateException) { return Conflict(new { title = "此微信已绑定其他账号，请重新确认登录账号" }); }
            return Ok(new { bound = true });
        }
        finally { gate.Semaphore.Release(); }
    }

    [HttpPost, EnableRateLimiting("wechat-reminders"), RequestSizeLimit(4096)]
    public async Task<IActionResult> Schedule(WeChatReminderInput input, CancellationToken cancellationToken)
    {
        if (!options.Enabled) return StatusCode(503, new { title = options.DisabledReason });
        if (!input.SubscriptionGranted) return BadRequest(new { title = "请先同意这一次微信订阅提醒" });
        if (!WeChatTodoSnapshot.TryDate(input.RemindAt, out var remindAt) || remindAt <= DateTimeOffset.UtcNow || remindAt > DateTimeOffset.UtcNow.AddDays(366))
            return BadRequest(new { title = "提醒时间须为未来一年内、带时区的有效日期时间" });
        await gate.Semaphore.WaitAsync(cancellationToken);
        try
        {
            var binding = await db.WeChatBindings.AsNoTracking().SingleOrDefaultAsync(b => b.Owner == Owner && b.AppId == options.AppId, cancellationToken);
            if (binding is null) return Conflict(new { title = "请先绑定当前微信身份" });
            var json = await tools.ReadAsync(Owner, "todos", cancellationToken);
            var epoch = remindAt.ToUnixTimeMilliseconds();
            if (WeChatTodoSnapshot.Find(json, input.TaskId, epoch) is null)
                return Conflict(new { title = "请先保存同步未完成的任务及对应提醒时间" });
            var reminder = await db.WeChatReminders.SingleOrDefaultAsync(r => r.Owner == Owner && r.TaskId == input.TaskId, cancellationToken);
            if (reminder is not null && reminder.RemindAtEpoch == epoch && reminder.AppId == options.AppId &&
                reminder.OpenId == binding.OpenId && reminder.TemplateId == options.TodoTemplateId && reminder.Status != "cancelled")
                return Ok(reminder.View()); // Request retries cannot grant additional sends.
            if (await db.WeChatReminders.CountAsync(r => r.Owner == Owner && r.Status == "pending", cancellationToken) >= Math.Clamp(options.MaximumPendingPerAccount, 1, 500) && reminder?.Status != "pending")
                return Conflict(new { title = "待发送提醒已达上限，请先取消部分提醒" });
            if (reminder is null)
            {
                reminder = new WeChatReminder { Owner = Owner, TaskId = input.TaskId };
                db.WeChatReminders.Add(reminder);
            }
            reminder.AppId = options.AppId;
            reminder.OpenId = binding.OpenId;
            reminder.TemplateId = options.TodoTemplateId;
            reminder.RemindAtEpoch = epoch;
            reminder.UpdatedAtEpoch = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            reminder.Status = "pending";
            reminder.ErrorCode = null;
            reminder.Revision = Guid.NewGuid().ToString("N");
            await db.SaveChangesAsync(cancellationToken);
            return Ok(reminder.View());
        }
        finally { gate.Semaphore.Release(); }
    }

    [HttpDelete("{taskId}"), EnableRateLimiting("wechat-reminders")]
    public async Task<IActionResult> Cancel([StringLength(128, MinimumLength = 1)] string taskId, CancellationToken cancellationToken,
        [FromQuery, StringLength(40)] string? expectedRemindAt = null)
    {
        long? expectedEpoch = null;
        if (expectedRemindAt is not null)
        {
            if (!WeChatTodoSnapshot.TryDate(expectedRemindAt, out var expected)) return BadRequest(new { title = "原提醒时间格式无效" });
            expectedEpoch = expected.ToUnixTimeMilliseconds();
        }
        await gate.Semaphore.WaitAsync(cancellationToken);
        try
        {
            var pending = db.WeChatReminders.Where(r => r.Owner == Owner && r.TaskId == taskId && r.Status == "pending");
            if (expectedEpoch is not null) pending = pending.Where(r => r.RemindAtEpoch == expectedEpoch.Value);
            await pending
                .ExecuteUpdateAsync(s => s.SetProperty(r => r.Status, "cancelled").SetProperty(r => r.ErrorCode, "user_cancelled")
                    .SetProperty(r => r.Revision, Guid.NewGuid().ToString("N"))
                    .SetProperty(r => r.UpdatedAtEpoch, DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()), cancellationToken);
            return NoContent();
        }
        finally { gate.Semaphore.Release(); }
    }
}

public sealed class WeChatBindInput
{
    [Required, StringLength(512, MinimumLength = 1)] public string Code { get; set; } = "";
}

public sealed class WeChatReminderInput
{
    [Required, StringLength(128, MinimumLength = 1), RegularExpression(@"^[A-Za-z0-9_-]+$")] public string TaskId { get; set; } = "";
    [Required, StringLength(40)] public string RemindAt { get; set; } = "";
    public bool SubscriptionGranted { get; set; }
}
