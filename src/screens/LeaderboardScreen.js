import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getLeaderboard, getMyRank, getSubjectLeaderboard } from '../services/apiService';
import { COLORS } from '../constants/colors';
import useSelectedSubjects from '../hooks/useSelectedSubjects';
import Skeleton from '../components/Skeleton';

function rankStyle(index) {
  if (index === 0) return styles.rankFirst;
  if (index === 1 || index === 2) return styles.rankPodium;
  return null;
}

export default function LeaderboardScreen({ navigation }) {
  const [rows, setRows] = useState([]);
  const [rank, setRank] = useState(null);
  const [rankMessage, setRankMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const { subjects, loading: subjectsLoading } = useSelectedSubjects();

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [board, mine] = await Promise.all([
        subjectId ? getSubjectLeaderboard(subjectId) : getLeaderboard(),
        getMyRank().catch(() => ({ rank: null, message: '' })),
      ]);
      setRows(board.leaderboard || []);
      setRank(subjectId ? null : (mine.rank || null));
      setRankMessage(mine.message || '');
    } catch (err) {
      setError(err.message || 'Could not load leaderboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [subjectId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.filterChip, !subjectId && styles.filterChipOn]}
              onPress={() => setSubjectId('')}
            >
              <Text style={[styles.filterText, !subjectId && styles.filterTextOn]}>All</Text>
            </TouchableOpacity>
            {subjectsLoading ? (
              <Skeleton style={{ marginTop: 12, width: 80, height: 28, borderRadius: 999 }} />
            ) : subjects.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.filterChip, subjectId === item.id && styles.filterChipOn]}
                onPress={() => setSubjectId(item.id)}
              >
                <Text style={[styles.filterText, subjectId === item.id && styles.filterTextOn]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Top JAMB students</Text>
          <Text style={styles.heroBody}>
            Ranked by average quiz score. Complete at least 3 quizzes to appear.
          </Text>
          {rank ? (
            <View style={styles.rankPill}>
              <Text style={styles.rankText}>
                Your rank: #{rank.rank} · {rank.average_score}% avg
              </Text>
            </View>
          ) : rankMessage ? (
            <Text style={styles.rankHint}>{rankMessage}</Text>
          ) : null}
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : rows.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No rankings yet</Text>
            <Text style={styles.emptyBody}>Take a few quizzes and this board will fill up.</Text>
          </View>
        ) : (
          rows.map((row, index) => (
            <View key={`${row.id}-${index}`} style={styles.row}>
              <Text style={[styles.rank, rankStyle(index)]}>{index + 1}</Text>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{row.name}</Text>
                <Text style={styles.rowMeta}>{row.total_quizzes || row.attempts} quizzes</Text>
              </View>
              <Text style={styles.rowScore}>{row.average_score}%</Text>
            </View>
          ))
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
  hero: {
    backgroundColor: '#14283D',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  heroTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900', marginBottom: 6 },
  heroBody: { color: '#C5D4CF', fontSize: 13, lineHeight: 19, marginBottom: 12 },
  rankPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rankText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  rankHint: { color: '#d4ac0d', fontSize: 12, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F7F5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D2DDD7',
    gap: 12,
  },
  rank: { width: 36, fontSize: 18, fontWeight: '800', color: COLORS.textMuted, textAlign: 'center' },
  rankFirst: { color: COLORS.gold, fontWeight: '900', fontSize: 20 },
  rankPodium: { color: COLORS.secondary, fontWeight: '900' },
  rowInfo: { flex: 1 },
  rowName: { fontWeight: '800', color: '#14283D', fontSize: 14 },
  rowMeta: { color: '#5A6B68', fontSize: 12, marginTop: 2 },
  rowScore: { fontWeight: '900', color: '#14283D', fontSize: 16 },
  empty: { padding: 24, alignItems: 'center' },
  emptyTitle: { fontWeight: '800', color: '#14283D', marginBottom: 6 },
  emptyBody: { color: '#5A6B68', textAlign: 'center' },
  error: { color: '#c0392b', textAlign: 'center', marginTop: 20 },
  filterChip: {
    backgroundColor: '#F3F7F5',
    borderWidth: 1,
    borderColor: '#D2DDD7',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipOn: { backgroundColor: '#0F8A72', borderColor: '#0F8A72' },
  filterText: { color: '#14283D', fontWeight: '700', fontSize: 12 },
  filterTextOn: { color: '#ffffff' },
});
