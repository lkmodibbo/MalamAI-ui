import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import { getMe } from '../services/apiService';

/**
 * Live server check before any admin UI mounts. Client-side is_admin flags in
 * AsyncStorage are treated as a hint only — demotions take effect immediately.
 */
export default function RequireAdmin({ children }) {
  const navigation = useNavigation();
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const me = await getMe();
        if (!mounted) return;
        if (me?.user?.is_admin) {
          setAllowed(true);
          return;
        }
        setAllowed(false);
        navigation.dispatch(
          CommonActions.reset({ index: 0, routes: [{ name: 'MainTabs' }] })
        );
      } catch {
        if (!mounted) return;
        setAllowed(false);
        navigation.dispatch(
          CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] })
        );
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigation]);

  if (allowed !== true) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return children;
}
