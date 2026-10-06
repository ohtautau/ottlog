using System.Net;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Ottlog.Api.Controllers;
using Ottlog.Api.Data;
using Ottlog.Api.Services;

var file = Path.Combine(Path.GetTempPath(), "ottlog-reminders-" + Guid.NewGuid().ToString("N") + ".db");
var handler = new FakeWeChat();
var settings = new WeChatReminderOptions { AppId = "fake-app", AppSecret = "fake-secret", TodoTemplateId = "fake-template", TitleField = "thing1", TimeField = "time2", NoteField = "thing3" };
var services = new ServiceCollection();
services.AddDbContext<BlogDb>(o => o.UseSqlite(new SqliteConnectionStringBuilder { DataSource = file }.ToString()));
services.AddSingleton<IOptions<WeChatReminderOptions>>(Options.Create(settings));
services.AddSingleton<WeChatReminderGate>();
services.AddScoped<WeChatReminderQueue>();
services.AddSingleton<IHttpClientFactory>(new FakeFactory(handler));
services.AddSingleton<IWeChatReminderClient, WeChatReminderClient>();
using var provider = services.BuildServiceProvider();
var worker = new WeChatReminderWorker(provider.GetRequiredService<IServiceScopeFactory>(), provider.GetRequiredService<WeChatReminderGate>(),
    provider.GetRequiredService<IWeChatReminderClient>(), Options.Create(settings), NullLogger<WeChatReminderWorker>.Instance);
var assertions = 0;
void Check(bool condition, string message) { if (!condition) throw new Exception(message); assertions++; }
async Task Db(Func<BlogDb, Task> action) { using var scope = provider.CreateScope(); await action(scope.ServiceProvider.GetRequiredService<BlogDb>()); }
async Task<IActionResult> Api(string id, Func<WeChatRemindersController, Task<IActionResult>> action)
{
    using var scope = provider.CreateScope();
    var controller = new WeChatRemindersController(scope.ServiceProvider.GetRequiredService<BlogDb>(), provider.GetRequiredService<WeChatReminderGate>(),
        provider.GetRequiredService<IWeChatReminderClient>(), Options.Create(settings));
    controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity([
        new Claim(ClaimTypes.NameIdentifier, id), new Claim(ClaimTypes.Role, "reader")], "test")) } };
    return await action(controller);
}
object Todo(string id, DateTimeOffset time, bool done = false) => new { id, title = "🙂" + new string('长', 40), description = "备注", reminderAt = time.ToString("O"), completedAt = done ? time.ToString("O") : null };
async Task State(string owner, params object[] tasks)
{
    await Db(async db =>
    {
        var state = await db.PersonalToolStates.FindAsync(owner, "todos");
        if (state is null) { state = new PersonalToolState { Owner = owner, Key = "todos" }; db.PersonalToolStates.Add(state); }
        state.DataJson = JsonSerializer.Serialize(new { tasks });
        await db.SaveChangesAsync();
    });
}
async Task Seed(string id, DateTimeOffset time, string status = "pending", long? updated = null)
{
    await State("reader:a", Todo(id, time));
    await Db(async db =>
    {
        db.WeChatReminders.Add(new WeChatReminder { Owner = "reader:a", TaskId = id, AppId = settings.AppId, OpenId = "fake-openid-a", TemplateId = settings.TodoTemplateId,
            RemindAtEpoch = time.ToUnixTimeMilliseconds(), UpdatedAtEpoch = updated ?? DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(), Status = status });
        await db.SaveChangesAsync();
    });
}
async Task<string> Status(string id)
{
    string value = "";
    await Db(async db => value = (await db.WeChatReminders.FindAsync("reader:a", id))!.Status);
    return value;
}

