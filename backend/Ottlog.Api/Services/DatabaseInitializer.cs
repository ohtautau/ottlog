using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Ottlog.Api.Data;
using System.Text.Json;

namespace Ottlog.Api.Services;

public static class DatabaseInitializer
{
    public static async Task InitializeAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BlogDb>();
        await db.Database.MigrateAsync();
        var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        if (!await db.Settings.AnyAsync(s => s.Key == "seed-complete"))
        {
            if (config.GetValue("SeedExamples", true))
            {
                var posts = await scope.ServiceProvider.GetRequiredService<MarkdownPostRepository>().GetAllAsync(default);
                foreach (var post in posts)
                    db.Articles.Add(new Article { Slug = post.Slug, Title = post.Title, Description = post.Description,
                        Date = post.Date, Category = post.Category, TagsJson = JsonSerializer.Serialize(post.Tags),
                        Content = post.Content, Published = true, PublishedMini = true });
            }
            db.Settings.Add(new Setting { Key = "seed-complete", Value = "1" });
            await db.SaveChangesAsync();
        }
        // Persist missing/default covers once; future title and slug changes keep them.
        var missingCovers = await db.Articles.Where(p => p.CoverUrl == "" || p.CoverUrl == "/images/quiet-hills.svg").ToListAsync();
        foreach (var article in missingCovers)
        {
            article.CoverUrl = await AutomaticCover.PickAsync(db);
            article.AutoCover = true;
            article.Version = Guid.NewGuid().ToString("N");
        }
        if (missingCovers.Count > 0) await db.SaveChangesAsync();
        if (!await db.Administrators.AnyAsync())
        {
            var password = config["Admin:Password"];
            if (!string.IsNullOrEmpty(config["Admin:PasswordFile"])) password = (await File.ReadAllTextAsync(config["Admin:PasswordFile"]!)).TrimEnd('\r', '\n');
            if (!string.IsNullOrEmpty(password))
            {
                if (password.Length < 12) throw new InvalidOperationException("Admin password must contain at least 12 characters.");
                var admin = new Administrator { UserName = config["Admin:UserName"] ?? "admin" };
                admin.PasswordHash = new PasswordHasher<Administrator>().HashPassword(admin, password);
                db.Administrators.Add(admin);
                await db.SaveChangesAsync();
            }
            else if (!scope.ServiceProvider.GetRequiredService<IWebHostEnvironment>().IsDevelopment())
                throw new InvalidOperationException("Set Admin__Password before the first production startup.");
        }
    }
}
