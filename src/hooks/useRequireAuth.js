import { useCallback } from 'react';
import { getMe, hasAuthToken } from '../services/apiService';

/**
 * Returns a `requireAuth` wrapper.
 * Usage:
 *   const requireAuth = useRequireAuth(navigation);
 *   requireAuth(() => navigation.navigate('Learn', { ... }));
 *
 * Confirms a live session with /auth/me when possible so a stale token in
 * storage cannot unlock student features.
 */
export default function useRequireAuth(navigation) {
  return useCallback(async (action) => {
    try {
      const hasToken = await hasAuthToken();
      if (!hasToken) {
        navigation.navigate('Login');
        return;
      }

      try {
        await getMe();
      } catch {
        navigation.navigate('Login');
        return;
      }

      action();
    } catch {
      navigation.navigate('Login');
    }
  }, [navigation]);
}
