import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getPastExamYears,
  getPastExamQuestions,
  submitPastExam,
  addBookmark,
} from '../services/apiService';
import { COLORS } from '../constants/colors';
import SubjectBadge from '../components/SubjectBadge';

const EXAM_TIME = 30 * 60; // 30 minutes

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function PastExamScreen({ route, navigation }) {
  const { subject } = route.params || {};

  const [stage, setStage]           = useState('setup');
  // stages: setup | exam | result

  const [years, setYears]           = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [questions, setQuestions]   = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers]       = useState({});
  const [timeRemaining, setTimeRemaining] = useState(EXAM_TIME);
  const [loading, setLoading]       = useState(false);
  const [yearsError, setYearsError] = useState('');
  const [result, setResult]         = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [bookmarked, setBookmarked] = useState({});

  const timerRef    = useRef(null);
  const startTimeRef = useRef(null);

  // Load available years on mount
  useEffect(() => {
    async function loadYears() {
      setLoading(true);
      setYearsError('');
      try {
        const data = await getPastExamYears(subject.id);
        setYears(data.years || []);
        if ((data.years || []).length === 0) {
          setYearsError('No past questions have been uploaded for this subject yet.');
        }
      } catch (err) {
        console.warn('[PastExamScreen] loadYears error:', err.message);
        setYearsError('Could not load years. Check your connection and try again.');
      } finally {
        setLoading(false);
      }
    }
    loadYears();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (stage !== 'exam') return;
    timerRef.current = setInterval(() => {
      setTimeRemaining((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleSubmit(true); // auto submit when time runs out
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [stage]);

  async function handleStartExam() {
    if (!selectedYear) {
      Alert.alert('Select year', 'Please select a year to start the exam.');
      return;
    }

    setLoading(true);
    try {
      const data = await getPastExamQuestions(subject.id, selectedYear);
      setQuestions(data.questions || []);
      setAnswers({});
      setCurrentIndex(0);
      setTimeRemaining(EXAM_TIME);
      startTimeRef.current = Date.now();
      setStage('exam');
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not load questions.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(autoSubmit = false) {
    if (submitting) return;

    const unanswered = questions.length - Object.keys(answers).length;

    if (!autoSubmit && unanswered > 0) {
      Alert.alert(
        `${unanswered} unanswered`,
        `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`,
        [
          { text: 'Go back', style: 'cancel' },
          { text: 'Submit', onPress: () => doSubmit() },
        ]
      );
      return;
    }

    doSubmit();
  }

  async function doSubmit() {
    clearInterval(timerRef.current);
    setSubmitting(true);

    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);

    // Format answers for backend
    const answersArray = questions.map((q) => ({
      question_id: q.id,
      selected:    answers[q.id] || '',
    }));

    try {
      const data = await submitPastExam(
        subject.id,
        selectedYear,
        answersArray,
        timeTaken
      );
      setResult(data);
      setStage('result');
    } catch (err) {
      Alert.alert('Error', 'Could not submit exam. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleAnswer(questionId, option) {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  }

  async function handleBookmark(questionId) {
    if (!questionId || bookmarked[questionId]) return;
    try {
      await addBookmark(questionId);
      setBookmarked((prev) => ({ ...prev, [questionId]: true }));
    } catch (err) {
      Alert.alert('Bookmark failed', err.message || 'Could not save this question.');
    }
  }

  const currentQuestion  = questions[currentIndex];
  const answeredCount    = Object.keys(answers).length;
  const timerIsLow       = timeRemaining <= 60;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SETUP STAGE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (stage === 'setup') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Past Questions</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.setupCard}>
            <SubjectBadge name={subject?.name} size="lg" style={styles.subjectBadge} />
            <Text style={styles.subjectName}>{subject?.name}</Text>
            <Text style={styles.setupDesc}>
              Select a year to practice past JAMB questions.
              Your answers will be marked automatically.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Select Year</Text>

          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} />
          ) : yearsError ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{yearsError}</Text>
            </View>
          ) : years.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No past questions available for {subject?.name} yet.
              </Text>
            </View>
          ) : (
            <View style={styles.yearsGrid}>
              {years.map((y) => (
                <TouchableOpacity
                  key={y.year}
                  style={[
                    styles.yearCard,
                    selectedYear === y.year && styles.yearCardSelected,
                  ]}
                  onPress={() => setSelectedYear(y.year)}
                >
                  <Text style={[
                    styles.yearText,
                    selectedYear === y.year && styles.yearTextSelected,
                  ]}>
                    {y.year}
                  </Text>
                  <Text style={[
                    styles.yearCount,
                    selectedYear === y.year && styles.yearCountSelected,
                  ]}>
                    {y.question_count} questions
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {selectedYear && (
            <TouchableOpacity
              style={[styles.startBtn, loading && styles.startBtnDisabled]}
              onPress={handleStartExam}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={COLORS.textWhite} />
                : <Text style={styles.startBtnText}>
                    Start {selectedYear} Exam →
                  </Text>
              }
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // EXAM STAGE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (stage === 'exam') {
    return (
      <SafeAreaView style={styles.container}>
        {/* Exam header */}
        <View style={styles.examHeader}>
          <View>
            <Text style={styles.examSubject}>{subject?.name}</Text>
            <Text style={styles.examYear}>JAMB {selectedYear}</Text>
          </View>
          <View style={[styles.timerBox, timerIsLow && styles.timerBoxLow]}>
            <Text style={[styles.timerText, timerIsLow && styles.timerTextLow]}>
              {formatTime(timeRemaining)}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[
            styles.progressFill,
            { width: `${(answeredCount / questions.length) * 100}%` },
          ]} />
        </View>
        <Text style={styles.progressText}>
          Answered {answeredCount} of {questions.length}
        </Text>

        <ScrollView contentContainerStyle={styles.scroll}>
          {currentQuestion && (
            <View>
              <View style={styles.questionTopRow}>
                <Text style={styles.questionNumber}>
                  Question {currentIndex + 1} of {questions.length}
                </Text>
                <TouchableOpacity onPress={() => handleBookmark(currentQuestion.id)}>
                  <Text style={styles.bookmarkText}>
                    {bookmarked[currentQuestion.id] ? 'Saved' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.questionText}>
                {currentQuestion.question}
              </Text>

              {Object.entries(currentQuestion.options || {}).map(([key, val]) => {
                const isSelected = answers[currentQuestion.id] === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => handleAnswer(currentQuestion.id, key)}
                  >
                    <View style={[
                      styles.optionKey,
                      isSelected && styles.optionKeySelected,
                    ]}>
                      <Text style={[
                        styles.optionKeyText,
                        isSelected && styles.optionKeyTextSelected,
                      ]}>
                        {key}
                      </Text>
                    </View>
                    <Text style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                    ]}>
                      {val}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Navigation */}
              <View style={styles.navRow}>
                <TouchableOpacity
                  style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
                  onPress={() => setCurrentIndex((i) => Math.max(i - 1, 0))}
                  disabled={currentIndex === 0}
                >
                  <Text style={styles.navBtnText}>← Prev</Text>
                </TouchableOpacity>

                {currentIndex === questions.length - 1 ? (
                  <TouchableOpacity
                    style={[styles.navBtn, styles.submitBtn]}
                    onPress={() => handleSubmit(false)}
                    disabled={submitting}
                  >
                    {submitting
                      ? <ActivityIndicator color={COLORS.primary} size="small" />
                      : <Text style={styles.submitBtnText}>Submit Exam</Text>
                    }
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.navBtn}
                    onPress={() => setCurrentIndex((i) =>
                      Math.min(i + 1, questions.length - 1)
                    )}
                  >
                    <Text style={styles.navBtnText}>Next →</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Question grid */}
              <View style={styles.questionGrid}>
                {questions.map((q, idx) => {
                  const isAnswered = Boolean(answers[q.id]);
                  const isActive   = idx === currentIndex;
                  return (
                    <TouchableOpacity
                      key={q.id}
                      style={[
                        styles.gridBox,
                        isAnswered && styles.gridBoxAnswered,
                        isActive   && styles.gridBoxActive,
                      ]}
                      onPress={() => setCurrentIndex(idx)}
                    >
                      <Text style={[
                        styles.gridBoxText,
                        isAnswered && styles.gridBoxTextAnswered,
                        isActive   && styles.gridBoxTextActive,
                      ]}>
                        {idx + 1}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RESULT STAGE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (stage === 'result' && result) {
    const percent = result.percent || 0;
    const color   = percent >= 80
      ? COLORS.correct
      : percent >= 50
      ? COLORS.accent
      : COLORS.wrong;

    const motivation = percent >= 80
      ? 'Excellent! Ka yi kyau sosai! You are ready for JAMB!'
      : percent >= 50
      ? 'Good effort! Sai haka! Review the corrections and try again.'
      : 'Kada ka damu! Go through the corrections carefully and try again.';

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>

          {/* Score card */}
          <View style={styles.scoreCard}>
            <Text style={styles.scoreTitle}>
              {subject?.name} — JAMB {selectedYear}
            </Text>
            <View style={[styles.scoreBig, { borderColor: color }]}>
              <Text style={[styles.scoreNumber, { color }]}>
                {result.score}/{result.total}
              </Text>
              <Text style={[styles.scorePercent, { color }]}>{percent}%</Text>
            </View>
            <Text style={styles.motivation}>{motivation}</Text>
          </View>

          {/* Corrections */}
          <Text style={styles.sectionTitle}>Corrections</Text>
          {(result.results || []).map((item, index) => (
            <View
              key={index}
              style={[
                styles.correctionCard,
                item.is_correct
                  ? styles.correctionCorrect
                  : styles.correctionWrong,
              ]}
            >
              <Text style={styles.correctionNumber}>Q{index + 1}</Text>
              <Text style={styles.correctionQuestion}>{item.question}</Text>

              <Text style={item.is_correct ? styles.answerCorrect : styles.answerWrong}>
                Your answer: {item.selected
                  ? `${item.selected}. ${item.options?.[item.selected] || ''}`
                  : 'Not answered'}
              </Text>

              {!item.is_correct && (
                <Text style={styles.answerCorrect}>
                  Correct: {item.correct}. {item.options?.[item.correct] || ''}
                </Text>
              )}

              {item.explanation ? (
                <Text style={styles.explanation}>{item.explanation}</Text>
              ) : null}
              {item.question_id ? (
                <TouchableOpacity onPress={() => handleBookmark(item.question_id)}>
                  <Text style={styles.bookmarkText}>
                    {bookmarked[item.question_id] ? 'Saved' : 'Bookmark this question'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}

          {/* Action buttons */}
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setStage('setup');
              setResult(null);
              setAnswers({});
            }}
          >
            <Text style={styles.retryBtnText}>Try Another Year</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backBtnText}>Back to Subjects</Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection:    'row',
    justifyContent:   'space-between',
    alignItems:       'center',
    paddingHorizontal: 16,
    paddingVertical:   12,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  backText: {
    color:      COLORS.primary,
    fontWeight: '700',
    fontSize:   14,
  },
  headerTitle: {
    fontSize:   18,
    fontWeight: '800',
    color:      COLORS.primary,
  },
  scroll: {
    padding:       16,
    paddingBottom: 40,
  },
  setupCard: {
    backgroundColor: COLORS.primary,
    borderRadius:    20,
    padding:         24,
    alignItems:      'center',
    marginBottom:    24,
  },
  subjectBadge: {
    marginBottom: 12,
  },
  subjectName: {
    fontSize:     20,
    fontWeight:   '800',
    color:        COLORS.textWhite,
    marginBottom: 8,
  },
  setupDesc: {
    fontSize:   13,
    color:      COLORS.textLight,
    textAlign:  'center',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize:     16,
    fontWeight:   '800',
    color:        COLORS.primary,
    marginBottom: 12,
  },
  emptyState: {
    alignItems:     'center',
    paddingVertical: 40,
    gap:             12,
  },
  emptyText: {
    color:     COLORS.textMuted,
    textAlign: 'center',
    fontSize:  14,
  },
  yearsGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           10,
    marginBottom:  20,
  },
  yearCard: {
    width:           '47%',
    backgroundColor: COLORS.surface,
    borderRadius:    14,
    padding:         16,
    alignItems:      'center',
    borderWidth:     1.5,
    borderColor:     COLORS.border,
  },
  yearCardSelected: {
    backgroundColor: COLORS.primary,
    borderColor:     COLORS.primary,
  },
  yearText: {
    fontSize:   22,
    fontWeight: '800',
    color:      COLORS.primary,
  },
  yearTextSelected: {
    color: COLORS.textWhite,
  },
  yearCount: {
    fontSize:  12,
    color:     COLORS.textMuted,
    marginTop: 4,
  },
  yearCountSelected: {
    color: COLORS.textLight,
  },
  startBtn: {
    backgroundColor: COLORS.accent,
    borderRadius:    30,
    paddingVertical: 16,
    alignItems:      'center',
    marginTop:       8,
  },
  startBtnDisabled: {
    backgroundColor: COLORS.disabled,
  },
  startBtnText: {
    color:      COLORS.primary,
    fontWeight: '800',
    fontSize:   16,
  },
  examHeader: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: 16,
    paddingVertical:   12,
    backgroundColor:   COLORS.primary,
  },
  examSubject: {
    fontSize:   14,
    fontWeight: '700',
    color:      COLORS.textWhite,
  },
  examYear: {
    fontSize:  12,
    color:     COLORS.textLight,
    marginTop: 2,
  },
  timerBox: {
    backgroundColor: COLORS.selected,
    borderRadius:    20,
    paddingVertical:   6,
    paddingHorizontal: 12,
  },
  timerBoxLow: {
    backgroundColor: COLORS.wrongBg,
  },
  timerText: {
    fontSize:   14,
    fontWeight: '800',
    color:      COLORS.primary,
  },
  timerTextLow: {
    color: COLORS.wrong,
  },
  progressBar: {
    height:          6,
    backgroundColor: COLORS.border,
  },
  progressFill: {
    height:          6,
    backgroundColor: COLORS.correct,
  },
  progressText: {
    fontSize:  11,
    color:     COLORS.textLight,
    textAlign: 'center',
    padding:   6,
  },
  questionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  questionNumber: {
    fontSize:     12,
    color:        COLORS.textMuted,
    fontWeight:   '700',
  },
  bookmarkText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 12,
    marginTop: 8,
  },
  questionText: {
    fontSize:     16,
    fontWeight:   '700',
    color:        COLORS.textPrimary,
    lineHeight:   24,
    marginBottom: 16,
  },
  option: {
    flexDirection:    'row',
    alignItems:       'center',
    backgroundColor:  COLORS.surface,
    borderRadius:     12,
    padding:          12,
    marginBottom:     8,
    borderWidth:      1,
    borderColor:      COLORS.border,
    gap:              12,
  },
  optionSelected: {
    backgroundColor: COLORS.selected,
    borderColor:     COLORS.secondary,
  },
  optionKey: {
    width:           32,
    height:          32,
    borderRadius:    16,
    backgroundColor: COLORS.border,
    alignItems:      'center',
    justifyContent:  'center',
  },
  optionKeySelected: {
    backgroundColor: COLORS.primary,
  },
  optionKeyText: {
    fontSize:   13,
    fontWeight: '800',
    color:      COLORS.textMuted,
  },
  optionKeyTextSelected: {
    color: COLORS.textWhite,
  },
  optionText: {
    flex:     1,
    fontSize: 14,
    color:    COLORS.textPrimary,
  },
  optionTextSelected: {
    color:      COLORS.primary,
    fontWeight: '600',
  },
  navRow: {
    flexDirection:  'row',
    gap:            10,
    marginTop:      16,
    marginBottom:   16,
  },
  navBtn: {
    flex:            1,
    backgroundColor: COLORS.primary,
    borderRadius:    30,
    paddingVertical: 14,
    alignItems:      'center',
  },
  navBtnDisabled: {
    backgroundColor: COLORS.disabled,
  },
  navBtnText: {
    color:      COLORS.textWhite,
    fontWeight: '800',
  },
  submitBtn: {
    backgroundColor: COLORS.accent,
  },
  submitBtnText: {
    color:      COLORS.primary,
    fontWeight: '900',
  },
  questionGrid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:            6,
    justifyContent: 'center',
    marginTop:      8,
  },
  gridBox: {
    width:           36,
    height:          36,
    borderRadius:    8,
    backgroundColor: COLORS.surface,
    borderWidth:     1,
    borderColor:     COLORS.border,
    alignItems:      'center',
    justifyContent:  'center',
  },
  gridBoxAnswered: {
    backgroundColor: COLORS.primary,
    borderColor:     COLORS.primary,
  },
  gridBoxActive: {
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  gridBoxText: {
    fontSize:   11,
    fontWeight: '700',
    color:      COLORS.textMuted,
  },
  gridBoxTextAnswered: {
    color: COLORS.textWhite,
  },
  gridBoxTextActive: {
    color: COLORS.accent,
  },
  scoreCard: {
    backgroundColor: COLORS.surface,
    borderRadius:    20,
    padding:         24,
    alignItems:      'center',
    marginBottom:    24,
    borderWidth:     1,
    borderColor:     COLORS.border,
  },
  scoreTitle: {
    fontSize:     14,
    fontWeight:   '700',
    color:        COLORS.textMuted,
    marginBottom: 16,
    textAlign:    'center',
  },
  scoreBig: {
    borderWidth:   3,
    borderRadius:  60,
    width:         120,
    height:        120,
    alignItems:    'center',
    justifyContent:'center',
    marginBottom:  16,
  },
  scoreNumber: {
    fontSize:   24,
    fontWeight: '900',
  },
  scorePercent: {
    fontSize:   16,
    fontWeight: '700',
  },
  motivation: {
    fontSize:   14,
    color:      COLORS.textMuted,
    textAlign:  'center',
    lineHeight: 22,
  },
  correctionCard: {
    borderRadius:  12,
    padding:       14,
    marginBottom:  10,
    borderWidth:   1,
  },
  correctionCorrect: {
    backgroundColor: COLORS.correctBg,
    borderColor:     COLORS.correct,
  },
  correctionWrong: {
    backgroundColor: COLORS.wrongBg,
    borderColor:     COLORS.wrong,
  },
  correctionNumber: {
    fontSize:     11,
    fontWeight:   '700',
    color:        COLORS.textMuted,
    marginBottom: 4,
  },
  correctionQuestion: {
    fontSize:     14,
    fontWeight:   '700',
    color:        COLORS.textPrimary,
    lineHeight:   20,
    marginBottom: 8,
  },
  answerCorrect: {
    fontSize:   13,
    fontWeight: '600',
    color:      COLORS.correct,
    marginTop:  4,
  },
  answerWrong: {
    fontSize:   13,
    fontWeight: '600',
    color:      COLORS.wrong,
    marginTop:  4,
  },
  explanation: {
    fontSize:   12,
    color:      COLORS.textMuted,
    lineHeight: 18,
    marginTop:  8,
    fontStyle:  'italic',
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius:    30,
    paddingVertical: 14,
    alignItems:      'center',
    marginBottom:    10,
  },
  retryBtnText: {
    color:      COLORS.textWhite,
    fontWeight: '800',
    fontSize:   15,
  },
  backBtn: {
    backgroundColor: COLORS.surface,
    borderRadius:    30,
    paddingVertical: 14,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     COLORS.border,
  },
  backBtnText: {
    color:      COLORS.textMuted,
    fontWeight: '700',
    fontSize:   15,
  },
});