using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using Ottlog.Api.Data;
using Ottlog.Api.Services;

namespace Ottlog.Api.Controllers;

[ApiController, Route("api/personal-tools"), Authorize(Roles = "admin,reader"), AutoValidateAntiforgeryToken]
[ResponseCache(Location = ResponseCacheLocation.None, NoStore = true)]
[PersonalToolPayloadLimit]
public sealed class PersonalToolsController(BlogDb db, WeChatReminderGate reminderGate, WeChatReminderQueue reminderQueue,
    WeChatPomodoroQueue pomodoroQueue, IPersonalToolStore? toolStore = null) : ControllerBase
{
    private readonly IPersonalToolStore tools = toolStore ?? new SqlitePersonalToolStore(db);
    private const int MaximumDataBytes = 1024 * 1024;
    private string Owner => (User.IsInRole("admin") ? "admin:" : "reader:") + User.FindFirstValue(ClaimTypes.NameIdentifier);
    private static bool IsKnownKey(string key) => key is "meals" or "reminders" or "todos" or "pomodoro" or "memos" or "dining" or "mottos" or "growth" or "domains";

    [HttpGet("{key}")]
    public async Task<IActionResult> Get(string key, CancellationToken cancellationToken)
    {
        if (!IsKnownKey(key)) return NotFound();
        var json = await tools.ReadAsync(Owner, key, cancellationToken);
        return Ok(new { data = json is null ? (JsonElement?)null : JsonSerializer.Deserialize<JsonElement>(json) });
    }

    [HttpPut("{key}"), RequestSizeLimit(MaximumDataBytes + 1024)]
    public async Task<IActionResult> Put(string key, PersonalToolInput input, CancellationToken cancellationToken)
    {
        if (!IsKnownKey(key)) return NotFound();
        if (input.Data.ValueKind == JsonValueKind.Undefined)
            return BadRequest(new { title = "缺少要保存的数据" });
        // Only Tau's administrator account may extend the comparison restaurant library.
        if (key == "dining" && !User.IsInRole("admin"))
        {
            if (input.Data.ValueKind != JsonValueKind.Object ||
                !input.Data.TryGetProperty("customFoods", out var foods) ||
                foods.ValueKind != JsonValueKind.Array || foods.GetArrayLength() != 0)
                return StatusCode(403, new { title = "只有 Tau 可以添加比较餐单" });
        }
        var json = input.Data.GetRawText();
        var limit = key is "meals" ? 128 * 1024 : MaximumDataBytes;
        if (Encoding.UTF8.GetByteCount(json) > limit)
            return BadRequest(new { title = $"保存内容不能超过 {limit / 1024} KB" });

        // The composite key isolates accounts and tools; an atomic upsert also handles first-save races.
        if (key is "todos" or "pomodoro") await reminderGate.Semaphore.WaitAsync(cancellationToken);
        try
        {
            await tools.WriteAsync(Owner, key, json, cancellationToken);
            if (key == "todos") await reminderQueue.CancelStaleAsync(Owner, json, cancellationToken);
            if (key == "pomodoro") await pomodoroQueue.ReconcileAsync(Owner, json, cancellationToken);
        }
        finally { if (key is "todos" or "pomodoro") reminderGate.Semaphore.Release(); }
        return Ok(new { data = input.Data });
    }
}

public sealed class PersonalToolInput
{
    public JsonElement Data { get; set; }
}

// Preserve a useful client error when Kestrel rejects the body before JSON model binding completes.
public sealed class PersonalToolPayloadLimitAttribute : ExceptionFilterAttribute
{
    public override void OnException(ExceptionContext context)
    {
        if (context.Exception is BadHttpRequestException { StatusCode: StatusCodes.Status413PayloadTooLarge })
        {
            context.HttpContext.Response.Headers.CacheControl = "no-store";
            context.Result = new ObjectResult(new { title = "保存内容不能超过 1 MB" })
                { StatusCode = StatusCodes.Status413PayloadTooLarge };
            context.ExceptionHandled = true;
        }
    }
}
