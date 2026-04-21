// ── Nav ──────────────────────────────────────────────────────────────────────
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

menuToggle.addEventListener("click", () => {
  navLinks.classList.toggle("show");
});

// ── Protocol check ───────────────────────────────────────────────────────────
const statusButton = document.getElementById("statusButton");
const protocolMessage = document.getElementById("protocolMessage");
const securityStatus = document.getElementById("securityStatus");

statusButton.addEventListener("click", () => {
  const isHttps = window.location.protocol === "https:";
  securityStatus.textContent = isHttps ? "HTTPS Enabled" : "HTTP Detected";
  protocolMessage.textContent = isHttps
    ? "This website is currently using HTTPS, which encrypts communication between client and server."
    : "This website is currently using HTTP. HTTPS is recommended for secure communication.";
});

// ── Firebase init ─────────────────────────────────────────────────────────────
// window.__ENV is written by build.sh from environment variables — never hardcoded.
const app = firebase.initializeApp(window.__ENV);
firebase.analytics();
const db = firebase.firestore();

// ── Guestbook ─────────────────────────────────────────────────────────────────
const form        = document.getElementById("guestbookForm");
const nameInput   = document.getElementById("nameInput");
const msgInput    = document.getElementById("messageInput");
const submitBtn   = document.getElementById("submitBtn");
const formError   = document.getElementById("formError");
const messagesList = document.getElementById("messagesList");

const RATE_LIMIT_MS = 30_000;
let lastSubmit = 0;

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.textContent = "";

  // Client-side rate limit
  const now = Date.now();
  if (now - lastSubmit < RATE_LIMIT_MS) {
    const wait = Math.ceil((RATE_LIMIT_MS - (now - lastSubmit)) / 1000);
    formError.textContent = `Please wait ${wait}s before posting again.`;
    return;
  }

  // Sanitize with DOMPurify — strips any injected HTML/scripts
  const name    = DOMPurify.sanitize(nameInput.value.trim(), { ALLOWED_TAGS: [] });
  const message = DOMPurify.sanitize(msgInput.value.trim(),  { ALLOWED_TAGS: [] });

  if (!name || !message) {
    formError.textContent = "Both fields are required.";
    return;
  }
  if (name.length > 100 || message.length > 1000) {
    formError.textContent = "Input exceeds maximum length.";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Posting…";

  try {
    await db.collection("messages").add({
      name,
      message,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });
    lastSubmit = Date.now();
    nameInput.value = "";
    msgInput.value  = "";
  } catch (err) {
    formError.textContent = "Failed to post message. Please try again.";
    console.error(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Post Message";
  }
});

// Real-time listener — renders messages as they arrive
db.collection("messages")
  .orderBy("timestamp", "desc")
  .limit(20)
  .onSnapshot((snapshot) => {
    if (snapshot.empty) {
      messagesList.innerHTML = "<p class='loading-text'>No messages yet — be the first!</p>";
      return;
    }
    messagesList.innerHTML = snapshot.docs.map((doc) => {
      const d = doc.data();
      // Sanitize again on render (defense in depth)
      const safeName = DOMPurify.sanitize(d.name,    { ALLOWED_TAGS: [] });
      const safeMsg  = DOMPurify.sanitize(d.message, { ALLOWED_TAGS: [] });
      const time     = d.timestamp?.toDate().toLocaleString() ?? "";
      return `
        <div class="message-card">
          <div class="message-header">
            <strong>${safeName}</strong>
            <span class="message-time">${time}</span>
          </div>
          <p>${safeMsg}</p>
        </div>`;
    }).join("");
  }, (err) => {
    messagesList.innerHTML = "<p class='loading-text'>Could not load messages.</p>";
    console.error(err);
  });
