import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Modal, ScrollView,
  Text, TouchableOpacity, View, StyleSheet, AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { normalizeQuestionList, parseQuestionJson } from '../services/grok';
import SUBJECTS from '../constants/subjects';
import { getQuestionsFromDB, saveAiQuestions, generateAiContent } from '../services/apiService';
import SubjectBadge from '../components/SubjectBadge';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EXAM_SECONDS = 90 * 60;
const QUESTION_COUNT = 20; // 20 per subject — reliable with all fallback models

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function MockExamScreen({ route, navigation }) {
  const { subjectIds = [] } = route.params || {};
  const subjects = useMemo(
    () => subjectIds.map((id) => SUBJECTS.find((s) => s.id === id)).filter(Boolean),
    [subjectIds],
  );

  const [loadStatus, setLoadStatus] = useState(() =>
    subjectIds.reduce((acc, id) => ({ ...acc, [id]: 'loading' }), {}),
  );
  const [questionsBySubject, setQuestionsBySubject] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubjectId, setActiveSubjectId] = useState(subjectIds[0] || '');
  const [currentIndexes, setCurrentIndexes] = useState(() =>
    subjectIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {}),
  );
  const [selectedAnswers, setSelectedAnswers] = useState(() =>
    subjectIds.reduce((acc, id) => ({ ...acc, [id]: {} }), {}),
  );
  const [secondsLeft, setSecondsLeft] = useState(EXAM_SECONDS);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const intervalRef = useRef(null);
  const saveTimerRef = useRef(null);

  const examStateKey = `inprogress_exam:${subjectIds.join('|')}`;

  // Try to load in-progress exam from storage first
  useEffect(() => {
    let mounted = true;
    const hydrate = async () => {
      try {
        const raw = await AsyncStorage.getItem(examStateKey);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        // basic validation: ensure subjects match
        if (!parsed || !Array.isArray(parsed.subjectIds) || parsed.subjectIds.join('|') !== subjectIds.join('|')) return;
        if (!mounted) return;
        setQuestionsBySubject(parsed.questionsBySubject || {});
        setSelectedAnswers(parsed.selectedAnswers || subjectIds.reduce((acc, id) => ({ ...acc, [id]: {} }), {}));
        setCurrentIndexes(parsed.currentIndexes || subjectIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {}));
        setSecondsLeft(typeof parsed.secondsLeft === 'number' ? parsed.secondsLeft : EXAM_SECONDS);
        setActiveSubjectId(parsed.activeSubjectId || subjectIds[0] || '');
        setLoadStatus(subjectIds.reduce((acc, id) => ({ ...acc, [id]: 'done' }), {}));
        setIsLoading(false);
      } catch (err) {
        // ignore hydrate errors and proceed to normal load
      }
    };
    hydrate();
    return () => { mounted = false; };
  }, [examStateKey]);

  // Load all subjects in parallel (unless hydrated from storage)
  useEffect(() => {
    let mounted = true;
    const loadAll = async () => {
      // If questions were hydrated from storage, skip remote generation for those subjects
      const missing = subjects.filter((s) => !(questionsBySubject[s.id] && questionsBySubject[s.id].length));
      if (!missing.length) {
        if (mounted) setIsLoading(false);
        return;
      }
      await Promise.all(missing.map(async (subject) => {
        try {
          let questions = await getQuestionsFromDB(subject.id, null, QUESTION_COUNT);
          if (questions.length < QUESTION_COUNT) {
            try {
              const data = await generateAiContent('questions', {
                subject: subject.name,
                count:   QUESTION_COUNT,
              });
              questions = normalizeQuestionList(parseQuestionJson(data.result), QUESTION_COUNT);
              saveAiQuestions(subject.id, null, questions).catch(() => {});
            } catch (aiErr) {
              if (!questions.length) throw aiErr;
            }
          } else {
            questions = questions.slice(0, QUESTION_COUNT);
          }
          if (!mounted) return;
          setQuestionsBySubject((prev) => ({ ...prev, [subject.id]: questions }));
          setLoadStatus((prev) => ({ ...prev, [subject.id]: 'done' }));
        } catch (err) {
          if (!mounted) return;
          setLoadStatus((prev) => ({ ...prev, [subject.id]: 'error' }));
          setError(`Failed to load ${subject.name}. Please go back and try again.`);
        }
      }));
      if (mounted) setIsLoading(false);
    };
    loadAll();
    return () => { mounted = false; };
  }, [subjects]);

  // Timer
  useEffect(() => {
    if (isLoading) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => Math.max(s - 1, 0));
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [isLoading]);

  useEffect(() => {
    if (secondsLeft === 0 && !isLoading) doSubmit();
  }, [secondsLeft, isLoading]);

  // Persist in-progress exam state periodically
  useEffect(() => {
    let mounted = true;
    const saveState = async () => {
      try {
        const payload = {
          subjectIds,
          questionsBySubject,
          selectedAnswers,
          currentIndexes,
          secondsLeft,
          activeSubjectId,
          savedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(examStateKey, JSON.stringify(payload));
      } catch (err) {
        // ignore save errors
      }
    };
    // debounce save after changes (2.5s)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { if (mounted) saveState(); }, 2500);

    const onAppStateChange = (next) => {
      if (next === 'inactive' || next === 'background') saveState();
    };
    AppState.addEventListener('change', onAppStateChange);

    return () => {
      mounted = false;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveState();
      AppState.removeEventListener('change', onAppStateChange);
    };
  }, [questionsBySubject, selectedAnswers, currentIndexes, secondsLeft, activeSubjectId, examStateKey, subjectIds]);

  const currentIndex = currentIndexes[activeSubjectId] || 0;
  const activeQuestions = questionsBySubject[activeSubjectId] || [];
  const currentQuestion = activeQuestions[currentIndex] || null;
  const currentAnswer = selectedAnswers[activeSubjectId]?.[currentIndex];

  const answeredCount = useMemo(
    () => Object.values(selectedAnswers).reduce((sum, ans) => sum + Object.keys(ans).length, 0),
    [selectedAnswers],
  );

  const totalQuestions = subjectIds.length * QUESTION_COUNT;
  const timerDanger = secondsLeft <= 600;

  const selectAnswer = (choice) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [activeSubjectId]: { ...prev[activeSubjectId], [currentIndex]: choice },
    }));
  };

  const move = (dir) => {
    setCurrentIndexes((prev) => ({
      ...prev,
      [activeSubjectId]: dir === 'next'
        ? Math.min((prev[activeSubjectId] || 0) + 1, QUESTION_COUNT - 1)
        : Math.max((prev[activeSubjectId] || 0) - 1, 0),
    }));
  };

  const remaining = totalQuestions - answeredCount;

  // Show confirmation modal if there are unanswered questions
  const handleSubmitPress = () => {
    if (remaining > 0) {
      setShowConfirm(true);
    } else {
      doSubmit();
    }
  };

  const doSubmit = () => {
    setShowConfirm(false);
    clearInterval(intervalRef.current);
    intervalRef.current = null;

    const subjectScores = subjects.map((subject) => {
      const answers = selectedAnswers[subject.id] || {};
      const questions = questionsBySubject[subject.id] || [];
      const correct = questions.reduce((n, q, i) =>
        n + (String(answers[i] || '').toUpperCase() === q.answer ? 1 : 0), 0);
      return {
        id: subject.id,
        name: subject.name,
        correct,
        total: questions.length,
        percent: questions.length ? Math.round((correct / questions.length) * 100) : 0,
      };
    });

    const totalScore = subjectScores.reduce((n, s) => n + s.correct, 0);
    const predictedScore = Math.round((totalScore / (subjectIds.length * QUESTION_COUNT)) * 400);

    navigation.replace('MockScore', {
      subjectScores,
      totalScore,
      predictedScore,
      timeTaken: EXAM_SECONDS - secondsLeft,
    });
    // clear saved in-progress exam
    AsyncStorage.removeItem(examStateKey).catch(() => {});
  };

  // ── Loading screen ──
  if (isLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loadScreen}>
          <Text style={styles.loadTitle}>Preparing your exam</Text>
          <Text style={styles.loadSub}>Generating {QUESTION_COUNT} questions per subject…</Text>
          <View style={styles.loadList}>
            {subjects.map((s) => (
              <View key={s.id} style={styles.loadRow}>
                <View style={styles.loadSubjectRow}>
                  <SubjectBadge name={s.name} size="sm" />
                  <Text style={styles.loadSubject}>{s.name}</Text>
                </View>
                {loadStatus[s.id] === 'done'
                  ? <Text style={styles.loadDone}>✓ Ready</Text>
                  : loadStatus[s.id] === 'error'
                    ? <Text style={styles.loadError}>Failed</Text>
                    : <ActivityIndicator size="small" color="#14283D" />}
              </View>
            ))}
          </View>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  // ── Exam screen ──
  return (
    <SafeAreaView style={styles.root}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={[styles.timerBox, timerDanger && styles.timerBoxDanger]}>
          <Text style={[styles.timerText, timerDanger && styles.timerTextDanger]}>
            {formatTime(secondsLeft)}
          </Text>
        </View>
        <Text style={styles.progressText}>{answeredCount}/{totalQuestions} answered</Text>
        <TouchableOpacity style={styles.submitTopBtn} onPress={handleSubmitPress}>
          <Text style={styles.submitTopText}>Submit</Text>
        </TouchableOpacity>
      </View>

      {/* Subject tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
      >
        {subjects.map((s) => {
          const active = s.id === activeSubjectId;
          const subAnswered = Object.keys(selectedAnswers[s.id] || {}).length;
          return (
            <TouchableOpacity
              key={s.id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveSubjectId(s.id)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {s.name}
              </Text>
              <Text style={[styles.tabCount, active && styles.tabCountActive]}>
                {subAnswered}/{QUESTION_COUNT}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Question header */}
        <View style={styles.questionHeader}>
          <Text style={styles.questionLabel}>Question {currentIndex + 1} of {QUESTION_COUNT}</Text>
          <View style={styles.questionProgress}>
            <View
              style={[styles.questionProgressFill, {
                width: `${((currentIndex + 1) / QUESTION_COUNT) * 100}%`,
              }]}
            />
          </View>
        </View>

        <Text style={styles.questionText}>{currentQuestion?.question}</Text>

        {/* Options */}
        {!currentQuestion && loadStatus[activeSubjectId] === 'error' ? (
          <View style={styles.subjectError}>
            <Text style={styles.subjectErrorText}>
              Questions failed to load for this subject.{'\n'}
              Switch to another subject or go back and retry.
            </Text>
          </View>
        ) : null}

        {currentQuestion && Object.entries(currentQuestion.options || {}).map(([key, val]) => {
          const chosen = currentAnswer === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.option, chosen && styles.optionChosen]}
              onPress={() => selectAnswer(key)}
              activeOpacity={0.8}
            >
              <View style={[styles.optionKey, chosen && styles.optionKeyChosen]}>
                <Text style={[styles.optionKeyText, chosen && styles.optionKeyTextChosen]}>{key}</Text>
              </View>
              <Text style={[styles.optionText, chosen && styles.optionTextChosen]}>{val}</Text>
            </TouchableOpacity>
          );
        })}

        {/* Nav */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
            onPress={() => move('prev')}
            disabled={currentIndex === 0}
          >
            <Text style={styles.navBtnText}>← Prev</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navBtn, currentIndex === QUESTION_COUNT - 1 && styles.navBtnDisabled]}
            onPress={() => move('next')}
            disabled={currentIndex === QUESTION_COUNT - 1}
          >
            <Text style={styles.navBtnText}>Next →</Text>
          </TouchableOpacity>
        </View>

        {/* Question grid */}
        <Text style={styles.gridLabel}>Questions overview</Text>
        <View style={styles.grid}>
          {Array.from({ length: QUESTION_COUNT }, (_, i) => {
            const answered = Boolean(selectedAnswers[activeSubjectId]?.[i]);
            const active = i === currentIndex;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.gridCell, answered && styles.gridCellAnswered, active && styles.gridCellActive]}
                onPress={() => setCurrentIndexes((prev) => ({ ...prev, [activeSubjectId]: i }))}
              >
                <Text style={[styles.gridCellText, (answered || active) && styles.gridCellTextOn]}>
                  {i + 1}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Confirm submit modal */}
      <Modal
        visible={showConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Submit exam?</Text>
            <Text style={styles.modalBody}>
              You still have{' '}
              <Text style={styles.modalHighlight}>{remaining} unanswered question{remaining !== 1 ? 's' : ''}</Text>
              {' '}out of {totalQuestions}.{'\n'}Unanswered questions will be marked wrong.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowConfirm(false)}
              >
                <Text style={styles.modalCancelText}>Keep going</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={doSubmit}
              >
                <Text style={styles.modalSubmitText}>Submit anyway</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },

  // Loading
  loadScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadTitle: { fontSize: 20, fontWeight: '800', color: '#14283D', marginBottom: 6 },
  loadSub: { fontSize: 13, color: '#5A6B68', marginBottom: 24, textAlign: 'center' },
  loadList: { width: '100%', gap: 10 },
  loadRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F3F7F5', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16,
    borderWidth: 1, borderColor: '#D2DDD7',
  },
  loadSubjectRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  loadSubject: { fontWeight: '700', color: '#14283D', fontSize: 14 },
  loadDone: { color: '#27ae60', fontWeight: '800' },
  loadError: { color: '#e74c3c', fontWeight: '800' },
  errorBox: { marginTop: 16, backgroundColor: '#fdf0f0', borderRadius: 12, padding: 12, width: '100%' },
  errorText: { color: '#c0392b', fontSize: 13, textAlign: 'center' },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#D2DDD7',
    backgroundColor: '#ffffff',
  },
  timerBox: {
    backgroundColor: '#F3F7F5',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#D2DDD7',
  },
  timerBoxDanger: { backgroundColor: '#fdf0f0', borderColor: '#f5c6cb' },
  timerText: { color: '#14283D', fontWeight: '800', fontSize: 15 },
  timerTextDanger: { color: '#c0392b' },
  progressText: { color: '#5A6B68', fontWeight: '700', fontSize: 13 },
  submitTopBtn: {
    backgroundColor: '#14283D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  submitTopText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },

  // Tabs
  tabRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F3F7F5',
    borderWidth: 1,
    borderColor: '#D2DDD7',
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#14283D', borderColor: '#14283D' },
  tabText: { color: '#14283D', fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: '#ffffff' },
  tabCount: { color: '#5A6B68', fontSize: 11, marginTop: 2 },
  tabCountActive: { color: '#C5D4CF' },

  // Content
  content: { padding: 16, paddingBottom: 32 },

  questionHeader: { marginBottom: 14 },
  questionLabel: { color: '#5A6B68', fontWeight: '700', fontSize: 13, marginBottom: 8 },
  questionProgress: {
    height: 4, backgroundColor: '#D2DDD7', borderRadius: 999, overflow: 'hidden',
  },
  questionProgressFill: { height: 4, backgroundColor: '#14283D', borderRadius: 999 },

  questionText: {
    fontSize: 16, fontWeight: '700', color: '#14283D',
    lineHeight: 24, marginBottom: 18,
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F7F5',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D2DDD7',
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  optionChosen: { backgroundColor: '#D5F0E8', borderColor: '#14283D' },
  optionKey: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#B5C4BF',
    alignItems: 'center', justifyContent: 'center',
  },
  optionKeyChosen: { backgroundColor: '#14283D', borderColor: '#14283D' },
  optionKeyText: { fontWeight: '800', color: '#14283D', fontSize: 13 },
  optionKeyTextChosen: { color: '#ffffff' },
  optionText: { flex: 1, color: '#14283D', fontWeight: '600', fontSize: 14, lineHeight: 20 },
  optionTextChosen: { color: '#14283D' },

  navRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  navBtn: {
    flex: 1, backgroundColor: '#F3F7F5', borderRadius: 12,
    borderWidth: 1, borderColor: '#D2DDD7',
    paddingVertical: 13, alignItems: 'center',
  },
  navBtnDisabled: { opacity: 0.35 },
  navBtnText: { color: '#14283D', fontWeight: '700' },

  gridLabel: { fontSize: 12, fontWeight: '700', color: '#5A6B68', marginTop: 20, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gridCell: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#F3F7F5', borderWidth: 1, borderColor: '#D2DDD7',
    alignItems: 'center', justifyContent: 'center',
  },
  gridCellAnswered: { backgroundColor: '#14283D', borderColor: '#14283D' },
  gridCellActive: { borderColor: '#0F8A72', borderWidth: 2 },
  gridCellText: { fontSize: 12, fontWeight: '700', color: '#5A6B68' },
  gridCellTextOn: { color: '#ffffff' },

  subjectError: {
    backgroundColor: '#fdf0f0',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f5c6cb',
    marginBottom: 16,
  },
  subjectErrorText: {
    color: '#c0392b',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },

  // Confirm modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#14283D', marginBottom: 10 },
  modalBody: {
    fontSize: 14,
    color: '#5A6B68',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalHighlight: { color: '#e74c3c', fontWeight: '800' },
  modalBtns: { flexDirection: 'row', gap: 10, width: '100%' },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#F3F7F5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D2DDD7',
  },
  modalCancelText: { color: '#14283D', fontWeight: '700', fontSize: 14 },
  modalSubmitBtn: {
    flex: 1,
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSubmitText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
});
