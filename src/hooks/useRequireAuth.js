import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Returns a `requireAuth` wrapper.
 * Usage:
 *   const requireAuth = useRequireAuth(navigation);
 *   requireAuth(() => navigation.navigate('Learn', { ... }));
 *
 * If the user is logged in the callback runs immediately.
 * If not, they are sent to the Login screen.
 */
export default function useRequireAuth(navigation) {
  return useCallback(async (action) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        action();
      } else {
        navigation.navigate('Login');
      }
    } catch {
      navigation.navigate('Login');
    }
  }, [navigation]);
}
