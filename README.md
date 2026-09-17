# RetaLog: Personal Weight, Glucose & Reta Intake Tracker

A private, offline-first tracker for a **Retatrutide weight-loss journey**, built
mobile-first, dressed in a translucent liquid-glass theme (light or dark), with a
reconstitution-driven dose calculator that turns mg into exact syringe units.

Everything you log stays in *your* browser. No accounts, no databases, no tracking.
`RESEARCH.md` explains every metric that made it in and why.

## What's inside

| View | What it does |
|---|---|
| **Today** | Goal ring (kg lost vs. goal) with count-up, 7-day-average weight, projected goal date, hydration card with pace reminders and one-tap water logging, next-dose countdown (mg **and units**), habit rings, today's log |
| **Trends** | Weight trend + goal line, fat-vs-muscle, glucose with fasting target band & post-meal limit, tape measurements (waist 102 cm mark), weekly workout minutes vs. lifting volume, calories & protein vs. target, sleep, blood pressure, energy/mood, HbA1c, progress photos. Range switch: 7D / 30D / 90D / ALL |
| **Dose** | **Dose calculator** (0.5–30 mg in 0.5 mg steps → insulin-syringe units from your saved vial strength), next-injection countdown, your titration ladder (start / step / interval / ceiling: editable), site rotation, side-effect log, latest labs with deltas |
| **More** | Theme (System / Light / Dark), reconstitution strength, titration plan, profile & glucose targets, daily goals, achievement badges, backup/restore, optional cloud sync |

Design notes: daily dots are noise, the **7-day moving average** is the signal; every
clinical metric gets a shaded target band; cards reveal with spring motion as you
scroll, the hero parallaxes, and the app is a PWA: install it to the home screen and
it works fully offline.

## Run it locally (30 seconds)

```bash
cd "Reta"
python3 -m http.server 8000
# Phone or desktop: open http://<your-computer-ip>:8000
```

(Or just double-click `index.html`: everything works, except the service worker,
which needs an `http://` URL. That only affects offline mode.)

First launch shows a 60-second onboarding (including your **vial strength** so the
calculator works from day one); **"Load demo data"** fills the app with a realistic
12-week journey so you can see every chart before you start.

## Deploy it free, then use it anywhere

All four options give you a permanent **https://** URL (required for the installable
offline app) and a free tier that comfortably covers one person.

### Option A: GitHub Pages (recommended: free forever, tidy URL)

1. Create a free account at [github.com](https://github.com) and make a new
   repository, e.g. `retalog`.
2. **Upload everything in this folder** to it: on the repo page click
   `Add file → Upload files`, drag *all* files (`index.html`, `app.js`, `styles.css`,
   `manifest.json`, `sw.js`, and the `icons/`, `fonts/`, `vendor/` folders), then
   `Commit changes`.
3. Go to **Settings → Pages**. Under *Build and deployment*: source
   `Deploy from a branch`, branch `main`, folder `/ (root)`, **Save**.
4. Wait ~1 minute. Your tracker is live at
   **`https://<your-username>.github.io/retalog/`**

### Option B: Netlify (fastest: 20 seconds, no code)

1. Open [app.netlify.com/drop](https://app.netlify.com/drop).
2. Drag this whole folder onto the page. Done: you get
   `https://<random-words>.netlify.app` immediately.
3. Optional: *Site settings → Change site name* to get `retalog.netlify.app`.

### Option C: Vercel / Cloudflare Pages

- **Vercel:** [vercel.com](https://vercel.com) → *New Project* → import the GitHub
  repo (or the folder via the CLI) → *Deploy*. Framework preset: **Other**.
- **Cloudflare Pages:** [pages.cloudflare.com](https://pages.cloudflare.com) →
  *Create a project* → connect the repo → *Deploy*. No settings needed.

### Install it on your Phone (then it works anywhere, offline)

1. Open your new URL in **Safari or Chrome** (use Safari, Chrome on iOS can't install apps).
2. Tap the **Share** icon (square with the up arrow).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**. The RetaLog icon appears on your home screen.

Open it from the icon and it runs **full-screen, no browser chrome**, works with no
internet (airplane mode, gym basement, anywhere), and your data persists between
opens. To update the app after you change the site: open it, and the service worker
swaps in the new version on the next launch.

### Keeping data in sync across devices

Everything lives in the browser you logged it in. Two free ways to move it:

- **Backup files (simple, bulletproof):** *More → Export backup* downloads a JSON
  file: save it to iCloud Drive / Files. On the other device, *More → Import backup*.
- **Cloud sync (no account):** [kvdb.io](https://kvdb.io) gives a free key-value bin
  with no signup. Create a bucket, take its URL, append `/retalog`, and paste it into
  *More → Cloud sync URL*. **Push** from the phone you log on, **Pull** from any
  other browser or device. (Your data sits on a third-party service; if you'd rather
  not, stick with backup files.)

## File map

```
index.html          app shell: views, floating glass nav, sheets, onboarding
app.js              the whole app (store, dose calculator, forms, charts, themes, FX)
styles.css          liquid-glass design system (light + dark, scroll animation CSS)
manifest.json       PWA manifest: makes it installable
sw.js               service worker: makes it offline
vendor/chart.umd.min.js   Chart.js, vendored so it works with no CDN
fonts/              self-hosted Fraunces / Inter / JetBrains Mono
icons/              generated app icons (run make_icons.py to regenerate)
make_icons.py       icon generator (PIL)
```

## Regenerating the icons

```bash
python3 make_icons.py
```

## Important

This is a **personal logging tool, not medical advice**. The titration ladder and the
0.5–30 mg dose range are reference tools: always follow your own prescription, and
bring the charts and the calculator to your clinician when you discuss escalation,
reconstitution, glucose targets or medication changes. Target bands (fasting 80–130
mg/dL, post-meal <180 mg/dL, HbA1c ≤6.5–7%, waist <102 cm) are standard reference
ranges, not personalised ones.
