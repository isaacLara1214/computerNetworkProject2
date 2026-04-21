# Technical Report: Secure, Optimize, and Monitor Your Website
**Course:** Computer Networking — Project 2  
**Instructor:** Roya Hosseini  
**Semester:** Spring 2026  
**Author:** Isaac Lara  

---

## 1. Overview

This report documents the enhancements made to the static website built in Project 1. The goal of Project 2 was to transform that baseline site into a production-grade web application by adding real-world security controls, database-backed dynamic content, performance optimizations, automated deployment infrastructure, and traffic monitoring.

The following improvements were implemented:

- **Security:** HTTPS/TLS enforcement, HTTP security headers (CSP, HSTS, X-Frame-Options), XSS input sanitization via DOMPurify, server-side Firestore validation rules, and client-side rate limiting.
- **Database Integration:** A live guestbook powered by Firebase Firestore with real-time updates.
- **Performance:** Long-term browser caching, CDN delivery of third-party assets with SRI integrity verification, and lazy loading.
- **Deployment & Infrastructure:** Continuous deployment via GitHub Actions to Netlify, with all secrets managed through environment variables — no credentials in source code.
- **Monitoring:** Google Analytics (GA4) for real-time traffic analysis.

Each improvement maps to a professional practice used in industry-grade web applications.

---

## 2. Implementation Details

### 2.1 Security Enhancements

#### HTTPS / TLS
The website is hosted on Netlify, which provisions a free TLS certificate automatically through Let's Encrypt. Every HTTP request is permanently redirected to HTTPS using a 301 redirect rule in `netlify.toml`:

```toml
[[redirects]]
  from   = "http://compnetworkproject2.netlify.app/*"
  to     = "https://compnetworkproject2.netlify.app/:splat"
  status = 301
  force  = true
```

This ensures all traffic between the browser and the server is encrypted with TLS, preventing eavesdropping and man-in-the-middle attacks.

#### HTTP Security Headers
All responses include a suite of security headers configured in `netlify.toml`:

| Header | Value | Purpose |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Forces HTTPS for 1 year; eligible for browser preload lists |
| `Content-Security-Policy` | *(see below)* | Restricts which origins can load scripts, styles, and connections |
| `X-Frame-Options` | `DENY` | Prevents the page from being embedded in iframes (clickjacking) |
| `X-Content-Type-Options` | `nosniff` | Prevents browsers from guessing MIME types |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer data sent to external sites |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` | Disables sensitive browser APIs |

The Content Security Policy explicitly whitelists trusted origins for scripts (Google Tag Manager, Firebase CDN, DOMPurify CDN), connections (Firebase APIs, Google Analytics), and frames — blocking everything else by default.

#### XSS Protection with DOMPurify
All user-submitted guestbook content is sanitized using DOMPurify before being stored or rendered. DOMPurify strips any HTML tags or JavaScript from input, neutralizing script injection attempts. Sanitization is applied twice: once on form submission (before the Firestore write) and again on render (when messages are loaded from the database). This defense-in-depth approach ensures that even if malicious data reached the database, it cannot execute in a user's browser.

```js
const name    = DOMPurify.sanitize(nameInput.value.trim(), { ALLOWED_TAGS: [] });
const message = DOMPurify.sanitize(msgInput.value.trim(),  { ALLOWED_TAGS: [] });
```

The DOMPurify library is loaded from the Cloudflare CDN with a Subresource Integrity (SRI) hash, ensuring the file has not been tampered with:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.6/purify.min.js"
        integrity="sha512-jB0TkTBeQC9ZSkBqDhdmfTv1qdfbWpGE72yJ/01Srq6hEzZIz2xkz1e57p9ai7IeHMwEG7HpzG6NdptChif5Pg=="
        crossorigin="anonymous"></script>
```

#### Firestore Security Rules
Server-side Firestore rules (`firestore.rules`) validate every write before it is accepted by the database. The rules enforce that:

- Required fields (`name`, `message`, `timestamp`) are all present.
- Both `name` and `message` are strings within defined length limits.
- No document can ever be updated or deleted after creation.

This means even if a client bypasses front-end validation (e.g., using the browser console), the database will still reject invalid or malicious writes.

#### Client-Side Rate Limiting
The guestbook form enforces a 30-second cooldown between submissions using a timestamp comparison in JavaScript. The submit button is disabled during the cooldown and a live countdown is shown to the user. This prevents simple flooding attacks against the Firestore database.

---

### 2.2 Database Integration

Firebase Firestore (NoSQL, free tier) was integrated to make the website dynamic. Users can submit messages through a guestbook form; messages are stored with a server-generated timestamp and displayed in reverse chronological order.

A real-time Firestore `onSnapshot` listener updates the displayed messages instantly whenever a new entry is added — no page refresh required:

```js
db.collection("messages")
  .orderBy("timestamp", "desc")
  .limit(20)
  .onSnapshot((snapshot) => { /* render messages */ });
```

**Credential Security:** Firebase configuration keys are never stored in the Git repository. A shell script (`build.sh`) reads them from environment variables at build time and writes a `firebase-config.js` file that is gitignored. On Netlify, these variables are set in the dashboard. On GitHub Actions, they are stored as repository secrets.

```sh
# build.sh — runs at deploy time
cat > firebase-config.js <<EOF
window.__ENV = {
  apiKey: "${FIREBASE_API_KEY}",
  ...
};
EOF
```

---

### 2.3 Performance Optimization

#### Browser Caching
`netlify.toml` sets long-term cache headers on static assets:

