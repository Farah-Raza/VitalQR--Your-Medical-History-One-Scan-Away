import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';

/**
 * Firebase auth provider. Used when VITE_AUTH_MODE=firebase, which is the
 * deployment path described in the Review-I deck.
 *
 * Only account sign-in runs through Firebase. Profile data still goes to our
 * own API, because the public scan has to be readable with no Firebase
 * session at all, and because redaction must happen server-side where a
 * client cannot skip it.
 */

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function auth() {
  if (!config.apiKey) {
    throw new Error(
      'VITE_AUTH_MODE=firebase but the Firebase web config is missing. ' +
        'Copy client/.env.example to client/.env and fill in the VITE_FIREBASE_* values.'
    );
  }
  const app = getApps().length ? getApps()[0] : initializeApp(config);
  return getAuth(app);
}

function shape(user) {
  if (!user) return null;
  return { uid: user.uid, email: user.email || '', displayName: user.displayName || '' };
}

/** Firebase error codes are not readable by a user; map the common ones. */
function friendly(err) {
  const map = {
    'auth/email-already-in-use': 'An account already exists for that email address',
    'auth/invalid-email': 'Enter a valid email address',
    'auth/weak-password': 'Password must be at least 8 characters',
    'auth/invalid-credential': 'Incorrect email or password',
    'auth/wrong-password': 'Incorrect email or password',
    'auth/user-not-found': 'Incorrect email or password',
    'auth/too-many-requests': 'Too many attempts. Please wait a few minutes.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
  };
  return new Error(map[err?.code] || err?.message || 'Authentication failed');
}

export const firebaseAuth = {
  mode: 'firebase',

  async signUp({ email, password, displayName }) {
    try {
      const cred = await createUserWithEmailAndPassword(auth(), email, password);
      if (displayName) await updateProfile(cred.user, { displayName });
      return shape(cred.user);
    } catch (err) {
      throw friendly(err);
    }
  },

  async signIn({ email, password }) {
    try {
      const cred = await signInWithEmailAndPassword(auth(), email, password);
      return shape(cred.user);
    } catch (err) {
      throw friendly(err);
    }
  },

  async signOut() {
    await fbSignOut(auth());
  },

  async getToken() {
    return auth().currentUser ? auth().currentUser.getIdToken() : null;
  },

  onChange(callback) {
    return onAuthStateChanged(auth(), (user) => callback(shape(user)));
  },
};