try
{
    await Db(db => db.Database.MigrateAsync());
    Check(!new WeChatReminderOptions().Enabled, "missing credentials must disable reminders");
    Check(!new WeChatReminderOptions { AppId = "a", AppSecret = "b", TodoTemplateId = "c", TitleField = "time1", TimeField = "time2" }.Enabled, "invalid template mapping");
    Check(!WeChatTodoSnapshot.TryDate("2026-09-14T12:00:00", out _), "must reject timezone-free dates");
    Check(!WeChatTodoSnapshot.TryDate("2026-02-30T12:00:00Z", out _), "must reject invalid dates");
    Check(await Api("a", c => c.Bind(new() { Code = "a" }, default)) is OkObjectResult, "bind verified WeChat code");
    Check(await Api("b", c => c.Bind(new() { Code = "a" }, default)) is ConflictObjectResult, "one WeChat identity cannot cross accounts");
    Check(await Api("b", c => c.Bind(new() { Code = "b" }, default)) is OkObjectResult, "bind second account");
    var future = DateTimeOffset.UtcNow.AddHours(1);
    await State("reader:a", Todo("task1", future));
    var input = new WeChatReminderInput { TaskId = "task1", RemindAt = future.ToString("O"), SubscriptionGranted = true };
    Check(await Api("b", c => c.Schedule(input, default)) is ConflictObjectResult, "cannot schedule another owner's task");
    Check(await Api("a", c => c.Schedule(new() { TaskId = "task1", RemindAt = input.RemindAt }, default)) is BadRequestObjectResult, "requires per-reminder consent");
    Check(await Api("a", c => c.Schedule(new() { TaskId = "task1", RemindAt = future.AddMinutes(1).ToString("O"), SubscriptionGranted = true }, default)) is ConflictObjectResult, "reminder must match saved task time");
    Check(await Api("a", c => c.Schedule(input, default)) is OkObjectResult, "schedule future reminder");
    Check(await Api("a", c => c.Schedule(input, default)) is OkObjectResult, "idempotent request");
    await Db(async db => Check(await db.WeChatReminders.CountAsync() == 1, "one persisted schedule"));
    Check(await Api("b", c => c.Cancel("task1", default)) is NoContentResult && await Status("task1") == "pending", "cancel isolated by account");
    Check(await Api("a", c => c.Cancel("task1", default, future.AddMinutes(-5).ToString("O"))) is NoContentResult && await Status("task1") == "pending", "late cancellation for old time cannot cancel new reminder");
    Check(await Api("a", c => c.Cancel("task1", default, "invalid-time")) is BadRequestObjectResult && await Status("task1") == "pending", "invalid expected cancellation time rejected");
    var otherList = (OkObjectResult)await Api("b", c => c.List(default));
    Check(JsonSerializer.Serialize(otherList.Value).Contains("\"reminders\":[]"), "list isolated by account");
    await State("reader:a", Todo("task1", future, true));
    await Db(async db => await new WeChatReminderQueue(db).CancelStaleAsync("reader:a", (await db.PersonalToolStates.FindAsync("reader:a", "todos"))!.DataJson, default));
    Check(await Status("task1") == "cancelled", "completing task cancels queued reminder");

    var due = DateTimeOffset.UtcNow.AddSeconds(-10);
    await Seed("deleted", due);
    await State("reader:a");
    await worker.DispatchDueAsync(default);
    Check(await Status("deleted") == "cancelled" && handler.Sends == 0, "deleted task never sent");
    await Seed("changed", due);
    await State("reader:a", Todo("changed", due.AddMinutes(30)));
    await worker.DispatchDueAsync(default);
    Check(await Status("changed") == "cancelled" && handler.Sends == 0, "changed reminder time never sends stale job");
    await Seed("success", due);
    await worker.DispatchDueAsync(default);
    Check(await Status("success") == "sent" && handler.Sends == 1, "successful send recorded");
    await worker.DispatchDueAsync(default);
    Check(handler.Sends == 1, "sent reminder never sent twice");
    var payload = JsonDocument.Parse(handler.LastBody!);
    Check(payload.RootElement.GetProperty("data").GetProperty("thing1").GetProperty("value").GetString()!.EnumerateRunes().Count() == 20, "template title limits count Unicode runes");
    Check(payload.RootElement.GetProperty("data").GetProperty("time2").GetProperty("value").GetString() == due.ToOffset(TimeSpan.FromHours(8)).ToString("yyyy-MM-dd HH:mm"), "display time honors UTC+8");
    Check(!handler.LastBody!.Contains(settings.AppSecret), "subscription payload has no app secret");
    handler.ErrorCode = 43101;
    await Seed("denied", due);
    await worker.DispatchDueAsync(default);
    Check(await Status("denied") == "failed", "WeChat subscription quota failure recorded");
    handler.ErrorCode = 0;
    handler.Timeout = true;
    await Seed("timeout", due);
    await worker.DispatchDueAsync(default);
    Check(await Status("timeout") == "unknown", "timeout delivery remains unknown");
    var sent = handler.Sends;
    await worker.DispatchDueAsync(default);
    Check(handler.Sends == sent, "unknown outcomes never blindly retry");
    handler.Timeout = false;
    await Seed("crash", due, "dispatching", DateTimeOffset.UtcNow.AddMinutes(-5).ToUnixTimeMilliseconds());
    await worker.DispatchDueAsync(default);
    Check(await Status("crash") == "unknown" && handler.Sends == sent, "crashed in-flight delivery never blindly retried");
    await Seed("expired", DateTimeOffset.UtcNow.AddDays(-2));
    await worker.DispatchDueAsync(default);
    Check(await Status("expired") == "failed" && handler.Sends == sent, "expired backlog is not delivered days late");
    await Seed("rebound", due);
    Check(await Api("a", c => c.Bind(new() { Code = "replacement" }, default)) is OkObjectResult, "allow verified binding update");
    await worker.DispatchDueAsync(default);
    Check(await Status("rebound") == "cancelled" && handler.Sends == sent, "rebinding invalidates previous recipient jobs");
    Check(handler.Tokens == 1, "access token cached across reminders");
    settings.TimeField = "character_string2";
    settings.ReasonField = "thing9";
    settings.NoteField = "thing10";
    Check(settings.Enabled, "memo template character string and reason mapping accepted");
    settings.ReasonField = "thing10";
    Check(!settings.Enabled, "duplicate reason and note fields rejected");
    settings.ReasonField = "time9";
    Check(!settings.Enabled, "reason must be a thing field");
    settings.ReasonField = "thing9";
    var memoJson = JsonSerializer.Serialize(new { tasks = new[] { new {
        id = "memo", title = "提交周报", description = "检查附件", dueDate = "2026-10-01", dueTime = "18:30",
        reminderAt = due.ToString("O"), completedAt = (string?)null
    } } });
    var memo = WeChatTodoSnapshot.Find(memoJson, "memo", due.ToUnixTimeMilliseconds());
    Check(memo?.DeadlineText == "2026-10-01T18:30", "deadline parsed independently from reminder time");
    Check(WeChatTodoSnapshot.Find(memoJson.Replace("18:30", ""), "memo", due.ToUnixTimeMilliseconds())?.DeadlineText == "2026-10-01", "date-only deadline preserved");
    Check(WeChatTodoSnapshot.Find(memoJson.Replace("2026-10-01", "2026-02-30"), "memo", due.ToUnixTimeMilliseconds())?.DeadlineText == "-", "invalid deadline uses absent marker");
    var memoReminder = new WeChatReminder { OpenId = "fake-openid-a", TemplateId = "memo-template", RemindAtEpoch = due.ToUnixTimeMilliseconds() };
    var client = provider.GetRequiredService<IWeChatReminderClient>();
    Check((await client.SendAsync(memoReminder, memo!, default)).Status == "sent", "memo template sends successfully");
    using (var message = JsonDocument.Parse(handler.LastBody!))
    {
        var data = message.RootElement.GetProperty("data");
        Check(data.EnumerateObject().Count() == 4, "memo supplies all four template fields");
        Check(data.GetProperty("character_string2").GetProperty("value").GetString() == "2026-10-01T18:30", "memo displays deadline instead of notification time");
        Check(data.GetProperty("thing9").GetProperty("value").GetString() == "已到你设置的提醒时间", "reason supplied separately");
        Check(data.GetProperty("thing10").GetProperty("value").GetString() == "检查附件", "task description used as note");
    }
    await client.SendAsync(memoReminder, new("无截止时间任务", ""), default);
    using (var message = JsonDocument.Parse(handler.LastBody!))
    {
        var data = message.RootElement.GetProperty("data");
        Check(data.GetProperty("character_string2").GetProperty("value").GetString() == "-", "missing deadline does not invent one");
        Check(data.GetProperty("thing10").GetProperty("value").GetString() == "请打开小程序查看任务", "blank note gets nonempty fallback");
    }
    settings.TimeField = "time2";
    settings.ReasonField = "";
    settings.NoteField = "thing3";
    assertions += await PomodoroChecks.RunAsync(provider, settings, handler);
    assertions += await SupabaseChecks.RunAsync();
    Console.WriteLine($"PASS: {assertions} checks; isolated SQLite migration, account isolation, scheduling, cancellation, Unicode/timezone payload, fake WeChat delivery and timeout recovery.");
}
finally
{
    await provider.DisposeAsync();
    SqliteConnection.ClearAllPools();
    foreach (var suffix in new[] { "", "-wal", "-shm" }) File.Delete(file + suffix);
}

