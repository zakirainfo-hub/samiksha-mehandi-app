const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const IMAGE_TYPES = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/jpg", ".jpg"],
  ["image/gif", ".gif"],
  ["image/webp", ".webp"],
  ["image/svg+xml", ".svg"],
  ["image/avif", ".avif"],
]);

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  });
}

async function defaultContent(env) {
  const res = await env.ASSETS.fetch(new Request("https://assets.local/content.default.json"));
  if (!res.ok) throw new Error("Default content is missing");
  return res.text();
}

async function currentRev(env) {
  return (await env.CONTENT.get("content:rev")) || "0";
}

function isAuthed(request, env) {
  const password = env.ADMIN_PASSWORD || "samiksha";
  return request.headers.get("x-admin-key") === password;
}

function contentProblems(obj) {
  const bad = [];
  if (!obj || typeof obj !== "object") return ["not an object"];
  if (!obj.business || typeof obj.business !== "object") bad.push("business");
  if (!Array.isArray(obj.sections)) bad.push("sections");
  if (!obj.pricing || !Array.isArray(obj.pricing.packages)) bad.push("pricing.packages");
  if (!obj.booking || !Array.isArray(obj.booking.occasions)) bad.push("booking.occasions");
  if (!obj.testimonials || !Array.isArray(obj.testimonials.items)) bad.push("testimonials.items");
  if (!obj.assistant || !Array.isArray(obj.assistant.rules)) bad.push("assistant.rules");
  return bad;
}

function safeUploadName(name, mime) {
  const ext = IMAGE_TYPES.get(mime);
  if (!ext) return null;
  const base = String(name || "image")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9\-_]+/gi, "-")
    .slice(0, 40)
    .toLowerCase() || "image";
  return `${base}-${Date.now()}${ext}`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/admin" || path === "/admin/") {
      return env.ASSETS.fetch(new Request(new URL("/admin.html", url), request));
    }

    if (path === "/api/content" && request.method === "GET") {
      const content = (await env.CONTENT.get("content")) || await defaultContent(env);
      return new Response(content, {
        headers: { ...JSON_HEADERS, "X-Content-Rev": await currentRev(env) },
      });
    }

    if (path === "/api/login" && request.method === "POST") {
      let body = {};
      try { body = await request.json(); } catch (_) {}
      return body.password === (env.ADMIN_PASSWORD || "samiksha")
        ? json({ ok: true })
        : json({ error: "Wrong password" }, 401);
    }

    if (path === "/api/content" && request.method === "POST") {
      if (!isAuthed(request, env)) return json({ error: "Not signed in" }, 401);
      let obj;
      try { obj = await request.json(); }
      catch (_) { return json({ error: "Invalid JSON" }, 400); }

      const problems = contentProblems(obj);
      if (problems.length) {
        return json({ error: "These parts are missing or malformed: " + problems.join(", ") }, 400);
      }

      const sent = request.headers.get("x-content-rev");
      const now = await currentRev(env);
      if (sent && sent !== now) {
        return json({
          error: "This content changed after the admin page opened. Reload and try again.",
          currentRev: now,
        }, 409, { "X-Content-Rev": now });
      }

      const previous = await env.CONTENT.get("content");
      if (previous) {
        await env.CONTENT.put(`backup:${new Date().toISOString()}`, previous, {
          expirationTtl: 60 * 60 * 24 * 30,
        });
      }

      const rev = String(Date.now());
      await env.CONTENT.put("content", JSON.stringify(obj, null, 2));
      await env.CONTENT.put("content:rev", rev);
      return json({ ok: true, savedAt: new Date().toISOString(), rev }, 200, { "X-Content-Rev": rev });
    }

    if (path === "/api/reset" && request.method === "POST") {
      if (!isAuthed(request, env)) return json({ error: "Not signed in" }, 401);
      const fallback = await defaultContent(env);
      const previous = await env.CONTENT.get("content");
      if (previous) {
        await env.CONTENT.put(`backup:${new Date().toISOString()}`, previous, {
          expirationTtl: 60 * 60 * 24 * 30,
        });
      }
      const rev = String(Date.now());
      await env.CONTENT.put("content", fallback);
      await env.CONTENT.put("content:rev", rev);
      return json({ ok: true, rev }, 200, { "X-Content-Rev": rev });
    }

    if (path === "/api/upload" && request.method === "POST") {
      if (!isAuthed(request, env)) return json({ error: "Not signed in" }, 401);
      let body;
      try { body = await request.json(); }
      catch (_) { return json({ error: "Invalid JSON" }, 400); }

      const match = /^data:([^;,]+);base64,(.*)$/s.exec(body.dataUrl || "");
      if (!match) return json({ error: "Not a valid image" }, 400);
      const mime = match[1].toLowerCase();
      const file = safeUploadName(body.name, mime);
      if (!file) return json({ error: "Use JPG, PNG, WEBP, GIF, SVG or AVIF" }, 400);
      const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
      if (bytes.byteLength > 12 * 1024 * 1024) return json({ error: "Image is larger than 12 MB" }, 413);

      await env.CONTENT.put(`upload:${file}`, bytes, { metadata: { contentType: mime } });
      await env.CONTENT.put(`upload-index:${file}`, JSON.stringify({ url: `/uploads/${file}`, mtime: Date.now() }));
      return json({ ok: true, url: `/uploads/${file}`, bytes: bytes.byteLength });
    }

    if (path === "/api/uploads" && request.method === "GET") {
      const list = await env.CONTENT.list({ prefix: "upload-index:" });
      const files = [];
      for (const key of list.keys) {
        const raw = await env.CONTENT.get(key.name);
        if (raw) files.push(JSON.parse(raw));
      }
      files.sort((a, b) => b.mtime - a.mtime);
      return json({ files });
    }

    if (path.startsWith("/uploads/") && request.method === "GET") {
      const key = "upload:" + decodeURIComponent(path.slice("/uploads/".length));
      const value = await env.CONTENT.getWithMetadata(key, "arrayBuffer");
      if (!value.value) return new Response("Not found", { status: 404 });
      return new Response(value.value, {
        headers: {
          "Content-Type": value.metadata?.contentType || "application/octet-stream",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
