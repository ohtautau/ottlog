using Microsoft.AspNetCore.Mvc;
using Ottlog.Api.Models;
using Ottlog.Api.Services;

namespace Ottlog.Api.Controllers;

[ApiController]
[Route("api/categories")]
public sealed class CategoriesController(PostRepository repository) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CategorySummary>>> GetCategories(CancellationToken cancellationToken, [FromQuery, System.ComponentModel.DataAnnotations.RegularExpression("^(web|mini)$")] string channel = "web")
    {
        var posts = await repository.GetAllAsync(cancellationToken, channel);
        return Ok(posts.GroupBy(post => post.Category).OrderBy(group => group.Key, StringComparer.Ordinal)
            .Select(group => new CategorySummary(group.Key, group.Count())).ToArray());
    }
}
