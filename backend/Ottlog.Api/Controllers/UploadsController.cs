using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Ottlog.Api.Controllers;
[ApiController, Route("api/admin/uploads"), Authorize(Roles = "admin"), AutoValidateAntiforgeryToken]
public sealed class UploadsController(IConfiguration config) : ControllerBase
{
    [HttpPost, RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> Upload(IFormFile file, CancellationToken cancellationToken)
    {
        if (file.Length is <= 0 or > 5 * 1024 * 1024) return BadRequest(new { title = "图片大小应为 1 字节至 5 MB" });
        await using var input = file.OpenReadStream();
        var bytes = new byte[file.Length];
        await input.ReadExactlyAsync(bytes, cancellationToken);
        string? extension = bytes.AsSpan().StartsWith(new byte[] {137,80,78,71,13,10,26,10}) ? ".png"
            : bytes.AsSpan().StartsWith(new byte[] {255,216,255}) && bytes.AsSpan().EndsWith(new byte[] {255,217}) ? ".jpg"
            : bytes.Length >= 12 && System.Text.Encoding.ASCII.GetString(bytes, 0, 4) == "RIFF" && System.Text.Encoding.ASCII.GetString(bytes, 8, 4) == "WEBP" ? ".webp" : null;
        if (extension is null) return BadRequest(new { title = "仅支持 PNG、JPEG、WebP 图片" });
        var name = Guid.NewGuid().ToString("N") + extension;
        await System.IO.File.WriteAllBytesAsync(Path.Combine(config["UploadsPath"]!, name), bytes, cancellationToken);
        return Ok(new { url = "/images/" + name });
    }
}
