// FIX: Using CDN URLs to ensure consistent module resolution and avoid "no exported member" errors
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Konfigurasi resmi proyek warungposfix
const firebaseConfig = {
  apiKey: "AIzaSyA5zXJdiWQWvLVcC6Ifqba1SDok7lhPg7Q",
  authDomain: "warungposfix.firebaseapp.com",
  projectId: "warungposfix",
  storageBucket: "warungposfix.firebasestorage.app",
  messagingSenderId: "9222944078",
  appId: "1:9222944078:web:653d2577d0c91796e91a1f",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db_fs = getFirestore(app);

// Aktifkan Offline Persistence
enableIndexedDbPersistence(db_fs).catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn("Persistence failed: Multiple tabs open");
  } else if (err.code === "unimplemented") {
    console.warn("Persistence is not available in this browser");
  }
});
