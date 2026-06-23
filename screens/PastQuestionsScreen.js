import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import pastQuestions from '../src/data/pastQuestions.json';

const SUBJECTS = [
  { id: 'english', label: 'English' },
  { id: 'maths', label: 'Maths' },
  { id: 'physics', label: 'Physics' },
  { id: 'chemistry', label: 'Chemistry' },
];
const YEARS = ['2019', '2020', '2021', '2022', '2023'];

function getMotivation(score, total) {
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  if (percent >= 80) return 'Excellent work. Ka yi kyau sosai! Keep revising and you will improve fast.';
  if (percent >= 50) return 'Nice progress. Sai haka! Review the missed questions and you will improve fast.';
  return 'Good effort. Kada ka damu. Go through the corrections slowly, then try again with fresh energy.';
}

export default function PastQuestionsScreen({ navigation }) {
  const [selectedSubject, setSelectedSubject] = useState('english');
  const [selectedYear, setSelectedYear] = useState('2023');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});

  const questions = useMemo(() => {
    return (pastQuestions[selectedSubject]?.[selectedYear] || []).slice(0, 5);
  }, [selectedSubject, selectedYear]);

  const currentQuestion = questions[currentQuestionIndex] || null;
  const selectedAnswer = selectedAnswers[currentQuestionIndex];
  const answeredCount = Object.keys(selectedAnswers).length;
  const totalQuestions = questions.length;

  const handleSelectAnswer = (choice) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: choice,
    }));
  };

  const handleSubmit = () => {
    const review = questions.map((item, index) => {
      const selected = String(selectedAnswers[index] || '').trim().toUpperCase();
      const correct = String(item.answer || '').trim().toUpperCase();
      return {
        question: item.question,
        options: item.options,
        answer: correct,
        selected,
        explanation: item.explanation,
        isCorrect: selected === correct,
      };
    });

    const score = review.filter((item) => item.isCorrect).length;
    const weakTopics = review.some((item) => !item.isCorrect) ? [`${selectedSubject} ${selectedYear}`] : [];

    navigation.replace('Score', {
      score,
      total: totalQuestions,
      weakTopics,
      review,
      motivation: getMotivation(score, totalQuestions),
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Past Questions</Text>
      </View>

      <View style={styles.selectorSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjectRow}>
          {SUBJECTS.map((subject) => {
            const active = subject.id === selectedSubject;
            return (
              <TouchableOpacity
                key={subject.id}
                onPress={() => {
                  setSelectedSubject(subject.id);
                  setCurrentQuestionIndex(0);
                  setSelectedAnswers({});
                }}
                style={[styles.subjectPill, active && styles.subjectPillActive]}
              >
                <Text style={[styles.subjectText, active && styles.subjectTextActive]}>{subject.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.yearRow}>
        {YEARS.map((year) => {
          const active = year === selectedYear;
          return (
            <TouchableOpacity
              key={year}
              onPress={() => {
                setSelectedYear(year);
                setCurrentQuestionIndex(0);
                setSelectedAnswers({});
              }}
              style={[styles.yearBtn, active && styles.yearBtnActive]}
            >
              <Text style={[styles.yearText, active && styles.yearTextActive]}>{year}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {questions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No past questions available.</Text>
            <Text style={styles.emptySubtitle}>Try a different subject or year.</Text>
          </View>
        ) : (
          <View>
            <Text style={styles.progressText}>Question {currentQuestionIndex + 1}/{totalQuestions}  Answered: {answeredCount}/{totalQuestions}</Text>
            <Text style={styles.questionText}>{currentQuestion?.question}</Text>
            {currentQuestion && Object.entries(currentQuestion.options || {}).map(([key, value]) => {
              const isSelected = selectedAnswer === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => handleSelectAnswer(key)}
                >
                  <Text style={styles.optionText}>{key}. {value}</Text>
                </TouchableOpacity>
              );
            })}
            <View style={styles.navRow}>
              <TouchableOpacity
                style={[styles.navBtn, currentQuestionIndex === 0 && styles.navBtnDisabled]}
                onPress={() => setCurrentQuestionIndex((index) => Math.max(index - 1, 0))}
                disabled={currentQuestionIndex === 0}
              >
                <Text style={styles.navBtnText}>Prev</Text>
              </TouchableOpacity>
              {currentQuestionIndex === totalQuestions - 1 ? (
                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                  <Text style={styles.submitBtnText}>Submit</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.navBtn} onPress={() => setCurrentQuestionIndex((index) => Math.min(index + 1, totalQuestions - 1))}>
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: {
    marginRight: 16,
  },
  backText: {
    color: '#0a7c4f',
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0a7c4f',
  },
  selectorSection: {
    paddingVertical: 16,
  },
  subjectRow: {
    paddingHorizontal: 16,
  },
  subjectPill: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: '#eaf4ee',
    marginRight: 10,
  },
  subjectPillActive: {
    backgroundColor: '#0a7c4f',
  },
  subjectText: {
    color: '#0a7c4f',
    fontWeight: '700',
  },
  subjectTextActive: {
    color: '#fff',
  },
  yearRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  yearBtn: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
  },
  yearBtnActive: {
    backgroundColor: '#f5a623',
  },
  yearText: {
    color: '#3a3a3a',
    fontWeight: '700',
  },
  yearTextActive: {
    color: '#0a7c4f',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  progressText: {
    color: '#0a7c4f',
    fontWeight: '700',
    marginBottom: 14,
  },
  questionText: {
    color: '#111',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 18,
    lineHeight: 26,
  },
  option: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e3e3e3',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  optionSelected: {
    backgroundColor: '#eaf4ee',
    borderColor: '#0a7c4f',
  },
  optionText: {
    color: '#222',
    fontWeight: '600',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 16,
  },
  navBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
  },
  navBtnDisabled: {
    opacity: 0.5,
  },
  navBtnText: {
    color: '#0a7c4f',
    fontWeight: '700',
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#f5a623',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#0a7c4f',
    fontWeight: '800',
  },
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0a7c4f',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
  },
});
