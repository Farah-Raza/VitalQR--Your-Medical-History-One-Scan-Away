import { api } from '../api.js';

/**
 * Local auth provider: talks to our own Express API and keeps the JWT in
 * localStorage. Used when VITE_AUTH_MODE=local, which is the zero-setup path.
 */

const TOKEN_KEY = 'vitalqr.token';
const USER_KEY = 'vitalqr.user';

const listeners = new Set();

function readUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persist(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  emit(user);
}

function emit(user) {
  listeners.forEach((fn) => fn(user));
}

export const localAuth = {
  mode: 'local',

  async signUp({ email, password, displayName }) {
    const { token, user } = await api.signup({ email, password, displayName });
    persist(token, user);
    return user;
  },

  async signIn({ email, password }) {
    const { token, user } = await api.login({ email, password });
    persist(token, user);
    return user;
  },

  async signOut() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    emit(null);
  },

  async getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Reports the cached user immediately so a reload doesn't flash the login
   * screen, then revalidates against the server and signs out if the stored
   * token has expired.
   */
  onChange(callback) {
    listeners.add(callback);

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      callback(null);
    } else {
      callback(readUser());
      api
        .me()
        .then(({ user }) => persist(null, user))
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          emit(null);
        });
    }

    return () => listeners.delete(callback);
  },
};
