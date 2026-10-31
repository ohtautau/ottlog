using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ottlog.Api.Data;
using Ottlog.Api.Services;

namespace Ottlog.Api.Controllers;

[ApiController, Route("api/account/bot-grants")]
[Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme, Roles = "admin,reader")]
[AutoValidateAntiforgeryToken, ResponseCache(Location = ResponseCacheLocation.None, NoStore = true)]
public sealed class BotGrantsController(BlogDb db, BotGrantStore grants) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List() => Ok(new { grants = (await db.BotGrants.AsNoTracking()
        .Where(g => g.Owner == BotGrantStore.Owner(User)).OrderByDescending(g => g.CreatedAt).ToListAsync()).Select(BotGrantStore.Summary) });

    [HttpPost]
    public async Task<IActionResult> Create(BotGrantInput input)
    {
        var name = input.Name.Trim();
        if (name.Length == 0) return BadRequest(new { title = "请输入授权名称" });
        if (await db.BotGrants.CountAsync(g => g.Owner == BotGrantStore.Owner(User) && g.RevokedAt == null) >= 20)
            return Conflict(new { title = "请先撤销不再使用的机器人授权" });
        var created = await grants.CreateAsync(User, name);
        if (created is null) return Unauthorized();
        var (grant, token) = created.Value;
        return StatusCode(201, new { grant.Id, grant.Name, grant.CreatedAt, token });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Revoke(string id)
    {
        var grant = await db.BotGrants.SingleOrDefaultAsync(g => g.Id == id && g.Owner == BotGrantStore.Owner(User));
        if (grant is null) return NotFound();
        grant.RevokedAt ??= DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        await db.SaveChangesAsync();
        return NoContent();
    }
}

public sealed class BotGrantInput
{
    [Required, StringLength(80)] public string Name { get; set; } = "";
}

[ApiController, Route("api/bot"), Authorize(AuthenticationSchemes = BotAuthenticationHandler.SchemeName)]
[ResponseCache(Location = ResponseCacheLocation.None, NoStore = true), PersonalToolPayloadLimit]
public sealed class BotController(BlogDb db, WeChatReminderGate gate, WeChatReminderQueue reminders,
    WeChatPomodoroQueue pomodoro, IPersonalToolStore tools) : ControllerBase
{
    private PersonalToolsController Tools => new(db, gate, reminders, pomodoro, tools) { ControllerContext = ControllerContext };

    [HttpGet("session")]
    public IActionResult Session() => Ok(new { authenticated = true, userName = User.Identity!.Name,
        isAdmin = User.IsInRole("admin"), grantId = User.FindFirstValue("bot_grant"), name = User.FindFirstValue("bot_name"),
        scopes = new[] { "todos:read", "todos:write", "memos:read", "memos:write", "reminders:read" } });

    [HttpGet("personal-tools/{key}")]
    public Task<IActionResult> Get(string key, CancellationToken cancellationToken) => key is "todos" or "memos" or "reminders"
        ? Tools.Get(key, cancellationToken) : Task.FromResult<IActionResult>(Forbid(BotAuthenticationHandler.SchemeName));

    [HttpPut("personal-tools/{key}"), RequestSizeLimit(1024 * 1024 + 1024)]
    public Task<IActionResult> Put(string key, PersonalToolInput input, CancellationToken cancellationToken) => key is "todos" or "memos"
        ? Tools.Put(key, input, cancellationToken) : Task.FromResult<IActionResult>(Forbid(BotAuthenticationHandler.SchemeName));

    [HttpDelete("grant")]
    public async Task<IActionResult> RevokeSelf()
    {
        await db.BotGrants.Where(g => g.Id == User.FindFirstValue("bot_grant") && g.RevokedAt == null)
            .ExecuteUpdateAsync(set => set.SetProperty(g => g.RevokedAt, DateTimeOffset.UtcNow.ToUnixTimeSeconds()));
        return NoContent();
    }
}
