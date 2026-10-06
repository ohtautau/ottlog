using System.Globalization;
using System.Xml.Linq;
using Microsoft.AspNetCore.Mvc;
using Ottlog.Api.Services;

namespace Ottlog.Api.Controllers;
[ApiController, Route("api/feed")]
public sealed class FeedController(PostRepository posts, IConfiguration config) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Feed(CancellationToken cancellationToken)
    {
        var origin = (config["Site:Url"] ?? "https://ohtautau.com").TrimEnd('/');
        var articles = await posts.GetAllAsync(cancellationToken);
        var document = new XDocument(new XDeclaration("1.0", "utf-8", null), new XElement("rss", new XAttribute("version", "2.0"),
            new XElement("channel", new XElement("title", "Ottlog"), new XElement("link", origin), new XElement("description", "Ottlog 最新文章"),
                articles.Take(50).Select(p => new XElement("item", new XElement("title", p.Title),
                    new XElement("link", $"{origin}/posts/{p.Slug}"), new XElement("guid", $"{origin}/posts/{p.Slug}"),
                    new XElement("description", p.Description), new XElement("category", p.Category),
                    new XElement("pubDate", DateTimeOffset.ParseExact(p.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal).ToString("r")))))));
        return Content(document.ToString(), "application/rss+xml; charset=utf-8");
    }
}
