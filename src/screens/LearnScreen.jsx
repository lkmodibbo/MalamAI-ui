import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useSRS from '../hooks/useSRS';
import useWeaknessTracker from '../hooks/useWeaknessTracker';
import useNotes from '../hooks/useNotes';
import FlashcardScreen from './FlashcardScreen';
import { callGrok, parseQuestionJson, normalizeQuestionList, isQuotaError } from '../services/grok';
import { getMode, getSystemPrompt } from '../hooks/useLanguageMode';
import { COLORS } from '../constants/colors';
import { getQuestionsFromDB, gradeQuiz } from '../services/apiService';
import { markTopicVisited } from '../hooks/useSetupProgress';
import SubjectBadge from '../components/SubjectBadge';

// Using Grok API for generating learning content.
// The API key and endpoint must come from environment variables.
// If credentials are missing, callGrok will throw a clear error.

const QUOTA_ERROR_MESSAGE = 'Grok quota is exhausted right now. Please try fetching the questions again soon.';
const QUIZ_TIME_SECONDS = 5 * 60;
const QUESTION_COUNT = 5;

function getMotivation(score, total) {
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;

  if (percent >= 80) return 'Excellent work. Ka yi kyau sosai! Keep revising and you will enter that exam with confidence.';
  if (percent >= 50) return 'Nice progress. Sai haka! Review the missed questions and you will improve fast.';
  return 'Good effort. Kada ka damu. Go through the corrections slowly, then try again with fresh energy.';
}

