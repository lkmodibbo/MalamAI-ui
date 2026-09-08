import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import useWeaknessTracker from '../hooks/useWeaknessTracker';
import SubjectBadge from './SubjectBadge';

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

  return (
    <View style={styles.card}>
      <View style={styles.leftBar} />
      <View style={styles.content}>
        <Text style={styles.title}>Focus area</Text>
        <View style={styles.topicRow}>
          <SubjectBadge name={topWeakTopic.subjectName} size="sm" />
          <Text style={styles.topic} numberOfLines={2}>{topWeakTopic.topic}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.studyBtn}
            onPress={() => navigation.navigate('Learn', {
              subject: { id: topWeakTopic.subjectId, name: topWeakTopic.subjectName },
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
    borderColor: '#D2DDD7',
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
    color: '#14283D',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  topic: {
    color: '#14283D',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    flex: 1,
    marginLeft: 10,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  studyBtn: {
    backgroundColor: '#14283D',
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
    color: '#0F8A72',
    fontWeight: '700',
    fontSize: 13,
  },
});
