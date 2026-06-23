import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { callGrok, getStepByStepPrompt, buildWhyWrongPrompt } from '../src/utils/grok';
import { COLORS } from '../constants/colors';
import { saveQuizAttempt } from '../src/utils/apiService'; // NEW

export default function ScoreScreen({ route, navigation }) {
  const {
    score = 0,
    total = 0,
    weakTopics = [],
    review = [],
    motivation,
    subjectId  = null,  // NEW
    topicName  = null,  // NEW
    timeTaken  = 0,     // NEW
  } = route.params || {};

  const [whyWrongResponses, setWhyWrongResponses]   = useState({});
  const [loadingWhyWrong, setLoadingWhyWrong]       = useState({});
  const [whyWrongErrors, setWhyWrongErrors]         = useState({});
  const [expandedWhyWrong, setExpandedWhyWrong]     = useState({});
  const [saveStatus, setSaveStatus]                 = useState('saving'); // 'saving' | 'saved' | 'error'
  const hasSavedRef = useRef(false); // prevent double save

  // NEW — save quiz attempt to backend when screen loads
  useEffect(() => {
    if (hasSavedRef.current) return;
    hasSavedRef.current = true;

    async function saveAttempt() {
      try {
        await saveQuizAttempt({
          subject_id: subjectId,
          topic_name: topicName,
          score,
          total,
          time_taken: timeTaken,
          // Pass each wrong answer for detailed tracking
          answers: review.map((item) => ({
            question_text: item.question,
            selected:      item.selected   || '',
            correct:       item.answer     || '',
            is_correct:    item.isCorrect,
          })),
        });
        setSaveStatus('saved');
      } catch (err) {
        console.warn('[ScoreScreen] save quiz attempt failed:', err.message);
        setSaveStatus('error');
      }
    }

    saveAttempt();
  }, []);

  const getFeedbackKey = (item, index) => `${item.question}-${index}`;

  const toggleWhyWrong = async (item, index) => {
    const key = getFeedbackKey(item, index);
    const isExpanded = expandedWhyWrong[key];

    if (isExpanded) {
      setExpandedWhyWrong((prev) => ({ ...prev, [key]: false }));
      return;
    }

    setExpandedWhyWrong((prev) => ({ ...prev, [key]: true }));

    if (whyWrongResponses[key] || loadingWhyWrong[key]) return;

    setLoadingWhyWrong((prev) => ({ ...prev, [key]: true }));
    setWhyWrongErrors((prev) => ({ ...prev, [key]: null }));

    try {
      const selectedOption = item.selected || '';
      const correctOption  = item.answer   || '';
      const selectedText   = selectedOption
        ? `${selectedOption}. ${item.options?.[selectedOption] || ''}`
        : 'Not answered';
      const correctText = correctOption
        ? `${correctOption}. ${item.options?.[correctOption] || ''}`
        : 'Not available';

      const prompt = buildWhyWrongPrompt(
        item.question,
        selectedOption,
        selectedText,
        correctOption,
        correctText,
      );

      const text = await callGrok(prompt);
      setWhyWrongResponses((prev) => ({ ...prev, [key]: text }));
    } catch (err) {
      console.warn('[ScoreScreen] fetch why-wrong failed', err);
      setWhyWrongErrors((prev) => ({
        ...prev,
        [key]: 'Could not load feedback. Tap to retry.',
      }));
    } finally {
      setLoadingWhyWrong((prev) => ({ ...prev, [key]: false }));
    }
  };

  const percent       = total > 0 ? Math.round((score / total) * 100) : 0;
  let message         = 'Good effort! Keep practicing to improve.';
  let hausa           = 'Ya yi ƙoƙari! Ci gaba da yin nazari.';

  if (percent >= 80) {
    message = 'Excellent work — you are ready!';
    hausa   = 'Nagode — Ya yi kyau sosai!';
  } else if (percent >= 50) {
    message = 'Nice progress — a bit more practice will help.';
    hausa   = 'Ka yi kyau — kada ka damu, ka ci gaba da karatu.';
  }

  const motivationText = motivation || `${message} ${hausa}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Final Score</Text>

        {/* NEW — small save status indicator */}
        {saveStatus === 'saving' && (
          <View style={styles.saveStatusRow}>
            <ActivityIndicator size="small" color={COLORS.textLight} />
            <Text style={styles.saveStatusText}>Saving your score…</Text>
          </View>
        )}
        {saveStatus === 'saved' && (
          <View style={styles.saveStatusRow}>
            <Text style={styles.saveStatusSaved}>✓ Score saved to your account</Text>
          </View>
        )}
        {saveStatus === 'error' && (
          <View style={styles.saveStatusRow}>
            <Text style={styles.saveStatusError}>
              Could not save score — check your connection
            </Text>
          </View>
        )}

        <View style={styles.scoreBox}>
          <Text style={styles.scoreText}>{score}/{total}</Text>
          <Text style={styles.percentText}>{percent}%</Text>
        </View>

        <Text style={styles.motivation}>{motivationText}</Text>

        {weakTopics && weakTopics.length > 0 && (
          <View style={styles.weakBox}>
            <Text style={styles.sectionTitle}>Weak areas to review</Text>
            {weakTopics.map((t, i) => (
              <Text key={i} style={styles.weakText}>• {t}</Text>
            ))}
          </View>
        )}

        {review.length > 0 && (
          <View style={styles.reviewSection}>
            <Text style={styles.sectionTitle}>Corrections</Text>
            {review.map((item, index) => {
              const selectedText = item.selected
                ? `${item.selected}. ${item.options?.[item.selected] || ''}`
                : 'Not answered';
              const answerText = item.answer
                ? `${item.answer}. ${item.options?.[item.answer] || ''}`
                : 'Not available';

              return (
                <View key={`${item.question}-${index}`} style={styles.reviewCard}>
                  <Text style={styles.reviewNumber}>Question {index + 1}</Text>
                  <Text style={styles.reviewQuestion}>{item.question}</Text>
                  <Text style={item.isCorrect ? styles.correctText : styles.wrongText}>
                    Your answer: {selectedText}
                  </Text>
                  <Text style={styles.correctText}>Correct answer: {answerText}</Text>
                  {item.explanation ? (
                    <Text style={styles.explanation}>{item.explanation}</Text>
                  ) : null}

                  {!item.isCorrect && (
                    <TouchableOpacity
                      style={styles.showWorkingBtn}
                      onPress={() => toggleWhyWrong(item, index)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.showWorkingText}>
                        {expandedWhyWrong[getFeedbackKey(item, index)]
                          ? 'Close ▲'
                          : 'Why did I get this wrong? →'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {expandedWhyWrong[getFeedbackKey(item, index)] && (
                    <View style={styles.feedbackContainer}>
                      {loadingWhyWrong[getFeedbackKey(item, index)] ? (
                        <View style={styles.feedbackLoadingRow}>
                          <ActivityIndicator
                            size="small"
                            color={COLORS.primary}
                            style={styles.feedbackLoader}
                          />
                          <Text style={styles.feedbackLoadingText}>
                            Malam AI is thinking…
                          </Text>
                        </View>
                      ) : whyWrongErrors[getFeedbackKey(item, index)] ? (
                        <Text style={styles.workingError}>
                          {whyWrongErrors[getFeedbackKey(item, index)]}
                        </Text>
                      ) : (
                        whyWrongResponses[getFeedbackKey(item, index)]
                          ?.split('\n')
                          .map((line, idx) => {
                            const trimmed = line.trim();
                            if (!trimmed) return null;
                            let dotStyle = styles.feedbackDotAmber;
                            if (/trap|tempting|wrong/i.test(trimmed))   dotStyle = styles.feedbackDotRed;
                            if (/correct|key|because/i.test(trimmed))   dotStyle = styles.feedbackDotGreen;
                            if (/remember|memory|trick/i.test(trimmed)) dotStyle = styles.feedbackDotAmber;
                            return (
                              <View key={idx} style={styles.feedbackRow}>
                                <View style={[styles.feedbackDot, dotStyle]} />
                                <Text style={styles.feedbackText}>{trimmed}</Text>
                              </View>
                            );
                          })
                      )}
                      <TouchableOpacity
                        style={styles.collapseBtn}
                        onPress={() =>
                          setExpandedWhyWrong((prev) => ({
                            ...prev,
                            [getFeedbackKey(item, index)]: false,
                          }))
                        }
                      >
                        <Text style={styles.collapseText}>Close ▲</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity
          style={styles.btn}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Subjects' })}
        >
          <Text style={styles.btnText}>Study Another Topic</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  // NEW save status styles
  saveStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  saveStatusText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  saveStatusSaved: {
    fontSize: 12,
    color: COLORS.correct,
    fontWeight: '600',
  },
  saveStatusError: {
    fontSize: 12,
    color: COLORS.wrong,
  },
  scoreBox: {
    marginTop: 16,
    backgroundColor: COLORS.surface,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
  },
  scoreText: {
    fontSize: 40,
    fontWeight: '900',
    color: COLORS.primary,
  },
  percentText: {
    marginTop: 8,
    fontSize: 18,
    color: COLORS.textMuted,
  },
  motivation: {
    marginTop: 18,
    color: COLORS.textPrimary,
    lineHeight: 22,
    textAlign: 'center',
    fontSize: 15,
  },
  weakBox: {
    marginTop: 18,
    width: '100%',
  },
  weakText: {
    marginTop: 6,
    color: COLORS.textPrimary,
  },
  sectionTitle: {
    fontWeight: '800',
    color: COLORS.primary,
    fontSize: 16,
    marginBottom: 8,
  },
  reviewSection: {
    width: '100%',
    marginTop: 22,
  },
  reviewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reviewNumber: {
    color: COLORS.primary,
    fontWeight: '800',
    marginBottom: 6,
  },
  reviewQuestion: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 10,
  },
  correctText: {
    color: COLORS.correct,
    fontWeight: '700',
    marginTop: 4,
  },
  wrongText: {
    color: COLORS.wrong,
    fontWeight: '700',
    marginTop: 4,
  },
  explanation: {
    color: COLORS.textMuted,
    lineHeight: 20,
    marginTop: 8,
  },
  showWorkingBtn: {
    alignSelf: 'flex-end',
    marginTop: 12,
  },
  showWorkingText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  feedbackContainer: {
    marginTop: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f0e6bb',
  },
  feedbackLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedbackLoader: {
    marginRight: 10,
  },
  feedbackLoadingText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  feedbackDot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    marginTop: 6,
    marginRight: 10,
  },
  feedbackDotRed:   { backgroundColor: '#d63447' },
  feedbackDotGreen: { backgroundColor: '#1d7d34' },
  feedbackDotAmber: { backgroundColor: COLORS.accent },
  feedbackText: {
    color: COLORS.textPrimary,
    lineHeight: 20,
    flex: 1,
  },
  collapseBtn: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  collapseText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  workingError: {
    color: COLORS.wrong,
    fontWeight: '700',
    lineHeight: 20,
  },
  btn: {
    marginTop: 24,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
  },
  btnText: {
    color: COLORS.textWhite,
    fontWeight: '800',
  },
});