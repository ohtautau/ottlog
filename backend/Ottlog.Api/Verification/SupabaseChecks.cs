using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.WebUtilities;
using Ottlog.Api.Services;

public static class SupabaseChecks
{
    public static async Task<int> RunAsync()
    {
        var count = 0;
        void Check(bool condition, string name) { if (!condition) throw new Exception(name); count++; }
        var handler = new FakeStore();
        using var http = new HttpClient(handler);
        var store = new SupabasePersonalToolStore(http, "https://fake-project.supabase.co", "sb_secret_test_only");
        const string ownerA = "reader:11111111-1111-1111-1111-111111111111";
        const string ownerB = "reader:22222222-2222-2222-2222-222222222222";
        const string data = "{\"records\":[{\"id\":\"original-id\",\"text\":\"进展🙂\"}],\"legacy\":true}";
        Check(await store.ReadAsync(ownerA, "growth", default) is null, "Empty cloud state");
        await store.WriteAsync(ownerA, "growth", data, default);
        Check(JsonNode.DeepEquals(JsonNode.Parse((await store.ReadAsync(ownerA, "growth", default))!), JsonNode.Parse(data)), "Historical JSON, IDs and Unicode round-trip");
        Check(await store.ReadAsync(ownerB, "growth", default) is null, "Accounts must be isolated");
        Check(await store.ReadAsync(ownerA, "domains", default) is null, "Tool keys must be isolated");
        await store.WriteAsync(ownerA, "growth", "null", default);
        Check(await store.ReadAsync(ownerA, "growth", default) == "null", "JSON null compatibility");
        await store.WriteAsync(ownerA, "growth", data, default);
        Check(handler.Rows.Count == 1, "Retry upserts one composite identity");
        Check(handler.CorrectHeaders, "Only server apikey; correct upsert preference");
        Check(await store.ReadyAsync(default), "Ready queries no account data");
        var calls = handler.Calls;
        try { await store.WriteAsync("guest", "growth", data, default); throw new Exception("Guest accepted"); }
        catch (ArgumentException) { count++; }
        try { await store.WriteAsync(ownerA, "unknown", data, default); throw new Exception("Unknown key accepted"); }
        catch (ArgumentException) { count++; }
        try { await store.WriteAsync(ownerA, "meals", JsonSerializer.Serialize(new string('中', 128 * 1024)), default); throw new Exception("Oversize accepted"); }
        catch (ArgumentException) { count++; }
        Check(calls == handler.Calls, "Invalid identity/key/capacity sends no request");
        handler.Fail = true;
        try { await store.WriteAsync(ownerA, "growth", "{}", default); throw new Exception("Failure accepted"); }
        catch (InvalidOperationException error)
        {
            Check(!error.Message.Contains("sb_secret") && !error.Message.Contains("private-upstream"), "Error does not expose upstream content or secret");
        }
        Check(!await store.ReadyAsync(default), "Unavailable store fails readiness");
        handler.Fail = false;
        Check(JsonNode.DeepEquals(JsonNode.Parse((await store.ReadAsync(ownerA, "growth", default))!), JsonNode.Parse(data)), "Failed save preserves remote state");
        foreach (var url in new[] { "http://fake-project.supabase.co", "https://fake-project.supabase.co/path", "https://user:password@fake-project.supabase.co" })
        {
            try { _ = new SupabasePersonalToolStore(http, url, "sb_secret_test_only"); throw new Exception("Invalid URL accepted"); }
            catch (InvalidOperationException) { count++; }
        }
        try { _ = new SupabasePersonalToolStore(http, "https://fake-project.supabase.co", "sb_publishable_test_only"); throw new Exception("Public key accepted"); }
        catch (InvalidOperationException) { count++; }
        return count;
    }

    private sealed class FakeStore : HttpMessageHandler
    {
        public readonly Dictionary<(string, string), string> Rows = [];
        public bool Fail;
        public bool CorrectHeaders = true;
        public int Calls;
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Calls++;
            CorrectHeaders &= request.Headers.GetValues("apikey").Single() == "sb_secret_test_only" && request.Headers.Authorization is null;
            if (Fail) return new(HttpStatusCode.InternalServerError) { Content = new StringContent("private-upstream") };
            var query = QueryHelpers.ParseQuery(request.RequestUri!.Query);
            if (request.Method == HttpMethod.Post)
            {
                CorrectHeaders &= request.Headers.GetValues("Prefer").Single() == "resolution=merge-duplicates,return=minimal" && query["on_conflict"] == "owner,key";
                using var document = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(cancellationToken));
                var row = document.RootElement;
                Rows[(row.GetProperty("owner").GetString()!, row.GetProperty("key").GetString()!)] = row.GetProperty("data").GetRawText();
                return new(HttpStatusCode.NoContent);
            }
            var body = "[]";
            if (query["limit"] != "0")
            {
                var owner = query["owner"].ToString()[3..];
                var key = query["key"].ToString()[3..];
                if (Rows.TryGetValue((owner, key), out var data)) body = "[{\"data\":" + data + "}]";
            }
            return new(HttpStatusCode.OK) { Content = new StringContent(body, Encoding.UTF8, "application/json") };
        }
    }
}
