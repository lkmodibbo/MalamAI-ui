import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import SUBJECTS from '../constants/subjects';
import SubjectBadge from './SubjectBadge';
import { getAiStudyPlan } from '../services/apiService';

// ─── Fallback (offline / no AI data) ─────────────────────────────────────────

function normalizeKey(subjectId, topic) {
  return `${String(subjectId || '').trim().toLowerCase()}|${String(topic || '').trim().toLowerCase()}`;
}

function buildFallbackSuggestions(weakTopics = [], visitedTopics = []) {
  const seenKeys    = new Set();
  const visitedKeys = new Set(visitedTopics.map((item) => String(item || '').trim().toLowerCase()));
  const suggestions = [];

  function push(subjectId, subjectName, topic) {
    const key = normalizeKey(subjectId, topic);
    if (!topic || seenKeys.has(key) || visitedKeys.has(key)) return;
    suggestions.push({ subjectId, subjectName, topic });
    seenKeys.add(key);
  }

  weakTopics.forEach((item) => { if (item?.topic) push(item.subjectId, item.subjectName, item.topic); });

  if (suggestions.length < 2) {
    SUBJECTS.forEach((s) => {
      s.topics?.forEach((t) => { if (suggestions.length < 2) push(s.id, s.name, t); });
    });
  }

  return suggestions.slice(0, 2);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TodaysPlanCard({ weakTopics = [], visitedTopics = [], onStudyNow }) {
  const [aiPlan, setAiPlan]       = useState(null);   // { plan: [], summary: '' }
  const [loading, setLoading]     = useState(false);
  const [aiError, setAiError]     = useState(false);
  const [useAi, setUseAi]         = useState(true);

  const loadAiPlan = useCallback(async () => {
    setLoading(true);
    setAiError(false);
    try {
      const data = await getAiStudyPlan();
      setAiPlan(data.plan);
    } catch {
      setAiError(true);
      setUseAi(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAiPlan();
  }, [loadAiPlan]);

  // Fallback suggestions when AI is unavailable
  const fallback = useMemo(
    () => buildFallbackSuggestions(weakTopics, visitedTopics),
    [weakTopics, visitedTopics],
  );

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Today's plan</Text>
        {!loading && (
          <TouchableOpacity
            onPress={loadAiPlan}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.refreshBtn}>↺ Refresh</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#14283D" />
          <Text style={styles.loadingText}>Malam AI is building your plan…</Text>
        </View>
      ) : useAi && aiPlan ? (
        // ── AI-generated plan ──────────────────────────────────────────────
        <>
          {aiPlan.plan.slice(0, 4).map((session, i) => (
            <View key={i} style={styles.aiRow}>
              <View style={styles.aiTimeBox}>
                <Text style={styles.aiTime}>{session.time}</Text>
              </View>
              <View style={styles.aiDetails}>
                <Text style={styles.aiSubject}>{session.subject}</Text>
                <Text style={styles.aiTopic} numberOfLines={1}>{session.topic}</Text>
                <Text style={styles.aiActivity} numberOfLines={1}>{session.activity}</Text>
              </View>
              <TouchableOpacity
                style={styles.studyBtn}
                onPress={() => onStudyNow({
                  subjectId:   SUBJECTS.find((s) => s.name.toLowerCase() === session.subject.toLowerCase())?.id || '',
                  subjectName: session.subject,
                  topic:       session.topic,
                })}
              >
                <Text style={styles.studyBtnText}>Study →</Text>
              </TouchableOpacity>
            </View>
          ))}
          {aiPlan.summary ? (
            <Text style={styles.summary}>{aiPlan.summary}</Text>
          ) : null}
        </>
      ) : (
        // ── Fallback / offline plan ────────────────────────────────────────
        <>
          {aiError && (
            <Text style={styles.aiErrorText}>
              Could not load AI plan — showing suggested topics instead.
            </Text>
          )}
          {fallback.length === 0 ? (
            <Text style={styles.emptyText}>All topics covered for today. Keep it up!</Text>
          ) : (
            fallback.map((s, i) => (
              <View key={`${s.subjectId}-${s.topic}-${i}`} style={styles.row}>
                <SubjectBadge name={s.subjectName} size="sm" />
                <Text style={styles.topicLabel}>{s.topic}</Text>
                <TouchableOpacity style={styles.studyBtn} onPress={() => onStudyNow(s)}>
                  <Text style={styles.studyBtnText}>Study →</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#D2DDD7',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  header: { color: '#14283D', fontSize: 15, fontWeight: '800' },
  refreshBtn: { color: '#0F8A72', fontSize: 12, fontWeight: '700' },

  // Loading
  loadingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  loadingText: { color: '#5A6B68', fontSize: 13 },

  // AI plan rows
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E4EDE9',
    gap: 10,
  },
  aiTimeBox: {
    backgroundColor: '#F3F7F5',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    minWidth: 72,
    alignItems: 'center',
  },
  aiTime: { color: '#14283D', fontSize: 10, fontWeight: '700' },
  aiDetails: { flex: 1 },
  aiSubject: { color: '#0F8A72', fontSize: 11, fontWeight: '800', marginBottom: 1 },
  aiTopic:   { color: '#14283D', fontSize: 13, fontWeight: '700' },
  aiActivity:{ color: '#5A6B68', fontSize: 11, marginTop: 1 },
  summary: {
    marginTop: 10,
    color: '#5A6B68',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
  },

  // Fallback rows
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E4EDE9',
  },
  topicLabel: {
    color: '#14283D', fontSize: 13, fontWeight: '600',
    flex: 1, marginLeft: 10, marginRight: 12,
  },

  // Shared
  studyBtn: {
    backgroundColor: '#14283D',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, minHeight: 40, justifyContent: 'center',
  },
  studyBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  emptyText: { color: '#5A6B68', fontSize: 13, lineHeight: 20 },
  aiErrorText: { color: '#c0392b', fontSize: 12, marginBottom: 8 },
});
