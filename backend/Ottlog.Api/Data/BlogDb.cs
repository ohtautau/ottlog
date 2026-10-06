using Microsoft.EntityFrameworkCore;
using Ottlog.Api.Models;
using System.Text.Json;

namespace Ottlog.Api.Data;

public sealed class BlogDb(DbContextOptions<BlogDb> options) : DbContext(options)
{
    public DbSet<Article> Articles => Set<Article>();
    public DbSet<Administrator> Administrators => Set<Administrator>();
    public DbSet<Setting> Settings => Set<Setting>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<Reader> Readers => Set<Reader>();
    public DbSet<Favorite> Favorites => Set<Favorite>();
    public DbSet<PersonalToolState> PersonalToolStates => Set<PersonalToolState>();
    public DbSet<WeChatBinding> WeChatBindings => Set<WeChatBinding>();
    public DbSet<WeChatReminder> WeChatReminders => Set<WeChatReminder>();
    public DbSet<WeChatPomodoroReminder> WeChatPomodoroReminders => Set<WeChatPomodoroReminder>();
    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<Article>().HasIndex(p => p.Slug).IsUnique();
        model.Entity<Reader>().HasIndex(p => p.UserName).IsUnique();
        model.Entity<Favorite>().HasKey(p => new { p.Owner, p.ArticleId });
        model.Entity<PersonalToolState>().HasKey(p => new { p.Owner, p.Key });
        model.Entity<WeChatBinding>().HasKey(p => p.Owner);
        model.Entity<WeChatBinding>().HasIndex(p => new { p.AppId, p.OpenId }).IsUnique();
        model.Entity<WeChatReminder>().HasKey(p => new { p.Owner, p.TaskId });
        model.Entity<WeChatReminder>().HasIndex(p => new { p.Status, p.RemindAtEpoch });
        model.Entity<WeChatPomodoroReminder>().HasKey(p => new { p.Owner, p.RunId, p.Event });
        model.Entity<WeChatPomodoroReminder>().HasIndex(p => new { p.Status, p.RemindAtEpoch });
        model.Entity<Favorite>().HasOne<Article>().WithMany().HasForeignKey(p => p.ArticleId).OnDelete(DeleteBehavior.Cascade);
        model.Entity<Article>().Property(p => p.Version).IsConcurrencyToken();
        model.Entity<Administrator>().HasIndex(p => p.UserName).IsUnique();
        model.Entity<Setting>().HasKey(p => p.Key);
        model.Entity<Comment>().HasOne<Article>().WithMany().HasForeignKey(c => c.ArticleId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class Article
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Slug { get; set; } = "";
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Date { get; set; } = "";
    public string Category { get; set; } = "";
    public string TagsJson { get; set; } = "[]";
    public string Content { get; set; } = "";
    public string CoverUrl { get; set; } = "";
    public bool Published { get; set; }
    public bool PublishedMini { get; set; }
    public bool AutoCover { get; set; } = true;
    public string Version { get; set; } = Guid.NewGuid().ToString("N");
    public string[] Tags() => JsonSerializer.Deserialize<string[]>(TagsJson) ?? [];
    public string EffectiveCover()
    {
        if (!string.IsNullOrWhiteSpace(CoverUrl) && CoverUrl != "/images/quiet-hills.svg") return CoverUrl;
        return AutomaticCover.For(Slug);
    }
    public string EffectiveDescription()
    {
        if (!string.IsNullOrWhiteSpace(Description)) return Description;
        var text = System.Text.RegularExpressions.Regex.Replace(Content, @"!\[[^\]]*\]\([^)]*\)", "");
        text = System.Text.RegularExpressions.Regex.Replace(text, @"\[([^\]]*)\]\([^)]*\)", "$1");
        text = System.Text.RegularExpressions.Regex.Replace(text, @"[#*`>\[\]()]", "");
        text = System.Text.RegularExpressions.Regex.Replace(text, @"\s+", " ").Trim();
        return string.Concat(text.EnumerateRunes().Take(160).Select(r => r.ToString()));
    }
    public PostDetail Detail() => new(Slug, Title, EffectiveDescription(), Date, Category, Tags(), Math.Max(1, (int)Math.Ceiling(Content.Length / 400d)), Content, EffectiveCover());
    public object AdminView() => new { Id, Slug, Title, Description, Date, Category, Tags = Tags(), Content, CoverUrl, AutoCover, effectiveCoverUrl = EffectiveCover(), Published, PublishedMini, Version };
}

public sealed class Administrator
{
    // A fixed key makes first-account creation atomic even across concurrent requests.
    public int Id { get; set; } = 1;
    public string UserName { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string SecurityStamp { get; set; } = Guid.NewGuid().ToString("N");
    public int FailedLogins { get; set; }
    public long LockedUntil { get; set; }
}
public sealed class Setting { public string Key { get; set; } = ""; public string Value { get; set; } = ""; }
public sealed class Reader
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserName { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string SecurityStamp { get; set; } = Guid.NewGuid().ToString("N");
    public int FailedLogins { get; set; }
    public long LockedUntil { get; set; }
}
public sealed class Favorite
{
    public string Owner { get; set; } = "";
    public Guid ArticleId { get; set; }
    public string CreatedAt { get; set; } = DateTimeOffset.UtcNow.ToString("O");
}
public sealed class PersonalToolState
{
    public string Owner { get; set; } = "";
    public string Key { get; set; } = "";
    public string DataJson { get; set; } = "null";
    public string UpdatedAt { get; set; } = DateTimeOffset.UtcNow.ToString("O");
}
public sealed class Comment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ArticleId { get; set; }
    public string Name { get; set; } = "";
    public string Text { get; set; } = "";
    public string CreatedAt { get; set; } = DateTimeOffset.UtcNow.ToString("O");
    public bool Approved { get; set; }
}
