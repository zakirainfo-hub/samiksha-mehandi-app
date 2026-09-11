# Getting this into the Play Store and the App Store

## Read this first — what is done, and what only you can do

**Done and in this folder:**

- The site is now an **installable app** (PWA). On Android and iPhone, opening it in
  a browser offers "Add to Home Screen" — it then runs full-screen with its own icon,
  no store involved. This works today, costs nothing, and needs no review.
- A complete **Capacitor project** (`mobile/`) that turns this same site into a real
  native Android and iOS app.
- Every **icon, splash screen and store graphic**, at every required size.
- The **store listing text** (`store-assets/listing.md`), ready to paste.

**Only you can do these**, because they are tied to your identity and payment:

| Step | Why it needs you |
|---|---|
| Google Play developer account — **$25 once** | Needs your ID, address and card |
| Apple Developer Program — **$99 per year** | Needs your Apple ID and card |
| Building the iOS app | Apple only allows this on a Mac with Xcode |
| Signing keys and certificates | These *are* your identity; they must never be shared |
| Pressing Submit, and answering review questions | Legally you are the publisher |

Nobody can do those parts for you — not me, not any tool. Everything up to that point
is prepared below.

**Honest expectation:** Google review usually takes 1–7 days. Apple usually 1–3 days.
Apple rejects apps that are "just a website" under guideline 4.2 — see
[Surviving Apple review](#surviving-apple-review) before you submit. If you only want
Samiksha's customers to have an app icon on their phone, the **PWA route below is
genuinely enough** and takes ten minutes.

---

## Route A — the free route (no stores, works today)

1. Put the site online (see *Hosting* below) on an `https://` address.
2. Send customers the link.
3. **Android:** Chrome shows an "Install app" prompt automatically.
   **iPhone:** Share button → *Add to Home Screen*.

They get an icon, a splash screen, full-screen mode, and it opens instantly even on a
bad signal. No $25, no $99, no review, and updates are live the moment you hit Save in
the admin panel.

Try it locally right now: run `node server.js`, open the site in Chrome, and look for
the **⤓ Install app** pill at the bottom-left.

> Note: iPhone only offers "Add to Home Screen" over `https://`, not on `localhost`.

---

## Route B — real store listings

### Step 0 — host the site first

The app fetches fresh content from your live site, so your admin edits reach people who
already installed it. Without this, changing a price means shipping an app update.

Any Node host works. Free/cheap options: **Render**, **Railway**, **Fly.io**.

- Start command: `node server.js`
- Persistent disk mounted at `data/` (otherwise uploads vanish on restart)
- **Change `ADMIN_PASSWORD` at the top of `server.js` before going public**

Say your site ends up at `https://samikshamehendi.com`.

### Step 1 — build the app bundle

```bash
cd samiksha-mehendi
node build-mobile.js https://samikshamehendi.com
```

That fills `mobile/www/` with the site, a bundled copy of your content (so the app works
offline), and a config pointing at your live API.

### Step 2 — install the tooling

You need **Node.js**, plus:

- **Android:** [Android Studio](https://developer.android.com/studio)
- **iOS:** a Mac with **Xcode** from the Mac App Store

```bash
cd mobile
npm install
npx cap add android      # creates mobile/android/
npx cap add ios          # creates mobile/ios/   (Mac only)
```

### Step 3 — apply the icons and splash screens

```bash
npx @capacitor/assets generate \
  --iconBackgroundColor '#FDF3E7' \
  --splashBackgroundColor '#FDF3E7'
```

This reads `mobile/assets/icon.png` and `mobile/assets/splash.png` (already there) and
writes every Android and iOS size into the native projects.

Then:

```bash
npx cap sync
```

Run `npx cap sync` again after **every** `node build-mobile.js`.

### Step 4 — Android: build a signed release

```bash
npx cap open android          # opens Android Studio
```

In Android Studio:

1. **Build → Generate Signed App Bundle / APK → Android App Bundle**
2. **Create new keystore.** Save the `.jks` file and its passwords somewhere safe —
   **if you lose them you can never update the app again.** Back them up twice.
3. Build variant **release** → you get `app-release.aab`

Set the version in `mobile/android/app/build.gradle` before each release:

```gradle
versionCode 1          // must go up by at least 1 every upload
versionName "1.0.0"    // what customers see
```

### Step 5 — Android: publish

1. <https://play.google.com/console> → pay the **$25** → verify your identity
   (this can take a few days — start it early)
2. **Create app** → name `Samiksha's Mehendi Art`, English (India), Free, App
3. Fill in from `store-assets/listing.md`:
   - Short and full description
   - App icon → `store-assets/play-icon-512x512.png`
   - Feature graphic → `store-assets/play-feature-graphic-1024x500.png`
   - Phone screenshots → **you must take these** (see *Screenshots* below)
4. Complete these mandatory questionnaires:
   - **Privacy policy URL** — required. `store-assets/privacy-policy.md` is a draft;
     host it at e.g. `https://samikshamehendi.com/privacy`
   - **Data safety** — declare: name, phone number and event details, collected only to
     arrange a booking, not shared with third parties, not used for ads
   - **Content rating** — answer "no" to everything; you will get *Everyone*
   - **Target audience** — 18+ (avoids the children's-app rules entirely)
   - **Ads** — none
5. Upload the `.aab` to **Production** → **Send for review**

### Step 6 — iOS: build and publish (Mac only)

```bash
npx cap open ios              # opens Xcode
```

In Xcode:

1. Select the **App** target → **Signing & Capabilities** → tick *Automatically manage
   signing* → choose your Team (needs the **$99/year** membership active)
2. Set **Bundle Identifier** to `com.samiksha.mehendiart` — it must match
   `capacitor.config.json` and be registered in your Apple account
3. Set **Version** `1.0.0` and **Build** `1`
4. **Product → Destination → Any iOS Device (arm64)**
5. **Product → Archive** → *Distribute App* → *App Store Connect* → *Upload*

Then at <https://appstoreconnect.apple.com>:

1. **My Apps → +** → fill in the listing from `store-assets/listing.md`
2. **Screenshots are mandatory** — 6.7" iPhone at minimum (1290×2796)
3. **App Privacy** — same answers as Google's Data safety
4. **Age rating** — 4+
5. Pick your uploaded build → **Submit for Review**

---

## Screenshots

Both stores reject listings without them, and I cannot produce them — they have to be
real captures of the app running.

**Easiest way:** open the site in Chrome on your computer, press `F12`, click the
phone/tablet icon, choose *iPhone 14 Pro Max*, then use the device-toolbar menu →
*Capture screenshot*.

Take these five:

1. The banner with the name and Book button
2. Designer Mehandi tiles
3. Figures Mehandi tiles
4. Pricing Packages
5. The booking form

| Store | Sizes needed |
|---|---|
| Google Play | 2–8 shots, anywhere from 320px to 3840px on the long edge |
| Apple | 6.7" iPhone `1290×2796`; iPad 12.9" `2048×2732` if you tick iPad support |

Put them in `store-assets/screenshots/`.

---

## Surviving Apple review

Guideline **4.2 Minimum Functionality** is the real risk: Apple rejects apps that just
show a website. Things in your favour, and what to say:

- The app **works with no signal** — designs, prices and the catalogue are bundled
- It uses the **native share and WhatsApp handoff**, not a browser tab
- It has **home-screen shortcuts** (Book, Designs, Pricing)
- In *App Review Notes*, write plainly: *"Booking app for a single mehendi artist in
  Mumbai. Catalogue and pricing work offline; bookings are completed over WhatsApp."*

If it is still rejected, the honest fixes are to add something a browser cannot do —
push notifications for booking confirmations, photo upload from the camera, or calendar
integration. Tell me and I will add one.

**Google Play** is far more relaxed about this; it is rarely a problem there.

---

## Shipping a change later

```bash
# 1. edit content in the admin panel, then:
node build-mobile.js https://samikshamehendi.com
cd mobile && npx cap sync
# 2. bump versionCode/versionName (Android) or Build/Version (iOS)
# 3. rebuild and upload
```

**But most changes need none of this.** Prices, photos, designs and text all come from
your live site, so the app picks them up on its own. You only need a new release when
the app's *code* changes.

---

## Cost summary

| | One-off | Yearly |
|---|---|---|
| PWA (Route A) | ₹0 | ₹0 |
| Google Play | ~₹2,100 ($25) | ₹0 |
| Apple App Store | ₹0 | ~₹8,300 ($99) |
| Hosting | ₹0 | ₹0–₹600/mo |

My suggestion: **do Route A today**, start the Google Play identity verification in
parallel since it is slow and cheap, and only pay Apple once you know customers actually
want an iPhone app.
