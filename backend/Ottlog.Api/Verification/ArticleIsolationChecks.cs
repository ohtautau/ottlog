using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Ottlog.Api.Controllers;
using Ottlog.Api.Data;
using Ottlog.Api.Services;

static class ArticleIsolationChecks
{
    public static async Task Run(BlogDb db, Action<bool, string> check)
    {
        PersonalToolsController For(string name) => new(db, new WeChatReminderGate(), new(db), new(db))
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity([
                new Claim(ClaimTypes.NameIdentifier, name), new Claim(ClaimTypes.Role, "reader")], "test")) } }
        };
        var a = For("article-a"); var b = For("article-b");
        using var payload = JsonDocument.Parse("{\"version\":1,\"articles\":[{\"id\":\"own\",\"title\":\"A only\"}]}");
        check(await a.Put("articles", new PersonalToolInput { Data = payload.RootElement.Clone() }, default) is OkObjectResult, "reader can save own articles");
        var own = (OkObjectResult)await a.Get("articles", default);
        check(JsonSerializer.SerializeToElement(own.Value).GetProperty("data").GetProperty("articles")[0].GetProperty("title").GetString() == "A only", "article owner can read saved article");
        var other = (OkObjectResult)await b.Get("articles", default);
        check(JsonSerializer.SerializeToElement(other.Value).GetProperty("data").ValueKind == JsonValueKind.Null, "other account cannot read articles");
        using var empty = JsonDocument.Parse("{\"version\":1,\"articles\":[]}");
        await b.Put("articles", new PersonalToolInput { Data = empty.RootElement.Clone() }, default);
        own = (OkObjectResult)await a.Get("articles", default);
        check(JsonSerializer.SerializeToElement(own.Value).GetProperty("data").GetProperty("articles").GetArrayLength() == 1, "another account deleting its archive never touches owner's articles");
    }
}