function getFallbackExplanation(subject, topic) {
  const subjectName = subject?.name || 'this subject';
  const focus = topic || subjectName;

  return `Grok quota is exhausted right now, so here is a quick offline note.\n\n${focus} is an important part of ${subjectName}. Start by learning the key meaning, then practise one small example before answering questions. Read each question carefully, remove options that are clearly wrong, and choose the best answer.\n\nReady to test yourself?`;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

export default function LearnScreen({ route, navigation }) {
  const { subject, topic: initialTopic } = route.params || {};
  const topic = initialTopic || null;

  const [mode, setMode] = useState('learn');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);

  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const { saveMissedQuestions } = useSRS();
  const { logWrongAnswer } = useWeaknessTracker();
  const { saveNote, getNote } = useNotes();
  const [noteText, setNoteText] = useState('');
  const [noteStatus, setNoteStatus] = useState('');

  // FIX 2: loadingQuestion is now also used as the fetchQuestions guard (replaces the
  // questions.length check that prevented retrying after a failed fetch).
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState('');

  // FIX 3: Timer starts as null. It only becomes a number once questions have loaded,
  // so students don't lose time while the spinner is showing.
  const [timeRemaining, setTimeRemaining] = useState(null);
  const submittedRef = useRef(false);

  const maxQuestions = QUESTION_COUNT;
  const currentQuestion = questions[currentQuestionIndex] || null;
  const selectedAnswer = selectedAnswers[currentQuestionIndex];
  const answeredCount = Object.keys(selectedAnswers).length;
  const timerIsLow = timeRemaining !== null && timeRemaining <= 60;
  const timerRunning = mode === 'practice' && timeRemaining !== null && !submittedRef.current;

  // FIX 4: fetchExplanation is wrapped in useCallback so it can be safely listed in the
  // useEffect dependency array, preventing the stale-closure lint warning.
  const fetchExplanation = useCallback(async () => {
    setLoading(true);
    try {
      const subjectName = subject?.name || 'this subject';
      const learnTopic = topic || subjectName;
      const languageMode = await getMode();
      const systemPrompt = getSystemPrompt(languageMode);

      const learnPrompt = `
        ${systemPrompt}

        Explain the topic "${learnTopic}" in simple terms, using relatable Nigerian examples.
        Keep the language style appropriate for a JAMB student. End the explanation with the phrase:
        Ready to test yourself?

        - Use short paragraphs, not walls of text.
        - Use relatable Nigerian examples (markets, farms, local contexts, everyday life).
        - Teach at SS2/SS3 level, not university level. Keep it simple and clear.
        - End with "Ready to test yourself?" to encourage the student to practise.
      `;
      const text = await callGrok(learnPrompt);
      setExplanation(typeof text === 'string' ? text : JSON.stringify(text));
      markTopicVisited(); // track progress milestone
    } catch (err) {
      console.error('[fetchExplanation]', err);

      if (isQuotaError(err)) {
        const retryText = err.retryDelay
          ? ` You can retry Grok in about ${err.retryDelay} seconds.`
          : '';
        setExplanation(`${getFallbackExplanation(subject, topic)}\n\n${retryText}`);
        return;
      }

      setExplanation('Sorry — could not get explanation. Please try again later.');
      Alert.alert('Error', err.message || 'Failed to fetch explanation.');
    } finally {
      setLoading(false);
    }
  }, [subject, topic]);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    fetchExplanation();
  }, [fetchExplanation, navigation]);

  useEffect(() => {
    let mounted = true;
    async function loadNote() {
      if (!subject?.id) {
        setNoteText('');
        return;
      }

      try {
        const existing = await getNote(subject, topic || subject.name);
        if (mounted) {
          setNoteText(existing?.note || '');
        }
      } catch (err) {
        console.warn('[LearnScreen] load note failed', err);
      }
    }

    loadNote();
    return () => { mounted = false; };
  }, [subject, topic, getNote]);

  // FIX 3 (continued): Timer only ticks when timeRemaining is a real number.
  useEffect(() => {
    if (!timerRunning) return undefined;

    const timer = setInterval(() => {
      setTimeRemaining((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timerRunning]);

  useEffect(() => {
    if (mode === 'practice' && timeRemaining === 0 && !submittedRef.current) {
      handleSubmitQuiz();
    }
  }, [mode, timeRemaining]);

  // FIX 2 (continued): Guard is now loadingQuestion instead of questions.length,
  // so retrying after a failed fetch works correctly.
 async function fetchQuestions() {
  if (loadingQuestion) return;

  setLoadingQuestion(true);
  setQuestionError('');

  try {
    const subjectName  = subject?.name || 'this subject';
    const practiceTopic = topic || subjectName;
    let   nextQuestions = [];

    // STEP 1 — Try to get questions from your backend database first
    if (subject?.id) {
      console.log('[fetchQuestions] trying database first...');
      const dbQuestions = await getQuestionsFromDB(
        subject.id,
        practiceTopic,
        maxQuestions
      );
      if (dbQuestions.length >= maxQuestions) {
        console.log(`[fetchQuestions] got ${dbQuestions.length} from database`);
        nextQuestions = dbQuestions.slice(0, maxQuestions);
      }
    }

    // STEP 2 — Fall back to Groq if database has no questions
    if (nextQuestions.length < maxQuestions) {
      console.log('[fetchQuestions] database empty — using Groq AI...');
      const languageMode  = await getMode();
      const systemPrompt  = getSystemPrompt(languageMode);
      const practicePrompt = `
        ${systemPrompt}
          Generate exactly ${maxQuestions} unique JAMB-style MCQ questions
          on "${practiceTopic}" in "${subjectName}".
          Return valid JSON only — no markdown.
          Format: { "questions": [{ "question":"","options":{"A":"","B":"","C":"","D":""},"answer":"A","explanation":"" }] }
        `;
        const text     = await callGrok(practicePrompt);
        const parsed   = parseQuestionJson(String(text));
        nextQuestions  = normalizeQuestionList(parsed, maxQuestions);
        // AI questions stay session-local. Writing them into the shared bank is
        // an admin action — students must not invent global content.
      }

    setQuestions(nextQuestions);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setTimeRemaining(QUIZ_TIME_SECONDS);

  } catch (err) {
    console.error('[fetchQuestions]', err);
    if (isQuotaError(err)) {
      setQuestionError(err.retryDelay
        ? `${QUOTA_ERROR_MESSAGE} Retry in ${err.retryDelay}s.`
        : QUOTA_ERROR_MESSAGE);
      return;
    }
    setQuestionError(err.message || 'Failed to fetch questions.');
    Alert.alert('Error', 'Failed to fetch questions. Please try again.');
  } finally {
    setLoadingQuestion(false);
  }
}

  function startPractice() {
    if (questions.length === 0 && Object.keys(selectedAnswers).length === 0) {
      submittedRef.current = false;
      // FIX 3 (continued): Don't reset timer here; it resets inside fetchQuestions on success.
    }

    setMode('practice');
    if (questions.length !== maxQuestions) fetchQuestions();
  }

  function handleAnswer(choice) {
    setSelectedAnswers((answers) => ({
      ...answers,
      [currentQuestionIndex]: choice,
    }));
  }

  function handlePrevQuestion() {
    setCurrentQuestionIndex((index) => Math.max(index - 1, 0));
  }

  function handleNextQuestion() {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= maxQuestions) return;
    setCurrentQuestionIndex(nextIndex);
  }

async function handleSubmitQuiz() {
    if (submittedRef.current) return;
    submittedRef.current = true;

    if (questions.length !== maxQuestions) {
      submittedRef.current = false;
      setQuestionError(`Please fetch all ${maxQuestions} AI questions before submitting.`);
      setMode('practice');
      return;
    }

    let review;
    let finalScore;

    // Banked questions no longer ship answers — grade them on the server.
    // AI-generated questions still include answers from the model and are graded locally.
    const banked = questions.every((item) => item?.id);
    if (banked) {
      try {
        const payload = questions.map((item, index) => ({
          question_id: item.id,
          selected: selectedAnswers[index] || '',
        }));
        const graded = await gradeQuiz(payload);
        review = (graded.review || []).map((item) => ({
          id: item.id,
          question: item.question,
          options: item.options,
          answer: item.answer,
          selected: item.selected,
          explanation: item.explanation,
          isCorrect: Boolean(item.isCorrect),
        }));
        finalScore = graded.score ?? review.filter((item) => item.isCorrect).length;
      } catch (err) {
        submittedRef.current = false;
        Alert.alert('Grading failed', err.message || 'Could not grade this quiz. Please try again.');
        return;
      }
    } else {
      review = questions.map((item, index) => {
        const selected = selectedAnswers[index] || '';
        const correct = item.answer?.trim().toUpperCase();

        return {
          id: item.id || null,
          question: item.question,
          options: item.options,
          answer: correct,
          selected,
          explanation: item.explanation,
          isCorrect: Boolean(correct) && selected.trim().toUpperCase() === correct,
        };
      });
      finalScore = review.filter((item) => item.isCorrect).length;
    }

    const weakTopics = review.some((item) => !item.isCorrect)
      ? [topic || subject?.name || 'Practice']
      : [];

    // Use graded answers so SRS still records the correct option for banked questions.
    const questionsForSrs = review.map((item, index) => ({
      ...(questions[index] || {}),
      question: item.question || questions[index]?.question,
      options: item.options || questions[index]?.options,
      answer: item.answer,
      explanation: item.explanation,
      id: item.id ?? questions[index]?.id,
    }));

    try {
      await saveMissedQuestions(questionsForSrs, selectedAnswers, topic, subject?.id);
    } catch (err) {
      console.warn('[saveMissedQuestions]', err);
    }

    try {
      const wrongItems = review.filter((item) => !item.isCorrect);
      await Promise.all(
        wrongItems.map((item) =>
          logWrongAnswer(
            topic || subject?.name || 'Practice',
            { id: subject?.id, name: subject?.name },
            item.question
          )
        )
      );
    } catch (err) {
      console.warn('[logWrongAnswer]', err);
    }

    navigation.replace('Score', {
      score: finalScore,
      total: maxQuestions,
      weakTopics,
      review,
      motivation: getMotivation(finalScore, maxQuestions),
      subjectId:   subject?.id   || null,
      topicName:   topic         || subject?.name || null,
      timeTaken:   QUIZ_TIME_SECONDS - (timeRemaining || 0),
    });
  }

  async function handleSaveNote() {
    if (!subject?.id) {
      Alert.alert('Missing subject', 'Unable to save note because the subject is missing.');
      return;
    }

    // Fall back to subject name if no specific topic was passed
    const noteKey = topic || subject.name;

    try {
      await saveNote(
        { id: subject.id, name: subject.name },
        noteKey,
        noteText
      );
      setNoteStatus('Saved');
    } catch (error) {
      console.warn('[LearnScreen] save note failed', error);
      Alert.alert('Save failed', 'Unable to save your note. Please try again.');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ color: COLORS.accent }}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <SubjectBadge name={subject?.name} size="sm" />
          <Text style={styles.headerTitle}>{subject?.name}</Text>
        </View>
      </View>

      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'learn' && styles.modeActive]}
          onPress={() => { setMode('learn'); fetchExplanation(); }}
        >
          <Text style={mode === 'learn' ? styles.modeActiveText : styles.modeText}>Learn</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'flashcards' && styles.modeActive]}
          onPress={() => setMode('flashcards')}
        >
          <Text style={mode === 'flashcards' ? styles.modeActiveText : styles.modeText}>Flashcards</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'practice' && styles.modeActive]}
          onPress={startPractice}
        >
          <Text style={mode === 'practice' ? styles.modeActiveText : styles.modeText}>Practice</Text>
        </TouchableOpacity>
      </View>

      {/* FIX 3 (continued): Only render the timer once it has a real value */}
      {mode === 'practice' && timeRemaining !== null ? (
        <View style={styles.timerRow}>
          <Text style={[styles.timerText, timerIsLow && styles.timerTextLow]}>
            {formatTime(timeRemaining)}
          </Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {mode === 'learn' && (
          <View>
            {loading
              ? <ActivityIndicator size="large" color={COLORS.primary} />
              : <Text style={styles.explanationText}>{explanation}</Text>
            }

            <View style={styles.notesCard}>
              <Text style={styles.notesHeader}>My notes</Text>
              <TextInput
                style={styles.notesInput}
                value={noteText}
                onChangeText={(text) => { setNoteText(text); setNoteStatus(''); }}
                placeholder="Write your own notes here…"
                placeholderTextColor={COLORS.textLight}
                multiline
                textAlignVertical="top"
              />
              <View style={styles.notesFooter}>
                <Text style={styles.noteStatus}>{noteStatus}</Text>
                <TouchableOpacity
                  style={[styles.saveNoteBtn, noteStatus === 'Saved' && styles.saveNoteBtnSaved]}
                  onPress={handleSaveNote}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveNoteText}>{noteStatus === 'Saved' ? '✓ Saved' : 'Save note'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.cta} onPress={startPractice}>
              <Text style={styles.ctaText}>Ready to test yourself? Start Practice</Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === 'flashcards' && (
          <FlashcardScreen subject={subject} topic={topic} startPractice={startPractice} />
        )}

        {mode === 'practice' && (
          <View>
            {loadingQuestion ? (
              <ActivityIndicator size="large" color={COLORS.primary} />
            ) : questionError ? (
              <View>
                <Text style={styles.errorText}>{questionError}</Text>
                <TouchableOpacity style={styles.cta} onPress={fetchQuestions}>
                  <Text style={styles.ctaText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : currentQuestion ? (
              <View>
                <Text style={styles.progressText}>
                  Question {currentQuestionIndex + 1}/{maxQuestions}{'  '}Answered: {answeredCount}/{maxQuestions}
                </Text>
                <Text style={styles.qText}>{currentQuestion.question}</Text>
                {Object.entries(currentQuestion.options || {}).map(([key, val]) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.option, selectedAnswer === key && styles.optionSelected]}
                    onPress={() => handleAnswer(key)}
                  >
                    <Text style={styles.optionText}>{key}. {val}</Text>
                  </TouchableOpacity>
                ))}
                <View style={styles.navRow}>
                  <TouchableOpacity
                    style={[styles.navBtn, currentQuestionIndex === 0 && styles.navBtnDisabled]}
                    onPress={handlePrevQuestion}
                    disabled={currentQuestionIndex === 0}
                  >
                    <Text style={styles.navBtnText}>Prev</Text>
                  </TouchableOpacity>

                  {currentQuestionIndex === maxQuestions - 1 ? (
                    <TouchableOpacity style={[styles.navBtn, styles.submitBtn]} onPress={handleSubmitQuiz}>
                      <Text style={styles.submitBtnText}>Submit</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.navBtn} onPress={handleNextQuestion}>
                      <Text style={styles.navBtnText}>Next</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.questionGrid}>
                  {Array.from({ length: maxQuestions }, (_, index) => {
                    const isAnswered = Boolean(selectedAnswers[index]);
                    const isActive = index === currentQuestionIndex;

                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.questionBox,
                          isAnswered && styles.questionBoxAnswered,
                          isActive && styles.questionBoxActive,
                        ]}
                        onPress={() => setCurrentQuestionIndex(index)}
                      >
                        <Text style={[
                          styles.questionBoxText,
                          isAnswered && styles.questionBoxTextAnswered,
                          isActive && styles.questionBoxTextActive,
                        ]}>
                          {index + 1}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : (
              <Text>No questions yet. Tap Practice to start.</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minHeight: 48,
  },
  backBtn: {
    position: 'absolute',
    left: 12,
    top: 10,
    zIndex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 64,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
    flexShrink: 1,
  },
  timerRow: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  timerText: {
    color: COLORS.timerNormal,
    fontWeight: '900',
    backgroundColor: COLORS.selected,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  timerTextLow: {
    color: COLORS.timerLow,
    backgroundColor: COLORS.timerBgLow,
  },
  modeRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 30,
    backgroundColor: COLORS.border,
    alignItems: 'center',
  },
  modeActive: {
    backgroundColor: COLORS.primary,
  },
  modeText: {
    color: COLORS.secondary,
    fontWeight: '700',
  },
  modeActiveText: {
    color: COLORS.textWhite,
    fontWeight: '700',
  },
  explanationText: {
    color: COLORS.textPrimary,
    lineHeight: 22,
    fontSize: 16,
  },
  notesCard: {
    marginTop: 18,
    backgroundColor: COLORS.background,
    borderRadius: 18,
    padding: 16,
  },
  notesHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 10,
  },
  notesInput: {
    minHeight: 110,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    color: COLORS.textPrimary,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  notesFooter: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteStatus: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  saveNoteBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  saveNoteBtnSaved: {
    backgroundColor: '#27ae60',
  },
  saveNoteText: {
    color: COLORS.textWhite,
    fontWeight: '800',
  },
  cta: {
    marginTop: 16,
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  ctaText: {
    color: COLORS.textWhite,
    fontWeight: '800',
  },
  qText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: COLORS.primary,
  },
  option: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionSelected: {
    backgroundColor: COLORS.selected,
    borderColor: COLORS.secondary,
  },
  optionText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  progressText: {
    color: COLORS.textMuted,
    fontWeight: '700',
    marginBottom: 10,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  navBtn: {
    flex: 0.48,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  navBtnDisabled: {
    backgroundColor: COLORS.disabled,
  },
  navBtnText: {
    color: COLORS.textWhite,
    fontWeight: '800',
  },
  submitBtn: {
    backgroundColor: COLORS.accent,
  },
  submitBtnText: {
    color: COLORS.textWhite,
    fontWeight: '900',
  },
  questionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    justifyContent: 'center',
  },
  questionBox: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
  },
  questionBoxAnswered: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  questionBoxActive: {
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  questionBoxText: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  questionBoxTextAnswered: {
    color: COLORS.textWhite,
  },
  questionBoxTextActive: {
    color: COLORS.accent,
  },
  errorText: {
    color: COLORS.wrong,
    lineHeight: 20,
    marginBottom: 12,
  },
});