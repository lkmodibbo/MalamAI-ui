import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  getAdminAiStats,
  getAdminAiQuestions,
  approveAdminAiQuestion,
  rejectAdminAiQuestion,
} from '../../services/apiService';
import { adminStyles } from './adminStyles';

// ─── small helpers ─────────────────────────────────────────────────────────────

function StatBox({ label, value, sub }) {
  return (
    <View style={s.statBox}>
      <Text style={s.statValue}>{value ?? '—'}</Text>
      <Text style={s.statLabel}>{label}</Text>
      {sub ? <Text style={s.statSub}>{sub}</Text> : null}
    </View>
  );
}

function SectionHeader({ title }) {
  return <Text style={s.sectionHeader}>{title}</Text>;
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function AdminAiStatsScreen({ navigation }) {
  const [stats, setStats]         = useState(null);
  const [questions, setQuestions] = useState([]);
  const [qTotal, setQTotal]       = useState(0);
  const [qPage, setQPage]         = useState(1);
  const [qStatus, setQStatus]     = useState('pending');
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [qLoading, setQLoading]   = useState(false);
  const [actioning, setActioning] = useState({});

  const loadStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getAdminAiStats();
      setStats(data);
    } catch (err) {
      console.warn('[AdminAiStats] stats load failed:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadQuestions = useCallback(async (page = 1, status = qStatus, append = false) => {
    setQLoading(true);
    try {
      const data = await getAdminAiQuestions({ status, page, limit: 15 });
      setQuestions(append ? (prev) => [...prev, ...(data.questions || [])] : (data.questions || []));
      setQTotal(data.total || 0);
      setQPage(page);
    } catch (err) {
      console.warn('[AdminAiStats] questions load failed:', err.message);
    } finally {
      setQLoading(false);
    }
  }, [qStatus]);

  useFocusEffect(useCallback(() => {
    loadStats();
    loadQuestions(1, 'pending', false);
  }, [loadStats, loadQuestions]));

  const switchStatus = (status) => {
    setQStatus(status);
    setQuestions([]);
    loadQuestions(1, status, false);
  };

  const handleApprove = async (id) => {
    setActioning((prev) => ({ ...prev, [id]: 'approving' }));
    try {
      await approveAdminAiQuestion(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      setQTotal((n) => Math.max(0, n - 1));
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not approve question.');
    } finally {
      setActioning((prev) => ({ ...prev, [id]: null }));
    }
  };

  const handleReject = async (id) => {
    Alert.alert(
      'Reject question?',
      'This will soft-delete the AI question from the live pool.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setActioning((prev) => ({ ...prev, [id]: 'rejecting' }));
            try {
              await rejectAdminAiQuestion(id);
              setQuestions((prev) => prev.filter((q) => q.id !== id));
              setQTotal((n) => Math.max(0, n - 1));
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not reject question.');
            } finally {
              setActioning((prev) => ({ ...prev, [id]: null }));
            }
          },
        },
      ]
    );
  };

  // ── Totals from today's daily row ──────────────────────────────────────────
  const todayRow    = stats?.daily?.[0] || {};
  const totalChats  = stats?.daily?.reduce((n, r) => n + Number(r.chat_total     || 0), 0) ?? 0;
  const totalGens   = stats?.daily?.reduce((n, r) => n + Number(r.generate_total || 0), 0) ?? 0;

  return (
    <SafeAreaView style={adminStyles.root} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={adminStyles.header}>
        <TouchableOpacity
          style={adminStyles.adminOpenBtn}
          onPress={() => navigation.canGoBack?.() ? navigation.goBack() : null}
        >
          <Text style={adminStyles.adminOpenBtnText}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, paddingHorizontal: 8 }}>
          <Text style={adminStyles.headerEyebrow}>Admin</Text>
          <Text style={adminStyles.headerTitle}>AI Monitor</Text>
        </View>
        <TouchableOpacity onPress={() => { loadStats(); loadQuestions(1, qStatus, false); }}>
          <Text style={[adminStyles.headerAction, { marginRight: 4 }]}>↺ Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadStats(true)} />}
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#C4A35A" />
        ) : (
          <>
            {/* ── Usage stats ─────────────────────────────────────────────── */}
            <SectionHeader title="Last 14 days" />
            <View style={s.statRow}>
              <StatBox label="Chat messages" value={totalChats} sub="14-day total" />
              <StatBox label="Generations"   value={totalGens}  sub="14-day total" />
              <StatBox label="Cache entries" value={stats?.cache?.total_cached} sub={`+${stats?.cache?.cached_today ?? 0} today`} />
            </View>

            {/* Today's breakdown */}
            <View style={s.statRow}>
              <StatBox label="Chats today"    value={todayRow.chat_total}     />
              <StatBox label="Generates today" value={todayRow.generate_total} />
              <StatBox label="Active users"   value={todayRow.active_users}   sub="today" />
            </View>

            {/* ── Daily sparkline table ──────────────────────────────────── */}
            {stats?.daily?.length > 0 && (
              <>
                <SectionHeader title="Daily breakdown" />
                <View style={s.table}>
                  <View style={[s.tableRow, s.tableHead]}>
                    <Text style={[s.tableCell, s.tableCellHead, { flex: 1.6 }]}>Date</Text>
                    <Text style={[s.tableCell, s.tableCellHead]}>Chats</Text>
                    <Text style={[s.tableCell, s.tableCellHead]}>Gens</Text>
                    <Text style={[s.tableCell, s.tableCellHead]}>Users</Text>
                  </View>
                  {stats.daily.map((row) => (
                    <View key={row.usage_date} style={s.tableRow}>
                      <Text style={[s.tableCell, { flex: 1.6 }]}>
                        {new Date(row.usage_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </Text>
                      <Text style={s.tableCell}>{row.chat_total}</Text>
                      <Text style={s.tableCell}>{row.generate_total}</Text>
                      <Text style={s.tableCell}>{row.active_users}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* ── Users at limit ─────────────────────────────────────────── */}
            {stats?.limitUsers?.length > 0 && (
              <>
                <SectionHeader title="Users at daily limit today" />
                {stats.limitUsers.map((u, i) => (
                  <View key={i} style={s.limitRow}>
                    <Text style={s.limitName} numberOfLines={1}>{u.name}</Text>
                    <Text style={s.limitEmail} numberOfLines={1}>{u.email}</Text>
                    <View style={s.limitBadges}>
                      <View style={s.badge}><Text style={s.badgeText}>{u.chat_count} chats</Text></View>
                      <View style={s.badge}><Text style={s.badgeText}>{u.generate_count} gens</Text></View>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* ── Top topics ─────────────────────────────────────────────── */}
            {stats?.topTopics?.length > 0 && (
              <>
                <SectionHeader title="Top student questions (30 days)" />
                {stats.topTopics.map((t, i) => (
                  <View key={i} style={s.topicRow}>
                    <Text style={s.topicRank}>#{i + 1}</Text>
                    <Text style={s.topicText} numberOfLines={2}>{t.cleaned}</Text>
                    <Text style={s.topicCount}>{t.ask_count}×</Text>
                  </View>
                ))}
              </>
            )}

            {/* ── AI question review ─────────────────────────────────────── */}
            <SectionHeader title="AI question review" />
            <View style={s.tabRow}>
              {['pending', 'approved', 'all'].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[s.tab, qStatus === tab && s.tabActive]}
                  onPress={() => switchStatus(tab)}
                >
                  <Text style={[s.tabText, qStatus === tab && s.tabTextActive]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.qTotal}>{qTotal} question{qTotal !== 1 ? 's' : ''}</Text>

            {qLoading && questions.length === 0 ? (
              <ActivityIndicator style={{ marginVertical: 20 }} color="#C4A35A" />
            ) : questions.length === 0 ? (
              <Text style={s.emptyText}>
                {qStatus === 'pending' ? 'No AI questions awaiting review.' : 'No questions here.'}
              </Text>
            ) : (
              questions.map((q) => (
                <View key={q.id} style={s.qCard}>
                  <View style={s.qMeta}>
                    <Text style={s.qSubject}>{q.subject_name || '—'}</Text>
                    {q.topic_name ? <Text style={s.qTopic}> · {q.topic_name}</Text> : null}
                    {q.is_ai_reviewed && <Text style={s.qReviewedBadge}> ✓ approved</Text>}
                  </View>
                  <Text style={s.qText}>{q.question}</Text>
                  {['A', 'B', 'C', 'D'].map((letter) => (
                    <Text
                      key={letter}
                      style={[s.qOption, q.answer === letter && s.qOptionCorrect]}
                    >
                      {letter}. {q[`option_${letter.toLowerCase()}`]}
                      {q.answer === letter ? ' ✓' : ''}
                    </Text>
                  ))}
                  {q.explanation ? <Text style={s.qExplanation}>{q.explanation}</Text> : null}

                  {qStatus !== 'approved' && (
                    <View style={s.qActions}>
                      <TouchableOpacity
                        style={[s.approveBtn, actioning[q.id] && s.btnDisabled]}
                        onPress={() => handleApprove(q.id)}
                        disabled={Boolean(actioning[q.id])}
                      >
                        {actioning[q.id] === 'approving'
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Text style={s.approveBtnText}>✓ Approve</Text>
                        }
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.rejectBtn, actioning[q.id] && s.btnDisabled]}
                        onPress={() => handleReject(q.id)}
                        disabled={Boolean(actioning[q.id])}
                      >
                        {actioning[q.id] === 'rejecting'
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Text style={s.rejectBtnText}>✕ Reject</Text>
                        }
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}

            {/* Load more */}
            {questions.length < qTotal && (
              <TouchableOpacity
                style={s.loadMoreBtn}
                onPress={() => loadQuestions(qPage + 1, qStatus, true)}
                disabled={qLoading}
              >
                <Text style={s.loadMoreText}>
                  {qLoading ? 'Loading…' : `Load more (${qTotal - questions.length} remaining)`}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },

  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#C4A35A',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 20,
    marginBottom: 10,
  },

  // Stat boxes
  statRow:  { flexDirection: 'row', gap: 10, marginBottom: 4 },
  statBox:  {
    flex: 1, backgroundColor: '#1A2E42', borderRadius: 12,
    padding: 14, alignItems: 'center',
  },
  statValue: { fontSize: 26, fontWeight: '900', color: '#C4A35A' },
  statLabel: { fontSize: 11, color: '#8A9BB0', marginTop: 4, textAlign: 'center' },
  statSub:   { fontSize: 10, color: '#5A6B78', marginTop: 2, textAlign: 'center' },

  // Table
  table:       { borderRadius: 10, overflow: 'hidden', marginBottom: 4 },
  tableHead:   { backgroundColor: '#1A2E42' },
  tableRow:    { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2A3E52', backgroundColor: '#111E2B' },
  tableCell:   { flex: 1, color: '#C8D6E0', fontSize: 13, textAlign: 'center' },
  tableCellHead: { color: '#C4A35A', fontWeight: '800', fontSize: 11, textTransform: 'uppercase' },

  // Limit users
  limitRow:  { backgroundColor: '#1A2E42', borderRadius: 10, padding: 12, marginBottom: 8 },
  limitName: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  limitEmail:{ color: '#8A9BB0', fontSize: 12, marginBottom: 6 },
  limitBadges: { flexDirection: 'row', gap: 8 },
  badge:     { backgroundColor: '#C4A35A22', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#C4A35A', fontWeight: '700', fontSize: 12 },

  // Top topics
  topicRow:  { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#111E2B', borderRadius: 10, padding: 10, marginBottom: 6, gap: 8 },
  topicRank: { color: '#C4A35A', fontWeight: '900', width: 28, fontSize: 13 },
  topicText: { flex: 1, color: '#C8D6E0', fontSize: 13 },
  topicCount:{ color: '#8A9BB0', fontSize: 12, fontWeight: '700' },

  // Question review tabs
  tabRow:    { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tab:       { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1A2E42', alignItems: 'center', borderWidth: 1, borderColor: '#2A3E52' },
  tabActive: { backgroundColor: '#C4A35A22', borderColor: '#C4A35A' },
  tabText:   { color: '#8A9BB0', fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: '#C4A35A' },
  qTotal:    { color: '#5A6B78', fontSize: 12, marginBottom: 8 },

  // Question cards
  qCard: {
    backgroundColor: '#111E2B', borderRadius: 12, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: '#2A3E52',
  },
  qMeta:    { flexDirection: 'row', marginBottom: 6, flexWrap: 'wrap' },
  qSubject: { color: '#C4A35A', fontSize: 11, fontWeight: '800' },
  qTopic:   { color: '#8A9BB0', fontSize: 11 },
  qReviewedBadge: { color: '#27ae60', fontSize: 11, fontWeight: '700' },
  qText:    { color: '#FFFFFF', fontWeight: '700', fontSize: 14, lineHeight: 20, marginBottom: 10 },
  qOption:  { color: '#8A9BB0', fontSize: 13, paddingVertical: 2 },
  qOptionCorrect: { color: '#27ae60', fontWeight: '700' },
  qExplanation: { color: '#5A6B78', fontSize: 12, marginTop: 8, lineHeight: 18 },

  qActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  approveBtn: { flex: 1, backgroundColor: '#27ae60', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  approveBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  rejectBtn:  { flex: 1, backgroundColor: '#c0392b', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  rejectBtnText:  { color: '#fff', fontWeight: '800', fontSize: 13 },
  btnDisabled: { opacity: 0.5 },

  loadMoreBtn: { alignItems: 'center', paddingVertical: 14 },
  loadMoreText: { color: '#C4A35A', fontWeight: '700', fontSize: 13 },

  emptyText: { color: '#5A6B78', textAlign: 'center', padding: 20, fontSize: 14 },
});
