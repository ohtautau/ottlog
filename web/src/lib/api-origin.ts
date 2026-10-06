export function getApiOrigin(environment: Record<string, string | undefined> = process.env): string {
  const configured = environment.API_BASE_URL?.trim();
  if (environment.VERCEL && !configured) {
    throw new Error("Set API_BASE_URL to the independently hosted HTTPS Ottlog API before deploying.");
  }
  const origin = new URL(configured || "http://127.0.0.1:5229");
  if (!["http:", "https:"].includes(origin.protocol) || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/") {
    throw new Error("API_BASE_URL must be an HTTP(S) origin without credentials, path or query.");
  }
  if (environment.VERCEL && (origin.protocol !== "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname))) {
    throw new Error("Vercel requires a publicly reachable HTTPS API_BASE_URL.");
  }
  const frontendHosts = [environment.VERCEL_URL, environment.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean);
  if (environment.VERCEL && frontendHosts.includes(origin.host)) {
    throw new Error("API_BASE_URL points to this frontend and would create a proxy loop.");
  }
  return origin.origin;
}
