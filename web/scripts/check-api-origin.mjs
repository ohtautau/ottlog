import assert from "node:assert/strict";
import { getApiOrigin } from "../src/lib/api-origin.ts";

assert.equal(getApiOrigin({}), "http://127.0.0.1:5229");
assert.equal(getApiOrigin({ API_BASE_URL: " https://api.example.com/ " }), "https://api.example.com");
assert.equal(getApiOrigin({ VERCEL: "1", API_BASE_URL: "https://api.example.com" }), "https://api.example.com");
for (const environment of [
  { VERCEL: "1" },
  { VERCEL: "1", API_BASE_URL: "http://127.0.0.1:5229" },
  { VERCEL: "1", API_BASE_URL: "https://localhost" },
  { API_BASE_URL: "https://user:secret@api.example.com" },
  { API_BASE_URL: "https://api.example.com/api" },
  { API_BASE_URL: "https://api.example.com?secret=value" },
  { VERCEL: "1", API_BASE_URL: "https://site.example.com", VERCEL_PROJECT_PRODUCTION_URL: "site.example.com" },
]) assert.throws(() => getApiOrigin(environment));
console.log("PASS: local default, separate cloud API, invalid origin and Vercel proxy-loop rejection.");
