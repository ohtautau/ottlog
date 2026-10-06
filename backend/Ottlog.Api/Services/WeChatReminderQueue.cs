using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Ottlog.Api.Data;

namespace Ottlog.Api.Services;

public sealed class WeChatReminderQueue(BlogDb db)
{
    // Called while holding the gate after a task save, and again immediately before dispatch.
    public async Task CancelStaleAsync(string owner, string todosJson, CancellationToken cancellationToken)
    {
        var pending = await db.WeChatReminders.Where(r => r.Owner == owner && r.Status == "pending").ToListAsync(cancellationToken);
        foreach (var reminder in pending.Where(r => WeChatTodoSnapshot.Find(todosJson, r.TaskId, r.RemindAtEpoch) is null))
        {
            reminder.Status = "cancelled";
            reminder.ErrorCode = "task_changed";
            reminder.Revision = Guid.NewGuid().ToString("N");
            reminder.UpdatedAtEpoch = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        }
        await db.SaveChangesAsync(cancellationToken);
    }
}

public sealed class WeChatReminderWorker(IServiceScopeFactory scopes, WeChatReminderGate gate,
    IWeChatReminderClient client, IOptions<WeChatReminderOptions> configured, ILogger<WeChatReminderWorker> logger) : BackgroundService
{
    private readonly WeChatReminderOptions options = configured.Value;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.Enabled) return;
        while (!stoppingToken.IsCancellationRequested)
        {
            try { await DispatchDueAsync(stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            // HTTP exception messages can contain URLs with credentials, so never log the exception itself.
            catch (Exception e) { logger.LogError("WeChat reminder dispatch interrupted ({ErrorType})", e.GetType().Name); }
            try { await Task.Delay(TimeSpan.FromSeconds(Math.Clamp(options.PollSeconds, 1, 60)), stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
        }
    }

    public async Task DispatchDueAsync(CancellationToken cancellationToken)
    {
        if (!options.Enabled) return;
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BlogDb>();
        var tools = scope.ServiceProvider.GetService<IPersonalToolStore>() ?? new SqlitePersonalToolStore(db);
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        // A crashed process may have sent a message. Expired claims are terminal, never requeued.
        await db.WeChatReminders.Where(r => r.Status == "dispatching" && r.UpdatedAtEpoch < now - 120_000)
            .ExecuteUpdateAsync(s => s.SetProperty(r => r.Status, "unknown").SetProperty(r => r.ErrorCode, "delivery_unconfirmed")
                .SetProperty(r => r.UpdatedAtEpoch, now), cancellationToken);
        var due = await db.WeChatReminders.AsNoTracking().Where(r => r.Status == "pending" && r.RemindAtEpoch <= now)
            .OrderBy(r => r.RemindAtEpoch).Take(50).ToListAsync(cancellationToken);
        foreach (var reminder in due)
        {
            await gate.Semaphore.WaitAsync(cancellationToken);
            try
            {
                var current = db.WeChatReminders.Where(r => r.Owner == reminder.Owner && r.TaskId == reminder.TaskId && r.Revision == reminder.Revision);
                var claim = await current.Where(r => r.Status == "pending").ExecuteUpdateAsync(s => s.SetProperty(r => r.Status, "dispatching")
                    .SetProperty(r => r.UpdatedAtEpoch, now), cancellationToken);
                if (claim == 0) continue;
                var json = await tools.ReadAsync(reminder.Owner, "todos", cancellationToken);
                var task = WeChatTodoSnapshot.Find(json, reminder.TaskId, reminder.RemindAtEpoch);
                var binding = await db.WeChatBindings.AsNoTracking().SingleOrDefaultAsync(b => b.Owner == reminder.Owner, cancellationToken);
                WeChatSendResult result;
                if (task is null) result = new("cancelled", "task_changed");
                else if (binding is null || binding.OpenId != reminder.OpenId || binding.AppId != reminder.AppId)
                    result = new("cancelled", "binding_changed");
                else if (reminder.AppId != options.AppId || reminder.TemplateId != options.TodoTemplateId)
                    result = new("cancelled", "configuration_changed");
                else if (reminder.RemindAtEpoch < now - 86_400_000)
                    result = new("failed", "reminder_expired");
                else result = await client.SendAsync(reminder, task, cancellationToken);
                await current.Where(r => r.Status == "dispatching").ExecuteUpdateAsync(s => s.SetProperty(r => r.Status, result.Status)
                    .SetProperty(r => r.ErrorCode, result.ErrorCode).SetProperty(r => r.UpdatedAtEpoch, DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()), cancellationToken);
            }
            finally { gate.Semaphore.Release(); }
        }
    }
}
