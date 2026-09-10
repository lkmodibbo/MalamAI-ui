import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useNavigation, CommonActions } from '@react-navigation/native';
import AppSidebar from '../components/AppSidebar';
import useSRS from '../hooks/useSRS';
import { getMe, getUnreadCount, logout } from '../services/apiService';

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

  // Counts and role are refreshed on open from the live session, not AsyncStorage.
  const openSidebar = useCallback(async () => {
    setOpen(true);
    refreshQueue();
    getUnreadCount()
      .then((data) => setUnreadCount(data.count || 0))
      .catch(() => {});

    try {
      const me = await getMe();
      if (me?.user?.name) setName(me.user.name);
      setIsAdmin(Boolean(me?.user?.is_admin));
    } catch {
      setIsAdmin(false);
    }
  }, [refreshQueue]);

  const closeSidebar = useCallback(() => setOpen(false), []);

  const handleNavigate = useCallback(async (route) => {
    try {
      if (route === 'LOGOUT') {
        await logout();
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] }));
        return;
      }

      if (route === 'AdminTabs' && !isAdmin) {
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
  }, [navigation, isAdmin]);

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
