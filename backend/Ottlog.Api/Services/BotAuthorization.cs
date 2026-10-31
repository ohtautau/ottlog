using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Ottlog.Api.Data;

namespace Ottlog.Api.Services;

public sealed class BotGrant
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Owner { get; set; } = "";
    public string Name { get; set; } = "";
    public string TokenHash { get; set; } = "";
    public string SecurityStamp { get; set; } = "";
    public long CreatedAt { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
    public long? RevokedAt { get; set; }
}

public sealed class BotGrantStore(BlogDb db)
{
    public static string Owner(ClaimsPrincipal user) =>
        (user.IsInRole("admin") ? "admin:" : "reader:") + user.FindFirstValue(ClaimTypes.NameIdentifier);
    public static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    public static object Summary(BotGrant grant) => new { grant.Id, grant.Name, grant.CreatedAt, grant.RevokedAt };

    public async Task<(string Id, string Name, string Stamp, string Role)?> IdentityAsync(string owner)
    {
        if (owner == "admin:1")
        {
            var admin = await db.Administrators.AsNoTracking().SingleOrDefaultAsync(a => a.Id == 1);
            return admin is null ? null : ("1", admin.UserName, admin.SecurityStamp, "admin");
        }
        if (!owner.StartsWith("reader:", StringComparison.Ordinal) || !Guid.TryParse(owner[7..], out var id)) return null;
        var reader = await db.Readers.AsNoTracking().SingleOrDefaultAsync(r => r.Id == id);
        return reader is null ? null : (reader.Id.ToString(), reader.UserName, reader.SecurityStamp, "reader");
    }

    public async Task<(BotGrant Grant, string Token)?> CreateAsync(ClaimsPrincipal user, string name)
    {
        var owner = Owner(user);
        var identity = await IdentityAsync(owner);
        if (identity is null || identity.Value.Stamp != user.FindFirstValue("stamp")) return null;
        var token = "ottb_" + Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        var grant = new BotGrant { Owner = owner, Name = name, TokenHash = Hash(token), SecurityStamp = identity.Value.Stamp };
        db.BotGrants.Add(grant);
        await db.SaveChangesAsync();
        return (grant, token);
    }
}

// Only /api/bot endpoints select this scheme; normal account/admin routes keep Cookie authentication.
public sealed class BotAuthenticationHandler(IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger, UrlEncoder encoder, BlogDb db, BotGrantStore grants)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "OttlogBot";
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var header = Request.Headers.Authorization;
        if (header.Count != 1 || !header.ToString().StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return AuthenticateResult.NoResult();
        var token = header.ToString()[7..];
        if (token.Length != 48 || !token.StartsWith("ottb_", StringComparison.Ordinal) || token[5..].Any(c => !char.IsAsciiLetterOrDigit(c) && c is not '-' and not '_'))
            return AuthenticateResult.Fail("Invalid bot authorization");
        var hash = BotGrantStore.Hash(token);
        var grant = await db.BotGrants.AsNoTracking().SingleOrDefaultAsync(g => g.TokenHash == hash && g.RevokedAt == null);
        if (grant is null) return AuthenticateResult.Fail("Invalid bot authorization");
        var identity = await grants.IdentityAsync(grant.Owner);
        if (identity is null || identity.Value.Stamp != grant.SecurityStamp)
            return AuthenticateResult.Fail("Invalid bot authorization");
        var current = identity.Value;
        var principal = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, current.Id), new Claim(ClaimTypes.Name, current.Name),
            new Claim(ClaimTypes.Role, current.Role), new Claim("bot_grant", grant.Id), new Claim("bot_name", grant.Name)
        ], SchemeName));
        return AuthenticateResult.Success(new AuthenticationTicket(principal, SchemeName));
    }
}
