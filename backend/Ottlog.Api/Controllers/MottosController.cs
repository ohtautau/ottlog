using System.Security.Claims;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ottlog.Api.Data;
using Ottlog.Api.Services;

namespace Ottlog.Api.Controllers;

// Compatibility entrance for the original website. It shares the exact same
// owner/key as personal-tools/mottos; old global Settings remain archival only.
[ApiController, Route("api/mottos"), Authorize(Roles = "admin,reader"), AutoValidateAntiforgeryToken]
public sealed class MottosController(BlogDb db, IPersonalToolStore? toolStore = null) : ControllerBase
{
    private readonly IPersonalToolStore tools = toolStore ?? new SqlitePersonalToolStore(db);
    private string Owner => (User.IsInRole("admin") ? "admin:" : "reader:") + User.FindFirstValue(ClaimTypes.NameIdentifier);
    private async Task<JsonObject> Read(CancellationToken cancellationToken)
    {
        var json = await tools.ReadAsync(Owner, "mottos", cancellationToken);
        return json is null ? new JsonObject { ["version"] = 1, ["mottos"] = new JsonArray() }
            : JsonNode.Parse(json) as JsonObject ?? throw new InvalidOperationException("账号格言格式暂不兼容");
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        Response.Headers.CacheControl = "no-store";
        var state = await Read(cancellationToken);
        return Ok(new { mottos = state["mottos"] is JsonArray values ? values.Select(value => value!.GetValue<string>()).ToArray() : [] });
    }

    [HttpPut]
    public async Task<IActionResult> Update(MottosInput input, CancellationToken cancellationToken)
    {
        if (input.Mottos is null || input.Mottos.Length > 50 || input.Mottos.Any(text => text is null || string.IsNullOrWhiteSpace(text) || text.Trim().Length > 120))
            return BadRequest(new { title = "最多设置 50 条格言，每条 1–120 个字符" });
        var mottos = input.Mottos.Select(text => text.Trim()).Distinct().ToArray();
        var state = await Read(cancellationToken);
        state["mottos"] = new JsonArray(mottos.Select(text => JsonValue.Create(text)).ToArray());
        var json = state.ToJsonString();
        await tools.WriteAsync(Owner, "mottos", json, cancellationToken);
        return Ok(new { mottos });
    }
}

public sealed class MottosInput { public string[]? Mottos { get; set; } }
