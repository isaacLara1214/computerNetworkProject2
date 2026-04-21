#!/bin/sh
# Generates firebase-config.js from environment variables at build time.
# Netlify sets these from the dashboard; locally they come from .env.

cat > firebase-config.js <<EOF
window.__ENV = {
  apiKey: "${FIREBASE_API_KEY}",
  authDomain: "${FIREBASE_AUTH_DOMAIN}",
  projectId: "${FIREBASE_PROJECT_ID}",
  storageBucket: "${FIREBASE_STORAGE_BUCKET}",
  messagingSenderId: "${FIREBASE_MESSAGING_SENDER_ID}",
  appId: "${FIREBASE_APP_ID}",
  measurementId: "${FIREBASE_MEASUREMENT_ID}"
};
EOF

echo "firebase-config.js generated successfully."
