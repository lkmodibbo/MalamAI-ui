import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import useWeaknessTracker from '../src/hooks/useWeaknessTracker';
import SUBJECTS from '../constants/subjects';

const getSubjectEmoji = (subjectId, subjectName) => {
  const subject = SUBJECTS.find((item) => item.id === subjectId || item.name === subjectName);
  return subject?.emoji || '📘';
};

export default function WeaknessScreen({ navigation }) {
  const { getWeakTopics, loading } = useWeaknessTracker();
  const [weakTopics, setWeakTopics] = useState([]);

  useEffect(() => {
    let mounted = true;
    getWeakTopics().then((topics) => {
      if (mounted) setWeakTopics(topics);
    }).catch((err) => {
      console.warn('[WeaknessScreen] failed to load weak topics', err);
    });
    return () => { mounted = false; };
  }, [getWeakTopics]);

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>✅</Text>
      <Text style={styles.emptyTitle}>No weak areas yet — keep practising!</Text>
      <Text style={styles.emptySubtitle}>Your wrong answers will begin to surface here once you take more quizzes.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weakness Tracker</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Ranked Weak Topics</Text>

        {loading ? (
          <Text style={styles.loadingText}>Loading weak topics...</Text>
        ) : weakTopics.length === 0 ? (
          renderEmpty()
        ) : (
          weakTopics.map((item, index) => {
            const emoji = getSubjectEmoji(item.subjectId, item.subjectName);
            return (
              <View key={`${item.subjectId}-${item.topic}`} style={styles.topicRow}>
                <View style={styles.topicInfo}>
                  <View style={styles.positionBadge}>
                    <Text style={styles.positionText}>{index + 1}</Text>
                  </View>
                  <View style={styles.topicTextBlock}>
                    <Text style={styles.topicName}>{emoji} {item.topic}</Text>
                    <Text style={styles.subjectName}>{item.subjectName}</Text>
                  </View>
                </View>
                <View style={styles.topicActions}>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{item.count}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.studyBtn}
                    onPress={() => navigation.navigate('Learn', {
                      subject: {
                        id: item.subjectId,
                        name: item.subjectName,
                        emoji,
                      },
                      topic: item.topic,
                    })}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.studyBtnText}>Study Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f8f4',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 6,
  },
  backBtn: {
    paddingVertical: 10,
    paddingRight: 16,
  },
  backText: {
    color: '#0a7c4f',
    fontWeight: '700',
  },
  headerTitle: {
    flex: 1,
    color: '#0a7c4f',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginRight: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    color: '#0a7c4f',
    fontSize: 18,
    fontWeight: '800',
    marginVertical: 16,
  },
  loadingText: {
    color: '#4b5d47',
    fontSize: 14,
    marginTop: 10,
  },
  emptyState: {
    marginTop: 28,
    alignItems: 'center',
    padding: 28,
    borderRadius: 18,
    backgroundColor: '#eaf8ee',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0a7c4f',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#4b5d47',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  topicRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  topicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  positionBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fde8e8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  positionText: {
    color: '#d31f2a',
    fontWeight: '800',
  },
  topicTextBlock: {
    maxWidth: '55%',
  },
  topicName: {
    color: '#0a7c4f',
    fontSize: 16,
    fontWeight: '800',
  },
  subjectName: {
    color: '#556c52',
    fontSize: 13,
    marginTop: 4,
  },
  topicActions: {
    alignItems: 'flex-end',
  },
  countBadge: {
    backgroundColor: '#fef0f0',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginBottom: 10,
  },
  countText: {
    color: '#d31f2a',
    fontWeight: '800',
  },
  studyBtn: {
    backgroundColor: '#0a7c4f',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  studyBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
