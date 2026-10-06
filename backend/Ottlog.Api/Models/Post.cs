namespace Ottlog.Api.Models;

public record PostSummary(string Slug, string Title, string Description, string Date,
    string Category, string[] Tags, int Minutes, string CoverUrl = "");

public record PostDetail(string Slug, string Title, string Description, string Date,
    string Category, string[] Tags, int Minutes, string Content, string CoverUrl = "")
{
    public PostSummary ToSummary() => new(Slug, Title, Description, Date, Category, Tags, Minutes, CoverUrl);
}

public record CategorySummary(string Name, int Count);

public sealed class PostMetadata
{
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Date { get; set; } = "";
    public string Category { get; set; } = "";
    public string[] Tags { get; set; } = [];
}
