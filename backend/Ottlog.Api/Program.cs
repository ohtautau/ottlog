using Ottlog.Api.Services;
using Ottlog.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.FileProviders;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using System.Net;

var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    if (IPAddress.TryParse(builder.Configuration["ReverseProxy:Address"], out var address)) options.KnownProxies.Add(address);
});
var dataPath = Path.GetFullPath(builder.Configuration["Data:Directory"] ?? Path.Combine(builder.Environment.ContentRootPath, "App_Data"));
Directory.CreateDirectory(dataPath);
var uploadsPath = Path.Combine(dataPath, "uploads");
Directory.CreateDirectory(uploadsPath);
builder.Configuration["UploadsPath"] = uploadsPath;
builder.Services.AddDbContext<BlogDb>(options => options.UseSqlite(new Microsoft.Data.Sqlite.SqliteConnectionStringBuilder { DataSource = Path.Combine(dataPath, "ottlog.db") }.ToString()));
builder.Services.AddDataProtection().PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(dataPath, "keys"))).SetApplicationName("Ottlog");
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(options =>
{
    options.Cookie.Name = "ottlog.admin";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
    options.ExpireTimeSpan = TimeSpan.FromHours(8);
    options.SlidingExpiration = false;
    options.Events.OnRedirectToLogin = context => { context.Response.StatusCode = 401; return Task.CompletedTask; };
    options.Events.OnRedirectToAccessDenied = context => { context.Response.StatusCode = 403; return Task.CompletedTask; };
    options.Events.OnValidatePrincipal = async context =>
    {
        var db = context.HttpContext.RequestServices.GetRequiredService<BlogDb>();
        var principal = context.Principal;
        string? stamp = null;
        if (principal?.IsInRole("admin") == true) stamp = (await db.Administrators.AsNoTracking().SingleOrDefaultAsync())?.SecurityStamp;
        else if (Guid.TryParse(principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var id))
            stamp = (await db.Readers.AsNoTracking().SingleOrDefaultAsync(r => r.Id == id))?.SecurityStamp;
        if (stamp is null || stamp != principal?.FindFirst("stamp")?.Value) context.RejectPrincipal();
    };
});
builder.Services.AddAntiforgery(options => { options.HeaderName = "X-CSRF-TOKEN"; options.Cookie.SameSite = SameSiteMode.Strict; options.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always; });
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = 429;
    options.AddPolicy("login", context => RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "local",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = builder.Configuration.GetValue("RateLimits:LoginPerMinute", 10), Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    options.AddPolicy("comments", context => RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "local",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 5, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    options.AddPolicy("wechat-reminders", context => RateLimitPartition.GetFixedWindowLimiter(
        (context.User.IsInRole("admin") ? "admin:" : "reader:") + context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 30, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});

// MVC's antiforgery authorization filters are registered by AddControllersWithViews.
builder.Services.AddControllersWithViews();
builder.Services.AddOpenApi();
builder.Services.AddHealthChecks();
builder.Services.AddProblemDetails();
builder.Services.AddScoped<MarkdownPostRepository>();
builder.Services.AddScoped<PostRepository>();
var toolProvider = builder.Configuration["PersonalTools:Provider"] ?? "Sqlite";
if (toolProvider.Equals("Supabase", StringComparison.OrdinalIgnoreCase))
{
    var supabaseUrl = builder.Configuration["Supabase:Url"] ?? "";
    var supabaseSecret = builder.Configuration["Supabase:SecretKey"] ?? "";
    // Validate configuration at startup, without sending a request or logging credentials.
    using (var validationClient = new HttpClient()) _ = new SupabasePersonalToolStore(validationClient, supabaseUrl, supabaseSecret);
    builder.Services.AddHttpClient("supabase-tools", client => client.Timeout = TimeSpan.FromSeconds(15)).RemoveAllLoggers()
        .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false });
    builder.Services.AddScoped<IPersonalToolStore>(services => new SupabasePersonalToolStore(
        services.GetRequiredService<IHttpClientFactory>().CreateClient("supabase-tools"), supabaseUrl, supabaseSecret));
}
else if (toolProvider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
    builder.Services.AddScoped<IPersonalToolStore, SqlitePersonalToolStore>();
else throw new InvalidOperationException("PersonalTools:Provider must be Sqlite or Supabase.");
builder.Services.Configure<WeChatReminderOptions>(builder.Configuration.GetSection("WeChat"));
// Request URLs contain WeChat credentials/tokens. Disable HttpClient URL logging for this client.
builder.Services.AddHttpClient("wechat-reminders", client =>
{
    client.BaseAddress = new Uri("https://api.weixin.qq.com/");
    client.Timeout = TimeSpan.FromSeconds(15);
}).RemoveAllLoggers();
builder.Services.AddSingleton<WeChatReminderGate>();
builder.Services.AddSingleton<IWeChatReminderClient, WeChatReminderClient>();
builder.Services.AddScoped<WeChatReminderQueue>();
builder.Services.AddHostedService<WeChatReminderWorker>();
builder.Services.AddScoped<WeChatPomodoroQueue>();
builder.Services.AddHostedService<WeChatPomodoroWorker>();

var app = builder.Build();
app.UseForwardedHeaders();
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// TLS terminates at the production reverse proxy; private API ports are not published.
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.Use(async (context, next) => { context.Response.Headers.XContentTypeOptions = "nosniff"; await next(); });
app.UseStaticFiles(new StaticFileOptions { FileProvider = new PhysicalFileProvider(uploadsPath), RequestPath = "/images" });
app.UseStaticFiles();

app.MapControllers();
app.MapHealthChecks("/health");
app.MapGet("/health/ready", async (BlogDb db, IPersonalToolStore tools, CancellationToken cancellationToken) =>
    await db.Database.CanConnectAsync(cancellationToken) && await tools.ReadyAsync(cancellationToken)
        ? Results.Ok(new { status = "ready" }) : Results.StatusCode(503));
app.MapGet("/", () => Results.Ok(new
{
    name = "Ottlog API",
    status = "running",
    health = "/health"
}));

await DatabaseInitializer.InitializeAsync(app.Services);
app.Run();

public partial class Program { }
