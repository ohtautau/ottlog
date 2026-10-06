using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Ottlog.Api.Controllers;
using Ottlog.Api.Data;
using Ottlog.Api.Services;

static class PomodoroChecks
{
    public static async Task<int> RunAsync(ServiceProvider provider, WeChatReminderOptions options, FakeWeChat handler)
    {
        var checks = 0;
        void Check(bool okay, string detail) { if (!okay) throw new Exception(detail); checks++; }
        var gate = provider.GetRequiredService<WeChatReminderGate>();
        var client = provider.GetRequiredService<IWeChatReminderClient>();
        var worker = new WeChatPomodoroWorker(provider.GetRequiredService<IServiceScopeFactory>(), gate, client,
            Options.Create(options), NullLogger<WeChatPomodoroWorker>.Instance);
        async Task Db(Func<BlogDb, Task> run) { using var scope = provider.CreateScope(); await run(scope.ServiceProvider.GetRequiredService<BlogDb>()); }
        ControllerContext Context(string owner = "p") => new() { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, owner), new Claim(ClaimTypes.Role, "reader")], "test")) } };
        async Task<IActionResult> Api(Func<WeChatPomodoroController, Task<IActionResult>> run, string owner = "p")
        {
            using var scope = provider.CreateScope();
            var controller = new WeChatPomodoroController(scope.ServiceProvider.GetRequiredService<BlogDb>(), gate, Options.Create(options)) { ControllerContext = Context(owner) };
            return await run(controller);
        }
        async Task Bind(string owner)
        {
            using var scope = provider.CreateScope();
            var controller = new WeChatRemindersController(scope.ServiceProvider.GetRequiredService<BlogDb>(), gate, client, Options.Create(options)) { ControllerContext = Context(owner) };
            Check(await controller.Bind(new() { Code = owner }, default) is OkObjectResult, "pomodoro-only configuration must support verified binding");
        }
        async Task Save(object state)
        {
            using var scope = provider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<BlogDb>();
            var controller = new PersonalToolsController(db, gate, new(db), new(db)) { ControllerContext = Context() };
            Check(await controller.Put("pomodoro", new() { Data = JsonSerializer.SerializeToElement(state) }, default) is OkObjectResult, "save and reconcile timer snapshot");
        }
        async Task<WeChatPomodoroReminder[]> Rows(string run)
        {
            WeChatPomodoroReminder[] rows = [];
            await Db(async db => rows = await db.WeChatPomodoroReminders.AsNoTracking().Where(r => r.Owner == "reader:p" && r.RunId == run).ToArrayAsync());
            return rows;
        }
        async Task Schedule(string run, params string[] events) => Check(await Api(c => c.Schedule(new() { RunId = run, Events = events }, default)) is OkObjectResult, "schedule accepted event subset");
        object Snapshot(string run, long start, long? deadline, string mode = "focus", bool running = true, int count = 0,
            object[]? sessions = null, string transition = "autoBreak", bool empty = false) => new
        {
            version = 1, settings = new { focus = 25, shortBreak = 5, longBreak = 15, longEvery = 4, transitionMode = transition },
            completedFocusCount = count, mode, selection = new { taskId = (string?)null, title = "练习写作" },
            active = empty ? null : new { id = mode == "focus" ? run : "break:" + run, rootRunId = run, originFocusId = mode == "focus" ? null : run,
                mode, totalSeconds = mode == "focus" ? 1500 : mode == "longBreak" ? 900 : 300, remainingSeconds = 100,
                running, deadline, startedAt = DateTimeOffset.FromUnixTimeMilliseconds(start).ToString("O"), selection = new { title = "练习写作", taskId = (string?)null } },
            sessions = sessions ?? []
        };
        object Session(string run, string mode, long start, long end, bool completed = true) => new
        {
            id = mode == "focus" ? run : "break:" + run, rootRunId = run, originFocusId = mode == "focus" ? null : run,
            mode, durationSeconds = 300, plannedSeconds = 300, completed, title = "练习写作", taskId = (string?)null,
            startedAt = DateTimeOffset.FromUnixTimeMilliseconds(start).ToString("O"), endedAt = DateTimeOffset.FromUnixTimeMilliseconds(end).ToString("O")
        };

        Check(!options.PomodoroEnabled && !new WeChatReminderOptions().PomodoroEnabled, "unconfigured pomodoro is disabled");
        var originalTodoTemplate = options.TodoTemplateId;
        options.TodoTemplateId = "";
        options.PomodoroFocusTemplateId = "focus-template";
        options.PomodoroBreakStartTemplateId = "break-start-template";
        options.PomodoroBreakEndTemplateId = "break-end-template";
        options.PomodoroFocus = new() { TitleField = "thing4", TimeField = "time5", NoteField = "thing6" };
        options.PomodoroBreakStart = new() { TitleField = "thing7", TimeField = "time8" };
        options.PomodoroBreakEnd = new() { TitleField = "thing9", TimeField = "time10", NoteField = "thing11" };
        Check(options.PomodoroEnabled && !options.Enabled && options.BindingEnabled, "pomodoro configuration independent of todo template");
        options.PomodoroBreakEndTemplateId = options.PomodoroFocusTemplateId;
        Check(!options.PomodoroEnabled, "duplicate template IDs cannot grant separate event sends");
        options.PomodoroBreakEndTemplateId = "break-end-template";
        var config = (OkObjectResult)await Api(c => Task.FromResult(c.Config()));
        var configText = JsonSerializer.Serialize(config.Value);
        Check(configText.Contains("focus_start") && !configText.Contains(options.AppSecret) && !configText.Contains("thing4"), "public configuration only reveals event/template choices");
        await Bind("p");
        await Bind("q");

        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var start = now - 10_000;
        var deadline = start + 1_500_000;
        await Save(Snapshot("round", start, deadline, count: 3));
        Check(await Api(c => c.Schedule(new() { RunId = "round", Events = ["focus_start"] }, default), "q") is ConflictObjectResult, "other account cannot schedule private timer");
        Check(await Api(c => c.Schedule(new() { RunId = "wrong", Events = ["focus_start"] }, default)) is ConflictObjectResult, "stale run id rejected");
        Check(await Api(c => c.Schedule(new() { RunId = "round", Events = [] }, default)) is BadRequestObjectResult, "no consent means no events");
        Check(await Api(c => c.Schedule(new() { RunId = "round", Events = ["focus_start", "focus_start"] }, default)) is BadRequestObjectResult, "duplicate consent event rejected");
        await Schedule("round", "focus_start");
        Check((await Rows("round")).Length == 1, "partial grant schedules exactly its accepted event");
        await Schedule("round", "focus_start");
        var before = handler.Sends;
        await worker.DispatchDueAsync(default);
        Check(handler.Sends == before + 1 && (await Rows("round"))[0].Status == "sent", "focus start sent once immediately");
        using (var payload = JsonDocument.Parse(handler.LastBody!))
        {
            Check(payload.RootElement.GetProperty("page").GetString() == "pages/pomodoro/index" &&
                payload.RootElement.GetProperty("template_id").GetString() == "focus-template" &&
                payload.RootElement.GetProperty("data").GetProperty("thing4").GetProperty("value").GetString() == "专注开始", "event has correct page, distinct template and mapping");
        }
        await Schedule("round", PomodoroEvents.All);
        var rows = await Rows("round");
        Check(rows.Length == 3 && rows.Single(r => r.Event == "focus_start").Status == "sent", "already consumed focus grant cannot be replayed");
        Check(rows.Single(r => r.Event == "break_end").RemindAtEpoch == deadline + 900_000, "fourth focus schedules long rest using completed count");
        await Save(Snapshot("round", start, null, running: false, count: 3));
        Check((await Rows("round")).Count(r => r.Status == "paused") == 2, "pause keeps unsent grants and suppresses sends");
        await worker.DispatchDueAsync(default);
        Check(handler.Sends == before + 1, "paused timer produces no notification");
        var resumedDeadline = deadline + 60_000;
        await Save(Snapshot("round", start, resumedDeadline, count: 3));
        rows = await Rows("round");
        Check(rows.Count(r => r.Status == "pending") == 2 && rows.Single(r => r.Event == "break_end").RemindAtEpoch == resumedDeadline + 900_000,
            "resume reuses unsent grants with shifted deadlines");
        Check(await Api(c => c.Cancel("round", default, deadline)) is NoContentResult && (await Rows("round")).Count(r => r.Status == "pending") == 2,
            "late conditional cancellation cannot cancel resumed timing");
        var focusEnd = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - 5_000;
        await Save(Snapshot("round", focusEnd - 1_500_000, focusEnd, count: 3));
        await worker.DispatchDueAsync(default);
        Check((await Rows("round")).Single(r => r.Event == "break_start").Status == "sent" && handler.Sends == before + 2,
            "backgrounded overdue focus still sends its automatic break start");
        var focusHistory = Session("round", "focus", focusEnd - 1_500_000, focusEnd);
        await Save(Snapshot("round", focusEnd, focusEnd + 900_000, "longBreak", count: 4, sessions: [focusHistory]));
        Check((await Rows("round")).Single(r => r.Event == "break_end").Status == "pending", "client automatic transition preserves rest-end grant");
        await Save(Snapshot("round", focusEnd, null, "longBreak", running: false, count: 4, sessions: [focusHistory]));
        Check((await Rows("round")).Single(r => r.Event == "break_end").Status == "paused", "break pause retains rest-end grant");
        var resumedBreakEnd = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() + 300_000;
        await Save(Snapshot("round", focusEnd, resumedBreakEnd, "longBreak", count: 4, sessions: [focusHistory]));
        Check((await Rows("round")).Single(r => r.Event == "break_end").RemindAtEpoch == resumedBreakEnd, "break resume schedules current rest deadline");
        var restEnd = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - 1_000;
        await Save(Snapshot("round", focusEnd, restEnd, "longBreak", count: 4, sessions: [focusHistory]));
        await Save(Snapshot("round", focusEnd, null, count: 4, empty: true, sessions: [Session("round", "longBreak", focusEnd, restEnd), focusHistory]));
        await worker.DispatchDueAsync(default);
        Check((await Rows("round")).All(r => r.Status == "sent") && handler.Sends == before + 3, "natural rest completion race still delivers one rest-end notification");
        await worker.DispatchDueAsync(default);
        Check(handler.Sends == before + 3, "repeated dispatch cannot replay any event");

        await Save(Snapshot("cancel", start, deadline));
        await Schedule("cancel", "break_start", "break_end");
        Check(await Api(c => c.Cancel("cancel", default, deadline), "q") is NoContentResult && (await Rows("cancel")).All(r => r.Status == "pending"), "cancel isolated by owner");
        Check(await Api(c => c.Cancel("cancel", default, deadline)) is NoContentResult && (await Rows("cancel")).All(r => r.Status == "cancelled"), "matching reset cancellation terminates unsent grants");
        await Schedule("cancel", "break_start", "break_end");
        Check((await Rows("cancel")).All(r => r.Status == "cancelled"), "cancelled run/event ledger cannot be recreated");
        await Save(Snapshot("early", start, deadline));
        await Schedule("early", "break_end");
        await Save(Snapshot("early", start, null, empty: true, sessions: [Session("early", "focus", start, now, false)]));
        Check((await Rows("early")).Single().Status == "cancelled", "early focus finish invalidates predicted rest");
        await Save(Snapshot("expired", now - 300_000, deadline));
        await Schedule("expired", "focus_start");
        Check((await Rows("expired")).Single().ErrorCode == "event_expired", "late focus start is never sent after 120 seconds");
        await Save(Snapshot("manual", start, deadline, transition: "manual"));
        Check(await Api(c => c.Schedule(new() { RunId = "manual", Events = ["break_end"] }, default)) is ConflictObjectResult, "manual transition cannot predict a future break");
        await Schedule("manual", "focus_start");
        handler.Timeout = true;
        await worker.DispatchDueAsync(default);
        Check((await Rows("manual")).Single().Status == "unknown", "ambiguous pomodoro send remains terminal unknown");
        var timeoutSends = handler.Sends;
        await Schedule("manual", "focus_start");
        await worker.DispatchDueAsync(default);
        Check(handler.Sends == timeoutSends, "neither retry request nor worker can resend ambiguous event");
        handler.Timeout = false;
        await Save(Snapshot("crash", start, deadline));
        await Schedule("crash", "focus_start");
        await Db(db => db.WeChatPomodoroReminders.Where(r => r.RunId == "crash").ExecuteUpdateAsync(s => s.SetProperty(r => r.Status, "dispatching").SetProperty(r => r.UpdatedAtEpoch, now - 300_000)));
        await worker.DispatchDueAsync(default);
        Check((await Rows("crash")).Single().Status == "unknown" && handler.Sends == timeoutSends, "crashed in-flight event never resends after restart");
        Check(WeChatPomodoroSnapshot.Find("{\"settings\":{},\"active\":{\"deadline\":null}}", "x", "break_end") is null,
            "malformed snapshot rejected without throwing");
        Check(WeChatPomodoroSnapshot.Find(JsonSerializer.Serialize(Snapshot("extreme", now, 253402300799999)), "extreme", "break_end") is null,
            "extreme persisted dates cannot overflow reminder timestamps");
        await Save(Snapshot("background-end", now - 1_801_000, now - 301_000));
        await Schedule("background-end", "break_start", "break_end");
        var sendsBeforeRestEnd = handler.Sends;
        await worker.DispatchDueAsync(default);
        var backgroundRows = await Rows("background-end");
        Check(backgroundRows.Single(r => r.Event == "break_start").ErrorCode == "event_expired" &&
            backgroundRows.Single(r => r.Event == "break_end").Status == "sent" && handler.Sends == sendsBeforeRestEnd + 1,
            "backgrounded whole focus/rest sends current rest end without stale rest-start spam");
        options.TodoTemplateId = originalTodoTemplate;
        return checks;
    }
}
