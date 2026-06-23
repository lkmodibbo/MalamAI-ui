import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import SUBJECTS from '../constants/subjects';

function normalizeKey(subjectId, topic) {
  return `${String(subjectId || '').trim().toLowerCase()}|${String(topic || '').trim().toLowerCase()}`;
}

function getSubjectByIdOrName(subjectId, subjectName) {
  return SUBJECTS.find((s) => s.id === subjectId || s.name === subjectName);
}

function buildSuggestions(weakTopics = [], visitedTopics = []) {
  const seenKeys = new Set();
  const visitedKeys = new Set(visitedTopics.map((item) => String(item || '').trim().toLowerCase()));
  const suggestions = [];

  function push(subjectId, subjectName, topic) {
    const key = normalizeKey(subjectId, topic);
    if (!topic || seenKeys.has(key) || visitedKeys.has(key)) return;
    const subject = getSubjectByIdOrName(subjectId, subjectName);
    suggestions.push({ subjectId, subjectName, topic, emoji: subject?.emoji || '📘' });
    seenKeys.add(key);
  }

  weakTopics.forEach((item) => { if (item?.topic) push(item.subjectId, item.subjectName, item.topic); });

  if (suggestions.length < 2) {
    SUBJECTS.forEach((s) => {
      s.topics.forEach((t) => { if (suggestions.length < 2) push(s.id, s.name, t); });
    });
  }

  return suggestions.slice(0, 2);
}

export default function TodaysPlanCard({ weakTopics = [], visitedTopics = [], onStudyNow }) {
  const suggestions = useMemo(
    () => buildSuggestions(weakTopics, visitedTopics),
    [weakTopics, visitedTopics],
  );

  return (
    <View style={styles.card}>
      <Text style={styles.header}>📅 Today's Plan</Text>
      {suggestions.length === 0 ? (
        <Text style={styles.emptyText}>All topics covered for today. Keep it up!</Text>
      ) : (
        suggestions.map((s, i) => (
          <View key={`${s.subjectId}-${s.topic}-${i}`} style={styles.row}>
            <Text style={styles.topicLabel}>{s.emoji} {s.topic}</Text>
            <TouchableOpacity style={styles.studyBtn} onPress={() => onStudyNow(s)}>
              <Text style={styles.studyBtnText}>Study →</Text>
            </TouchableOpacity>
          </View>
        ))
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
    borderColor: '#dde3ef',
  },
  header: {
    color: '#1b2a4a',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeef6',
  },
  topicLabel: {
    color: '#1b2a4a',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  studyBtn: {
    backgroundColor: '#1b2a4a',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  studyBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyText: {
    color: '#6b7c9a',
    fontSize: 13,
    lineHeight: 20,
  },
});
