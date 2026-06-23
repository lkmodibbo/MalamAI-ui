import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { COLORS } from './src/constants/colors';

import LoginScreen from './screens/LoginScreen';
import LandingScreen from './screens/LandingScreen';
import SubjectScreen from './screens/SubjectScreen';
import ProfileScreen from './screens/ProfileScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import LearnScreen from './screens/LearnScreen';
import MockSetupScreen from './screens/MockSetupScreen';
import MockExamScreen from './screens/MockExamScreen';
import MockScoreScreen from './screens/MockScoreScreen';
import ReviewScreen from './screens/ReviewScreen';
import PastQuestionsScreen from './screens/PastQuestionsScreen';
import WeaknessScreen from './screens/WeaknessScreen';
import NotesScreen from './screens/NotesScreen';
import EditNoteScreen from './screens/EditNoteScreen';
import ScoreScreen from './screens/ScoreScreen';
import SettingsScreen from './screens/SettingsScreen';
import ChatScreen from './screens/ChatScreen';
import { isOnboardingComplete } from './src/hooks/useStudentProfile';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.navInactive,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#dde3ef',
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 58,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginBottom: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={LandingScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>💬</Text>,
        }}
      />
      <Tab.Screen
        name="Subjects"
        component={SubjectScreen}
        options={{
          tabBarLabel: 'Subjects',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📚</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  // null = still checking, true = logged in, false = not logged in
  const [authState, setAuthState] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      try {
        const [token, onboardingDone] = await Promise.all([
          AsyncStorage.getItem('auth_token'),
          isOnboardingComplete(),
        ]);
        setShowOnboarding(!onboardingDone);
        setAuthState(!!token);
      } catch {
        setAuthState(false);
      }
    }
    bootstrap();
  }, []);

  // Spinner while checking auth + onboarding
  if (authState === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Determine starting screen:
  // - not logged in → Login
  // - logged in, onboarding not done → Onboarding
  // - logged in, onboarding done → MainTabs
  const initialRoute = !authState
    ? 'Home'          // show landing freely — no redirect to login on app open
    : showOnboarding
      ? 'Onboarding'
      : 'MainTabs';

  return (
    <NavigationContainer>
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
