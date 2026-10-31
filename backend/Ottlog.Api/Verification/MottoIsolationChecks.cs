using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ottlog.Api.Controllers;
using Ottlog.Api.Data;

static class MottoIsolationChecks
{
    public static async Task Run(BlogDb db, Action<bool, string> check)
    {
        check(typeof(MottosController).GetCustomAttributes(typeof(AuthorizeAttribute), true).Length > 0, "motto API requires authentication");
        var retained = JsonSerializer.Serialize(new { version = 1, mottos = new[] { "existing" }, rotationSeconds = 73 });
        await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO PersonalToolStates (Owner, Key, DataJson, UpdatedAt) VALUES ('reader:motto-check-a', 'mottos', {retained}, 'test')");
        MottosController For(string id) => new(db)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, id), new Claim(ClaimTypes.Role, "reader")], "test")) } }
        };
        var a = For("motto-check-a"); var b = For("motto-check-b");
        var empty = (OkObjectResult)await b.Get(default);
        check(JsonSerializer.SerializeToElement(empty.Value).GetProperty("mottos").GetArrayLength() == 0, "other account cannot see another user's mottos or global defaults");
        await a.Update(new MottosInput { Mottos = ["account A only"] }, default);
        var saved = await db.PersonalToolStates.AsNoTracking().SingleAsync(row => row.Owner == "reader:motto-check-a" && row.Key == "mottos");
        using var state = JsonDocument.Parse(saved.DataJson);
        check(state.RootElement.GetProperty("rotationSeconds").GetInt32() == 73, "compatibility edits preserve account rotation settings");
        check(state.RootElement.GetProperty("mottos")[0].GetString() == "account A only", "original website writes the shared personal-tool key");
        await a.Update(new MottosInput { Mottos = [] }, default);
        var removed = (OkObjectResult)await a.Get(default);
        check(JsonSerializer.SerializeToElement(removed.Value).GetProperty("mottos").GetArrayLength() == 0, "deleting every motto does not restore shared defaults");
        var untouched = (OkObjectResult)await b.Get(default);
        check(JsonSerializer.SerializeToElement(untouched.Value).GetProperty("mottos").GetArrayLength() == 0, "motto edits remain isolated across accounts");
    }
}
