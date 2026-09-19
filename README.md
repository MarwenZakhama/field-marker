# Field Marker — offline GPS photo logger

A small web app: compact camera window (not fullscreen), tags every photo with
GPS coordinates and an optional reference number, works with no internet after
the first load.

## Files
- `index.html` — the app
- `manifest.json`, `sw.js` — makes it installable and offline-capable
- `piexif.js` — writes real GPS EXIF metadata into the JPEG (bundled, no CDN needed)
- `jszip.min.js` — bundles multiple photos into one .zip for the "save all" button (bundled, no CDN needed)
- `icon-192.png`, `icon-512.png` — app icons

## One important constraint
Phone browsers only allow camera + GPS access on a page loaded over **HTTPS**
(or `localhost`) — not from a bare `file://` path. So you need to host these
5 files somewhere once. After that first load, the service worker caches the
app and it keeps working with zero signal.

Easiest free option — **GitHub Pages**:
1. Create a new GitHub repo, upload these 5 files to it.
2. Repo Settings → Pages → Deploy from branch → `main` → `/ (root)`.
3. Open the given `https://yourname.github.io/reponame/` URL on your phone.
4. Tap the browser menu → **Add to Home Screen**. It now opens like a normal
   app, full offline, no browser address bar.

Any other static host (Netlify, Vercel, Cloudflare Pages, your own server)
works the same way — it just needs to be HTTPS.

## Using it
- Grant camera and location permission when asked (only needed once).
- Type a reference number if you want one (optional) — leave blank if not needed.
- Tap the shutter. The photo is saved to the on-page log with:
  - a visible watermark burned into the bottom of the image (ref + coordinates + timestamp)
  - the same data written into the photo's actual GPS EXIF tags (readable by
    any mapping/photo tool, e.g. Google Photos map view, GPS EXIF viewers, QGIS, etc.)
- "Auto-increment" ticks the reference number up by 1 after each capture —
  turn it off if you want to type each one manually, or leave the field blank
  for photos with no reference at all.
- Everything is stored locally in the browser (localStorage) until you export.
- **Save all photos as .zip** downloads every captured photo bundled into a
  single .zip file to your phone's Downloads folder (unzip it on the phone
  or on a computer to get the individual .jpg files). **Export CSV** gives
  you a spreadsheet of ref/lat/lon/time for every entry, no photo needed.
- **Clear** wipes the on-page log (does not touch photos already downloaded).

## On the "small window, not fully visible" request
The camera preview is intentionally a compact boxed widget rather than a
fullscreen camera takeover — it sits inside a normal-looking page layout so it
doesn't look like an active camera app from a glance at the screen. It's still
a real page in the browser/home-screen app, so it will show your phone's
normal status bar and won't hide from someone looking directly at the screen.

## Troubleshooting

**GPS says "permission denied":**
- Most common cause: your phone's system-wide **Location** toggle is off.
  Android will report this to the browser as "permission denied" even if
  you never blocked the *site* itself — turn on Settings → Location, then
  tap **Retry GPS lock** in the app.
- Check the *site's* permission too: tap the padlock/info icon next to the
  address bar → Permissions/Site settings → Location → set to Allow, then
  reload the page.
- Geolocation only works on an `https://` page (or `localhost`) — if you
  opened `index.html` directly from a file on your phone instead of the
  GitHub Pages link, it will not work. Use the `https://yourname.github.io/...`
  URL.

**Photos coming out black:**
This was a real bug — fixed in this version. The video element wasn't always
fully decoding a live frame before the photo was taken (common on mobile
browsers, especially right after opening the app or returning to it from the
background). The app now: explicitly starts video playback, waits until a
real frame is ready before letting you tap the shutter, resumes the camera
if the app was backgrounded, and checks each captured frame — if it still
comes out blank it automatically retries a few times and tells you to try
again rather than silently saving a black photo.

**"Save all photos" only saved one:**
Also fixed. Mobile browsers block multiple automatic downloads fired one
after another — only the first goes through. "Save all" now bundles every
captured photo into a single .zip file instead, so it's one download and
nothing gets blocked.

