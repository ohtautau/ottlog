using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ottlog.Api.Data;
using System.Text.Json;

namespace Ottlog.Api.Controllers;

[ApiController, Route("api/mottos")]
public sealed class MottosController(BlogDb db) : ControllerBase
{
    private static readonly string[] Defaults = ["别评判自己，别审判自己。", "用自己的语言来表达心情。", "他人的感受不应该凌驾在你的感受之上。", "记得分享观察和感受。", "不休息怎么工作！", "怎么说每天也要动动吧。", "感受到的动力是不可靠的，习惯才是可靠的。", "每天有做三件事，就算成功！", "让心嘭嘭，让事等等。", "请允许大难临头，请允许睡个大觉。", "归因有个屁用。", "因人有无穷无尽的潜力，所以努力；因人有各种各样的局限性，所以选择。", "想要坚持的话，提醒很重要，让它在你的脑子里反复出现吧。", "看到这条麻烦您屈尊夸一下自己。", "目标，计划，可执行的下一步，这是不同的东西。", "做不到也是一种行动的结果。", "新的成就会让一切旧的苦难成为铺垫。", "他人对你的期望，既有动力，也有压力。", "他人的攻击意味着他人的需求没有得到满足，和你的好坏无关。", "有攻击，就有防御。", "羞耻。"];

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        Response.Headers.CacheControl = "no-store";
        var value = await db.Settings.Where(s => s.Key == "homepage-mottos").Select(s => s.Value).SingleOrDefaultAsync();
        var mottos = value is null ? Defaults : JsonSerializer.Deserialize<string[]>(value) ?? Defaults;
        return Ok(new { mottos = mottos.Length == 0 ? Defaults : mottos });
    }

    [HttpPut, Authorize(Roles = "admin"), AutoValidateAntiforgeryToken]
    public async Task<IActionResult> Update(MottosInput input)
    {
        if (input.Mottos is null || input.Mottos.Length > 50 || input.Mottos.Any(m => m is null || string.IsNullOrWhiteSpace(m) || m.Trim().Length > 120))
            return BadRequest(new { title = "最多设置 50 条格言，每条 1–120 个字符" });
        var mottos = input.Mottos.Select(m => m.Trim()).Distinct().ToArray();
        if (mottos.Length == 0) mottos = Defaults;
        var json = JsonSerializer.Serialize(mottos);
        await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO Settings (Key, Value) VALUES ('homepage-mottos', {json}) ON CONFLICT(Key) DO UPDATE SET Value = excluded.Value");
        return Ok(new { mottos });
    }
}

public sealed class MottosInput { public string[]? Mottos { get; set; } }
