/* ============================================================
   Samiksha's Mehendi Art — local server + content API
   Plain Node.js. No npm install, no dependencies.

   Start it with:   node server.js
   Then open:       http://localhost:4321
   Admin panel:     http://localhost:4321/admin
   ============================================================ */

const http = require('http');
const fs   = require('fs');
const path = require('path');

/* ---------- settings you may want to change ---------- */
const PORT           = process.env.PORT || 4321;
const ADMIN_PASSWORD = 'samiksha';        // password for the admin panel
/* ----------------------------------------------------- */

const ROOT     = __dirname;
const PUBLIC   = path.join(ROOT, 'public');
const DATA     = path.join(ROOT, 'data');
const UPLOADS  = path.join(DATA, 'uploads');
const CONTENT  = path.join(DATA, 'content.json');
const DEFAULTS = path.join(DATA, 'content.default.json');
const BACKUPS  = path.join(DATA, 'backups');

fs.mkdirSync(UPLOADS, { recursive: true });
fs.mkdirSync(BACKUPS, { recursive: true });

// keep a pristine copy so "Reset to defaults" always works
if (!fs.existsSync(DEFAULTS) && fs.existsSync(CONTENT)) {
  fs.copyFileSync(CONTENT, DEFAULTS);
}

const MIME = {
  '.html':'text/html; charset=utf-8', '.js':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',   '.json':'application/json; charset=utf-8',
  '.png':'image/png',  '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif',
  '.webp':'image/webp','.svg':'image/svg+xml', '.ico':'image/x-icon', '.avif':'image/avif',
  '.webmanifest':'application/manifest+json', '.txt':'text/plain; charset=utf-8',
  '.woff2':'font/woff2', '.mp4':'video/mp4'
};
const EXT_FOR = {
  'image/png':'.png','image/jpeg':'.jpg','image/jpg':'.jpg','image/gif':'.gif',
  'image/webp':'.webp','image/svg+xml':'.svg','image/avif':'.avif'
};

function send(res, code, body, type, extra) {
  res.writeHead(code, Object.assign({
    'Content-Type': type || 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store'
  }, extra || {}));
  res.end(body);
}
function json(res, code, obj, extra) { send(res, code, JSON.stringify(obj), MIME['.json'], extra); }

/* A "revision" is just the file's last-modified time. The admin panel reads it
   when it loads and sends it back when saving, so an old browser tab cannot
   silently overwrite newer content. */
function currentRev() {
  try { return String(Math.round(fs.statSync(CONTENT).mtimeMs)); }
  catch (e) { return '0'; }
}

/* Refuse to write content that is obviously broken — a truncated or wrong
   payload would otherwise wipe the whole site. */
function contentProblems(obj) {
  const bad = [];
  if (!obj || typeof obj !== 'object') return ['not an object'];
  if (!obj.business || typeof obj.business !== 'object') bad.push('business');
  if (!Array.isArray(obj.sections)) bad.push('sections');
  if (!obj.pricing || !Array.isArray(obj.pricing.packages)) bad.push('pricing.packages');
  if (!obj.booking || !Array.isArray(obj.booking.occasions)) bad.push('booking.occasions');
  if (!obj.testimonials || !Array.isArray(obj.testimonials.items)) bad.push('testimonials.items');
  if (!obj.assistant || !Array.isArray(obj.assistant.rules)) bad.push('assistant.rules');
  return bad;
}

function readBody(req, cb) {
  const chunks = []; let size = 0;
  req.on('data', d => {
    size += d.length;
    if (size > 30 * 1024 * 1024) { req.destroy(); return; }   // 30 MB cap
    chunks.push(d);
  });
  req.on('end', () => cb(Buffer.concat(chunks).toString('utf8')));
}

function serveFile(res, file) {
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, 'Not found');
    send(res, 200, buf, MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
  });
}

function safeJoin(base, target) {
  const p = path.normalize(path.join(base, decodeURIComponent(target)));
  return p.startsWith(base) ? p : null;
}

