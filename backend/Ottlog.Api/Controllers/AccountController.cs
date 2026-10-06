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

[ApiController, Route("api/account"), AutoValidateAntiforgeryToken]
public sealed class AccountController(BlogDb db, IAntiforgery antiforgery, IWebHostEnvironment env) : ControllerBase
{
    private static readonly SemaphoreSlim Gate = new(1, 1);
    [HttpGet("session")]
    [HttpGet("profile")]
    public IActionResult Session()
    {
        Response.Headers.CacheControl = "no-store";
        return Ok(new { authenticated = User.Identity?.IsAuthenticated == true, userName = User.Identity?.Name,
            isAdmin = User.IsInRole("admin"), csrfToken = Request.Path.Value!.EndsWith("/profile", StringComparison.Ordinal) ? "" : antiforgery.GetAndStoreTokens(HttpContext).RequestToken });
    }
    [HttpPost("register"), EnableRateLimiting("login")]
    public async Task<IActionResult> Register(Credentials input)
    {
        if (input.Password.Length < 12) return BadRequest(new { title = "密码至少 12 位" });
        if (await db.Administrators.AnyAsync(a => a.UserName.ToLower() == input.UserName.ToLower()))
            return Conflict(new { title = "该用户名不可用" });
        var reader = new Reader { UserName = input.UserName.ToLowerInvariant() };
        reader.PasswordHash = new PasswordHasher<Reader>().HashPassword(reader, input.Password);
        db.Readers.Add(reader);
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException) { return Conflict(new { title = "该用户名不可用" }); }
        await SignIn(reader); return Ok(new { reader.UserName });
    }
    [HttpPost("login"), EnableRateLimiting("login")]
    public async Task<IActionResult> Login(Credentials input)
    {
        // Both roles use this entrance; reuse the administrator's lockout and sign-in logic.
        var administrator = await db.Administrators.AsNoTracking().SingleOrDefaultAsync(a => a.UserName.ToLower() == input.UserName.ToLower());
        if (administrator is not null)
            return await new AuthController(db, antiforgery, env) { ControllerContext = ControllerContext }
                .Login(input with { UserName = administrator.UserName });
        await Gate.WaitAsync();
        try
        {
            var reader = await db.Readers.SingleOrDefaultAsync(r => r.UserName == input.UserName.ToLowerInvariant());
            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            if (reader is null || reader.LockedUntil > now) return Unauthorized(new { title = "账号密码错误，或暂时已锁定" });
            if (new PasswordHasher<Reader>().VerifyHashedPassword(reader, reader.PasswordHash, input.Password) == PasswordVerificationResult.Failed)
            {
                if (++reader.FailedLogins >= 5) { reader.LockedUntil = now + 900; reader.FailedLogins = 0; }
                await db.SaveChangesAsync(); return Unauthorized(new { title = "账号密码错误，或暂时已锁定" });
            }
            reader.FailedLogins = 0; reader.LockedUntil = 0;
            await db.SaveChangesAsync(); await SignIn(reader); return Ok(new { reader.UserName });
        }
        finally { Gate.Release(); }
    }
    [HttpPost("logout"), Authorize]
    public async Task<IActionResult> Logout() { await HttpContext.SignOutAsync(); return NoContent(); }
    private Task SignIn(Reader r) => HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme,
        new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, r.Id.ToString()),
            new Claim(ClaimTypes.Name, r.UserName), new Claim(ClaimTypes.Role, "reader"), new Claim("stamp", r.SecurityStamp)], CookieAuthenticationDefaults.AuthenticationScheme)));
}

[ApiController, Route("api/favorites"), Authorize, AutoValidateAntiforgeryToken]
public sealed class FavoritesController(BlogDb db) : ControllerBase
{
    private string Owner => (User.IsInRole("admin") ? "admin:" : "reader:") + User.FindFirstValue(ClaimTypes.NameIdentifier);
    [HttpGet]
    public async Task<IActionResult> List([FromQuery, System.ComponentModel.DataAnnotations.RegularExpression("^(web|mini)$")] string channel = "web")
    {
        Response.Headers.CacheControl = "no-store";
        return Ok(await (from f in db.Favorites.AsNoTracking() join p in db.Articles on f.ArticleId equals p.Id
            where f.Owner == Owner && (channel == "mini" ? p.PublishedMini : p.Published)
            orderby f.CreatedAt descending select new { p.Slug, p.Title }).ToListAsync());
    }
    [HttpPut("{slug}")]
    public async Task<IActionResult> Add(string slug, [FromQuery, System.ComponentModel.DataAnnotations.RegularExpression("^(web|mini)$")] string channel = "web")
    {
        var post = await db.Articles.SingleOrDefaultAsync(p => p.Slug == slug && (channel == "mini" ? p.PublishedMini : p.Published));
        if (post is null) return NotFound();
        // SQLite's unique composite key makes repeated/concurrent saves idempotent.
        await db.Database.ExecuteSqlInterpolatedAsync($"INSERT OR IGNORE INTO Favorites (Owner, ArticleId, CreatedAt) VALUES ({Owner}, {post.Id}, {DateTimeOffset.UtcNow.ToString("O")})");
        return NoContent();
    }
    [HttpDelete("{slug}")]
    public async Task<IActionResult> Delete(string slug)
    {
        await db.Favorites.Where(f => f.Owner == Owner && db.Articles.Any(p => p.Id == f.ArticleId && p.Slug == slug)).ExecuteDeleteAsync();
        return NoContent();
    }
}
