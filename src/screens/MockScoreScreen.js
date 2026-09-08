import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { saveMockExam } from '../services/apiService';
import SubjectBadge from '../components/SubjectBadge';

function getGrade(percent) {
  if (percent >= 70) return { label: 'Excellent', color: '#27ae60', bg: '#eafaf1' };
  if (percent >= 50) return { label: 'Good', color: '#0F8A72', bg: '#D5F0E8' };
  if (percent >= 30) return { label: 'Fair', color: '#e67e22', bg: '#fef3e2' };
  return { label: 'Needs Work', color: '#e74c3c', bg: '#fdf0f0' };
}

function getMotivation(percent) {
  if (percent >= 70) return { text: 'Nagode! Ka yi kyau sosai — excellent performance!' };
  if (percent >= 50) return { text: 'Sai haka! Good work, keep pushing for higher marks.' };
  if (percent >= 30) return { text: 'Ka na kan hanya — you\'re on track. Review weak areas and try again.' };
  return { text: 'Kada ka damu. Every attempt makes you stronger. Review your topics and try again.' };
}

export default function MockScoreScreen({ route, navigation }) {
  const { subjectScores = [], totalScore = 0, predictedScore = 0, timeTaken = 0 } = route.params || {};
  const totalPossible = subjectScores.reduce((s, x) => s + x.total, 0);
  const percent = totalPossible ? Math.round((totalScore / totalPossible) * 100) : 0;
  const overall = getGrade(percent);
  const motivation = getMotivation(percent);
  const savedRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState('saving');

  const persistMock = async () => {
    setSaveStatus('saving');
    try {
      await saveMockExam({
        subject_ids: subjectScores.map((s) => s.id),
        subject_scores: subjectScores,
        total_score: totalScore,
        total_possible: totalPossible,
        predicted_score: predictedScore,
        time_taken: timeTaken,
      });
      setSaveStatus('saved');
    } catch (err) {
      console.warn('[MockScoreScreen] save failed', err.message);
      setSaveStatus('error');
    }
  };

  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;
    persistMock();
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mock Exam Results</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {saveStatus === 'saved' ? (
          <Text style={styles.saveOk}>✓ Mock exam saved to your account</Text>
        ) : saveStatus === 'error' ? (
          <TouchableOpacity onPress={persistMock}>
            <Text style={styles.saveErr}>Could not save mock — tap to retry</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.savePending}>Saving your mock result…</Text>
        )}

        {/* Overall score hero */}
        <View style={styles.heroCard}>
          <Text style={styles.heroScore}>{totalScore}/{totalPossible}</Text>
          <Text style={styles.heroPercent}>{percent}%</Text>
          <View style={[styles.gradeBadge, { backgroundColor: overall.bg }]}>
            <Text style={[styles.gradeText, { color: overall.color }]}>{overall.label}</Text>
          </View>
        </View>

        {/* Predicted JAMB score */}
        <View style={styles.predictedCard}>
          <View>
            <Text style={styles.predictedLabel}>Predicted JAMB Score</Text>
            <Text style={styles.predictedSub}>Based on your performance</Text>
          </View>
          <Text style={styles.predictedValue}>{predictedScore}<Text style={styles.predictedMax}>/400</Text></Text>
        </View>

        {/* Per-subject breakdown */}
        <Text style={styles.sectionLabel}>Subject Breakdown</Text>
        {subjectScores.map((s) => {
          const grade = getGrade(s.percent);
          return (
            <View key={s.id} style={styles.subjectRow}>
              <SubjectBadge name={s.name} size="sm" style={styles.subjectBadge} />
              <View style={styles.subjectInfo}>
                <View style={styles.subjectTopRow}>
                  <Text style={styles.subjectName}>{s.name}</Text>
                  <Text style={styles.subjectScore}>{s.correct}/{s.total}</Text>
                </View>
                <View style={styles.subjectBarBg}>
                  <View style={[styles.subjectBarFill, { width: `${s.percent}%`, backgroundColor: grade.color }]} />
                </View>
                <Text style={[styles.subjectPercent, { color: grade.color }]}>{s.percent}% — {grade.label}</Text>
              </View>
            </View>
          );
        })}

        {/* Motivation */}
        <View style={styles.motivationCard}>
          <Text style={styles.motivationText}>{motivation.text}</Text>
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('MockSetup')}
        >
          <Text style={styles.primaryBtnText}>Try Again →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Subjects' })}
        >
          <Text style={styles.secondaryBtnText}>Study Weak Areas</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#D2DDD7',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#14283D' },
  saveOk: { color: '#27ae60', fontWeight: '700', fontSize: 12, textAlign: 'center', marginBottom: 10 },
  saveErr: { color: '#c0392b', fontWeight: '700', fontSize: 12, textAlign: 'center', marginBottom: 10 },
  savePending: { color: '#5A6B68', fontSize: 12, textAlign: 'center', marginBottom: 10 },

  container: { padding: 16 },

  // Hero
  heroCard: {
    backgroundColor: '#14283D',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 14,
  },
  heroScore: { color: '#ffffff', fontSize: 44, fontWeight: '900', lineHeight: 48 },
  heroPercent: { color: '#C5D4CF', fontSize: 18, fontWeight: '700', marginBottom: 14 },
  gradeBadge: {
    paddingHorizontal: 18, paddingVertical: 7, borderRadius: 999,
  },
  gradeText: { fontWeight: '800', fontSize: 14 },

  // Predicted
  predictedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F7F5',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#D2DDD7',
    marginBottom: 20,
  },
  predictedLabel: { fontSize: 14, fontWeight: '800', color: '#14283D' },
  predictedSub: { fontSize: 12, color: '#5A6B68', marginTop: 2 },
  predictedValue: { fontSize: 38, fontWeight: '900', color: '#14283D' },
  predictedMax: { fontSize: 16, color: '#5A6B68' },

  // Subjects
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#5A6B68', marginBottom: 12 },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F3F7F5',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D2DDD7',
    gap: 12,
  },
  subjectBadge: { marginTop: 2 },
  subjectInfo: { flex: 1 },
  subjectTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8,
  },
  subjectName: { fontWeight: '800', color: '#14283D', fontSize: 14 },
  subjectScore: { fontWeight: '700', color: '#5A6B68', fontSize: 14 },
  subjectBarBg: {
    height: 6, backgroundColor: '#D2DDD7', borderRadius: 999, overflow: 'hidden', marginBottom: 6,
  },
  subjectBarFill: { height: 6, borderRadius: 999 },
  subjectPercent: { fontSize: 12, fontWeight: '700' },

  // Motivation
  motivationCard: {
    backgroundColor: '#F3F7F5',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#D2DDD7',
  },
  motivationText: { color: '#14283D', fontSize: 14, lineHeight: 22, fontWeight: '600', textAlign: 'center' },

  // Buttons
  primaryBtn: {
    backgroundColor: '#14283D',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
  secondaryBtn: {
    backgroundColor: '#F3F7F5',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D2DDD7',
  },
  secondaryBtnText: { color: '#14283D', fontWeight: '700', fontSize: 15 },
});
