using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace Ottlog.Api.Data;

public static class AutomaticCover
{
    public sealed record Photo(string Url, string Source, string Photographer, string Profile, string Description);
    public static readonly Photo[] Photos = Load();
    private static Photo[] Load()
    {
        using var stream = typeof(AutomaticCover).Assembly.GetManifestResourceStream("Ottlog.UnsplashCovers.json")!;
        return JsonSerializer.Deserialize<Photo[]>(stream, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
    }
    public static bool Contains(string? url) => Photos.Any(photo => photo.Url == url);
    public static string For(string slug)
    {
        uint hash = 2166136261;
        foreach (var character in slug) hash = unchecked((hash ^ character) * 16777619);
        return Photos[hash % Photos.Length].Url;
    }
    public static async Task<string> PickAsync(BlogDb db, string? exclude = null)
    {
        var used = (await db.Articles.AsNoTracking().Select(p => p.CoverUrl).ToListAsync())
            .Concat(db.ChangeTracker.Entries<Article>().Where(e => e.State != EntityState.Deleted).Select(e => e.Entity.CoverUrl))
            .GroupBy(url => url).ToDictionary(g => g.Key, g => g.Count());
        var candidates = Photos.Where(p => p.Url != exclude).ToArray();
        var minimum = candidates.Min(p => used.GetValueOrDefault(p.Url));
        var choices = candidates.Where(p => used.GetValueOrDefault(p.Url) == minimum).ToArray();
        return choices[RandomNumberGenerator.GetInt32(choices.Length)].Url;
    }
}
