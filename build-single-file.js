/* Builds one standalone HTML file from the site + current content.
   Run:  node build-single-file.js
   Output: samikshas-mehendi-art-standalone.html  (open by double-clicking) */
const fs = require('fs'), path = require('path');
const P = f => path.join(__dirname, f);

let html    = fs.readFileSync(P('public/index.html'), 'utf8');
const css   = fs.readFileSync(P('public/style.css'), 'utf8');
const art   = fs.readFileSync(P('public/art.js'), 'utf8');
const data  = fs.readFileSync(P('data/content.json'), 'utf8');

html = html.replace('<link rel="stylesheet" href="/style.css">', '<style>\n' + css + '\n</style>');
html = html.replace('<script src="/art.js"></script>',
  '<script>\n' + art + '\n</script>\n<script>window.__INLINE_CONTENT__ = ' + data + ';</script>');

const out = P('samikshas-mehendi-art-standalone.html');
fs.writeFileSync(out, html, 'utf8');
console.log('Built ' + out + '  (' + Math.round(html.length / 1024) + ' KB)');
console.log('Note: uploaded photos are linked as /uploads/... so they only appear when the server runs.');
