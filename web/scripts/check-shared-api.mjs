// Start web dev on 3100 separately. This script owns an isolated test API on 5229.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium, request } from "@playwright/test";

const api = "http://127.0.0.1:5229";
const web = "http://127.0.0.1:3100";
const backend = path.resolve("../backend/Ottlog.Api");
const directory = mkdtempSync(path.join(tmpdir(), "ottlog-shared-api-"));
let child, browser;
const clients = [];
try {
  try { await fetch(`${api}/health`, { signal: AbortSignal.timeout(500) }); throw new Error("Port 5229 already occupied; stop the existing API first."); }
  catch (error) { if (error.message.startsWith("Port 5229")) throw error; }
  child = spawn("dotnet", [path.join(backend, "bin/PersonalTools/net10.0/Ottlog.Api.dll"), "--urls", api], {
    cwd: backend, windowsHide: true, stdio: "ignore",
    env: { ...process.env, ASPNETCORE_ENVIRONMENT: "Development", DOTNET_ENVIRONMENT: "Development", Data__Directory: directory, SeedExamples: "false", PersonalTools__Provider: "Sqlite", Admin__Password: "", Admin__PasswordFile: "", ASPNETCORE_HOSTINGSTARTUPASSEMBLIES: "" },
  });
  for (let n = 0; n < 100; n++) {
    if (child.exitCode !== null) throw new Error("Isolated API startup failed");
    try { if ((await fetch(`${api}/health/ready`)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  const website = await request.newContext({ baseURL: web });
  const mini = await request.newContext({ baseURL: api });
  const guest = await request.newContext({ baseURL: web });
  clients.push(website, mini, guest);
  const session = async client => (await (await client.get("/api/account/session")).json());
  let current = await session(website);
  const credentials = { userName: "synthetic-sync-user", password: "Synthetic-sync-only-2026!" };
  assert.equal((await website.post("/api/account/register", { headers: { "X-CSRF-TOKEN": current.csrfToken }, data: credentials })).status(), 200);
  current = await session(mini);
  assert.equal((await mini.post("/api/account/login", { headers: { "X-CSRF-TOKEN": current.csrfToken }, data: credentials })).status(), 200);
  const miniSession = await session(mini), webSession = await session(website);
  for (const key of ["meals", "reminders", "todos", "pomodoro", "memos", "dining", "mottos", "growth", "domains"]) {
    const data = key === "dining" ? { customFoods: [] } : { records: [{ id: `stable-${key}`, text: "双端🙂" }] };
    assert.equal((await mini.put(`/api/personal-tools/${key}`, { headers: { "X-CSRF-TOKEN": miniSession.csrfToken }, data: { data } })).status(), 200);
    assert.deepEqual((await (await website.get(`/api/personal-tools/${key}`)).json()).data, data);
    const next = key === "dining" ? data : { records: [{ id: `stable-${key}`, text: "网站更新" }] };
    assert.equal((await website.put(`/api/personal-tools/${key}`, { headers: { "X-CSRF-TOKEN": webSession.csrfToken }, data: { data: next } })).status(), 200);
    assert.deepEqual((await (await mini.get(`/api/personal-tools/${key}`)).json()).data, next);
    assert.equal((await guest.get(`/api/personal-tools/${key}`)).status(), 401);
  }
  browser = await chromium.launch({ headless: true });
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 375, height: 667 }]) {
    const page = await browser.newPage({ viewport });
    const response = await page.goto(web);
    assert.equal(response.status(), 200);
    assert.ok((await page.locator("body").innerText()).length > 0);
    assert.equal((await page.request.get(`${web}/api/account/session`)).status(), 200);
    await page.close();
  }
  console.log("PASS: Next dev renders desktop/mobile; API proxy, shared login, all nine tools round-trip in both directions, stable IDs and guest isolation. Synthetic data only; no live cloud test.");
} finally {
  await browser?.close();
  for (const client of clients) await client.dispose();
  if (child && child.exitCode === null) { const stopped = new Promise(resolve => child.once("exit", resolve)); child.kill(); await stopped; }
  rmSync(directory, { recursive: true, force: true });
}
