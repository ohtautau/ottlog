using Microsoft.AspNetCore.Authentication;

namespace Ottlog.Api.Services;

public static class LoginSession
{
    // Keep ordinary and existing mini-program sessions at eight hours. Only an
    // explicit remember choice produces a browser-persistent authentication cookie.
    public static AuthenticationProperties Properties(bool rememberMe) => new()
    {
        IsPersistent = rememberMe,
        ExpiresUtc = DateTimeOffset.UtcNow.Add(rememberMe ? TimeSpan.FromDays(30) : TimeSpan.FromHours(8)),
        AllowRefresh = false
    };
}
