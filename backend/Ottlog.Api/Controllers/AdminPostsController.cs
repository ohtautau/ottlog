using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ottlog.Api.Data;

namespace Ottlog.Api.Controllers;

[ApiController, Route("api/admin/posts"), Authorize(Roles = "admin"), AutoValidateAntiforgeryToken]
public sealed class AdminPostsController(BlogDb db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List() => Ok((await db.Articles.AsNoTracking().OrderByDescending(p => p.Date).ToListAsync()).Select(p => p.AdminView()));
    [HttpPost]
    public async Task<IActionResult> Create(EditPost input)
    {
        if (input.SaveAction == "publish" && !input.Published && !input.PublishedMini) return BadRequest(new { title = "请选择至少一个发布渠道" });
        if (input.SaveAction == "draft") { input.Published = false; input.PublishedMini = false; }
        if (string.IsNullOrWhiteSpace(input.Slug)) input.Slug = "post-" + Guid.NewGuid().ToString("N")[..16];
        if (!Valid(input)) return BadRequest(new { title = "日期、标签或封面地址格式不正确" });
        if (await db.Articles.AnyAsync(p => p.Slug == input.Slug)) return Conflict(new { title = "文章地址已存在" });
        var post = new Article();
        await Apply(post, input);
        db.Articles.Add(post);
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException) { return Conflict(new { title = "文章地址已存在" }); }
        return Created($"/api/admin/posts/{post.Id}", post.AdminView());
    }
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, EditPost input)
    {
        if (input.SaveAction == "publish" && !input.Published && !input.PublishedMini) return BadRequest(new { title = "请选择至少一个发布渠道" });
        if (input.SaveAction == "draft") { input.Published = false; input.PublishedMini = false; }
        if (!Valid(input)) return BadRequest(new { title = "日期、标签或封面地址格式不正确" });
        var post = await db.Articles.FindAsync(id);
        if (post is null) return NotFound();
        if (string.IsNullOrWhiteSpace(input.Slug)) input.Slug = post.Slug;
        if (post.Version != input.Version) return Conflict(new { title = "文章已在其他窗口更新，请重新加载后编辑" });
        if (await db.Articles.AnyAsync(p => p.Id != id && p.Slug == input.Slug)) return Conflict(new { title = "文章地址已存在" });
        await Apply(post, input);
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException) { return Conflict(new { title = "文章已改变或地址冲突，请重新加载" }); }
        return Ok(post.AdminView());
    }
    [HttpPost("cover")]
    public async Task<IActionResult> ChooseCover(CoverChoice input) => Ok(new { coverUrl = await AutomaticCover.PickAsync(db, input.CurrentCover) });

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, [FromQuery, Required] string version)
    {
        var post = await db.Articles.FindAsync(id);
        if (post is null) return NotFound();
        if (post.Version != version) return Conflict(new { title = "文章已改变，请重新加载后删除" });
        db.Articles.Remove(post);
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException) { return Conflict(); }
        return NoContent();
    }
    private static bool Valid(EditPost p) => DateOnly.TryParseExact(p.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _)
        && p.Tags is { Length: <= 20 } && p.Tags.All(t => !string.IsNullOrWhiteSpace(t) && t.Length <= 30)
        && (AutomaticCover.Contains(p.CoverUrl) || string.IsNullOrEmpty(p.CoverUrl) || System.Text.RegularExpressions.Regex.IsMatch(p.CoverUrl, @"^/images/[a-zA-Z0-9._-]+$"));
    private async Task Apply(Article p, EditPost input)
    {
        p.Slug = input.Slug!; p.Title = input.Title.Trim(); p.Description = (input.Description ?? "").Trim();
        p.Date = input.Date; p.Category = input.Category.Trim(); p.TagsJson = JsonSerializer.Serialize(input.Tags.Select(t => t.Trim()).Distinct());
        p.Content = input.Content;
        var requested = input.CoverUrl;
        if (input.AutoCover && !AutomaticCover.Contains(requested))
            requested = p.AutoCover && AutomaticCover.Contains(p.CoverUrl) ? p.CoverUrl : "";
        if (string.IsNullOrWhiteSpace(requested) || requested == "/images/quiet-hills.svg")
            requested = await AutomaticCover.PickAsync(db);
        p.CoverUrl = requested; p.AutoCover = AutomaticCover.Contains(requested); p.PublishedMini = input.PublishedMini; p.Published = input.Published; p.Version = Guid.NewGuid().ToString("N");
    }
}
public sealed class EditPost
{
    [RegularExpression("^(draft|publish)$")] public string? SaveAction { get; set; }
    [StringLength(100), RegularExpression("^[a-z0-9]+(?:-[a-z0-9]+)*$")] public string? Slug { get; set; } = "";
    [Required, StringLength(160)] public string Title { get; set; } = "";
    [StringLength(500)] public string? Description { get; set; } = "";
    [Required] public string Date { get; set; } = "";
    [Required, StringLength(50)] public string Category { get; set; } = "";
    public string[] Tags { get; set; } = [];
    [Required, StringLength(200000)] public string Content { get; set; } = "";
    [StringLength(200)] public string CoverUrl { get; set; } = "";
    public bool Published { get; set; }
    public bool PublishedMini { get; set; }
    public bool AutoCover { get; set; } = true;
    public string? Version { get; set; }
}

public sealed class CoverChoice { [StringLength(500)] public string? CurrentCover { get; set; } }
