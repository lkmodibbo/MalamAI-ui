import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import useWeaknessTracker from '../src/hooks/useWeaknessTracker';
import SUBJECTS from '../constants/subjects';

const getSubjectEmoji = (subjectId, subjectName) => {
  const subject = SUBJECTS.find((s) => s.id === subjectId || s.name === subjectName);
  return subject?.emoji || '📘';
};

export default function HomeWeaknessCard({ navigation }) {
  const { getWeakTopics } = useWeaknessTracker();
  const [topWeakTopic, setTopWeakTopic] = useState(null);

  useEffect(() => {
    let mounted = true;
    getWeakTopics().then((topics) => {
      if (mounted) setTopWeakTopic(topics[0] || null);
    }).catch((err) => {
      console.warn('[HomeWeaknessCard] failed to load weak topics', err);
    });
    return () => { mounted = false; };
  }, [getWeakTopics]);

  if (!topWeakTopic) return null;

  const emoji = getSubjectEmoji(topWeakTopic.subjectId, topWeakTopic.subjectName);

  return (
    <View style={styles.card}>
      <View style={styles.leftBar} />
      <View style={styles.content}>
        <Text style={styles.title}>⚠️ Focus Area</Text>
        <Text style={styles.topic} numberOfLines={2}>{emoji} {topWeakTopic.topic}</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.studyBtn}
            onPress={() => navigation.navigate('Learn', {
              subject: { id: topWeakTopic.subjectId, name: topWeakTopic.subjectName, emoji },
              topic: topWeakTopic.topic,
            })}
          >
            <Text style={styles.studyBtnText}>Study Now</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Weakness')}>
            <Text style={styles.viewAll}>View all →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#dde3ef',
    overflow: 'hidden',
  },
  leftBar: {
    width: 6,
    backgroundColor: '#e74c3c',
  },
  content: {
    flex: 1,
    padding: 14,
  },
  title: {
    color: '#1b2a4a',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  topic: {
    color: '#1b2a4a',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  studyBtn: {
    backgroundColor: '#1b2a4a',
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  studyBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  viewAll: {
    color: '#2e4a7a',
    fontWeight: '700',
    fontSize: 13,
  },
});
