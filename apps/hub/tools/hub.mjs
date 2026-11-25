#!/usr/bin/env node
// A small command line for the Kindness Hub's API, so Claude (or anyone with the key) can read and
// change the hub from a terminal. No dependencies: Node 18 or newer.
//
//   node tools/hub.mjs                         what the API offers
//   node tools/hub.mjs week [YYYY-MM-DD]       a week's brief, kit, cards and tasks
//   node tools/hub.mjs list tasks --week 2026-11-16 --owner Mark
//   node tools/hub.mjs list videos --q "13 or B"
//   node tools/hub.mjs get cards <id>
//   node tools/hub.mjs add tasks '{"title":"Reply to comments","day":"2026-11-17","lever":"engage","ownerId":"Mark"}'
//   node tools/hub.mjs add videos --file new-videos.json
//   node tools/hub.mjs update tasks <id> '{"done":true}'
//   node tools/hub.mjs remove tasks <id>
//   node tools/hub.mjs upload <cardId> film.mp4 [--cover]   put a picture or video on a card
//   node tools/hub.mjs kit badge.png '{"title":"Badge","audience":"organisation"}' [--thumb t.jpg]   add to the partner kit
//   node tools/hub.mjs import plan.json        a whole plan (see tools/export-plan.mts)
//   node tools/hub.mjs log                     what has changed through the API
//
// Settings come from the environment, or from apps/hub/.env.hub.local (never committed):
//   HUB_API_KEY   the key (the same value as the HUB_API_KEY secret on GitHub). Required.
//   HUB_API_URL   defaults to the live project's function address
//   HUB_ACTOR     who you are, for the change log (default "Claude")

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.join(here, "..", ".env.hub.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const BASE = (process.env.HUB_API_URL || "https://tipfbleltjexofsjffwb.supabase.co/functions/v1/hub-api").replace(/\/$/, "");
const KEY = process.env.HUB_API_KEY;
const ACTOR = process.env.HUB_ACTOR || "Claude";

const [cmd, ...rest] = process.argv.slice(2);
const flags = {};
const args = [];
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith("--")) flags[rest[i].slice(2)] = rest[i + 1]?.startsWith("--") || rest[i + 1] === undefined ? "true" : rest[++i];
  else args.push(rest[i]);
}

function body() {
  if (flags.file) return JSON.parse(fs.readFileSync(flags.file, "utf8"));
  const raw = args.find((a) => a.trim().startsWith("{") || a.trim().startsWith("["));
  if (!raw) throw new Error("Give the fields as JSON, or --file path/to/file.json");
  return JSON.parse(raw);
}

/** Like call(), but hands the answer back instead of printing it. */
async function api(method, p, data) {
  const res = await fetch(`${BASE}${p}`, { method, headers: { Authorization: `Bearer ${KEY}`, "x-hub-actor": ACTOR, "Content-Type": "application/json" }, body: data !== undefined ? JSON.stringify(data) : undefined });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status}: ${out.error ?? "the hub refused"}`);
  return out;
}

async function call(method, p, data) {
  if (!KEY) {
    console.error("HUB_API_KEY is not set. Put it in apps/hub/.env.hub.local as HUB_API_KEY=... (that file is never committed).");
    process.exit(2);
  }
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, "x-hub-actor": ACTOR, ...(data !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
  const text = await res.text();
  let out;
  try {
    out = JSON.parse(text);
  } catch {
    out = text;
  }
  if (!res.ok) {
    console.error(`${res.status}: ${typeof out === "object" && out?.error ? out.error : text}`);
    process.exit(1);
  }
  console.log(typeof out === "string" ? out : JSON.stringify(out, null, 2));
}

const qs = (extra = {}) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...flags, ...extra })) if (k !== "file" && v !== undefined) p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
};

try {
  switch (cmd) {
    case undefined:
    case "help":
      await call("GET", "/");
      break;
    case "week":
      await call("GET", `/week${args[0] ? `?start=${args[0]}` : ""}`);
      break;
    case "list":
      await call("GET", `/${args[0]}${qs()}`);
      break;
    case "get":
      await call("GET", `/${args[0]}/${args[1]}`);
      break;
    case "add":
      await call("POST", `/${args[0]}`, body());
      break;
    case "update":
      await call("PATCH", `/${args[0]}/${args[1]}`, body());
      break;
    case "remove":
      await call("DELETE", `/${args[0]}/${args[1]}`);
      break;
    case "upload": {
      // node tools/hub.mjs upload <cardId> <file> [--cover]
      const [cardId, file] = args;
      if (!cardId || !file) throw new Error("Use: upload <cardId> <file> [--cover]");
      const data = fs.readFileSync(file);
      const ext = path.extname(file).toLowerCase();
      const mime = { ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" }[ext];
      if (!mime) throw new Error(`The hub takes pictures and videos; ${ext || "this file"} is neither.`);
      const ask = await api("POST", "/files", { cardId, name: path.basename(file), mime, size: data.length });
      const put = await fetch(ask.uploadUrl, { method: "PUT", headers: { "Content-Type": mime, "x-upsert": "false", "cache-control": "max-age=3600" }, body: data });
      if (!put.ok) throw new Error(`The upload did not go through (${put.status}): ${(await put.text()).slice(0, 200)}`);
      await call("POST", "/attach", { cardId, path: ask.path, name: path.basename(file), mime, kind: flags.cover ? "cover" : "media" });
      break;
    }
    case "kit": {
      // node tools/hub.mjs kit <file> '{"title":"Proud partner badge","audience":"organisation","section":"social"}' [--thumb small.jpg] [--folder partner]
      // puts a file in the public partner-kit store and adds it to the Partners Hub kit
      const [file] = args;
      if (!file) throw new Error('Use: kit <file> \'{"title": "..."}\' [--thumb small.jpg] [--folder name]');
      const fields = body();
      const KIT_MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml", ".pdf": "application/pdf", ".zip": "application/zip", ".mp4": "video/mp4", ".txt": "text/plain", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation" };
      const put = async (f) => {
        const data = fs.readFileSync(f);
        const mime = KIT_MIME[path.extname(f).toLowerCase()] ?? "application/octet-stream";
        const ask = await api("POST", "/kit-files", { name: path.basename(f), mime, size: data.length, folder: flags.folder ?? "kit" });
        const res = await fetch(ask.uploadUrl, { method: "PUT", headers: { "Content-Type": mime, "x-upsert": "false", "cache-control": "max-age=86400" }, body: data });
        if (!res.ok) throw new Error(`The upload did not go through (${res.status}): ${(await res.text()).slice(0, 200)}`);
        return { path: ask.path, mime, size: data.length };
      };
      const main = await put(file);
      const thumb = flags.thumb && flags.thumb !== "true" ? await put(flags.thumb) : null;
      await call("POST", "/partnerKit", { ...fields, filePath: main.path, mime: main.mime, sizeBytes: main.size, ...(thumb ? { thumbPath: thumb.path } : {}) });
      break;
    }
    case "import":
      await call("POST", "/import", JSON.parse(fs.readFileSync(args[0] ?? flags.file, "utf8")));
      break;
    case "log":
      await call("GET", `/log${qs({ limit: flags.limit ?? 50 })}`);
      break;
    default:
      console.error(`Unknown command "${cmd}". Try: week, list, get, add, update, remove, upload, kit, import, log.`);
      process.exit(2);
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
}