```toml
[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

This tells browsers to cache JavaScript and CSS files for one year without revalidating. On return visits, these files are served from the local cache rather than re-downloaded, reducing load time and bandwidth usage.

#### CDN Delivery
Third-party libraries (Firebase SDK, DOMPurify) are loaded from global CDNs (gstatic.com, cdnjs.cloudflare.com) rather than from the origin server. CDN nodes serve files from locations geographically close to the user, reducing latency. All CDN-loaded scripts include SRI integrity hashes to verify authenticity.

Netlify itself distributes the site across a global CDN, so all assets — HTML, CSS, JS — are edge-cached and served from the closest datacenter to each visitor.

#### Lazy Loading
Images use the native browser `loading="lazy"` attribute, which defers loading of off-screen images until the user scrolls near them. This reduces initial page load time and saves bandwidth for users who do not scroll the full page.

---

### 2.4 Deployment & Infrastructure

#### Netlify Hosting
The site is deployed to Netlify, which provides automatic HTTPS, global CDN distribution, and continuous deployment triggered by Git pushes. IPv6 is supported natively by Netlify's infrastructure — no additional configuration was required.

#### GitHub Actions CI/CD
A GitHub Actions workflow (`.github/workflows/deploy.yml`) automates deployment on every push to the `main` branch:

1. Checks out the repository.
2. Injects Firebase credentials from GitHub secrets into environment variables.
3. Runs `build.sh` to generate `firebase-config.js`.
4. Deploys the site to Netlify using the Netlify CLI.

```yaml
- name: Generate Firebase config
  env:
    FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
    ...
  run: sh build.sh

- name: Deploy to Netlify
  uses: netlify/actions/cli@master
  with:
    args: deploy --dir=. --prod
```

This eliminates manual deployments and ensures that only code passing the workflow reaches production.

---

### 2.5 Network Monitoring & Security Analysis

Google Analytics 4 (Measurement ID: `G-6J7Q1K816E`) is embedded in every page. It tracks:

- **Page views** — which pages are visited and how often.
- **Session duration** — how long users stay on the site.
- **Traffic sources** — direct, referral, or organic search.
- **User geography** — country and city of visitors.
- **Device type** — desktop, mobile, or tablet.

The GA4 snippet is loaded asynchronously so it does not block page rendering:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-6J7Q1K816E"></script>
```

Security headers can be verified in real time using tools such as [securityheaders.com](https://securityheaders.com), and network traffic can be inspected using Wireshark or the browser's DevTools Network panel to confirm HTTPS encryption on all requests.

---

## 3. Challenges & Solutions

### Challenge 1: Content Security Policy Blocking Firebase and DOMPurify
After deploying the CSP header, the browser blocked requests to `gstatic.com` (Firebase SDK source maps) and `cdnjs.cloudflare.com` (DOMPurify). The error messages in the DevTools console identified exactly which origins were missing from which CSP directives.

**Solution:** Iteratively added the required origins to `connect-src` and `script-src` in `netlify.toml` and redeployed after each fix. The final CSP explicitly whitelists `https://www.gstatic.com`, `https://cdnjs.cloudflare.com`, and all required Firebase and Google domains.

### Challenge 2: Incorrect SRI Hash for DOMPurify
The initial Subresource Integrity hash for DOMPurify was incorrect, causing the browser to block the script entirely with an integrity mismatch error.

**Solution:** Recomputed the correct SHA-512 hash by downloading the file and running `openssl dgst -sha512 -binary | openssl base64 -A`, then updated the `integrity` attribute in `index.html`.

### Challenge 3: Firebase Credentials in Source Code
Firebase configuration keys needed to be available at runtime (client-side JavaScript) but could not be committed to the public GitHub repository.

**Solution:** Implemented a build-time injection pattern: `build.sh` reads credentials from environment variables and writes them into a `firebase-config.js` file. That file is listed in `.gitignore` so it is never committed. Netlify and GitHub Actions both inject the variables from their respective secret stores at deploy time, so the generated file only exists on the deployment server — never in version control.

### Challenge 4: Firestore Deployed in Production Mode Without Rules
Firebase Firestore was initially set up in production mode, which denies all reads and writes by default. This caused the guestbook to silently fail — no error was shown, and no data was written.

**Solution:** Wrote explicit Firestore security rules in `firestore.rules` allowing public reads and validated creates, then deployed them using the Firebase CLI (`firebase-tools`). After deployment, the guestbook began working correctly.

---

## 4. Traffic & Security Analysis

### Security Headers Verification
The deployed site can be tested at [securityheaders.com](https://securityheaders.com). Expected results include an **A or A+ rating**, with all of the following headers present and correctly configured:
- `Strict-Transport-Security`
- `Content-Security-Policy`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`

### HTTPS Verification
Using the browser's DevTools (Security tab), the TLS certificate issued by Let's Encrypt via Netlify is visible, confirming end-to-end encryption on all connections. All subresources (scripts, stylesheets) are also loaded over HTTPS, with no mixed-content warnings.

### Google Analytics Traffic
The GA4 dashboard provides real-time and historical data on site visits, traffic sources, session behavior, and user geography. Since the site was deployed, analytics data is available in the Google Analytics console under Measurement ID `G-6J7Q1K816E`.

### Firestore Activity
The Firebase Console → Firestore → Usage tab shows read and write counts over time, providing visibility into guestbook activity and potential abuse patterns.

---

## 5. Conclusion

Project 2 successfully transformed a static informational website into a secure, monitored, and dynamically-driven web application. Every major attack surface was addressed: traffic is encrypted with TLS, responses carry a strict security header policy, user input is sanitized against XSS, the database enforces server-side validation rules, and no credentials are exposed in source code. Performance improvements ensure fast load times for returning visitors through caching and CDN delivery. Automated CI/CD via GitHub Actions means future changes deploy safely and consistently without manual steps. Together, these enhancements reflect the practices used in real-world production web deployments.
