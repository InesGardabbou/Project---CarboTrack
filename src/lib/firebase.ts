import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD5-5VrujneYwVtZuTm1U1PPGJd0z6ibV4",
  authDomain: "carbotrack-7e160.firebaseapp.com",
  databaseURL: "https://carbotrack-7e160-default-rtdb.firebaseio.com",
  projectId: "carbotrack-7e160",
  storageBucket: "carbotrack-7e160.firebasestorage.app",
  messagingSenderId: "115519988382",
  appId: "1:115519988382:web:e0cce3800601b1d0c1118f",
  measurementId: "G-JJX1FDNJPH"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google Provider for additional scopes if needed
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
