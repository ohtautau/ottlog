using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using Ottlog.Api.Data;

namespace Ottlog.Api.Controllers;
[ApiController, Route("api/posts/{slug}/comments")]
public sealed class CommentsController(BlogDb db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(string slug, [FromQuery, RegularExpression("^(web|mini)$")] string channel = "web")
    {
        var post = await db.Articles.AsNoTracking().SingleOrDefaultAsync(p => p.Slug == slug && (channel == "mini" ? p.PublishedMini : p.Published));
        if (post is null) return NotFound();
        return Ok(await db.Comments.AsNoTracking().Where(c => c.ArticleId == post.Id && c.Approved).OrderBy(c => c.CreatedAt)
            .Select(c => new { c.Id, c.Name, c.Text, c.CreatedAt }).ToListAsync());
    }
    [HttpPost, EnableRateLimiting("comments")]
    public async Task<IActionResult> Add(string slug, NewComment input, [FromQuery, RegularExpression("^(web|mini)$")] string channel = "web")
    {
        var post = await db.Articles.SingleOrDefaultAsync(p => p.Slug == slug && (channel == "mini" ? p.PublishedMini : p.Published));
        if (post is null) return NotFound();
        db.Comments.Add(new Comment { ArticleId = post.Id, Name = input.Name.Trim(), Text = input.Text.Trim() });
        await db.SaveChangesAsync();
        return Accepted(new { message = "评论已提交，审核通过后展示" });
    }
}
public record NewComment([Required, StringLength(40)] string Name, [Required, StringLength(2000)] string Text);

[ApiController, Route("api/admin/comments"), Authorize(Roles = "admin"), AutoValidateAntiforgeryToken]
public sealed class AdminCommentsController(BlogDb db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List() => Ok(await (from c in db.Comments.AsNoTracking() join p in db.Articles on c.ArticleId equals p.Id
        orderby c.CreatedAt descending select new { c.Id, c.Name, c.Text, c.CreatedAt, c.Approved, postTitle = p.Title }).ToListAsync());
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Moderate(Guid id, Moderation input)
    {
        var comment = await db.Comments.FindAsync(id);
        if (comment is null) return NotFound();
        comment.Approved = input.Approved;
        await db.SaveChangesAsync(); return NoContent();
    }
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var comment = await db.Comments.FindAsync(id);
        if (comment is null) return NotFound();
        db.Comments.Remove(comment); await db.SaveChangesAsync(); return NoContent();
    }
}
public record Moderation(bool Approved);
