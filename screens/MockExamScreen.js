import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Modal, ScrollView,
  Text, TouchableOpacity, View, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { callGrok, normalizeQuestionList, parseQuestionJson } from '../src/utils/grok';
import SUBJECTS from '../constants/subjects';

const EXAM_SECONDS = 90 * 60;
const QUESTION_COUNT = 20; // 20 per subject — reliable with all fallback models

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getSubjectPrompt(subjectName) {
  return `You are MalamAI, a JAMB tutor. Generate exactly ${QUESTION_COUNT} unique multiple choice JAMB-style questions for "${subjectName}". Each question must have four options A, B, C, D and one correct answer. Return valid JSON only, no markdown, no extra text:\n{\n  "questions": [\n    {\n      "question": "...",\n      "options": {"A": "...", "B": "...", "C": "...", "D": "..."},\n      "answer": "A",\n      "explanation": "..."\n    }\n  ]\n}`;
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

  // Load all subjects in parallel
  useEffect(() => {
    let mounted = true;
    const loadAll = async () => {
      await Promise.all(subjects.map(async (subject) => {
        try {
          const raw = await callGrok(getSubjectPrompt(subject.name));
          const questions = normalizeQuestionList(parseQuestionJson(raw), QUESTION_COUNT);
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
        emoji: subject.emoji,
        name: subject.name,
        correct,
        total: questions.length,
        percent: questions.length ? Math.round((correct / questions.length) * 100) : 0,
      };
    });

    const totalScore = subjectScores.reduce((n, s) => n + s.correct, 0);
    const predictedScore = Math.round((totalScore / (subjectIds.length * QUESTION_COUNT)) * 400);

    navigation.replace('MockScore', { subjectScores, totalScore, predictedScore });
  };

  // ── Loading screen ──
  if (isLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loadScreen}>
          <View style={styles.loadIcon}>
            <Text style={{ fontSize: 32 }}>🎓</Text>
          </View>
          <Text style={styles.loadTitle}>Preparing your exam</Text>
          <Text style={styles.loadSub}>Generating {QUESTION_COUNT} questions per subject…</Text>
          <View style={styles.loadList}>
            {subjects.map((s) => (
              <View key={s.id} style={styles.loadRow}>
                <Text style={styles.loadSubject}>{s.emoji} {s.name}</Text>
                {loadStatus[s.id] === 'done'
                  ? <Text style={styles.loadDone}>✓ Ready</Text>
                  : loadStatus[s.id] === 'error'
                    ? <Text style={styles.loadError}>✗ Failed</Text>
                    : <ActivityIndicator size="small" color="#1b2a4a" />}
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
            ⏱ {formatTime(secondsLeft)}
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
                {s.emoji} {s.name}
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
              ⚠️ Questions failed to load for this subject.{'\n'}
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
            <Text style={styles.modalEmoji}>⚠️</Text>
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
  loadIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#f4f6fb', borderWidth: 1, borderColor: '#dde3ef',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  loadTitle: { fontSize: 20, fontWeight: '800', color: '#1b2a4a', marginBottom: 6 },
  loadSub: { fontSize: 13, color: '#6b7c9a', marginBottom: 24, textAlign: 'center' },
  loadList: { width: '100%', gap: 10 },
  loadRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f4f6fb', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16,
    borderWidth: 1, borderColor: '#dde3ef',
  },
  loadSubject: { fontWeight: '700', color: '#1b2a4a', fontSize: 14 },
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
    borderBottomColor: '#dde3ef',
    backgroundColor: '#ffffff',
  },
  timerBox: {
    backgroundColor: '#f4f6fb',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#dde3ef',
  },
  timerBoxDanger: { backgroundColor: '#fdf0f0', borderColor: '#f5c6cb' },
  timerText: { color: '#1b2a4a', fontWeight: '800', fontSize: 15 },
  timerTextDanger: { color: '#c0392b' },
  progressText: { color: '#6b7c9a', fontWeight: '700', fontSize: 13 },
  submitTopBtn: {
    backgroundColor: '#1b2a4a',
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
    backgroundColor: '#f4f6fb',
    borderWidth: 1,
    borderColor: '#dde3ef',
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#1b2a4a', borderColor: '#1b2a4a' },
  tabText: { color: '#1b2a4a', fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: '#ffffff' },
  tabCount: { color: '#6b7c9a', fontSize: 11, marginTop: 2 },
  tabCountActive: { color: '#b0bfd8' },

  // Content
  content: { padding: 16, paddingBottom: 32 },

  questionHeader: { marginBottom: 14 },
  questionLabel: { color: '#6b7c9a', fontWeight: '700', fontSize: 13, marginBottom: 8 },
  questionProgress: {
    height: 4, backgroundColor: '#dde3ef', borderRadius: 999, overflow: 'hidden',
  },
  questionProgressFill: { height: 4, backgroundColor: '#1b2a4a', borderRadius: 999 },

  questionText: {
    fontSize: 16, fontWeight: '700', color: '#1b2a4a',
    lineHeight: 24, marginBottom: 18,
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f6fb',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dde3ef',
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  optionChosen: { backgroundColor: '#e6f0ff', borderColor: '#1b2a4a' },
  optionKey: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#c5cfe0',
    alignItems: 'center', justifyContent: 'center',
  },
  optionKeyChosen: { backgroundColor: '#1b2a4a', borderColor: '#1b2a4a' },
  optionKeyText: { fontWeight: '800', color: '#1b2a4a', fontSize: 13 },
  optionKeyTextChosen: { color: '#ffffff' },
  optionText: { flex: 1, color: '#1b2a4a', fontWeight: '600', fontSize: 14, lineHeight: 20 },
  optionTextChosen: { color: '#1b2a4a' },

  navRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  navBtn: {
    flex: 1, backgroundColor: '#f4f6fb', borderRadius: 12,
    borderWidth: 1, borderColor: '#dde3ef',
    paddingVertical: 13, alignItems: 'center',
  },
  navBtnDisabled: { opacity: 0.35 },
  navBtnText: { color: '#1b2a4a', fontWeight: '700' },

  gridLabel: { fontSize: 12, fontWeight: '700', color: '#6b7c9a', marginTop: 20, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gridCell: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#f4f6fb', borderWidth: 1, borderColor: '#dde3ef',
    alignItems: 'center', justifyContent: 'center',
  },
  gridCellAnswered: { backgroundColor: '#1b2a4a', borderColor: '#1b2a4a' },
  gridCellActive: { borderColor: '#2e4a7a', borderWidth: 2 },
  gridCellText: { fontSize: 12, fontWeight: '700', color: '#6b7c9a' },
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
  modalEmoji: { fontSize: 36, marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#1b2a4a', marginBottom: 10 },
  modalBody: {
    fontSize: 14,
    color: '#6b7c9a',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalHighlight: { color: '#e74c3c', fontWeight: '800' },
  modalBtns: { flexDirection: 'row', gap: 10, width: '100%' },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#f4f6fb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dde3ef',
  },
  modalCancelText: { color: '#1b2a4a', fontWeight: '700', fontSize: 14 },
  modalSubmitBtn: {
    flex: 1,
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSubmitText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
});
