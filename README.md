# Samiksha's Mehendi Art — website + admin panel

A small website with its own admin panel. Everything you see on the site —
every word, price, design and photo — is stored in one file (`data/content.json`)
and edited through the admin panel in your browser. No coding needed.

---

## 1. Start it (first time)

**You need Node.js once.** Check by opening Terminal and typing `node -v`.
If it says "command not found", install it from <https://nodejs.org> (the green **LTS** button).

Then:

**Mac** — double-click **`START-HERE.command`**.
The first time, macOS may block it. If so: right-click the file → **Open** → **Open**.
If it still refuses, open Terminal and run:

```
chmod +x "/path/to/samiksha-mehendi/START-HERE.command"
```

**Any computer** — open a Terminal in this folder and run:

```
node server.js
```

## 2. The two addresses

| What | Address |
|---|---|
| The website | <http://localhost:4321> |
| The admin panel | <http://localhost:4321/admin> |

Admin password: **`samiksha`**

To stop the site, press **Control + C** in the Terminal window.

---

## 3. What you can change from the admin panel

| Tab | Controls |
|---|---|
| **Business info** | Logo (with height/width), name, tagline, WhatsApp number, address, hours, rating, button labels, the three stat boxes |
| **Banner & images** | Upload the banner photo (add a second for an overlapping pair) |
| **Mehandi designs** | Add / rename / reorder / delete whole sections and individual designs, upload a photo for each, set price, time, coverage and description |
| **Pricing** | The package cards — name, price, badge, description |
| **Customer reviews** | Add, edit, reorder or delete reviews |
| **Booking form** | Headings, the occasion chips, the location list |
| **AI assistant** | The greeting, the suggested questions, and every keyword → answer pair |
| **Footer** | The single copyright line ({year} auto-fills) |

Click **Save changes**, then refresh the website tab to see it.

### About photos

Every design and banner slot shows a **drawn henna illustration** until you
upload a real photo. Upload one and it replaces the drawing automatically.
Remove it and the drawing comes back.

- Accepted: JPG, PNG, WEBP, GIF, SVG — up to 12 MB each
- Uploaded files are saved into `data/uploads/`
- Square photos work best for design tiles

---

## 4. Where your data lives

```
data/content.json          ← all the text, prices and designs
data/uploads/              ← every photo you upload
data/backups/              ← a copy is saved automatically before each save
data/content.default.json  ← the original, used by "Reset to defaults"
```

**To back everything up**, copy the whole `data` folder somewhere safe.
That is the entire site content.

---

## 5. It works on every screen size

The site is one responsive layout, tested at 360, 390, 430, 768, 1024, 1280 and 1600px:

- **Phones** — single column, designs 2-up (4-up from 430px), packages stacked as rows,
  reviews swipe sideways, a fixed *Book Now* bar at the bottom, notch-safe padding
- **Tablets** — wider column, larger type
- **Desktop** — a proper header with navigation and a Book button, the bottom bar
  disappears, reviews become a 2×2 grid, the booking form goes two columns, and design
  details open as a centred dialog instead of a bottom sheet

Inputs are 16px so iPhones don't zoom when tapping a field, and animations respect the
"reduce motion" accessibility setting.

## 6. Installing it as a phone app

The site is a **PWA**, so it installs without any app store:

- **Android / Chrome** — an *Install app* prompt appears (or use the ⤓ pill at the
  bottom-left)
- **iPhone / Safari** — Share → *Add to Home Screen*

It then runs full-screen with its own icon and works without a signal.
iPhone only offers this over `https://`, not on `localhost`.

For real **Play Store and App Store** listings, see **`APP-STORE-GUIDE.md`**. Everything
that can be prepared already is — the Capacitor project in `mobile/`, every icon, the
splash screen, the store graphics, the listing text and a privacy-policy draft. The
guide is honest about the parts only you can do (developer accounts, a Mac with Xcode,
signing keys, pressing Submit).

To rebuild the app bundle after changing content:

```
node build-mobile.js https://your-live-site.com
cd mobile && npx cap sync
```

To regenerate every icon and store graphic from code:

```
pip3 install pillow
python3 make-icons.py
```

## 7. Putting it online

The quickest route is **Cloudflare** — free, fast in India, and the admin panel keeps
working. Everything is already ported and tested:

```
node build-cloudflare.js
cd cloudflare && npm install && npx wrangler login
npx wrangler pages deploy public --project-name samiksha-mehendi
```

Full instructions, including the storage setup and the admin password, are in
**`CLOUDFLARE-DEPLOY.md`**.

## 7b. Other hosts

The site is a normal Node.js app with no dependencies, so it runs as-is on
Render, Railway, Fly.io, a VPS, or any host that supports Node.

- Start command: `node server.js`
- It listens on `PORT` if the host sets one, otherwise 4321
- **Before going public, change the password** at the top of `server.js`:
  ```js
  const ADMIN_PASSWORD = 'samiksha';
  ```
  The admin panel has no other protection, so this matters.
- Make sure the `data` folder is on persistent storage, or uploads and edits
  will disappear when the host restarts.

### Just want one plain HTML file?

```
node build-single-file.js
```

That produces `samikshas-mehendi-art-standalone.html` — the whole site frozen
into a single file you can email or drop on any static host. It has no admin
panel, and it only includes photos that are drawn (uploaded photos live in
`data/uploads/`, so copy that folder alongside it if you have used any).

---

## 8. Folder map

```
samiksha-mehendi/
├── START-HERE.command       double-click to run (Mac)
├── README.md                this file
├── APP-STORE-GUIDE.md       publishing to Play Store / App Store
├── CLOUDFLARE-DEPLOY.md     putting the site online (recommended)
├── server.js                the server — port and password are at the top
├── build-single-file.js     freeze the site into one HTML file
├── build-mobile.js          build the phone-app bundle
├── build-cloudflare.js      build the Cloudflare deploy folder
├── make-icons.py            regenerate all icons and store graphics
├── public/
│   ├── index.html           the website
│   ├── admin.html           the admin panel
│   ├── style.css            all the styling, all breakpoints
│   ├── art.js               the drawn henna artwork
│   ├── sw.js                offline support
│   ├── manifest.webmanifest makes it installable
│   └── icons/               every app icon size
├── data/
│   ├── content.json         ← your content
│   ├── content.default.json  what "Reset to defaults" restores
│   ├── uploads/             your photos
│   └── backups/             automatic, one per save
├── cloudflare/              the Cloudflare Pages version
│   ├── functions/           the API, running at the edge (KV + R2)
│   ├── wrangler.toml        put your KV namespace id here
│   └── public/              generated by build-cloudflare.js
├── mobile/                  the Android + iOS project
│   ├── capacitor.config.json
│   ├── package.json
│   ├── assets/              icon.png and splash.png for the native builds
│   └── www/                 generated by build-mobile.js
└── store-assets/
    ├── listing.md           store text, ready to paste
    ├── privacy-policy.md    draft — both stores require one
    ├── play-icon-512x512.png
    ├── play-feature-graphic-1024x500.png
    ├── appstore-icon-1024x1024.png
    ├── splash-2048x2048.png
    └── screenshots/         ← you need to add these
```

---

## 9. Common problems

**"Port 4321 is already in use"** — the site is already running in another
window. Close it, or start on a different port:

```
PORT=5000 node server.js
```

**The page says "The content file could not be loaded"** — the server is not
running. Start it and reload.

**I broke something in the admin panel** — click **Reset to defaults**, or copy
a file out of `data/backups/` over `data/content.json`.

**Bookings** — nothing is stored on the server. The form builds a filled-in
WhatsApp message and the customer sends it themselves.
