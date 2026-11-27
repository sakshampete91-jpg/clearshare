# Firebase Hosting Deployment Guide — CLEARSHARE

## 1. Deployment Architecture

CLEARSHARE is a **100% client-side React 19 + Vite 8 + TypeScript 7 single-page application** inside [`frontend/`](../frontend):

- **Public Build Directory:** `frontend/dist/`
- **Backend / Cloud Databases:** **None** (`N/A` — document extraction, PII/secret detection, exposure simulation, sanitization, verification, and exports execute exclusively in browser RAM).
- **Firebase Service Scope:** **Firebase Hosting only** (`firebase deploy --only hosting`). Firebase Authentication, Firestore, Realtime Database, Firebase Storage, Cloud Functions, and App Check are **not** used and must not be deployed unnecessarily.

---

## 2. Production Security Headers (`firebase.json`)

[`firebase.json`](../firebase.json) configures Firebase Hosting to serve **only** `frontend/dist/` with:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`
- `Content-Security-Policy`:
  - `default-src 'self'; script-src 'self'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none';`
  - **Notes:**
    - `script-src 'self'` strictly disallows inline scripts and `'unsafe-eval'`.
    - `worker-src 'self' blob:` supports the bundled Web Worker (`documentProcessing.worker-*.js`) and `pdfjs-dist` worker (`pdf.worker.min-*.mjs`).
    - `style-src 'self' 'unsafe-inline'` is scoped to React inline style attributes (such as dynamic exposure progress bars).
- **Caching:** Content-hashed assets under `/assets/**` use `public, max-age=31536000, immutable`; `/index.html` uses `no-cache, must-revalidate` so browsers always load fresh releases.
- **SPA Fallback:** All unmatched non-file routes rewrite to `/index.html`.
- **SSL / HTTPS:** Managed automatically by Firebase Hosting on `*.web.app` and `*.firebaseapp.com`.

---

## 3. Connected Project & One-Time Setup

- **Configured Project ID (`.firebaserc`):** `clearshare-e965e` (Hosting site: `clearshare-e965e`)
- **Live URLs:**
  - `https://clearshare-e965e.web.app`
  - `https://clearshare-e965e.firebaseapp.com`

If setting up on a fresh machine (on Windows PowerShell, use `.cmd` shims):
```powershell
npm.cmd install -g firebase-tools
firebase.cmd --version
firebase.cmd login
firebase.cmd use clearshare-e965e
```

---

## 4. Pre-Deployment Verification Checklist

Run from repository root / `frontend/`:

```powershell
Set-Location 'C:\Users\Dell\.gemini\antigravity\scratch\clearshare\frontend'
npm.cmd ci
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test:run
npm.cmd run build
```

Optional local Firebase Hosting emulator check (from repository root after creating `.firebaserc`):

```powershell
Set-Location 'C:\Users\Dell\.gemini\antigravity\scratch\clearshare'
firebase.cmd emulators:start --only hosting
```

---

## 5. Preview Channel Verification (Recommended Before Live Publish)

Deploy an expiring preview channel first and test desktop + mobile views, synthetic sample flows, console logs, network tab (`0` outbound document calls), and HTTP response headers:

```powershell
Set-Location 'C:\Users\Dell\.gemini\antigravity\scratch\clearshare'
firebase.cmd hosting:channel:deploy clearshare-preview --expires 7d
```

Never test preview URLs with real confidential documents.

---

## 6. Production Deployment (`--only hosting`)

Once preview verification passes:

```powershell
Set-Location 'C:\Users\Dell\.gemini\antigravity\scratch\clearshare'
firebase.cmd deploy --only hosting
```

After deployment succeeds:
1. Record the live URLs printed by Firebase CLI (`https://<PROJECT_ID>.web.app` and `https://<PROJECT_ID>.firebaseapp.com`).
2. Update [`README.md`](../README.md) with the real verified live URL.
3. Verify `curl -I https://<PROJECT_ID>.web.app` response headers and test the live workflow with built-in synthetic fixtures only.

---

## 7. Release Inspection & Safe Rollback

Do not delete prior working releases:

```powershell
# Inspect active Hosting channels & finalized versions
firebase.cmd hosting:channel:list --json
firebase.cmd hosting:sites:get clearshare-e965e --json

# Clone a verified preview channel back to live (or roll back in Firebase Console -> Hosting -> Release history):
firebase.cmd hosting:clone clearshare-e965e:clearshare-preview clearshare-e965e:live

# Or rebuild cleanly from a known-good Git commit and redeploy:
git checkout <verified-commit-sha>
Set-Location frontend; npm.cmd ci; npm.cmd run build
Set-Location ..; firebase.cmd deploy --only hosting
```

---

## 8. Future GitHub Actions Integration Proposal (Optional, Disabled Until Manual Deploy Succeeds)

Only after manual preview and production deployments pass:
- Use **Workload Identity Federation** (`google-github-actions/auth`) rather than long-lived service-account JSON keys.
- Restrict Hosting deployments to `main` (and preview channels to trusted non-fork PRs) using dedicated least-privilege role `roles/firebasehosting.admin` scoped strictly to this Hosting project.
- Require `lint`, `typecheck`, `test:run`, `build`, `npm audit`, and secret-hygiene checks in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) to pass as release gates before any deployment job runs.
