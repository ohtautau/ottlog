using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Ottlog.Api.Data;

namespace Ottlog.Api.Services;

public sealed class WeChatPomodoroQueue(BlogDb db)
{
    // Called with the same gate as timer saves and sends. Pausing retains an
    // unused grant; resuming moves its time without asking for another grant.
    public async Task ReconcileAsync(string owner, string? json, CancellationToken cancellationToken)
    {
        var pending = await db.WeChatPomodoroReminders.Where(r => r.Owner == owner && (r.Status == "pending" || r.Status == "paused"))
            .ToListAsync(cancellationToken);
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        foreach (var row in pending)
        {
            var plan = WeChatPomodoroSnapshot.Find(json, row.RunId, row.Event);
            Apply(row, plan, now);
        }
        await db.SaveChangesAsync(cancellationToken);
    }

    public static void Apply(WeChatPomodoroReminder row, WeChatPomodoroPlan? plan, long now)
    {
        var status = plan is null ? "cancelled" : plan.Paused ? "paused" : plan.ExpiresAtEpoch is null || plan.ExpiresAtEpoch <= now ? "failed" : "pending";
        var error = plan is null ? "timer_changed" : status == "failed" ? "event_expired" : null;
        var at = plan?.RemindAtEpoch ?? row.RemindAtEpoch;
        var deadline = plan?.SourceDeadline ?? row.SourceDeadline;
        if (row.Status == status && row.ErrorCode == error && row.RemindAtEpoch == at && row.SourceDeadline == deadline) return;
        row.Status = status;
        row.ErrorCode = error;
        row.RemindAtEpoch = at;
        row.SourceDeadline = deadline;
        row.UpdatedAtEpoch = now;
        row.Revision = Guid.NewGuid().ToString("N");
    }
}

public sealed class WeChatPomodoroWorker(IServiceScopeFactory scopes, WeChatReminderGate gate,
    IWeChatReminderClient client, IOptions<WeChatReminderOptions> configured, ILogger<WeChatPomodoroWorker> logger) : BackgroundService
{
    private readonly WeChatReminderOptions options = configured.Value;
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.PomodoroEnabled) return;
        while (!stoppingToken.IsCancellationRequested)
        {
            try { await DispatchDueAsync(stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception e) { logger.LogError("WeChat pomodoro dispatch interrupted ({ErrorType})", e.GetType().Name); }
            try { await Task.Delay(TimeSpan.FromSeconds(Math.Clamp(options.PollSeconds, 1, 60)), stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
        }
    }

    public async Task DispatchDueAsync(CancellationToken cancellationToken)
    {
        if (!options.PomodoroEnabled) return;
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BlogDb>();
        var tools = scope.ServiceProvider.GetService<IPersonalToolStore>() ?? new SqlitePersonalToolStore(db);
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        await db.WeChatPomodoroReminders.Where(r => r.Status == "dispatching" && r.UpdatedAtEpoch < now - 120_000)
            .ExecuteUpdateAsync(s => s.SetProperty(r => r.Status, "unknown").SetProperty(r => r.ErrorCode, "delivery_unconfirmed")
                .SetProperty(r => r.UpdatedAtEpoch, now), cancellationToken);
        var due = await db.WeChatPomodoroReminders.AsNoTracking().Where(r => r.Status == "pending" && r.RemindAtEpoch <= now)
            .OrderBy(r => r.RemindAtEpoch).Take(50).ToListAsync(cancellationToken);
        foreach (var item in due)
        {
            await gate.Semaphore.WaitAsync(cancellationToken);
            try
            {
                var json = await tools.ReadAsync(item.Owner, "pomodoro", cancellationToken);
                await new WeChatPomodoroQueue(db).ReconcileAsync(item.Owner, json, cancellationToken);
                var row = await db.WeChatPomodoroReminders.AsNoTracking().SingleAsync(r => r.Owner == item.Owner && r.RunId == item.RunId && r.Event == item.Event, cancellationToken);
                now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                if (row.Status != "pending" || row.RemindAtEpoch > now) continue;
                var current = db.WeChatPomodoroReminders.Where(r => r.Owner == row.Owner && r.RunId == row.RunId && r.Event == row.Event && r.Revision == row.Revision);
                var claimed = await current.Where(r => r.Status == "pending").ExecuteUpdateAsync(s => s.SetProperty(r => r.Status, "dispatching")
                    .SetProperty(r => r.UpdatedAtEpoch, now), cancellationToken);
                if (claimed == 0) continue;
                var plan = WeChatPomodoroSnapshot.Find(json, row.RunId, row.Event);
                var binding = await db.WeChatBindings.AsNoTracking().SingleOrDefaultAsync(b => b.Owner == row.Owner, cancellationToken);
                WeChatSendResult result;
                if (plan is null || plan.Paused) result = new("cancelled", "timer_changed");
                else if (binding is null || binding.OpenId != row.OpenId || binding.AppId != row.AppId) result = new("cancelled", "binding_changed");
                else if (row.AppId != options.AppId || row.TemplateId != options.PomodoroTemplate(row.Event)) result = new("cancelled", "configuration_changed");
                else if (plan.ExpiresAtEpoch <= now) result = new("failed", "event_expired");
                else result = await client.SendPomodoroAsync(row, plan, cancellationToken);
                await current.Where(r => r.Status == "dispatching").ExecuteUpdateAsync(s => s.SetProperty(r => r.Status, result.Status)
                    .SetProperty(r => r.ErrorCode, result.ErrorCode).SetProperty(r => r.UpdatedAtEpoch, DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()), cancellationToken);
            }
            finally { gate.Semaphore.Release(); }
        }
    }
}