sealed class FakeFactory(FakeWeChat handler) : IHttpClientFactory
{
    public HttpClient CreateClient(string name) => new(handler, disposeHandler: false) { BaseAddress = new Uri("https://api.weixin.qq.com/") };
}
sealed class FakeWeChat : HttpMessageHandler
{
    public int Sends { get; private set; }
    public int Tokens { get; private set; }
    public int ErrorCode { get; set; }
    public bool Timeout { get; set; }
    public string? LastBody { get; private set; }
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var path = request.RequestUri!.AbsolutePath;
        object data;
        if (path == "/sns/jscode2session")
        {
            var query = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(request.RequestUri.Query);
            data = new { openid = "fake-openid-" + query["js_code"], session_key = "never-persist-this" };
        }
        else if (path == "/cgi-bin/token") { Tokens++; data = new { access_token = "fake-token", expires_in = 7200 }; }
        else if (path == "/cgi-bin/message/subscribe/send")
        {
            Sends++;
            LastBody = await request.Content!.ReadAsStringAsync(cancellationToken);
            if (Timeout) throw new TaskCanceledException("simulated ambiguous delivery timeout");
            data = new { errcode = ErrorCode };
        }
        else throw new Exception("Unexpected network request: " + path);
        return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(JsonSerializer.Serialize(data)) };
    }
}
