# Firebase & Google Cloud Security Posture — CLEARSHARE

## 1. Actual Infrastructure Inventory (Zero Firebase / Zero GCP Integrated)

An audit of [frontend/package.json](../frontend/package.json), [frontend/src/](../frontend/src), [backend/README.md](../backend/README.md), [Dockerfile](../Dockerfile), and [nginx.conf](../nginx.conf) confirms:

- **Firebase Authentication:** Not used (`N/A` — no user accounts or login system exists).
- **Cloud Firestore / Realtime Database:** Not used (`N/A` — document data is strictly ephemeral in browser memory).
- **Firebase Storage:** Not used (`N/A` — files never leave the browser).
- **Cloud Functions / Cloud Run:** Not used (`N/A` — zero backend execution layer).
- **Firebase App Check:** Not applicable (`N/A` — no protected Firebase/GCP backend endpoints exist).
- **Google Cloud IAM / Secret Manager / VPC Firewall / Cloud Armor:** Not provisioned (`N/A` — application deploys solely as static assets via Nginx/Docker).

Per zero-trust data-minimization principles, Firebase SDKs and cloud storage services were **deliberately not introduced**, ensuring documents never cross network trust boundaries.

## 2. Firewall, Ingress & Cloud Armor Applicability

- **Current Deployment (`nginx.conf` + `Dockerfile`):** CLEARSHARE serves static compiled frontend files (`frontend/dist`) on port `8080` with `server_tokens off`, `X-Frame-Options: DENY`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, and strict CSP.
- **VPC Firewall / Cloud Armor Status:** `[N/A]` for the static single-page container as currently architected. Because there are no databases, SSH-exposed VMs, or load-balanced backend APIs in this repo, provisioning a VPC firewall or paid Cloud Armor policy without a load-balanced backend would create unnecessary complexity and cost without protecting any server-side asset.
- **Static Hosting Equivalency:** If deployed behind a TLS reverse proxy, Cloudflare/CDN, or Firebase Hosting in the future, HTTPS termination and HTTP security response headers serve as the browser-facing policy boundary.

## 3. Mandatory Controls Checklist (Only If Firebase or GCP Is Adopted Later)

Do not add Firebase or GCP document storage without an explicit architectural review. Should a future feature require authentication or cloud hosting, enforce these gates **before go-live**:

1. **Firebase Hosting (Static Assets Only):** Configure HTTPS-only delivery, replicate all headers from [nginx.conf](../nginx.conf) inside `firebase.json` (removing any unnecessary wildcards), and verify CSP against the real Vite build.
2. **Firebase Authentication & App Check (Manual Console Action):** Enable only required providers, turn on Email Enumeration Protection, restrict Authorized Domains to production domains, register Web App Check (reCAPTCHA Enterprise), enforce App Check on all active products, and keep debug tokens strictly local.
3. **Firestore / Storage Rules & Emulator Tests (Configured + Manual Deploy):** Begin with default-deny (`allow read, write: if false;`), require `request.auth.uid == resource.data.ownerId`, validate strict schemas/sizes, keep sensitive documents strictly off cloud buckets/databases, and require `firestore.rules.test.ts` / `storage.rules.test.ts` passing in the Firebase Local Emulator Suite before CI release.
4. **Google Cloud IAM & Secret Manager (Manual Console Action):** Remove broad `Owner`/`Editor` roles from automation identities, use short-lived Workload Identity Federation for GitHub Actions (no long-lived JSON keys), store genuine server secrets in Cloud Secret Manager, enable billing/quota budget alerts, and configure API key restrictions.