**Timestamps:**
All timestamps — on the photo watermark, in the photo/zip filenames, and in
the photo's EXIF metadata — are fixed to Tunisia local time
(`Africa/Tunis`, UTC+1 year-round, no daylight saving), regardless of what
timezone the phone itself is set to. Display format is Tunisian-style
`DD/MM/YYYY HH:MM:SS` (24-hour). Filenames use a safe `YYYY-MM-DD_HH-MM-SS`
version of the same moment. The "Save all photos" zip filename is also
timestamped the same way, e.g. `fieldmarker_photos_2026-08-19_22-06-14.zip`.

**Camera preview freezing / stuttering:**
Three rounds of trying to auto-detect and auto-fix a stalled preview in the
background all ended up causing their own stutter — either restarting the
stream too eagerly over normal brief pauses (autofocus/exposure), or
polling constantly in the background. That's been removed entirely. The
app now just starts the camera once and, if the preview is ever stuck, a
single tap anywhere on the screen resumes it — same as the original
behavior, no constant background checking running.

**Photos disappearing after closing the app:**
This was a real bug. Photos were stored as full-size base64 images in
`localStorage`, which caps out around 5-10MB per site — only a handful of
photos before the browser silently stopped saving new ones. It now stores
photos in IndexedDB instead, which doesn't have that small cap (typically
hundreds of MB, tied to actual free space on the device), so the whole
session's photos should survive closing and reopening the app. Any log
already sitting in the old storage is migrated over automatically the next
time you open the app. Still: export/download anything important
regularly — this is local device storage, not a backup, and could still be
lost if you uninstall the app, clear site data, or the browser evicts it.

**Delete confirmation:**
Tapping the delete icon on a single photo asks you to confirm before
removing it — same as "Clear," which already asked.

**Does "Clear" actually free up storage space?**
Yes — "Clear" now fully deletes the stored record from IndexedDB (rather
than overwriting it with an empty placeholder), so the space is actually
released, not just left as clutter. "Delete" on a single photo removes just
that photo's data the same way. Exporting the CSV or the zip doesn't clear
anything on its own — you still need to tap Clear (or delete individual
photos) afterward if you want the space back.

**Captured list and photo preview:**
Each entry in the captured list now shows the capture time next to the
reference number. There's also a new eye icon next to the download arrow —
tap it to view the full photo (with its reference, coordinates, and
timestamp) before deciding to download or delete it.

**Photo/text quality:**
Two changes improve sharpness, especially for photographing small text or
labels:
- On browsers that support it (most Android browsers; not currently
  Safari/iOS), photos are now captured straight from the camera sensor at
  its full photo resolution via the `ImageCapture` API, instead of from the
  lower-resolution live preview stream — this is a large jump in detail.
  Browsers without that support fall back to the previous method, now
  requested at a higher preview resolution than before.
- JPEG compression quality was raised, which reduces the blurring/artifacting
  compression can cause around fine text.
- Continuous autofocus is requested where the device supports it, which
  helps when photographing something up close.
There's no substitute for holding the phone steady and giving the camera a
half-second to focus before tapping the shutter, especially in low light.

If you already added the old version to your home screen, re-upload these
files to the same GitHub repo, then fully close and reopen the app once
(this lets the updated service worker take over) before testing again.

## Notes on GPS without signal
The phone's GPS chip gets a position from satellites directly — it does not
need mobile data or WiFi. The first fix after opening the app can take longer
without network-assisted GPS (no bars), and it may take longer indoors or
under cover. Once it locks, the coordinate box turns green and updates live.

## Tap-to-copy

Coordinates and reference numbers can be copied with a single tap. Anything
copyable has a dashed underline under it:

- **Live GPS readout** at the top — tap it to copy the current coordinates
  as `lat, lon`. The ±accuracy shown on screen is deliberately left off the
  clipboard so you get a clean pasteable value.
- **In the captured list** — tap a photo's reference number to copy just the
  reference; tap its coordinates to copy `lat, lon`. The list shows 5
  decimals to save space, but copying always gives the full 6 decimals.
- **In the photo viewer** (the eye icon) — buttons for *Copy coordinates*,
  *Copy reference*, and *Copy ref + coordinates*. The combined one copies
  them separated by a tab, so pasting into a spreadsheet drops the reference
  and the coordinates into two adjacent cells.

A short vibration and a toast confirm each copy. If the clipboard is blocked
by the browser, the app falls back to an older copy method automatically.
