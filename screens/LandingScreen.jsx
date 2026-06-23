import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StatusBar, ScrollView, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import useRequireAuth from '../src/hooks/useRequireAuth';
import HeroCarousel from '../components/HeroCarousel';
import ExamCountdownCard from '../components/ExamCountdownCard';
import TodaysPlanCard from '../components/TodaysPlanCard';
import HomeReviewCard from '../components/HomeReviewCard';
import HomeWeaknessCard from '../components/HomeWeaknessCard';
import SUBJECTS from '../constants/subjects';
import useSRS from '../hooks/useSRS';
import useNotes from '../src/hooks/useNotes';
import useExamCountdown from '../src/hooks/useExamCountdown';
import useStudentProfile from '../src/hooks/useStudentProfile';
import useWeaknessTracker from '../src/hooks/useWeaknessTracker';

const FEATURES = [
  {
    emoji: '🤖',
    title: 'AI-Powered Tutor',
    body: 'Ask any JAMB question and get a clear, step-by-step explanation — anytime, anywhere.',
  },
  {
    emoji: '📝',
    title: 'Practice Quizzes',
    body: 'Sharpen your skills with AI-generated questions across all 16 UTME subjects.',
  },
  {
    emoji: '🎓',
    title: 'Full Mock Exams',
    body: 'Simulate the real JAMB experience — 80 questions, 90 minutes, instant score breakdown.',
  },
  {
    emoji: '🗂️',
    title: 'Flashcards',
    body: 'Master key concepts fast with auto-generated flashcards for every topic.',
  },
  {
    emoji: '📊',
    title: 'Track Your Progress',
    body: 'See your weak areas, monitor improvement, and focus your study where it matters most.',
  },
  {
    emoji: '📓',
    title: 'Personal Notes',
    body: 'Save AI explanations as notes and review them anytime — even offline.',
  },
];

const SUBJECTS_PREVIEW = [
  { emoji: '📐', name: 'Mathematics' },
  { emoji: '📖', name: 'English' },
  { emoji: '⚡', name: 'Physics' },
  { emoji: '⚗️', name: 'Chemistry' },
  { emoji: '🧬', name: 'Biology' },
  { emoji: '💰', name: 'Economics' },
  { emoji: '🏛️', name: 'Government' },
  { emoji: '🌍', name: 'Geography' },
];

