import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
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
import RequireAdmin from '../components/RequireAdmin';
import SidebarProvider from './SidebarProvider';
import PastExamScreen from '../screens/PastExamScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import BookmarksScreen from '../screens/BookmarksScreen';
import ProgressScreen from '../screens/ProgressScreen';
import DevSrsDebug from '../screens/DevSrsDebug';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminUserDetailScreen from '../screens/admin/AdminUserDetailScreen';
import AdminLeaderboardScreen from '../screens/admin/AdminLeaderboardScreen';
import AdminPastQuestionsScreen from '../screens/admin/AdminPastQuestionsScreen';
import AdminContentScreen from '../screens/admin/AdminContentScreen';
import AdminAuditScreen from '../screens/admin/AdminAuditScreen';
import AdminAiStatsScreen from '../screens/admin/AdminAiStatsScreen';
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
  const insets = useSafeAreaInsets();
  // Closed until the admin opens it — never leave the menu open after login.
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [activeRoute, setActiveRoute] = React.useState('AdminHome');

  const goAdmin = (route) => {
    setActiveRoute(route);
    setMenuOpen(false);
    navigationRef.current?.navigate(route);
  };

  return (
    <RequireAdmin>
      <View style={adminShell.container}>
        <View style={adminShell.contentArea}>
          <Tab.Navigator tabBar={() => null} screenOptions={{ headerShown: false }}>
            <Tab.Screen name="AdminHome" component={AdminDashboardScreen} />
            <Tab.Screen name="AdminUsers" component={AdminUsersScreen} />
            <Tab.Screen name="AdminBoard" component={AdminLeaderboardScreen} />
            <Tab.Screen name="AdminUpload" component={AdminPastQuestionsScreen} />
            <Tab.Screen name="AdminAudit"   component={AdminAuditScreen} />
            <Tab.Screen name="AdminAiStats" component={AdminAiStatsScreen} />
            <Tab.Screen name="AdminContent" component={AdminContentScreen} />
          </Tab.Navigator>
          {/* Rendered after the tabs so it stays above screen headers. */}
          <TouchableOpacity
            style={[
              adminShell.openSidebarButton,
              { bottom: Math.max(insets.bottom, 12) + 12 },
            ]}
            onPress={() => setMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Open admin menu"
          >
            <Text style={adminShell.openSidebarButtonText}>☰</Text>
          </TouchableOpacity>
        </View>
        <AdminSidebar
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          activeRoute={activeRoute}
          onNavigate={goAdmin}
        />
      </View>
    </RequireAdmin>
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

const adminShell = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  openSidebarButton: {
    position: 'absolute',
    right: 16,
    zIndex: 30,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.adminHero,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  openSidebarButtonText: {
    fontSize: 18,
    color: COLORS.gold,
  },
  contentArea: {
    flex: 1,
  },
});

function AdminUserDetailGate(props) {
  return (
    <RequireAdmin>
      <AdminUserDetailScreen {...props} />
    </RequireAdmin>
  );
}

function AdminContentGate(props) {
  return (
    <RequireAdmin>
      <AdminContentScreen {...props} />
    </RequireAdmin>
  );
}

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
  // - not logged in → public Home
  // - logged in admin → AdminTabs (ops console, not student study home)
  // - logged in, onboarding not done → Onboarding
  // - logged in student → MainTabs
  const initialRoute = !authState
    ? 'Home'
    : isAdmin
      ? 'AdminTabs'
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
            <Stack.Screen name="AdminUserDetail" component={AdminUserDetailGate} />
            <Stack.Screen name="AdminContent" component={AdminContentGate} />
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
            <Stack.Screen name="DevSrsDebug" component={DevSrsDebug} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
