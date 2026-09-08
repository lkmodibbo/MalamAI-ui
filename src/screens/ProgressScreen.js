import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  getQuizHistory, getQuizStats, getPastExamHistory, getPastExamStats, getMockExamHistory,
} from '../services/apiService';
import SubjectBadge from '../components/SubjectBadge';

function pct(score, total) {
  if (!total) return 0;
  return Math.round((Number(score) / Number(total)) * 100);
}

function formatWhen(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export default function ProgressScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [streak, setStreak] = useState({ current_streak: 0, longest_streak: 0 });
  const [quizHistory, setQuizHistory] = useState([]);
  const [pastHistory, setPastHistory] = useState([]);
  const [pastStats, setPastStats] = useState([]);
  const [mockHistory, setMockHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [quizStats, quizzes, past, pastStat, mocks] = await Promise.all([
        getQuizStats(),
        getQuizHistory(),
        getPastExamHistory(),
        getPastExamStats(),
        getMockExamHistory(),
      ]);
      setStats(quizStats.stats || null);
      setStreak(quizStats.streak || { current_streak: 0, longest_streak: 0 });
      setQuizHistory(quizzes.history || []);
      setPastHistory(past.history || []);
      setPastStats(pastStat.stats || []);
      setMockHistory(mocks.history || []);
    } catch (err) {
      setError(err.message || 'Could not load progress.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Progress</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        {loading ? (
          <ActivityIndicator color="#14283D" style={{ marginTop: 24 }} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <>
            <View style={styles.statGrid}>
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{stats?.total_quizzes || 0}</Text>
                <Text style={styles.statLabel}>Quizzes</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{stats?.average_score || 0}%</Text>
                <Text style={styles.statLabel}>Average</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{streak.current_streak || 0}</Text>
                <Text style={styles.statLabel}>Streak</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{streak.longest_streak || 0}</Text>
                <Text style={styles.statLabel}>Best streak</Text>
              </View>
            </View>

            <Text style={styles.section}>Recent quizzes</Text>
            {quizHistory.length === 0 ? (
              <Text style={styles.empty}>No quizzes saved yet.</Text>
            ) : quizHistory.map((item) => (
              <View key={item.id} style={styles.row}>
                <SubjectBadge name={item.subject_name || item.topic_name} size="sm" />
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>{item.subject_name || item.topic_name || 'Quiz'}</Text>
                  <Text style={styles.rowMeta}>{item.topic_name || 'Practice'} · {formatWhen(item.created_at)}</Text>
                </View>
                <Text style={styles.rowScore}>{item.score}/{item.total} · {pct(item.score, item.total)}%</Text>
              </View>
            ))}

            <Text style={styles.section}>Past exam history</Text>
            {pastHistory.length === 0 ? (
              <Text style={styles.empty}>No past exams submitted yet.</Text>
            ) : pastHistory.map((item) => (
              <View key={item.id} style={styles.row}>
                <SubjectBadge name={item.subject_name} size="sm" />
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>{item.subject_name} {item.year}</Text>
                  <Text style={styles.rowMeta}>{formatWhen(item.completed_at)}</Text>
                </View>
                <Text style={styles.rowScore}>{item.score}/{item.total} · {item.percent}%</Text>
              </View>
            ))}

            {pastStats.length > 0 && (
              <>
                <Text style={styles.section}>Past exam averages</Text>
                {pastStats.map((item) => (
                  <View key={item.subject_name} style={styles.row}>
                    <SubjectBadge name={item.subject_name} size="sm" />
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowTitle}>{item.subject_name}</Text>
                      <Text style={styles.rowMeta}>{item.attempts} attempt{item.attempts === 1 ? '' : 's'}</Text>
                    </View>
                    <Text style={styles.rowScore}>Avg {item.average_percent}% · Best {item.best_percent}%</Text>
                  </View>
                ))}
              </>
            )}

            <Text style={styles.section}>Mock exams</Text>
            {mockHistory.length === 0 ? (
              <Text style={styles.empty}>No mock exams saved yet.</Text>
            ) : mockHistory.map((item) => (
              <View key={item.id} style={styles.row}>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>Mock · {item.predicted_score}/400</Text>
                  <Text style={styles.rowMeta}>{formatWhen(item.created_at)}</Text>
                </View>
                <Text style={styles.rowScore}>{item.total_score}/{item.total_possible}</Text>
              </View>
            ))}
          </>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#D2DDD7',
  },
  backBtn: { minWidth: 60 },
  backText: { color: '#0F8A72', fontWeight: '700' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#14283D' },
  content: { padding: 16 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  statTile: {
    width: '48.5%',
    backgroundColor: '#F3F7F5',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D2DDD7',
  },
  statValue: { fontSize: 22, fontWeight: '900', color: '#14283D' },
  statLabel: { color: '#5A6B68', fontWeight: '700', marginTop: 4, fontSize: 12 },
  section: { fontSize: 15, fontWeight: '800', color: '#14283D', marginTop: 8, marginBottom: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F7F5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D2DDD7',
    gap: 10,
  },
  rowInfo: { flex: 1 },
  rowTitle: { fontWeight: '800', color: '#14283D', fontSize: 13 },
  rowMeta: { color: '#5A6B68', fontSize: 11, marginTop: 2 },
  rowScore: { color: '#14283D', fontWeight: '800', fontSize: 12 },
  empty: { color: '#5A6B68', marginBottom: 12 },
  error: { color: '#c0392b', textAlign: 'center', marginTop: 20 },
});
