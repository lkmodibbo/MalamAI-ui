import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StatusBar, ScrollView, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import useRequireAuth from '../hooks/useRequireAuth';
import HeroCarousel from '../components/HeroCarousel';
import ExamCountdownCard from '../components/ExamCountdownCard';
import TodaysPlanCard from '../components/TodaysPlanCard';
import HomeReviewCard from '../components/HomeReviewCard';
import HomeWeaknessCard from '../components/HomeWeaknessCard';
import SUBJECTS from '../constants/subjects';
import SubjectBadge from '../components/SubjectBadge';
import MenuButton from '../components/MenuButton';
import useSRS from '../hooks/useSRS';
import useNotes from '../hooks/useNotes';
import useExamCountdown from '../hooks/useExamCountdown';
import useStudentProfile from '../hooks/useStudentProfile';
import useWeaknessTracker from '../hooks/useWeaknessTracker';
import useSetupProgress from '../hooks/useSetupProgress';
import { getQuizStats, getUnreadCount } from '../services/apiService';
import { COLORS } from '../constants/colors';

const FEATURES = [
  {
    title: 'AI-Powered Tutor',
    body: 'Ask any JAMB question and get a clear, step-by-step explanation — anytime, anywhere.',
  },
  {
    title: 'Practice Quizzes',
    body: 'Sharpen your skills with AI-generated questions across all 16 UTME subjects.',
  },
  {
    title: 'Full Mock Exams',
    body: 'Simulate the real JAMB experience — 80 questions, 90 minutes, instant score breakdown.',
  },
  {
    title: 'Flashcards',
    body: 'Master key concepts fast with auto-generated flashcards for every topic.',
  },
  {
    title: 'Track Your Progress',
    body: 'See your weak areas, monitor improvement, and focus your study where it matters most.',
  },
  {
    title: 'Personal Notes',
    body: 'Save AI explanations as notes and review them anytime — even offline.',
  },
];

const SUBJECTS_PREVIEW = [
  { name: 'Mathematics' },
  { name: 'English' },
  { name: 'Physics' },
  { name: 'Chemistry' },
  { name: 'Biology' },
  { name: 'Economics' },
  { name: 'Government' },
  { name: 'Geography' },
];

function SetupStep({ done, label, hint, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.setupStep, done && styles.setupStepDone]}
      onPress={done ? undefined : onPress}
      activeOpacity={done ? 1 : 0.75}
    >
      <View style={[styles.setupStepIcon, done && styles.setupStepIconDone]}>
        {done ? <Text style={styles.setupStepCheck}>✓</Text> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.setupStepLabel, done && styles.setupStepLabelDone]}>{label}</Text>
        {!done && <Text style={styles.setupStepHint}>{hint}</Text>}
      </View>
    </TouchableOpacity>
  );
}

