import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, TextInput, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';

import LoginScreen from '../screens/LoginScreen';
import LandingScreen from '../screens/LandingScreen';
import SubjectScreen from '../screens/SubjectScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LearnScreen from '../screens/LearnScreen';
import MockSetupScreen from '../screens/MockSetupScreen';
import MockExamScreen from '../screens/MockExamScreen';
import MockScoreScreen from '../screens/MockScoreScreen';
import ReviewScreen from '../screens/ReviewScreen';
import PastQuestionsScreen from '../screens/PastQuestionsScreen';
import WeaknessScreen from '../screens/WeaknessScreen';
import NotesScreen from '../screens/NotesScreen';
import EditNoteScreen from '../screens/EditNoteScreen';
import ScoreScreen from '../screens/ScoreScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ChatScreen from '../screens/ChatScreen';
import { isOnboardingComplete, setOnboardingComplete } from '../hooks/useStudentProfile';
import { getMe, setUnauthorizedHandler } from '../services/apiService';
import ErrorBoundary from '../components/ErrorBoundary';
import SidebarProvider from './SidebarProvider';
import PastExamScreen from '../screens/PastExamScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import BookmarksScreen from '../screens/BookmarksScreen';
import ProgressScreen from '../screens/ProgressScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminUserDetailScreen from '../screens/admin/AdminUserDetailScreen';
import AdminLeaderboardScreen from '../screens/admin/AdminLeaderboardScreen';
import AdminPastQuestionsScreen from '../screens/admin/AdminPastQuestionsScreen';
import AdminContentScreen from '../screens/admin/AdminContentScreen';
import AdminAuditScreen from '../screens/admin/AdminAuditScreen';
import AdminSidebar from '../components/AdminSidebar';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Shared navigation ref so internal admin sidebar can switch tabs.
const navigationRef = React.createRef();

// Text-only tabs: a rule above the active label replaces the icon.
function TabLabel({ children, color, focused }) {
  return (
    <View style={styles.tabItem}>
      <View style={[styles.tabRule, focused && styles.tabRuleActive]} />
      <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

function tabOptions(label) {
  return {
    tabBarLabel: ({ color, focused }) => (
      <TabLabel color={color} focused={focused}>{label}</TabLabel>
    ),
  };
}

function useTabScreenOptions() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);

  return {
    headerShown: false,
    tabBarActiveTintColor: COLORS.accent,
    tabBarInactiveTintColor: COLORS.navInactive,
    tabBarHideOnKeyboard: true,
    tabBarShowLabel: true,
    tabBarStyle: {
      backgroundColor: '#ffffff',
      borderTopColor: COLORS.border,
      borderTopWidth: 1,
      paddingTop: 0,
      paddingBottom: bottomPad,
      height: 50 + bottomPad,
      elevation: 8,
      shadowColor: COLORS.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: -2 },
    },
    tabBarItemStyle: {
      paddingTop: 0,
    },
  };
}

