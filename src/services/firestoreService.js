const admin = require('firebase-admin');
const fs = require('fs');

let initialized = false;

function initFirestore() {
  if (initialized) return admin.firestore();

  // Prefer explicit service account JSON in env var (FIREBASE_SERVICE_ACCOUNT_JSON)
  // or GOOGLE_APPLICATION_CREDENTIALS file path. If neither is set, we attempt to
  // initialize with default credentials (useful on GCP) or throw an informative error.
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const obj = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      admin.initializeApp({
        credential: admin.credential.cert(obj)
      });
      initialized = true;
      return admin.firestore();
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      // let firebase-admin pick up GOOGLE_APPLICATION_CREDENTIALS automatically
      admin.initializeApp();
      initialized = true;
      return admin.firestore();
    }

    // If emulator is used, firebase-admin will still initialize without credentials
    // when FIRESTORE_EMULATOR_HOST is set. Try default initialize.
    admin.initializeApp();
    initialized = true;
    return admin.firestore();
  } catch (err) {
    // Provide a helpful error that points to how to set credentials
    throw new Error('Failed to initialize Firestore: ' + err.message + '. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.');
  }
}

function getFirestore() {
  return initFirestore();
}

module.exports = { getFirestore };
