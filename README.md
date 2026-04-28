# Computer Networking Project 2 - Secure, Optimize, and Monitor a Website

This repository contains my Spring 2026 Computer Networking Project 2 submission.  
The goal was to take a basic static website and improve it with real-world security, performance, deployment, and monitoring practices.

Live site: `https://serene-froyo-e7a967.netlify.app/`

## What I implemented

### 1) Security enhancements (mandatory)

- **HTTPS/TLS enforcement** using Netlify-managed certificates.
- **HTTP -> HTTPS redirect** configured in `netlify.toml`.
- **HSTS** enabled with `Strict-Transport-Security`.
- **Security headers** enabled:
  - `Content-Security-Policy`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy`
  - `Permissions-Policy`
- **XSS protection** with DOMPurify on guestbook inputs.
- **Input validation** on client and server (field type + length checks).
- **Rate limiting behavior** in the UI (30-second cooldown between guestbook posts).

### 2) Database integration

- Added a **Firebase Firestore guestbook** so the site is no longer fully static.
- Users can submit messages (`name`, `message`, `timestamp`) and see updates in real time.
- Firestore is read with an `onSnapshot` listener for live updates.
- Firestore rules in `firestore.rules` enforce safe writes and block update/delete.

### 3) Performance optimization

- **Long-term browser caching** for CSS/JS with cache headers in `netlify.toml`.
- **CDN-delivered dependencies** (Firebase SDK + DOMPurify).
- **Asset optimization/minification** via Netlify deployment pipeline.
- **Responsive layout** and efficient static delivery for desktop/mobile usage.

### 4) Deployment and infrastructure

- Hosted on **Netlify** with automatic TLS and CDN distribution.
- Added **GitHub Actions CI/CD** in `.github/workflows/deploy.yml`.
- On push to `main`, workflow:
  1. Checks out repository
  2. Generates runtime Firebase config via `build.sh`
  3. Deploys to Netlify using repository secrets
- Secrets are stored in GitHub/Netlify settings (not hardcoded in source).

### 5) Monitoring and analytics

- Added **Google Analytics (GA4)** tracking in `index.html`.
- Tracks traffic and usage behavior for project analysis/reporting.

## Project structure

- `index.html` - main single-page site content and external SDK includes
- `style.css` - UI layout and responsive styles
- `script.js` - nav behavior, protocol check UI, Firestore guestbook logic, sanitization, and rate limit
- `netlify.toml` - redirects, security headers, and cache policies
- `firestore.rules` - backend data validation and write restrictions
- `firebase.json` - Firebase configuration (rules target)
- `build.sh` - generates `firebase-config.js` from environment variables at build time
- `.github/workflows/deploy.yml` - CI/CD deployment workflow

## Local development

### Prerequisites

- Python 3 (for local static hosting)
- Firebase project credentials (set as environment variables)

### Environment variables

Create a `.env` file (or export vars in your shell) with:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_MEASUREMENT_ID`

### Run locally

Generate runtime config and start a local server:

```bash
sh build.sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Notes

- `firebase-config.js` is generated at build time and ignored by git.
- `.env` is ignored by git to protect secrets.
- This project was built to satisfy Computer Networking Project 2 requirements:
  - security features,
  - at least two additional enhancements,
  - public deployment,
  - monitoring support.
