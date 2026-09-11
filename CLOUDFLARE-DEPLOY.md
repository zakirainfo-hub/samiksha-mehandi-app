# Deploying to Cloudflare

## What I could and could not do

**Done:** the app is fully ported to Cloudflare. That was real work, not a copy —
Cloudflare has no writable disk, so the Node server's file storage had to be replaced:

| Local version | Cloudflare version |
|---|---|
| `data/content.json` on disk | **KV**, key `content` |
| `data/uploads/*.jpg` | **R2** bucket, or KV if you skip R2 |
| `data/backups/` | KV `backup:<rev>` keys, kept 30 days |
| `node server.js` | Pages Functions in `cloudflare/functions/` |
| `ADMIN_PASSWORD` in the file | a Cloudflare **secret** |

The website, the admin panel, photo uploads, the stale-tab guard and the validation all
behave exactly as they do locally. I tested all of it against mock KV and R2 —
**34 checks, all passing**.

**Not done — and I can't:** pressing deploy. That needs you to sign in to your
Cloudflare account. I have no access to it, and I won't handle your login. Everything
below is four commands you run yourself.

---

## What you need

- A Cloudflare account (free is enough)
- Node.js on your machine
- About ten minutes

Cost: **₹0**. Pages, KV and R2 all have free tiers far above what this site will use.
R2 sometimes asks for a card on file — if you'd rather not, skip it and photos go into
KV instead. Everything works either way.

---

## Step 1 — build the files

From the project folder:

```bash
node build-cloudflare.js
```

This fills `cloudflare/public/` with the site, your current content and the 14 photos it
uses. Run it again any time you want the deployed *starting point* refreshed.

## Step 2 — sign in

```bash
cd cloudflare
npm install
npx wrangler login
```

A browser window opens; approve it. This is the part only you can do.

## Step 3 — create the storage

```bash
npx wrangler kv namespace create CONTENT
```

It prints something like:

```
[[kv_namespaces]]
binding = "CONTENT"
id = "a1b2c3d4e5f6..."
```

Copy that `id` into **`wrangler.toml`**, replacing `PASTE_YOUR_KV_NAMESPACE_ID_HERE`.

*Optional — photos in R2 instead of KV:*

```bash
npx wrangler r2 bucket create samiksha-mehendi-uploads
```

then uncomment the `[[r2_buckets]]` block in `wrangler.toml`.

## Step 4 — deploy

```bash
npx wrangler pages deploy public --project-name samiksha-mehendi
```

You get a URL like `https://samiksha-mehendi.pages.dev`. The site is live.

## Step 5 — set the admin password

```bash
npx wrangler pages secret put ADMIN_PASSWORD --project-name samiksha-mehendi
```

Type a **new, strong password** when prompted. Do not reuse `samiksha` — the site is
public now and `/admin` is guessable.

Until this secret is set, the admin panel refuses every login. That is deliberate.

Then visit `https://samiksha-mehendi.pages.dev/admin` and sign in.

---

## Your own domain

1. Add the domain to Cloudflare (**Add a site**) and point your registrar at the
   nameservers Cloudflare gives you
2. Pages project → **Custom domains** → **Set up a domain** → enter it
3. HTTPS is automatic

Then update `store-assets/listing.md` and `build-mobile.js` to use the real address:

```bash
node build-mobile.js https://samikshamehendiarts.com
```

---

## Day-to-day

**Changing text, prices or photos:** use `/admin` on the live site. Saves go straight
into KV and appear immediately. No redeploy.

**Changing the site's code** (layout, new sections, styling):

```bash
node build-cloudflare.js
cd cloudflare && npx wrangler pages deploy public --project-name samiksha-mehendi
```

Note the difference: **content lives in KV, code lives in the deploy.** Redeploying does
*not* wipe your admin edits — KV wins over the bundled copy. "Reset to defaults" in the
admin deletes the KV copy, which falls back to whatever was bundled at the last deploy.

**Seeing errors:**

```bash
npx wrangler pages deployment tail --project-name samiksha-mehendi
```

---

## Backing up

Content:

```bash
curl https://samiksha-mehendi.pages.dev/api/content > backup.json
```

Photos, if you used R2:

```bash
npx wrangler r2 object get samiksha-mehendi-uploads/<filename> --file <filename>
```

Do this before any big change. Every save also archives the previous version into KV for
30 days, but a file on your own machine is better.

---

## If something goes wrong

**"Admin panel says changes cannot be saved"** — the KV namespace isn't bound. Check the
`id` in `wrangler.toml`, then redeploy.

**"Wrong password" with the right password** — the secret isn't set, or was set on a
different project name. Re-run step 5.

**Photos show as broken** — the file isn't in R2/KV *and* wasn't bundled. Re-upload it in
the admin panel, or run `node build-cloudflare.js` and redeploy.

**Old version keeps showing** — the service worker. It's set to network-first so this
shouldn't happen, but a hard reload (`Cmd+Shift+R`) settles it.

**Everything looks broken after a deploy** — roll back in the dashboard: Pages project →
**Deployments** → pick the previous one → **Rollback**. Instant, and your KV content is
untouched.

---

## Security, plainly

`/admin` is protected by one password and nothing else. On a public URL that matters:

- Use a long, unique password
- Don't put it in `wrangler.toml` or any file — only as a secret
- `robots.txt` and a `noindex` header keep `/admin` out of Google, but that is not
  security, only tidiness

If you want it properly locked down later, **Cloudflare Access** (free for up to 50
users) can put email-code login in front of `/admin` so the password alone isn't enough.
Say the word and I'll set the config up.
