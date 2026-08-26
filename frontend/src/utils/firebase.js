import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';

const firebaseConfig = {
  projectId: "manishmarket-web",
  appId: "1:133452385401:web:d26d79b5d6a36816d2d8a8",
  storageBucket: "manishmarket-web.firebasestorage.app",
  apiKey: "AIzaSyD4YkCxqFyzj0qIbgjK6evooCGT47MkTAE",
  authDomain: "manishmarket-web.firebaseapp.com",
  messagingSenderId: "133452385401"
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Trigger Real Google Sign In Popup
 * Opens genuine Google OAuth popup dialog and returns authenticated user
 */
export async function signInWithRealGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    return {
      name: user.displayName || user.email.split('@')[0],
      email: user.email,
      photoURL: user.photoURL,
      uid: user.uid
    };
  } catch (error) {
    // If popup is blocked by browser or running in native webview, fallback to redirect or pass error
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      throw new Error('Google Sign-in was cancelled or popup was blocked by browser.');
    }
    if (error.code === 'auth/unauthorized-domain') {
      throw new Error('Domain not authorized in Firebase Auth. Please verify authorized domains.');
    }
    throw error;
  }
}
