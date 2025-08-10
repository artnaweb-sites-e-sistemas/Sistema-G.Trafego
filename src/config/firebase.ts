// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAwTAva9KXnIqZa2k3RYMKmdU0GUYEjPdg",
  authDomain: "dashboard---g-trafego.firebaseapp.com",
  projectId: "dashboard---g-trafego",
  storageBucket: "dashboard---g-trafego.firebasestorage.app",
  messagingSenderId: "865944845442",
  appId: "1:865944845442:web:57057eca143e51995f089b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
// Habilita persistência IndexedDB multi-aba (ignorar erro se já estiver habilitado ou não suportado)
try {
  enableMultiTabIndexedDbPersistence(db);
} catch (err) {
  // noop: em alguns ambientes (Safari/Privado) ou em HMR pode falhar – não bloqueia app
}
export const auth = getAuth(app);

export default app;