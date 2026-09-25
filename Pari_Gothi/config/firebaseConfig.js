const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const path = require('path');
const fs = require('fs');

let serviceAccount = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string'
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : process.env.FIREBASE_SERVICE_ACCOUNT;
  } catch (err) {
    console.error('❌ Error parsing FIREBASE_SERVICE_ACCOUNT env var:', err.message);
  }
} else {
  // Fallback to local serviceAccountKey.json
  const defaultPath = path.resolve(__dirname, '..', 'serviceAccountKey.json');
  const customPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : defaultPath;

  if (fs.existsSync(customPath)) {
    try {
      serviceAccount = require(customPath);
    } catch (e) {
      console.warn(`⚠️ Could not load service account from ${customPath}:`, e.message);
    }
  }
}

const existingApps = getApps ? getApps() : (admin.apps || []);

if (existingApps.length === 0) {
  if (serviceAccount) {
    if (admin.credential && admin.credential.cert) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      initializeApp({
        credential: cert(serviceAccount)
      });
    }
    console.log('✅ Firebase Admin SDK initialized successfully with service account.');
  } else {
    try {
      if (admin.initializeApp) {
        admin.initializeApp();
      } else {
        initializeApp();
      }
      console.log('ℹ️ Firebase Admin SDK initialized with default application credentials.');
    } catch (err) {
      console.warn('⚠️ Warning: Firebase service account credentials not found. Please provide FIREBASE_SERVICE_ACCOUNT env variable or serviceAccountKey.json file.');
    }
  }
}

let db = null;
try {
  const currentApps = getApps ? getApps() : (admin.apps || []);
  if (currentApps.length > 0) {
    db = getFirestore ? getFirestore() : admin.firestore();
  }
} catch (err) {
  console.error('❌ Failed to get Firestore instance:', err.message);
}

module.exports = { admin, db };
