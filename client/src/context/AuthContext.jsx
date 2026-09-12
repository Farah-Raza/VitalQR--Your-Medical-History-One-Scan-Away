import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { localAuth } from '../lib/auth/localAuth.js';
import { setTokenProvider } from '../lib/api.js';

const AuthContext = createContext(null);

const MODE = import.meta.env.VITE_AUTH_MODE === 'firebase' ? 'firebase' : 'local';

/**
 * Resolves the auth provider for the configured mode. The Firebase module is
 * imported lazily so a local-mode build never pulls the Firebase SDK into the
 * bundle or fails on missing config.
 */
async function loadProvider() {
  if (MODE === 'firebase') {
    const { firebaseAuth } = await import('../lib/auth/firebaseAuth.js');
    return firebaseAuth;
  }
  return localAuth;
}

export function AuthProvider({ children }) {
  const [provider, setProvider] = useState(MODE === 'local' ? localAuth : null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(null);

  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;

    loadProvider()
      .then((p) => {
        if (cancelled) return;
        setProvider(p);
        setTokenProvider(() => p.getToken());
        unsubscribe = p.onChange((u) => {
          setUser(u);
          setLoading(false);
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setConfigError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      configError,
      mode: MODE,
      signUp: (payload) => provider.signUp(payload),
      signIn: (payload) => provider.signIn(payload),
      signOut: () => provider.signOut(),
    }),
    [user, loading, configError, provider]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
