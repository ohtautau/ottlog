using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Ottlog.Api.Data;

namespace Ottlog.Api.Services;

public interface IPersonalToolStore
{
    Task<string?> ReadAsync(string owner, string key, CancellationToken cancellationToken);
    Task WriteAsync(string owner, string key, string json, CancellationToken cancellationToken);
    Task<bool> ReadyAsync(CancellationToken cancellationToken);
}

public sealed class SqlitePersonalToolStore(BlogDb db) : IPersonalToolStore
{
    public Task<string?> ReadAsync(string owner, string key, CancellationToken cancellationToken) =>
        db.PersonalToolStates.AsNoTracking().Where(s => s.Owner == owner && s.Key == key)
            .Select(s => s.DataJson).SingleOrDefaultAsync(cancellationToken);

    public async Task WriteAsync(string owner, string key, string json, CancellationToken cancellationToken) =>
        await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO PersonalToolStates (Owner, Key, DataJson, UpdatedAt) VALUES ({owner}, {key}, {json}, {DateTimeOffset.UtcNow.ToString("O")}) ON CONFLICT(Owner, Key) DO UPDATE SET DataJson = excluded.DataJson, UpdatedAt = excluded.UpdatedAt", cancellationToken);

    public Task<bool> ReadyAsync(CancellationToken cancellationToken) => db.Database.CanConnectAsync(cancellationToken);
}

// Only the API knows this key. Clients retain their existing authenticated endpoints.
// No fallback or dual write: a remote failure must preserve the client's pending draft.
public sealed class SupabasePersonalToolStore : IPersonalToolStore
{
    private readonly HttpClient http;
    private readonly Uri endpoint;
    private readonly string secret;

    public SupabasePersonalToolStore(HttpClient http, string projectUrl, string secretKey)
    {
        if (!Uri.TryCreate(projectUrl, UriKind.Absolute, out var url) || url.Scheme != "https" ||
            !string.IsNullOrEmpty(url.UserInfo) || !string.IsNullOrEmpty(url.Query) ||
            !string.IsNullOrEmpty(url.Fragment) || url.AbsolutePath != "/")
            throw new InvalidOperationException("Supabase:Url must be an HTTPS project origin.");
        if (!secretKey.StartsWith("sb_secret_", StringComparison.Ordinal) || secretKey.Length <= "sb_secret_".Length ||
            secretKey.Any(char.IsWhiteSpace))
            throw new InvalidOperationException("Set the server-only Supabase:SecretKey (sb_secret_...).");
        this.http = http;
        secret = secretKey;
        endpoint = new Uri(url, "/rest/v1/personal_tool_states");
    }

    private static void Validate(string owner, string key)
    {
        if (!Regex.IsMatch(owner, @"\A(admin|reader):[A-Za-z0-9_-]{1,80}\z") ||
            key is not ("meals" or "reminders" or "todos" or "pomodoro" or "memos" or "dining" or "mottos" or "growth" or "domains"))
            throw new ArgumentException("Invalid tool storage identity.");
    }

    private HttpRequestMessage Request(HttpMethod method, string query)
    {
        var request = new HttpRequestMessage(method, new Uri(endpoint + query));
        // Modern secret keys are not JWTs and belong only in the apikey header.
        request.Headers.Add("apikey", secret);
        return request;
    }

    private async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        try
        {
            var response = await http.SendAsync(request, cancellationToken);
            if (response.IsSuccessStatusCode) return response;
            response.Dispose();
        }
        catch (HttpRequestException) { }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested) { }
        // Never include upstream body, URL, data, or credentials in an exception/log.
        throw new InvalidOperationException("Shared tool storage is unavailable. Retry without switching stores.");
    }

    public async Task<string?> ReadAsync(string owner, string key, CancellationToken cancellationToken)
    {
        Validate(owner, key);
        using var request = Request(HttpMethod.Get, $"?owner=eq.{Uri.EscapeDataString(owner)}&key=eq.{Uri.EscapeDataString(key)}&select=data&limit=1");
        using var response = await SendAsync(request, cancellationToken);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        if (document.RootElement.ValueKind != JsonValueKind.Array || document.RootElement.GetArrayLength() > 1)
            throw new InvalidOperationException("Invalid shared tool storage response.");
        if (document.RootElement.GetArrayLength() == 0) return null;
        return document.RootElement[0].GetProperty("data").GetRawText();
    }

    public async Task WriteAsync(string owner, string key, string json, CancellationToken cancellationToken)
    {
        Validate(owner, key);
        if (Encoding.UTF8.GetByteCount(json) > (key == "meals" ? 128 * 1024 : 1024 * 1024))
            throw new ArgumentException("Tool storage capacity exceeded.");
        using var document = JsonDocument.Parse(json);
        using var request = Request(HttpMethod.Post, "?on_conflict=owner,key");
        request.Headers.Add("Prefer", "resolution=merge-duplicates,return=minimal");
        request.Content = JsonContent.Create(new { owner, key, data = document.RootElement });
        using var response = await SendAsync(request, cancellationToken);
    }

    public async Task<bool> ReadyAsync(CancellationToken cancellationToken)
    {
        using var request = Request(HttpMethod.Get, "?select=key&limit=0");
        try { using var response = await SendAsync(request, cancellationToken); return true; }
        catch (InvalidOperationException) { return false; }
    }
}