function authed(req) {
  return (req.headers['x-admin-key'] || '') === ADMIN_PASSWORD;
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const p = u.pathname;

  /* ---------- API ---------- */

  // read the whole content file
  if (p === '/api/content' && req.method === 'GET') {
    return fs.readFile(CONTENT, (err, buf) =>
      err ? json(res, 500, { error: 'content.json could not be read' })
          : send(res, 200, buf, MIME['.json'], { 'X-Content-Rev': currentRev() }));
  }

  // check the admin password
  if (p === '/api/login' && req.method === 'POST') {
    return readBody(req, raw => {
      let pw = ''; try { pw = (JSON.parse(raw) || {}).password || ''; } catch (e) {}
      return pw === ADMIN_PASSWORD ? json(res, 200, { ok: true })
                                   : json(res, 401, { error: 'Wrong password' });
    });
  }

  // save the whole content file
  if (p === '/api/content' && req.method === 'POST') {
    if (!authed(req)) return json(res, 401, { error: 'Not signed in' });
    return readBody(req, raw => {
      let obj;
      try { obj = JSON.parse(raw); }
      catch (e) { return json(res, 400, { error: 'Invalid JSON' }); }

      const problems = contentProblems(obj);
      if (problems.length) {
        return json(res, 400, { error: 'These parts are missing or malformed: ' + problems.join(', ') });
      }

      // stale-tab guard: the panel tells us which version it started from
      const sent = req.headers['x-content-rev'];
      const now  = currentRev();
      if (sent && sent !== now) {
        return json(res, 409, {
          error: 'Someone else (or another browser tab) saved changes after this page was opened. '
               + 'Reload to get the latest version, then make your change again.',
          currentRev: now
        }, { 'X-Content-Rev': now });
      }

      try {
        if (fs.existsSync(CONTENT)) {
          const stamp = new Date().toISOString().replace(/[:.]/g, '-');
          fs.copyFileSync(CONTENT, path.join(BACKUPS, `content-${stamp}.json`));
        }
        fs.writeFileSync(CONTENT, JSON.stringify(obj, null, 2), 'utf8');
        json(res, 200, { ok: true, savedAt: new Date().toISOString(), rev: currentRev() },
             { 'X-Content-Rev': currentRev() });
      } catch (e) { json(res, 500, { error: String(e.message || e) }); }
    });
  }

  // restore the original content
  if (p === '/api/reset' && req.method === 'POST') {
    if (!authed(req)) return json(res, 401, { error: 'Not signed in' });
    try {
      if (!fs.existsSync(DEFAULTS)) return json(res, 404, { error: 'No default file found' });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      if (fs.existsSync(CONTENT)) fs.copyFileSync(CONTENT, path.join(BACKUPS, `content-${stamp}.json`));
      fs.copyFileSync(DEFAULTS, CONTENT);
      return json(res, 200, { ok: true });
    } catch (e) { return json(res, 500, { error: String(e.message || e) }); }
  }

  // upload an image  { name, dataUrl }  ->  { url }
  if (p === '/api/upload' && req.method === 'POST') {
    if (!authed(req)) return json(res, 401, { error: 'Not signed in' });
    return readBody(req, raw => {
      let body;
      try { body = JSON.parse(raw); } catch (e) { return json(res, 400, { error: 'Invalid JSON' }); }
      const m = /^data:([^;,]+);base64,(.*)$/s.exec(body.dataUrl || '');
      if (!m) return json(res, 400, { error: 'Not a valid image' });
      const mime = m[1].toLowerCase();
      const ext  = EXT_FOR[mime];
      if (!ext) return json(res, 400, { error: 'Use JPG, PNG, WEBP, GIF or SVG' });
      const buf = Buffer.from(m[2], 'base64');
      if (buf.length > 12 * 1024 * 1024) return json(res, 413, { error: 'Image is larger than 12 MB' });
      const base = String(body.name || 'image')
        .replace(/\.[^.]+$/, '').replace(/[^a-z0-9\-_]+/gi, '-').slice(0, 40).toLowerCase() || 'image';
      const file = `${base}-${Date.now()}${ext}`;
      try {
        fs.writeFileSync(path.join(UPLOADS, file), buf);
        json(res, 200, { ok: true, url: '/uploads/' + file, bytes: buf.length });
      } catch (e) { json(res, 500, { error: String(e.message || e) }); }
    });
  }

  // list previously uploaded images
  if (p === '/api/uploads' && req.method === 'GET') {
    try {
      const files = fs.readdirSync(UPLOADS)
        .filter(f => MIME[path.extname(f).toLowerCase()])
        .map(f => ({ url: '/uploads/' + f, mtime: fs.statSync(path.join(UPLOADS, f)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime);
      return json(res, 200, { files });
    } catch (e) { return json(res, 200, { files: [] }); }
  }

  /* ---------- uploaded images ---------- */
  if (p.startsWith('/uploads/')) {
    const f = safeJoin(UPLOADS, p.slice('/uploads/'.length));
    return f ? serveFile(res, f) : send(res, 403, 'Forbidden');
  }

  /* ---------- pages & static files ---------- */
  if (p === '/' || p === '/index.html')  return serveFile(res, path.join(PUBLIC, 'index.html'));
  if (p === '/admin' || p === '/admin/') return serveFile(res, path.join(PUBLIC, 'admin.html'));

  const f = safeJoin(PUBLIC, p);
  if (!f) return send(res, 403, 'Forbidden');
  fs.stat(f, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'Not found');
    serveFile(res, f);
  });
});

/* Start listening. If the port is busy, quietly try the next one. */
const PORT_FILE = path.join(ROOT, '.port');
let attempt = 0;

function start(port) {
  server.listen(port);
}

server.on('listening', () => {
  const port = server.address().port;
  try { fs.writeFileSync(PORT_FILE, String(port), 'utf8'); } catch (e) {}
  const line = '─'.repeat(48);
  console.log('\n' + line);
  console.log("  Samiksha's Mehendi Art is running");
  console.log(line);
  console.log('  Website :  http://localhost:' + port);
  console.log('  Admin   :  http://localhost:' + port + '/admin');
  console.log('  Password:  ' + ADMIN_PASSWORD);
  console.log(line);
  console.log('  Leave this window open while you use the site.');
  console.log('  Press Control + C here to stop it.\n');
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE' && attempt < 12) {
    attempt++;
    const next = Number(PORT) + attempt;
    console.log(`  Port ${Number(PORT) + attempt - 1} is busy, trying ${next}…`);
    setTimeout(() => start(next), 120);
    return;
  }
  if (err.code === 'EADDRINUSE') {
    console.error('\n  Could not find a free port between ' + PORT + ' and ' + (Number(PORT) + 12) + '.');
    console.error('  Close whatever else is running, or pick one yourself:\n');
    console.error('      PORT=8080 node server.js\n');
  } else if (err.code === 'EACCES') {
    console.error('\n  Not allowed to use port ' + PORT + '. Try a number above 1024:\n');
    console.error('      PORT=8080 node server.js\n');
  } else {
    console.error('\n  The server could not start:\n');
    console.error('  ' + (err.message || err) + '\n');
  }
  process.exit(1);
});

process.on('SIGINT', () => {
  try { fs.unlinkSync(PORT_FILE); } catch (e) {}
  console.log('\n  Stopped.\n');
  process.exit(0);
});

start(PORT);
