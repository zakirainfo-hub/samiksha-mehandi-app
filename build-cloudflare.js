/* ============================================================
   Assembles cloudflare/public/ for deployment.

   Run:  node build-cloudflare.js

   Copies the website, your current content (as the bundled default)
   and every photo the site uses into the folder wrangler uploads.
   ============================================================ */
const fs = require('fs');
const path = require('path');

const ROOT   = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA   = path.join(ROOT, 'data');
const OUT    = path.join(ROOT, 'cloudflare', 'public');

/* Clearing the folder is a nicety, not a requirement — if the filesystem
   refuses (locked file, restricted mount) we just overwrite in place. */
function rmrf(p) {
  try { fs.rmSync(p, { recursive: true, force: true }); }
  catch (e) { console.log('  (could not clear ' + path.basename(p) + ', overwriting instead)'); }
}
function copyDir(from, to, skip = []) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (skip.includes(e.name)) continue;
    const s = path.join(from, e.name), t = path.join(to, e.name);
    e.isDirectory() ? copyDir(s, t, skip) : fs.copyFileSync(s, t);
  }
}

rmrf(OUT);
fs.mkdirSync(OUT, { recursive: true });

// the site itself (admin panel included — it is password protected)
copyDir(PUBLIC, OUT);

// your content, bundled so a fresh deploy has something to show before
// anything is saved into KV
const content = fs.readFileSync(path.join(DATA, 'content.json'), 'utf8');
fs.writeFileSync(path.join(OUT, 'content.default.json'), content, 'utf8');

// only the photos the site actually references
const c = JSON.parse(content);
const used = new Set();
const add = p => { if (p && p.startsWith('/uploads/')) used.add(path.basename(p)); };
add(c.business.logo && c.business.logo.image);
(c.banner.collage || []).forEach(x => add(x.image));
(c.sections || []).forEach(s => (s.items || []).forEach(d => add(d.image)));

fs.mkdirSync(path.join(OUT, 'uploads'), { recursive: true });
let copied = 0, bytes = 0, missing = [];
for (const f of used) {
  const src = path.join(DATA, 'uploads', f);
  if (!fs.existsSync(src)) { missing.push(f); continue; }
  fs.copyFileSync(src, path.join(OUT, 'uploads', f));
  bytes += fs.statSync(src).size; copied++;
}

// Pages serves these as headers
fs.writeFileSync(path.join(OUT, '_headers'),
`/uploads/*
  Cache-Control: public, max-age=31536000, immutable

/icons/*
  Cache-Control: public, max-age=604800

/style.css
  Cache-Control: public, max-age=3600

/art.js
  Cache-Control: public, max-age=3600

/sw.js
  Cache-Control: no-cache

/content.default.json
  Cache-Control: no-store

/admin
  X-Robots-Tag: noindex

/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
`, 'utf8');

// keep the admin panel out of search results
fs.writeFileSync(path.join(OUT, 'robots.txt'),
`User-agent: *
Disallow: /admin
Disallow: /api/
Allow: /
`, 'utf8');

function walk(dir, base = dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p, base));
    else out.push(path.relative(base, p));
  }
  return out;
}
const all = walk(OUT);
const total = all.reduce((n, f) => n + fs.statSync(path.join(OUT, f)).size, 0);

console.log('Built cloudflare/public — ' + all.length + ' files, ' + Math.round(total / 1024) + ' KB');
console.log('  photos bundled: ' + copied + ' (' + Math.round(bytes / 1024) + ' KB)'
            + (missing.length ? '  MISSING: ' + missing.join(', ') : ''));
console.log('\nDeploy with:');
console.log('  cd cloudflare');
console.log('  npx wrangler pages deploy public --project-name samiksha-mehendi');
console.log('\nFirst time? Read CLOUDFLARE-DEPLOY.md — it covers login, KV and the password.');
