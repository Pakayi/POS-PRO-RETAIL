import { initializeApp } from "https://esm.sh/firebase@11.3.1/app";
import { getAuth } from "https://esm.sh/firebase@11.3.1/auth";
import { getFirestore, enableIndexedDbPersistence } from "https://esm.sh/firebase@11.3.1/firestore";

// Konfigurasi resmi untuk proyek baru 'warungposfix'
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

// Aktifkan Offline Persistence agar tetap bisa transaksi tanpa internet
enableIndexedDbPersistence(db_fs).catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn("Persistence failed: Multiple tabs open");
  } else if (err.code === "unimplemented") {
    console.warn("Persistence is not available in this browser");
  }
});
