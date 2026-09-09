import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import useSRS from '../hooks/useSRS';

function formatDays(ms) {
  if (ms <= 0) return 'today';
  const days = Math.ceil(ms / 86400000);
  return `${days} day${days === 1 ? '' : 's'}`;
}

export default function ReviewScreen({ navigation }) {
  const { dueQuestions, loading, refreshQueue, markQuestionsReviewed, queue, getQuestionHistory } = useSRS();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => {
    refreshQueue();
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setSubmitted(false);
    setMessage('');
  }, [refreshQueue]));

  const currentQuestion = dueQuestions[currentQuestionIndex] || null;
  const selectedAnswer = selectedAnswers[currentQuestionIndex];
  const answeredCount = Object.keys(selectedAnswers).length;

  useEffect(() => {
    if (submitted) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }).start();
    }
  }, [submitted, scaleAnim]);

  const totalQuestions = dueQuestions.length;

  const nextReviewText = useMemo(() => {
    if (!submitted) return '';
    const futureQueue = queue.filter((item) => item.nextReviewDate > Date.now());
    if (futureQueue.length === 0) return 'Great work! No more review questions for now.';

    const nextDueMs = Math.min(...futureQueue.map((item) => item.nextReviewDate - Date.now()));
    return `Great work! Next review in ${formatDays(nextDueMs)}.`;
  }, [submitted, queue]);

  const handleAnswer = (choice) => {
    if (submitted) return;
    setSelectedAnswers((answers) => ({
      ...answers,
      [currentQuestionIndex]: choice,
    }));
  };

  const handlePrevQuestion = () => {
    setCurrentQuestionIndex((index) => Math.max(index - 1, 0));
  };

  const handleNextQuestion = () => {
    setCurrentQuestionIndex((index) => Math.min(index + 1, totalQuestions - 1));
  };

  const handleSubmitReview = async () => {
    if (submitted || totalQuestions === 0) return;
    setProcessing(true);

    const reviewResults = dueQuestions.map((item, index) => {
      const selected = String(selectedAnswers[index] || '').trim().toUpperCase();
      const correct = String(item.answer || '').trim().toUpperCase();
      return {
        question: item.question,
        isCorrect: selected === correct,
      };
    });

    await markQuestionsReviewed(reviewResults);
    setSubmitted(true);
    setProcessing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#6a3ba8" style={{ marginTop: 32 }} />
      </SafeAreaView>
    );
  }

  if (totalQuestions === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Review</Text>
          </View>
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No review questions due today</Text>
            <Text style={styles.emptySubtitle}>Come back tomorrow or keep practicing to build your SRS queue.</Text>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Subjects')}>
              <Text style={styles.secondaryBtnText}>Go Study</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Review</Text>
        </View>

        <View style={styles.infoBar}>
          <Text style={styles.infoText}>Purple review mode helps you revise due questions only.</Text>
        </View>

        {submitted ? (
          <View style={styles.resultsCard}>
            <Animated.Text style={[styles.checkmark, { transform: [{ scale: scaleAnim }] }]}>✓</Animated.Text>
            <Text style={styles.resultText}>{nextReviewText}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Subjects')}>
              <Text style={styles.primaryBtnText}>Back to Subjects</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.progressText}>Question {currentQuestionIndex + 1}/{totalQuestions}  Answered: {answeredCount}/{totalQuestions}</Text>
            <Text style={styles.questionText}>{currentQuestion.question}</Text>
            {/* Mastery history */}
            {(() => {
              const hist = getQuestionHistory(currentQuestion.question);
              if (!hist) return null;
              const now = Date.now();
              const nextIn = hist.nextReviewDate ? Math.max(0, hist.nextReviewDate - now) : null;
              return (
                <View style={styles.historyCard}>
                  <Text style={styles.historyText}>Last reviewed: {hist.lastReviewed ? new Date(hist.lastReviewed).toLocaleDateString() : '—'}</Text>
                  <Text style={styles.historyText}>Repetitions: {hist.repetitions} · Reviews: {hist.reviewsCount}</Text>
                  <Text style={styles.historyText}>Ease: {hist.ef.toFixed(2)}{nextIn !== null ? ` · Next in ${formatDays(nextIn)}` : ''}</Text>
                </View>
              );
            })()}
            {Object.entries(currentQuestion.options || {}).map(([key, option]) => {
              const isSelected = selectedAnswer === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => handleAnswer(key)}
                >
                  <Text style={styles.optionLabel}>{key}. {option}</Text>
                </TouchableOpacity>
              );
            })}

            <View style={styles.navRow}>
              <TouchableOpacity style={[styles.navBtn, currentQuestionIndex === 0 && styles.navBtnDisabled]} onPress={handlePrevQuestion} disabled={currentQuestionIndex === 0}>
                <Text style={styles.navBtnText}>Prev</Text>
              </TouchableOpacity>
              {currentQuestionIndex === totalQuestions - 1 ? (
                <TouchableOpacity style={[styles.primaryBtn, processing && styles.disabledBtn]} onPress={handleSubmitReview} disabled={processing}>
                  <Text style={styles.primaryBtnText}>{processing ? 'Updating...' : 'Submit Review'}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.navBtn} onPress={handleNextQuestion}>
                  <Text style={styles.navBtnText}>Next</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9f3ff',
  },
  container: {
    padding: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    marginRight: 12,
  },
  backText: {
    color: '#6a3ba8',
    fontWeight: '700',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#5b2d92',
  },
  infoBar: {
    backgroundColor: '#f3e6ff',
    borderLeftWidth: 5,
    borderLeftColor: '#7c3aed',
    padding: 14,
    borderRadius: 16,
    marginBottom: 18,
  },
  infoText: {
    color: '#3c1361',
    fontSize: 14,
    lineHeight: 20,
  },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#efe6ff',
  },
  historyText: { color: '#4a3569', fontSize: 12, marginBottom: 2 },
  progressText: {
    color: '#6a3ba8',
    fontWeight: '700',
    marginBottom: 16,
  },
  questionText: {
    color: '#1f1b36',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    lineHeight: 26,
  },
  option: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e9d7ff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  optionSelected: {
    backgroundColor: '#efe6ff',
    borderColor: '#8b5cf6',
  },
  optionLabel: {
    color: '#3d1c6d',
    fontWeight: '600',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 14,
  },
  navBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d5b3ff',
    alignItems: 'center',
  },
  navBtnDisabled: {
    opacity: 0.5,
  },
  navBtnText: {
    color: '#6a3ba8',
    fontWeight: '700',
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  disabledBtn: {
    opacity: 0.7,
  },
  resultsCard: {
    marginTop: 24,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 26,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  checkmark: {
    fontSize: 54,
    fontWeight: '800',
    color: '#7c3aed',
    marginBottom: 18,
  },
  resultText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3f2d5b',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyState: {
    paddingTop: 80,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#5b2d92',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#4a3569',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    maxWidth: 320,
  },
  secondaryBtn: {
    backgroundColor: '#e9d5ff',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  secondaryBtnText: {
    color: '#6a3ba8',
    fontWeight: '800',
  },
});
