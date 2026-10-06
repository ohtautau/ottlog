using System.ComponentModel.DataAnnotations;
using System.Net;
using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Ottlog.Api.Data;

namespace Ottlog.Api.Controllers;

[ApiController, Route("api/auth"), AutoValidateAntiforgeryToken]
public sealed class AuthController(BlogDb db, IAntiforgery antiforgery, IWebHostEnvironment env) : ControllerBase
{
    private static readonly SemaphoreSlim Gate = new(1, 1);
    private bool LocalSetupAllowed() => env.IsDevelopment()
        && HttpContext.Connection.RemoteIpAddress is { } ip && IPAddress.IsLoopback(ip)
        && (!Request.Headers.TryGetValue("Origin", out var origin)
            || (Uri.TryCreate(origin.ToString(), UriKind.Absolute, out var uri) && uri.IsLoopback));

    [HttpGet("session")]
    public async Task<IActionResult> Session()
    {
        Response.Headers.CacheControl = "no-store";
        return Ok(new { authenticated = User.IsInRole("admin"), userName = User.Identity?.Name,
            needsSetup = !await db.Administrators.AnyAsync() && LocalSetupAllowed(),
            csrfToken = antiforgery.GetAndStoreTokens(HttpContext).RequestToken });
    }

    [HttpPost("setup"), EnableRateLimiting("login")]
    public async Task<IActionResult> Setup(Credentials input)
    {
        if (!LocalSetupAllowed()) return NotFound();
        if (input.Password.Length < 12) return BadRequest(new { title = "密码至少需要 12 个字符" });
        await Gate.WaitAsync();
        try
        {
            if (await db.Administrators.AnyAsync()) return Conflict(new { title = "管理员已创建，请登录" });
            if (await db.Readers.AnyAsync(r => r.UserName == input.UserName.ToLower())) return Conflict(new { title = "该用户名不可用" });
            var admin = new Administrator { UserName = input.UserName.Trim() };
            admin.PasswordHash = new PasswordHasher<Administrator>().HashPassword(admin, input.Password);
            db.Administrators.Add(admin);
            await db.SaveChangesAsync();
            await SignIn(admin);
            return Ok(new { admin.UserName });
        }
        finally { Gate.Release(); }
    }

    [HttpPost("login"), EnableRateLimiting("login")]
    public async Task<IActionResult> Login(Credentials input)
    {
        await Gate.WaitAsync();
        try
        {
            var admin = await db.Administrators.SingleOrDefaultAsync(a => a.UserName == input.UserName.Trim());
            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            if (admin is null || admin.LockedUntil > now) return Unauthorized(new { title = "账号或密码不正确，或暂时已锁定" });
            if (new PasswordHasher<Administrator>().VerifyHashedPassword(admin, admin.PasswordHash, input.Password) == PasswordVerificationResult.Failed)
            {
                admin.FailedLogins++;
                if (admin.FailedLogins >= 5) { admin.LockedUntil = now + 900; admin.FailedLogins = 0; }
                await db.SaveChangesAsync();
                return Unauthorized(new { title = "账号或密码不正确，或暂时已锁定" });
            }
            admin.FailedLogins = 0;
            admin.LockedUntil = 0;
            await db.SaveChangesAsync();
            await SignIn(admin);
            return Ok(new { admin.UserName });
        }
        finally { Gate.Release(); }
    }

    [HttpPost("logout"), Authorize]
    public async Task<IActionResult> Logout() { await HttpContext.SignOutAsync(); return NoContent(); }

    [HttpPost("password"), Authorize(Roles = "admin")]
    public async Task<IActionResult> Password(ChangePassword input)
    {
        var admin = await db.Administrators.SingleAsync();
        if (new PasswordHasher<Administrator>().VerifyHashedPassword(admin, admin.PasswordHash, input.CurrentPassword) == PasswordVerificationResult.Failed)
            return BadRequest(new { title = "当前密码不正确" });
        admin.PasswordHash = new PasswordHasher<Administrator>().HashPassword(admin, input.NewPassword);
        admin.SecurityStamp = Guid.NewGuid().ToString("N");
        await db.SaveChangesAsync();
        await HttpContext.SignOutAsync();
        return NoContent();
    }

    private Task SignIn(Administrator admin) => HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme,
        new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, admin.Id.ToString()),
            new Claim(ClaimTypes.Name, admin.UserName), new Claim("stamp", admin.SecurityStamp), new Claim(ClaimTypes.Role, "admin")], CookieAuthenticationDefaults.AuthenticationScheme)));
}
public record Credentials([Required, StringLength(50, MinimumLength = 3), RegularExpression(@"[a-zA-Z0-9_-]+") ] string UserName,
    [Required, StringLength(128)] string Password);
public record ChangePassword([Required, StringLength(128)] string CurrentPassword,
    [Required, StringLength(128, MinimumLength = 12)] string NewPassword);
