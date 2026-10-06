using System.Globalization;
using System.Text.RegularExpressions;
using Ottlog.Api.Models;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace Ottlog.Api.Services;

// Content stays outside wwwroot: only the API exposes published article fields.
// Replace this repository with database access in the next phase.
public sealed class MarkdownPostRepository(IWebHostEnvironment environment)
{
    private readonly string directory = Path.Combine(environment.ContentRootPath, "Content", "Posts");

    public async Task<IReadOnlyList<PostDetail>> GetAllAsync(CancellationToken cancellationToken)
    {
        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance).Build();
        var posts = new List<PostDetail>();
        foreach (var file in Directory.EnumerateFiles(directory, "*.md"))
        {
            cancellationToken.ThrowIfCancellationRequested();
            var slug = Path.GetFileNameWithoutExtension(file);
            if (!Regex.IsMatch(slug, "^[a-z0-9]+(?:-[a-z0-9]+)*$"))
                throw new InvalidDataException($"Invalid article filename: {Path.GetFileName(file)}");
            var text = (await File.ReadAllTextAsync(file, cancellationToken)).Replace("\r\n", "\n");
            var match = Regex.Match(text, @"\A---\n(?<metadata>.*?)\n---(?:\n|\z)(?<body>[\s\S]*)\z", RegexOptions.Singleline);
            if (!match.Success) throw new InvalidDataException($"Missing front matter: {slug}");
            var meta = deserializer.Deserialize<PostMetadata>(match.Groups["metadata"].Value);
            if (meta is null || string.IsNullOrWhiteSpace(meta.Title) || string.IsNullOrWhiteSpace(meta.Description)
                || string.IsNullOrWhiteSpace(meta.Category) || meta.Tags is null || meta.Tags.Any(string.IsNullOrWhiteSpace)
                || !DateOnly.TryParseExact(meta.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
                throw new InvalidDataException($"Invalid article metadata: {slug}");
            var content = match.Groups["body"].Value;
            posts.Add(new(slug, meta.Title, meta.Description, meta.Date, meta.Category, meta.Tags,
                Math.Max(1, (int)Math.Ceiling(content.Length / 400d)), content));
        }
        return posts.OrderByDescending(post => post.Date, StringComparer.Ordinal)
            .ThenBy(post => post.Slug, StringComparer.Ordinal).ToArray();
    }
}
