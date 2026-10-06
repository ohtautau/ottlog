using Microsoft.EntityFrameworkCore;
using Ottlog.Api.Data;
using Ottlog.Api.Models;
namespace Ottlog.Api.Services;
public sealed class PostRepository(BlogDb db)
{
    public async Task<IReadOnlyList<PostDetail>> GetAllAsync(CancellationToken cancellationToken, string channel = "web")
    {
        var articles = await db.Articles.AsNoTracking().Where(p => channel == "mini" ? p.PublishedMini : p.Published)
            .OrderByDescending(p => p.Date).ThenBy(p => p.Slug).ToListAsync(cancellationToken);
        return articles.Select(p => p.Detail()).ToArray();
    }
}