// Students navigate from the sidebar instead of a tab bar, so the bar itself is
// not rendered. This stays a tab navigator so every existing
// navigate('Subjects') / navigate('Profile') call keeps working unchanged.
function MainTabs() {
  return (
    <SidebarProvider>
      <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={() => null}>
        <Tab.Screen name="Home" component={LandingScreen} />
        <Tab.Screen name="Chat" component={ChatScreen} />
        <Tab.Screen name="Subjects" component={SubjectScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </SidebarProvider>
  );
}

function AdminTabs() {
  const screenOptions = useTabScreenOptions();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [adminMenuOpen, setAdminMenuOpen] = React.useState(false);

  return (
    // Render a two-column admin layout: left sidebar + right content area.
    <View style={adminStyles.container}>
      {sidebarOpen ? (
        <View style={adminStyles.sidebar}>
          <View style={adminStyles.sidebarSearchWrap}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={adminStyles.sidebarTitle}>Admin</Text>
              <TouchableOpacity onPress={() => setSidebarOpen(false)} style={adminStyles.closeBtn}>
                <Text style={adminStyles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={adminStyles.sidebarSearch}
              placeholder="Search..."
              placeholderTextColor="#7D8E8A"
            />
          </View>

          <TouchableOpacity style={adminStyles.sidebarItem} onPress={() => navigationRef.current?.navigate('AdminHome')}>
            <Text style={adminStyles.sidebarItemText}>Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity style={adminStyles.sidebarItem} onPress={() => navigationRef.current?.navigate('AdminUsers')}>
            <Text style={adminStyles.sidebarItemText}>Users</Text>
          </TouchableOpacity>
          <TouchableOpacity style={adminStyles.sidebarItem} onPress={() => navigationRef.current?.navigate('AdminBoard')}>
            <Text style={adminStyles.sidebarItemText}>Leaderboard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={adminStyles.sidebarItem} onPress={() => navigationRef.current?.navigate('AdminUpload')}>
            <Text style={adminStyles.sidebarItemText}>Upload</Text>
          </TouchableOpacity>
          <TouchableOpacity style={adminStyles.sidebarItem} onPress={() => navigationRef.current?.navigate('AdminAudit')}>
            <Text style={adminStyles.sidebarItemText}>Audit</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={adminStyles.openSidebarButton} onPress={() => setSidebarOpen(true)}>
          <Text style={adminStyles.openSidebarButtonText}>☰</Text>
        </TouchableOpacity>
      )}

      <View style={adminStyles.contentArea}>
        <TouchableOpacity style={adminStyles.adminMenuButton} onPress={() => setAdminMenuOpen(true)}>
          <Text style={adminStyles.adminMenuButtonText}>☰</Text>
        </TouchableOpacity>
        <Tab.Navigator tabBar={() => null} screenOptions={{ headerShown: false }}>
          <Tab.Screen name="AdminHome" component={AdminDashboardScreen} />
          <Tab.Screen name="AdminUsers" component={AdminUsersScreen} />
          <Tab.Screen name="AdminBoard" component={AdminLeaderboardScreen} />
          <Tab.Screen name="AdminUpload" component={AdminPastQuestionsScreen} />
          <Tab.Screen name="AdminAudit" component={AdminAuditScreen} />
          <Tab.Screen name="AdminContent" component={AdminContentScreen} />
        </Tab.Navigator>
      </View>
      <AdminSidebar visible={adminMenuOpen} onClose={() => setAdminMenuOpen(false)} onNavigate={(r) => navigationRef.current?.navigate(r)} />
    </View>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    paddingTop: 8,
  },
  tabRule: {
    height: 2,
    width: 22,
    borderRadius: 999,
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  tabRuleActive: {
    backgroundColor: COLORS.accent,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
});

const adminStyles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.background,
  },
  sidebar: {
    width: 220,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingTop: 16,
    paddingHorizontal: 12,
  },
  sidebarSearchWrap: {
    marginBottom: 12,
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  sidebarSearch: {
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    color: COLORS.primary,
    backgroundColor: '#f8faf9',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  closeBtnText: {
    fontSize: 16,
    color: COLORS.navInactive,
  },
  sidebarCollapsed: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapseToggle: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  collapseToggleText: {
    fontSize: 20,
    color: COLORS.primary,
  },
  adminMenuButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  adminMenuButtonText: {
    fontSize: 18,
    color: COLORS.primary,
  },
  openSidebarButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  openSidebarButtonText: {
    fontSize: 18,
    color: COLORS.primary,
  },
  sidebarItem: {
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  sidebarItemText: {
    fontSize: 14,
    color: COLORS.primary,
  },
  contentArea: {
    flex: 1,
  },
});

export default function RootNavigator() {
  // null = still checking, true = logged in, false = not logged in
  const [authState, setAuthState] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  // Navigation container uses the module-level ref defined above.

  useEffect(() => {
    async function bootstrap() {
      try {
        const token = await AsyncStorage.getItem('auth_token');

        if (!token) {
          setAuthState(false);
          return;
        }

        // Validate token against backend — clear it if expired/invalid
        try {
          const me = await getMe();
          if (me?.user?.is_admin) {
            setIsAdmin(true);
            setShowOnboarding(false);
          } else if (me?.user?.onboardingComplete) {
            setIsAdmin(false);
            await setOnboardingComplete(true);
            setShowOnboarding(false);
          } else {
            setIsAdmin(false);
            const onboardingDone = await isOnboardingComplete();
            setShowOnboarding(!onboardingDone);
          }
        } catch {
          await AsyncStorage.multiRemove(['auth_token', 'auth_user']);
          setAuthState(false);
          return;
        }

        setAuthState(true);
      } catch {
        setAuthState(false);
      }
    }
    bootstrap();
  }, []);

  // When a token is rejected mid-session the api layer clears it and calls
  // this, so the user lands back on Login instead of a screen full of errors.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      navigationRef.current?.resetRoot({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // Spinner while checking auth + onboarding
  if (authState === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Determine starting screen:
  // - not logged in → Login
  // - logged in, onboarding not done → Onboarding
  // - logged in, onboarding done → MainTabs (admin users see student UI by default)
  const initialRoute = !authState
    ? 'Home'
    : showOnboarding
      ? 'Onboarding'
      : 'MainTabs';

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator
            screenOptions={{ headerShown: false }}
            initialRouteName={initialRoute}
          >
            {/* Public — always accessible */}
            <Stack.Screen name="Home" component={LandingScreen} />

            {/* Auth */}
            <Stack.Screen name="Login" component={LoginScreen} />

            {/* Onboarding */}
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />

            {/* Main app */}
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="AdminTabs" component={AdminTabs} />
            <Stack.Screen name="AdminUserDetail" component={AdminUserDetailScreen} />
            <Stack.Screen name="AdminContent" component={AdminContentScreen} />
            <Stack.Screen name="Learn" component={LearnScreen} />
            <Stack.Screen name="MockSetup" component={MockSetupScreen} />
            <Stack.Screen name="MockExam" component={MockExamScreen} />
            <Stack.Screen name="MockScore" component={MockScoreScreen} />
            <Stack.Screen name="PastQuestions" component={PastQuestionsScreen} />
            <Stack.Screen name="Weakness" component={WeaknessScreen} />
            <Stack.Screen name="Notes" component={NotesScreen} />
            <Stack.Screen name="EditNote" component={EditNoteScreen} />
            <Stack.Screen name="Review" component={ReviewScreen} />
            <Stack.Screen name="Score" component={ScoreScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="PastExam" component={PastExamScreen} />
            <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Bookmarks" component={BookmarksScreen} />
            <Stack.Screen name="Progress" component={ProgressScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