export default function LandingScreen({ navigation }) {
  const requireAuth = useRequireAuth(navigation);
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const { profile, loading: profileLoading, reloadProfile } = useStudentProfile();
  const { dueCount, refreshQueue } = useSRS();
  const { notes, refreshNotes } = useNotes();
  const { weakTopics, refreshWeakTopics } = useWeaknessTracker();
  const { examDate, daysRemaining, progressPercent } = useExamCountdown();

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      async function refreshHome() {
        try {
          const token = await AsyncStorage.getItem('auth_token');
          if (!mounted) return;
          setIsLoggedIn(Boolean(token));
          if (token) {
            await Promise.all([
              reloadProfile(),
              refreshQueue(),
              refreshNotes(),
              refreshWeakTopics(),
            ]);
          }
        } catch (error) {
          console.warn('[LandingScreen] failed to refresh home dashboard', error);
          if (mounted) setIsLoggedIn(false);
        }
      }
      refreshHome();
      return () => { mounted = false; };
    }, [refreshNotes, refreshQueue, refreshWeakTopics, reloadProfile]),
  );

  const selectedSubjects = useMemo(() => {
    const selectedIds = profile?.selectedSubjects || [];
    const chosen = SUBJECTS.filter((subject) => selectedIds.includes(subject.id));
    return chosen.length > 0 ? chosen : SUBJECTS.filter((subject) => subject.id === 'english');
  }, [profile?.selectedSubjects]);

  const recentNotes = useMemo(() => {
    return notes
      .flatMap((group) => group.notes || [])
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 3);
  }, [notes]);

  const totalNotes = useMemo(
    () => notes.reduce((sum, group) => sum + (group.notes?.length || 0), 0),
    [notes],
  );

  const firstName = (profile?.name || 'Student').trim().split(/\s+/)[0] || 'Student';

  const openSubject = (subject) => {
    navigation.navigate('Learn', { subject, topic: subject.topics?.[0] || subject.name });
  };

  const studyPlanTopic = (item) => {
    const subject = SUBJECTS.find((s) => s.id === item.subjectId || s.name === item.subjectName);
    navigation.navigate('Learn', {
      subject: {
        id: item.subjectId || subject?.id,
        name: item.subjectName || subject?.name,
        emoji: item.emoji || subject?.emoji || '📘',
      },
      topic: item.topic,
    });
  };

  if (isLoggedIn === null || (isLoggedIn && profileLoading)) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#1b2a4a" />
        </View>
      </SafeAreaView>
    );
  }

  if (isLoggedIn) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <ScrollView contentContainerStyle={styles.dashboardContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.dashboardHero}>
            <Image
              source={require('../assets/Images/JambImage-1.jpeg')}
              style={styles.dashboardHeroImage}
              resizeMode="cover"
            />
            <View style={styles.heroOverlay} />
            <View style={styles.dashboardHeroContent}>
              <Text style={styles.welcomeLabel}>Welcome back</Text>
              <Text style={styles.dashboardTitle}>{firstName}</Text>
              <Text style={styles.dashboardSub}>
                Keep your JAMB prep moving today with focused practice, review, and notes.
              </Text>
            </View>
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryTile}>
              <Text style={styles.summaryValue}>{selectedSubjects.length}</Text>
              <Text style={styles.summaryLabel}>Subjects</Text>
            </View>
            <View style={styles.summaryTile}>
              <Text style={styles.summaryValue}>{dueCount}</Text>
              <Text style={styles.summaryLabel}>Reviews</Text>
            </View>
            <View style={styles.summaryTile}>
              <Text style={styles.summaryValue}>{totalNotes}</Text>
              <Text style={styles.summaryLabel}>Notes</Text>
            </View>
            <View style={styles.summaryTile}>
              <Text style={styles.summaryValue}>{weakTopics.length}</Text>
              <Text style={styles.summaryLabel}>Focus</Text>
            </View>
          </View>

          <ExamCountdownCard
            daysRemaining={daysRemaining}
            progressPercent={progressPercent}
            examDate={examDate}
            onSetDate={() => navigation.navigate('Profile')}
          />

          <Text style={styles.dashboardSectionTitle}>Quick access</Text>
          <View style={styles.quickGrid}>
            {[
              { label: 'Subjects', icon: '📚', action: () => navigation.navigate('Subjects') },
              { label: 'AI Chat', icon: '💬', action: () => navigation.navigate('Chat') },
              { label: 'Mock Exam', icon: '🎓', action: () => navigation.navigate('MockSetup') },
              { label: 'Past Questions', icon: '📝', action: () => navigation.navigate('PastQuestions') },
              { label: 'Review', icon: '🧠', action: () => navigation.navigate('Review') },
              { label: 'Notes', icon: '📓', action: () => navigation.navigate('Notes') },
            ].map((item) => (
              <TouchableOpacity key={item.label} style={styles.quickTile} onPress={item.action} activeOpacity={0.86}>
                <Text style={styles.quickIcon}>{item.icon}</Text>
                <Text style={styles.quickLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.dashboardSectionTitle}>Your subjects</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjectRail}>
            {selectedSubjects.map((subject) => (
              <TouchableOpacity key={subject.id} style={styles.dashboardSubjectCard} onPress={() => openSubject(subject)}>
                <Text style={styles.dashboardSubjectEmoji}>{subject.emoji}</Text>
                <Text style={styles.dashboardSubjectName}>{subject.name}</Text>
                <Text style={styles.dashboardSubjectMeta}>{subject.topics.length} topics</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.dashboardSubjectCard, styles.addSubjectCard]} onPress={() => navigation.navigate('Profile')}>
              <Text style={styles.dashboardSubjectEmoji}>＋</Text>
              <Text style={styles.dashboardSubjectName}>Edit subjects</Text>
              <Text style={styles.dashboardSubjectMeta}>Profile</Text>
            </TouchableOpacity>
          </ScrollView>

          <TodaysPlanCard
            weakTopics={weakTopics}
            visitedTopics={recentNotes.map((note) => note.topic)}
            onStudyNow={studyPlanTopic}
          />
          <HomeReviewCard dueCount={dueCount} onPress={() => navigation.navigate('Review')} />
          <HomeWeaknessCard navigation={navigation} />

          <View style={styles.readingSummary}>
            <View style={styles.readingHeader}>
              <Text style={styles.dashboardSectionTitleInline}>Reading summary</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Notes')}>
                <Text style={styles.viewLink}>View notes →</Text>
              </TouchableOpacity>
            </View>
            {recentNotes.length > 0 ? (
              recentNotes.map((note) => (
                <TouchableOpacity
                  key={`${note.subjectId}-${note.topic}-${note.timestamp}`}
                  style={styles.noteRow}
                  onPress={() => navigation.navigate('Notes')}
                >
                  <Text style={styles.noteEmoji}>{note.subjectEmoji || '📘'}</Text>
                  <View style={styles.noteTextBlock}>
                    <Text style={styles.noteTitle} numberOfLines={1}>{note.topic}</Text>
                    <Text style={styles.noteMeta} numberOfLines={1}>{note.subjectName}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptySummary}>
                <Text style={styles.emptyTitle}>No notes yet</Text>
                <Text style={styles.emptyBody}>Study a topic and save explanations here for quick revision.</Text>
              </View>
            )}
          </View>

          <View style={styles.imageStudyBand}>
            <Image
              source={require('../assets/Images/JambImage-5.webp')}
              style={styles.imageStudyBandImage}
              resizeMode="cover"
            />
            <View style={styles.imageStudyBandText}>
              <Text style={styles.imageBandTitle}>Build today’s momentum</Text>
              <Text style={styles.imageBandBody}>A short focused session now is better than waiting for the perfect time.</Text>
            </View>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>🚀 AI-Powered JAMB Preparation</Text>
          </View>
          <Text style={styles.heroTitle}>Crack JAMB with{'\n'}AI by your side</Text>
          <Text style={styles.heroSub}>
            The smartest way to prepare for UTME.{'\n'}
            Study smarter, not harder — Ka yi kyau!
          </Text>

          {/* Image carousel */}
          <View style={styles.illustrationWrap}>
            <HeroCarousel />
          </View>
          <TouchableOpacity
            style={styles.heroBtn}
            onPress={() => requireAuth(() => navigation.navigate('Subjects'))}
            activeOpacity={0.88}
          >
            <Text style={styles.heroBtnText}>Start Studying Free →</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.heroSecondaryBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.heroSecondaryText}>Already have an account? Login</Text>
          </TouchableOpacity>
        </View>

        {/* Stats strip */}
        <View style={styles.statsRow}>
          {[
            { val: '16', label: 'Subjects' },
            { val: '400+', label: 'Topics' },
            { val: 'AI', label: 'Powered' },
            { val: '24/7', label: 'Available' },
          ].map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={styles.statVal}>{s.val}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Motivational side card */}
        <View style={styles.motivationCard}>
          <Image
            source={require('../assets/Images/JambImage-3.jpeg')}
            style={styles.motivationImage}
            resizeMode="cover"
          />
          <View style={styles.motivationContent}>
            <Text style={styles.motivationQuote}>
              "Every great scorer{'\n'}started exactly{'\n'}where you are."
            </Text>
            <Text style={styles.motivationSub}>
              Thousands of Nigerian students passed JAMB with the right preparation.{'\n'}
              Today is your day to start.
            </Text>
            <View style={styles.motivationTag}>
              <Text style={styles.motivationTagText}>💡 Start now</Text>
            </View>
          </View>
        </View>

        {/* Features — 3 columns × 2 rows */}
        <Text style={styles.sectionTitle}>Everything you need to score high</Text>
        <View style={styles.featuresGrid}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureCard}>
              <Text style={styles.featureEmoji}>{f.emoji}</Text>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureBody}>{f.body}</Text>
            </View>
          ))}
        </View>

        {/* Image + motivational text section — text left, image right */}
        <View style={styles.promoRow}>
          <View style={styles.promoText}>
            <Text style={styles.promoTitle}>Your score is not determined by luck</Text>
            <Text style={styles.promoBody}>
              Students who pass JAMB study consistently and track weak areas daily.
              CrackJAMB gives you AI explanations, mock exams, flashcards and more.
            </Text>
            <TouchableOpacity
              style={styles.promoBtn}
              onPress={() => requireAuth(() => navigation.navigate('Subjects'))}
            >
              <Text style={styles.promoBtnText}>Start preparing →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.promoImageWrap}>
            <Image
              source={require('../assets/Images/JambImage-2.jpeg')}
              style={styles.promoImage}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Subjects preview */}
        <Text style={styles.sectionTitle}>All major JAMB subjects covered</Text>
        <View style={styles.subjectsGrid}>
          {SUBJECTS_PREVIEW.map((s) => (
            <TouchableOpacity
              key={s.name}
              style={styles.subjectChip}
              onPress={() => requireAuth(() => navigation.navigate('Subjects'))}
              activeOpacity={0.8}
            >
              <Text style={styles.subjectEmoji}>{s.emoji}</Text>
              <Text style={styles.subjectName}>{s.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.subjectChip, styles.subjectChipMore]}
            onPress={() => requireAuth(() => navigation.navigate('Subjects'))}
          >
            <Text style={styles.subjectMoreText}>+8 more →</Text>
          </TouchableOpacity>
        </View>

        {/* How it works */}
        <Text style={styles.sectionTitle}>How it works</Text>
        <View style={styles.stepsCol}>
          {[
            { step: '1', title: 'Pick a subject', body: 'Choose from all 16 UTME subjects and select a topic.' },
            { step: '2', title: 'Learn with AI', body: 'Get a clear explanation with Nigerian examples you can relate to.' },
            { step: '3', title: 'Practice & test yourself', body: 'Answer AI-generated quiz questions and track your score.' },
            { step: '4', title: 'Review & improve', body: 'See corrections, save notes, and focus on your weak areas.' },
          ].map((s) => (
            <View key={s.step} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNum}>{s.step}</Text>
              </View>
              <View style={styles.stepText}>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepBody}>{s.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Quote */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>
            "Ilimi shine maɓallin nasara"
          </Text>
          <Text style={styles.quoteTranslation}>Knowledge is the key to success</Text>
        </View>

        {/* Final CTA */}
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => requireAuth(() => navigation.navigate('Subjects'))}
          activeOpacity={0.88}
        >
          <Text style={styles.ctaBtnText}>Get Started — It's Free</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  container: { padding: 16 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  dashboardContainer: { padding: 16, paddingBottom: 34 },
  dashboardHero: {
    height: 230,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: '#1b2a4a',
  },
  dashboardHeroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(27,42,74,0.48)',
  },
  dashboardHeroContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 18,
  },
  welcomeLabel: {
    color: '#e6edf8',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  dashboardTitle: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '900',
    marginBottom: 6,
  },
  dashboardSub: {
    color: '#e6edf8',
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 320,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  summaryTile: {
    width: '48.7%',
    minHeight: 76,
    backgroundColor: '#f4f6fb',
    borderWidth: 1,
    borderColor: '#dde3ef',
    borderRadius: 12,
    padding: 14,
    justifyContent: 'center',
  },
  summaryValue: { color: '#1b2a4a', fontSize: 24, fontWeight: '900', marginBottom: 3 },
  summaryLabel: { color: '#6b7c9a', fontSize: 12, fontWeight: '700' },
  dashboardSectionTitle: {
    color: '#1b2a4a',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 12,
    marginTop: 4,
  },
  dashboardSectionTitleInline: {
    color: '#1b2a4a',
    fontSize: 17,
    fontWeight: '900',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  quickTile: {
    width: '31.7%',
    aspectRatio: 1.08,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dde3ef',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  quickIcon: { fontSize: 25, marginBottom: 7 },
  quickLabel: {
    color: '#1b2a4a',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  subjectRail: {
    gap: 10,
    paddingRight: 16,
    marginBottom: 18,
  },
  dashboardSubjectCard: {
    width: 142,
    minHeight: 120,
    backgroundColor: '#f4f6fb',
    borderWidth: 1,
    borderColor: '#dde3ef',
    borderRadius: 12,
    padding: 14,
    justifyContent: 'space-between',
  },
  addSubjectCard: {
    backgroundColor: '#ffffff',
    borderStyle: 'dashed',
  },
  dashboardSubjectEmoji: { fontSize: 28 },
  dashboardSubjectName: {
    color: '#1b2a4a',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
  },
  dashboardSubjectMeta: {
    color: '#6b7c9a',
    fontSize: 11,
    fontWeight: '700',
  },
  readingSummary: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dde3ef',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  readingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  viewLink: { color: '#2e4a7a', fontSize: 12, fontWeight: '800' },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eaeef6',
  },
  noteEmoji: { fontSize: 20, marginRight: 10 },
  noteTextBlock: { flex: 1 },
  noteTitle: { color: '#1b2a4a', fontSize: 13, fontWeight: '800', marginBottom: 2 },
  noteMeta: { color: '#6b7c9a', fontSize: 12 },
  emptySummary: {
    backgroundColor: '#f4f6fb',
    borderRadius: 10,
    padding: 14,
  },
  emptyTitle: { color: '#1b2a4a', fontSize: 14, fontWeight: '900', marginBottom: 4 },
  emptyBody: { color: '#6b7c9a', fontSize: 12, lineHeight: 18 },
  imageStudyBand: {
    flexDirection: 'row',
    minHeight: 108,
    backgroundColor: '#1b2a4a',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 4,
  },
  imageStudyBandImage: { width: '38%', minHeight: 138 },
  imageStudyBandText: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  imageBandTitle: { color: '#ffffff', fontSize: 16, fontWeight: '900', marginBottom: 8 },
  imageBandBody: { color: '#b0bfd8', fontSize: 12, lineHeight: 18 },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 28,
  },
  heroBadge: {
    backgroundColor: '#e6f0ff',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#c5d8ff',
  },
  heroBadgeText: { color: '#1b2a4a', fontWeight: '700', fontSize: 13 },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1b2a4a',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 12,
  },
  heroSub: {
    fontSize: 15,
    color: '#6b7c9a',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  heroBtn: {
    backgroundColor: '#1b2a4a',
    paddingVertical: 15,
    paddingHorizontal: 32,
    borderRadius: 14,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  heroBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  heroSecondaryBtn: { paddingVertical: 6 },
  heroSecondaryText: { color: '#2e4a7a', fontWeight: '600', fontSize: 13 },

  illustrationWrap: {
    width: '100%',
    marginBottom: 20,
    borderRadius: 18,
    overflow: 'hidden',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#1b2a4a',
    borderRadius: 16,
    paddingVertical: 18,
    marginBottom: 28,
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center' },
  statVal: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
  statLabel: { color: '#b0bfd8', fontSize: 11, marginTop: 3 },

  // Motivation card
  motivationCard: {
    flexDirection: 'row',
    backgroundColor: '#1b2a4a',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 28,
    height: 130,
  },
  motivationImage: {
    width: '35%',
  },
  motivationContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  motivationQuote: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 21,
    marginBottom: 10,
  },
  motivationSub: {
    color: '#b0bfd8',
    fontSize: 11,
    lineHeight: 17,
    marginBottom: 14,
  },
  motivationTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  motivationTagText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Section titles
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1b2a4a',
    marginBottom: 14,
  },

  // Features grid — 3 columns
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  featureCard: {
    width: '31%',
    backgroundColor: '#f4f6fb',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#dde3ef',
  },
  featureEmoji: { fontSize: 22, marginBottom: 6 },
  featureTitle: { fontSize: 11, fontWeight: '800', color: '#1b2a4a', marginBottom: 4 },
  featureBody: { fontSize: 10, color: '#6b7c9a', lineHeight: 15 },

  // Promo row — text left, image right
  promoRow: {
    flexDirection: 'row',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 28,
    backgroundColor: '#f4f6fb',
    borderWidth: 1,
    borderColor: '#dde3ef',
    height: 170,
  },
  promoText: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
  },
  promoImageWrap: {
    width: 110,
  },
  promoImage: {
    width: 110,
    height: 170,
  },
  promoTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1b2a4a',
    lineHeight: 19,
    marginBottom: 8,
  },
  promoBody: {
    fontSize: 11,
    color: '#6b7c9a',
    lineHeight: 17,
    marginBottom: 12,
  },
  promoBtn: {
    backgroundColor: '#1b2a4a',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  promoBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 11 },

  // Subjects
  subjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 28,
  },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f4f6fb',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#dde3ef',
  },
  subjectChipMore: {
    backgroundColor: '#1b2a4a',
    borderColor: '#1b2a4a',
  },
  subjectEmoji: { fontSize: 15 },
  subjectName: { fontSize: 12, fontWeight: '700', color: '#1b2a4a' },
  subjectMoreText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },

  // Steps
  stepsCol: { gap: 12, marginBottom: 28 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: '#f4f6fb',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#dde3ef',
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1b2a4a',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNum: { color: '#ffffff', fontWeight: '900', fontSize: 14 },
  stepText: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: '800', color: '#1b2a4a', marginBottom: 3 },
  stepBody: { fontSize: 12, color: '#6b7c9a', lineHeight: 18 },

  // Quote
  quoteCard: {
    backgroundColor: '#1b2a4a',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  quoteText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 6,
  },
  quoteTranslation: { color: '#b0bfd8', fontSize: 12, textAlign: 'center' },

  // CTA
  ctaBtn: {
    backgroundColor: '#1b2a4a',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
});
