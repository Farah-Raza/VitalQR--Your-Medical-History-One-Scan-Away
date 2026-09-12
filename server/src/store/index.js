import { env } from '../config/env.js';
import { memoryStore } from './memoryStore.js';

/**
 * Picks the data store from config and hands back one object with a fixed
 * interface. Routes never import a store directly, so switching
 * DATA_STORE=memory -> firestore changes nothing above this line.
 */

let store = null;

export async function initStore() {
  if (store) return store;

  if (env.dataStore === 'firestore') {
    // Imported lazily so a memory-mode dev run never needs firebase-admin
    // credentials to be present.
    const { firestoreStore } = await import('./firestoreStore.js');
    store = await firestoreStore.init();
  } else {
    store = await memoryStore.init();
  }

  return store;
}

export function getStore() {
  if (!store) {
    throw new Error('Data store used before initStore() was awaited');
  }
  return store;
}
