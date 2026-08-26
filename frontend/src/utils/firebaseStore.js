/**
 * firebaseStore.js
 * 24/7 Cloud Firestore Real-time Persistence & Synchronization Layer.
 * Provides resilient multi-device sync with instant local caching fallbacks.
 */

import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from './firebase';

// Helper to check if Firestore is available
function isFirestoreReady() {
  return !!db;
}

// -----------------------------------------------------------------------------
// 1. User Profile Sync
// -----------------------------------------------------------------------------

export async function syncUserProfile(user) {
  if (!isFirestoreReady() || !user?.uid) return;
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email || '',
      name: user.name || '',
      photoURL: user.photoURL || '',
      lastSeen: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('[Firestore] syncUserProfile notice:', err.message);
  }
}

// -----------------------------------------------------------------------------
// 2. Watchlists Cloud Sync
// -----------------------------------------------------------------------------

export async function saveCloudWatchlist(userId, market = 'IN', symbols = []) {
  if (!isFirestoreReady() || !userId) return;
  try {
    const marketKey = (market || 'IN').toUpperCase();
    const docRef = doc(db, 'users', userId, 'watchlists', marketKey);
    await setDoc(docRef, {
      market: marketKey,
      symbols: Array.isArray(symbols) ? symbols : [],
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn(`[Firestore] saveCloudWatchlist (${market}) error:`, err.message);
  }
}

export function subscribeCloudWatchlist(userId, market = 'IN', onUpdate) {
  if (!isFirestoreReady() || !userId || typeof onUpdate !== 'function') {
    return () => {};
  }
  try {
    const marketKey = (market || 'IN').toUpperCase();
    const docRef = doc(db, 'users', userId, 'watchlists', marketKey);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data?.symbols)) {
          onUpdate(data.symbols);
        }
      }
    }, (err) => {
      console.warn(`[Firestore] subscribeCloudWatchlist listener notice:`, err.message);
    });
  } catch (err) {
    console.warn('[Firestore] subscribeCloudWatchlist setup notice:', err.message);
    return () => {};
  }
}

export async function getCloudWatchlist(userId, market = 'IN') {
  if (!isFirestoreReady() || !userId) return null;
  try {
    const marketKey = (market || 'IN').toUpperCase();
    const docRef = doc(db, 'users', userId, 'watchlists', marketKey);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return Array.isArray(data?.symbols) ? data.symbols : null;
    }
  } catch (err) {
    console.warn(`[Firestore] getCloudWatchlist (${market}) error:`, err.message);
  }
  return null;
}

// -----------------------------------------------------------------------------
// 3. Paper Trading Portfolio & Orders Cloud Sync
// -----------------------------------------------------------------------------

export async function saveCloudPortfolio(userId, portfolioData) {
  if (!isFirestoreReady() || !userId || !portfolioData) return;
  try {
    const docRef = doc(db, 'users', userId, 'portfolio', 'state');
    await setDoc(docRef, {
      ...portfolioData,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('[Firestore] saveCloudPortfolio error:', err.message);
  }
}

export function subscribeCloudPortfolio(userId, onUpdate) {
  if (!isFirestoreReady() || !userId || typeof onUpdate !== 'function') {
    return () => {};
  }
  try {
    const docRef = doc(db, 'users', userId, 'portfolio', 'state');
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data());
      }
    }, (err) => {
      console.warn('[Firestore] subscribeCloudPortfolio listener notice:', err.message);
    });
  } catch (err) {
    console.warn('[Firestore] subscribeCloudPortfolio setup notice:', err.message);
    return () => {};
  }
}

export async function saveCloudOrder(userId, order) {
  if (!isFirestoreReady() || !userId || !order?.orderId) return;
  try {
    const docRef = doc(db, 'users', userId, 'orders', order.orderId);
    await setDoc(docRef, {
      ...order,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('[Firestore] saveCloudOrder error:', err.message);
  }
}

export async function getCloudOrders(userId) {
  if (!isFirestoreReady() || !userId) return [];
  try {
    const q = query(collection(db, 'users', userId, 'orders'), orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('[Firestore] getCloudOrders error:', err.message);
    return [];
  }
}

// -----------------------------------------------------------------------------
// 4. Price Alerts Cloud Sync
// -----------------------------------------------------------------------------

export async function saveCloudAlert(userId, alert) {
  if (!isFirestoreReady() || !userId || !alert?.id) return;
  try {
    const docRef = doc(db, 'users', userId, 'alerts', String(alert.id));
    await setDoc(docRef, {
      ...alert,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('[Firestore] saveCloudAlert error:', err.message);
  }
}

export async function deleteCloudAlert(userId, alertId) {
  if (!isFirestoreReady() || !userId || !alertId) return;
  try {
    const docRef = doc(db, 'users', userId, 'alerts', String(alertId));
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('[Firestore] deleteCloudAlert error:', err.message);
  }
}

export function subscribeCloudAlerts(userId, onUpdate) {
  if (!isFirestoreReady() || !userId || typeof onUpdate !== 'function') {
    return () => {};
  }
  try {
    const collRef = collection(db, 'users', userId, 'alerts');
    return onSnapshot(collRef, (snap) => {
      const alerts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      onUpdate(alerts);
    }, (err) => {
      console.warn('[Firestore] subscribeCloudAlerts notice:', err.message);
    });
  } catch (err) {
    console.warn('[Firestore] subscribeCloudAlerts setup notice:', err.message);
    return () => {};
  }
}