export default function LandingScreen({ navigation }) {
  const requireAuth = useRequireAuth(navigation);
  // The bottom tab bar used to cover this edge; with it gone the screen owns
  // the full safe area again.
  const safeEdges = ['top', 'left', 'right', 'bottom'];
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const [streak, setStreak] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const { profile, loading: profileLoading, reloadProfile } = useStudentProfile();
  const { dueCount, refreshQueue } = useSRS();
  const { notes, refreshNotes } = useNotes();
  const { weakTopics, refreshWeakTopics } = useWeaknessTracker();
  const { examDate, daysRemaining, progressPercent } = useExamCountdown();
  const { steps, completedCount, totalSteps, percent: setupPercent, isComplete: setupDone, refresh: refreshProgress } = useSetupProgress(profile);

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
              getQuizStats().then((data) => setStreak(data.streak?.current_streak || 0)).catch(() => {}),
              getUnreadCount().then((data) => setUnreadCount(data.count || 0)).catch(() => {}),
            ]);
            refreshProgress();
          }
        } catch (error) {
          console.warn('[LandingScreen] failed to refresh home dashboard', error);
          if (mounted) setIsLoggedIn(false);
        }
      }
      refreshHome();
      return () => { mounted = false; };
    }, [refreshNotes, refreshQueue, refreshWeakTopics, reloadProfile, refreshProgress]),
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
      },
      topic: item.topic,
    });
  };

  if (isLoggedIn === null || (isLoggedIn && profileLoading)) {
    return (
      <SafeAreaView style={styles.root} edges={safeEdges}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#14283D" />
        </View>
      </SafeAreaView>
    );
  }

  if (isLoggedIn) {
    return (
      <SafeAreaView style={styles.root} edges={safeEdges}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.pageHeader}>
          <View style={styles.headerLeft}>
            <MenuButton />
            <View>
              <Text style={styles.headerEyebrow}>Dashboard</Text>
              <Text style={styles.headerTitle}>Home</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.headerBell}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.8}
          >
            <Text style={styles.headerBellLabel}>Alerts</Text>
            {unreadCount > 0 ? (
              <View style={styles.headerBellBadge}>
                <Text style={styles.headerBellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.dashboardContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.dashboardHero}>
            <Image
              source={require('../../assets/Images/hero-study.jpg')}
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
            <TouchableOpacity style={styles.summaryTile} onPress={() => navigation.navigate('Subjects')} activeOpacity={0.85}>
              <Text style={styles.summaryValue}>{selectedSubjects.length}</Text>
              <Text style={styles.summaryLabel}>Subjects</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.summaryTile} onPress={() => navigation.navigate('Review')} activeOpacity={0.85}>
              <Text style={styles.summaryValue}>{dueCount}</Text>
              <Text style={styles.summaryLabel}>Reviews</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.summaryTile} onPress={() => navigation.navigate('Notes')} activeOpacity={0.85}>
              <Text style={styles.summaryValue}>{totalNotes}</Text>
              <Text style={styles.summaryLabel}>Notes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.summaryTile} onPress={() => navigation.navigate('Progress')} activeOpacity={0.85}>
              <Text style={styles.summaryValue}>{streak}</Text>
              <Text style={styles.summaryLabel}>Streak</Text>
            </TouchableOpacity>
          </View>

          {/* ── Setup Progress Card ── */}
          {!setupDone && (
            <View style={styles.setupCard}>
              <View style={styles.setupHeader}>
                <Text style={styles.setupTitle}>Finish your setup</Text>
                <Text style={styles.setupBadge}>{completedCount}/{totalSteps}</Text>
              </View>

              {/* Progress bar */}
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${setupPercent}%` }]} />
              </View>
              <Text style={styles.progressLabel}>{setupPercent}% complete</Text>

              {/* Step list */}
              <View style={styles.stepList}>
                <SetupStep
                  done={steps.nameSet}
                  label="Set your name"
                  hint="Go to Profile →"
                  onPress={() => navigation.navigate('Profile')}
                />
                <SetupStep
                  done={steps.examDateSet}
                  label="Set your JAMB exam date"
                  hint="Go to Profile →"
                  onPress={() => navigation.navigate('Profile')}
                />
                <SetupStep
                  done={steps.topicVisited}
                  label="Visit a topic to learn"
                  hint="Go to Subjects →"
                  onPress={() => navigation.navigate('Subjects')}
                />
                <SetupStep
                  done={steps.quizDone}
                  label="Complete your first quiz"
                  hint="Study a topic, then practice"
                  onPress={() => navigation.navigate('Subjects')}
                />
              </View>
            </View>
          )}

          <ExamCountdownCard
            daysRemaining={daysRemaining}
            progressPercent={progressPercent}
            examDate={examDate}
            onSetDate={() => navigation.navigate('Profile')}
          />

          <Text style={styles.dashboardSectionTitle}>Study today</Text>
          <View style={styles.actionList}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => navigation.navigate('MockSetup')}
              activeOpacity={0.86}
            >
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>Mock exam</Text>
                <Text style={styles.actionHint}>Timed paper like the real CBT</Text>
              </View>
              <Text style={styles.actionArrow}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => navigation.navigate('PastQuestions')}
              activeOpacity={0.86}
            >
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>Past questions</Text>
                <Text style={styles.actionHint}>Year-by-year UTME practice</Text>
              </View>
              <Text style={styles.actionArrow}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => navigation.navigate('Leaderboard')}
              activeOpacity={0.86}
            >
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>Leaderboard</Text>
                <Text style={styles.actionHint}>See how you rank this week</Text>
              </View>
              <Text style={styles.actionArrow}>→</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.dashboardSectionTitle}>Your subjects</Text>
          <View style={styles.subjectGrid}>
            {selectedSubjects.map((subject) => (
              <TouchableOpacity key={subject.id} style={styles.dashboardSubjectCard} onPress={() => openSubject(subject)}>
                <SubjectBadge name={subject.name} size="md" />
                <Text style={styles.dashboardSubjectName}>{subject.name}</Text>
                <Text style={styles.dashboardSubjectMeta}>{subject.topics.length} topics</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.dashboardSubjectCard, styles.addSubjectCard]} onPress={() => navigation.navigate('Profile')}>
              <Text style={styles.dashboardSubjectPlus}>+</Text>
              <Text style={styles.dashboardSubjectName}>Edit subjects</Text>
              <Text style={styles.dashboardSubjectMeta}>Profile</Text>
            </TouchableOpacity>
          </View>

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
                  <SubjectBadge name={note.subjectName} size="sm" style={styles.noteBadge} />
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
              source={require('../../assets/Images/night-prep.jpg')}
              style={styles.imageStudyBandImage}
              resizeMode="cover"
            />
            <View style={styles.imageStudyBandScrim} />
            <View style={styles.imageStudyBandText}>
              <Text style={styles.imageBandKicker}>Tonight</Text>
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
    <SafeAreaView style={styles.root} edges={safeEdges}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.illustrationWrap}>
            <HeroCarousel />
          </View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Built for UTME candidates</Text>
          </View>
          <Text style={styles.heroTitle}>Crack JAMB with{'\n'}AI by your side</Text>
          <Text style={styles.heroSub}>
            Learn topics, practise like CBT day, and fix weak areas — in Hausa, English, or mixed. Ka yi kyau.
          </Text>
          <TouchableOpacity
            style={styles.heroBtn}
            onPress={() => requireAuth(() => navigation.navigate('Subjects'))}
            activeOpacity={0.88}
          >
            <Text style={styles.heroBtnText}>Start studying free</Text>
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
            { val: 'AI', label: 'Tutor' },
            { val: 'CBT', label: 'Mocks' },
          ].map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={styles.statVal}>{s.val}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Motivational card */}
        <View style={styles.storyCard}>
          <Image
            source={require('../../assets/Images/study-together.jpg')}
            style={styles.storyImage}
            resizeMode="cover"
          />
          <View style={styles.storyScrim} />
          <View style={styles.storyContent}>
            <Text style={styles.storyKicker}>Start where you are</Text>
            <Text style={styles.storyTitle}>Every high scorer started with one topic.</Text>
            <Text style={styles.storyBody}>
              Nigerian students pass JAMB with a plan — not luck. Begin today and keep a short streak.
            </Text>
          </View>
        </View>

        {/* Features — 3 columns × 2 rows */}
        <Text style={styles.sectionTitle}>Everything you need to score high</Text>
        <View style={styles.featuresGrid}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureCard}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureBody}>{f.body}</Text>
            </View>
          ))}
        </View>

        <View style={styles.storyCard}>
          <Image
            source={require('../../assets/Images/cbt-focus.jpg')}
            style={styles.storyImage}
            resizeMode="cover"
          />
          <View style={styles.storyScrim} />
          <View style={styles.storyContent}>
            <Text style={styles.storyKicker}>Exam hall energy</Text>
            <Text style={styles.storyTitle}>Your score is built in practice, not luck.</Text>
            <Text style={styles.storyBody}>
              Sit timed mocks, review mistakes, and walk into CBT day already used to the pressure.
            </Text>
            <TouchableOpacity
              style={styles.promoBtn}
              onPress={() => requireAuth(() => navigation.navigate('MockSetup'))}
            >
              <Text style={styles.promoBtnText}>Try a mock exam</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.readyCard}>
          <Image
            source={require('../../assets/Images/exam-ready.jpg')}
            style={styles.readyImage}
            resizeMode="cover"
          />
          <View style={styles.readyScrim} />
          <View style={styles.readyContent}>
            <Text style={styles.readyTitle}>Walk in ready</Text>
            <Text style={styles.readyBody}>Track weak areas daily so exam morning feels familiar.</Text>
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
  root: { flex: 1, backgroundColor: '#F4F7F5' },
  container: { padding: 16 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#DCE6E2',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerEyebrow: {
    color: '#5A6B68',
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  headerTitle: {
    color: '#14283D',
    fontWeight: '900',
    fontSize: 24,
    marginTop: 2,
  },
  headerBell: {
    position: 'relative',
    minWidth: 44,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: '#F3F7F5',
    borderWidth: 1,
    borderColor: '#D2DDD7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBellLabel: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  headerBellBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e74c3c',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  headerBellBadgeText: { color: '#ffffff', fontSize: 9, fontWeight: '800' },
  dashboardContainer: { padding: 16, paddingBottom: 28 },
  dashboardHero: {
    height: 188,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: COLORS.primary,
  },
  dashboardHeroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,40,61,0.52)',
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
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 4,
  },
  dashboardSub: {
    color: '#e6edf8',
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 280,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  summaryTile: {
    flex: 1,
    minHeight: 68,
    backgroundColor: '#F3F7F5',
    borderWidth: 1,
    borderColor: '#D2DDD7',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: { color: '#14283D', fontSize: 18, fontWeight: '900', marginBottom: 2 },
  summaryLabel: { color: '#5A6B68', fontSize: 10, fontWeight: '700' },
  dashboardSectionTitle: {
    color: '#14283D',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 12,
    marginTop: 4,
  },
  dashboardSectionTitleInline: {
    color: '#14283D',
    fontSize: 17,
    fontWeight: '900',
  },
  actionList: {
    gap: 8,
    marginBottom: 20,
  },
  actionRow: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionCopy: { flex: 1 },
  actionTitle: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  actionHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  actionArrow: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
  },
  subjectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  dashboardSubjectCard: {
    flexBasis: '48%',
    minHeight: 120,
    backgroundColor: '#F3F7F5',
    borderWidth: 1,
    borderColor: '#D2DDD7',
    borderRadius: 12,
    padding: 14,
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addSubjectCard: {
    backgroundColor: '#ffffff',
    borderStyle: 'dashed',
  },
  dashboardSubjectPlus: {
    color: COLORS.accent,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
  },
  dashboardSubjectName: {
    color: '#14283D',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
  },
  dashboardSubjectMeta: {
    color: '#5A6B68',
    fontSize: 11,
    fontWeight: '700',
  },
  readingSummary: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#D2DDD7',
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
  viewLink: { color: '#0F8A72', fontSize: 12, fontWeight: '800' },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E4EDE9',
  },
  noteBadge: { marginRight: 10 },
  noteTextBlock: { flex: 1 },
  noteTitle: { color: '#14283D', fontSize: 13, fontWeight: '800', marginBottom: 2 },
  noteMeta: { color: '#5A6B68', fontSize: 12 },
  emptySummary: {
    backgroundColor: '#F3F7F5',
    borderRadius: 10,
    padding: 14,
  },
  emptyTitle: { color: '#14283D', fontSize: 14, fontWeight: '900', marginBottom: 4 },
  emptyBody: { color: '#5A6B68', fontSize: 12, lineHeight: 18 },
  imageStudyBand: {
    height: 176,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 4,
    justifyContent: 'flex-end',
  },
  imageStudyBandImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  imageStudyBandScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 40, 61, 0.48)',
  },
  imageStudyBandText: {
    padding: 16,
  },
  imageBandKicker: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  imageBandTitle: { color: '#ffffff', fontSize: 16, fontWeight: '900', marginBottom: 8 },
  imageBandBody: { color: '#C5D4CF', fontSize: 13, lineHeight: 19 },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 20,
  },
  heroBadge: {
    backgroundColor: COLORS.selected,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heroBadgeText: { color: COLORS.primary, fontWeight: '800', fontSize: 12, letterSpacing: 0.2 },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primary,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 10,
  },
  heroSub: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  heroBtn: {
    backgroundColor: '#0F8A72',
    paddingVertical: 15,
    paddingHorizontal: 32,
    borderRadius: 14,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  heroBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  heroSecondaryBtn: { paddingVertical: 6 },
  heroSecondaryText: { color: '#0F8A72', fontWeight: '600', fontSize: 13 },

  illustrationWrap: {
    width: '100%',
    marginBottom: 18,
    borderRadius: 20,
    overflow: 'hidden',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#14283D',
    borderRadius: 16,
    paddingVertical: 18,
    marginBottom: 28,
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center' },
  statVal: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
  statLabel: { color: '#C5D4CF', fontSize: 11, marginTop: 3 },

  storyCard: {
    height: 220,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'flex-end',
  },
  storyImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  storyScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 40, 61, 0.46)',
  },
  storyContent: {
    padding: 18,
  },
  storyKicker: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  storyTitle: {
    color: COLORS.textWhite,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
    marginBottom: 8,
  },
  storyBody: {
    color: COLORS.textOnDark,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  readyCard: {
    height: 168,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'flex-end',
  },
  readyImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  readyScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 40, 61, 0.40)',
  },
  readyContent: {
    padding: 18,
  },
  readyTitle: {
    color: COLORS.textWhite,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  readyBody: {
    color: COLORS.textOnDark,
    fontSize: 13,
    lineHeight: 19,
  },

  // Section titles
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#14283D',
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
    width: '48.2%',
    backgroundColor: '#F3F7F5',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D2DDD7',
  },
  featureTitle: { fontSize: 13, fontWeight: '800', color: '#14283D', marginBottom: 4 },
  featureBody: { fontSize: 12, color: '#5A6B68', lineHeight: 17 },

  promoBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  promoBtnText: { color: COLORS.textWhite, fontWeight: '800', fontSize: 13 },

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
    backgroundColor: '#F3F7F5',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#D2DDD7',
  },
  subjectChipMore: {
    backgroundColor: '#14283D',
    borderColor: '#14283D',
  },
  subjectName: { fontSize: 12, fontWeight: '700', color: '#14283D' },
  subjectMoreText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },

  // Steps
  stepsCol: { gap: 12, marginBottom: 28 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: '#F3F7F5',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D2DDD7',
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#14283D',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNum: { color: '#ffffff', fontWeight: '900', fontSize: 14 },
  stepText: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: '800', color: '#14283D', marginBottom: 3 },
  stepBody: { fontSize: 12, color: '#5A6B68', lineHeight: 18 },

  // Quote
  quoteCard: {
    backgroundColor: '#14283D',
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
  quoteTranslation: { color: '#C5D4CF', fontSize: 12, textAlign: 'center' },

  // CTA
  ctaBtn: {
    backgroundColor: '#0F8A72',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },

  // Setup progress card
  setupCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#D2DDD7',
  },
  setupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  setupTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#14283D',
  },
  setupBadge: {
    backgroundColor: '#14283D',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#D2DDD7',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: 8,
    backgroundColor: '#14283D',
    borderRadius: 999,
  },
  progressLabel: {
    fontSize: 11,
    color: '#5A6B68',
    fontWeight: '700',
    marginBottom: 12,
  },
  stepList: { gap: 8 },
  setupStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F3F7F5',
    borderRadius: 10,
    padding: 11,
    borderWidth: 1,
    borderColor: '#D2DDD7',
  },
  setupStepDone: {
    backgroundColor: '#f0faf4',
    borderColor: '#b7e0c7',
  },
  setupStepIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#C5D4CF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupStepIconDone: {
    backgroundColor: '#14283D',
    borderColor: '#14283D',
  },
  setupStepCheck: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textWhite,
  },
  setupStepLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#14283D',
  },
  setupStepLabelDone: {
    color: '#3a7d5a',
    textDecorationLine: 'line-through',
  },
  setupStepHint: {
    fontSize: 11,
    color: '#5A6B68',
    marginTop: 1,
  },
});
