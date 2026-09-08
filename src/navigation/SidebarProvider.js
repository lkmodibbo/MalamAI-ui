import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, CommonActions } from '@react-navigation/native';
import AppSidebar from '../components/AppSidebar';
import { logout } from '../services/apiService';
import useSRS from '../hooks/useSRS';
import { getUnreadCount } from '../services/apiService';

const SidebarContext = createContext({ openSidebar: () => {} });

export function useSidebar() {
  return useContext(SidebarContext);
}

// These live in the tab navigator; everything else is a root stack route.
const TAB_ROUTES = new Set(['Home', 'Chat', 'Subjects', 'Profile']);

/**
 * Hosts a single sidebar for every screen inside the student tabs. The tab bar
 * was removed, so this is the primary way to move between features and it has
 * to be reachable from all four tab screens.
 */
export default function SidebarProvider({ children }) {
  const navigation = useNavigation();
  const { dueCount, refreshQueue } = useSRS();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('Student');
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Counts are refreshed on open rather than on every render so the menu stays
  // current without polling in the background.
  const openSidebar = useCallback(async () => {
    setOpen(true);
    try {
      const raw = await AsyncStorage.getItem('auth_user');
      const user = raw ? JSON.parse(raw) : null;
      if (user?.name) setName(user.name);
      setIsAdmin(Boolean(user?.is_admin));
    } catch {
      // keep whatever name we already have
    }
    refreshQueue();
    getUnreadCount()
      .then((data) => setUnreadCount(data.count || 0))
      .catch(() => {});
  }, [refreshQueue]);

  const closeSidebar = useCallback(() => setOpen(false), []);

  const handleNavigate = useCallback(async (route) => {
    try {
      if (route === 'LOGOUT') {
        // Clear session and return to the public landing page (reset the navigation stack)
        await logout();
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] }));
        return;
      }

      if (TAB_ROUTES.has(route)) {
        navigation.navigate('MainTabs', { screen: route });
      } else {
        navigation.navigate(route);
      }
    } catch (err) {
      console.warn('[Sidebar] navigation error:', err.message);
    }
  }, [navigation]);

  const value = useMemo(() => ({ openSidebar, closeSidebar }), [openSidebar, closeSidebar]);

  return (
    <SidebarContext.Provider value={value}>
      {children}
      <AppSidebar
        visible={open}
        onClose={closeSidebar}
        onNavigate={handleNavigate}
        name={name}
        isAdmin={isAdmin}
        badges={{ dueCount, unreadCount }}
      />
    </SidebarContext.Provider>
  );
}
