import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { randomUUID } from "node:crypto";
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3000", browserName: "chromium" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: [{
    command: "dotnet run --project ../backend/Ottlog.Api/Ottlog.Api.csproj --no-build --launch-profile http",
    url: "http://127.0.0.1:5229/health",
    reuseExistingServer: false,
    env: { "RateLimits__LoginPerMinute": "200", "Data__Directory": path.resolve("../backend/Ottlog.Api/App_Data/e2e", randomUUID()), "Admin__UserName": "testadmin", "Admin__Password": "E2e-only-password-2026!" },
  }, {
    command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
  }],
});
