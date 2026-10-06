using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Ottlog.Api.Models;
using Ottlog.Api.Services;

namespace Ottlog.Api.Controllers;

[ApiController]
[Route("api/posts")]
public sealed class PostsController(PostRepository repository) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PostSummary>>> GetPosts(
        [FromQuery, StringLength(100)] string? q,
        [FromQuery, StringLength(100)] string? category,
        CancellationToken cancellationToken, [FromQuery, System.ComponentModel.DataAnnotations.RegularExpression("^(web|mini)$")] string channel = "web")
    {
        var posts = await repository.GetAllAsync(cancellationToken, channel);
        var query = q?.Trim();
        var selectedCategory = category?.Trim();
        return Ok(posts.Where(post => string.IsNullOrEmpty(selectedCategory)
                || post.Category.Equals(selectedCategory, StringComparison.OrdinalIgnoreCase))
            .Where(post => string.IsNullOrEmpty(query)
                || new[] { post.Title, post.Description, post.Content, post.Category }.Concat(post.Tags)
                    .Any(value => value.Contains(query, StringComparison.OrdinalIgnoreCase)))
            .Select(post => post.ToSummary()).ToArray());
    }

    [HttpGet("{slug}")]
    [ProducesResponseType<PostDetail>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PostDetail>> GetPost(string slug, CancellationToken cancellationToken, [FromQuery, System.ComponentModel.DataAnnotations.RegularExpression("^(web|mini)$")] string channel = "web")
    {
        // Match a known slug rather than constructing a filesystem path from user input.
        var post = (await repository.GetAllAsync(cancellationToken, channel)).FirstOrDefault(post => post.Slug == slug);
        return post is null ? Problem(statusCode: 404, title: "文章不存在") : Ok(post);
    }
}
