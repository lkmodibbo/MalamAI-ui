import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Skeleton from '../components/Skeleton';
import { COLORS } from '../constants/colors';
import useSubjects from '../hooks/useSubjects';
import SubjectBadge from '../components/SubjectBadge';

export default function PastQuestionsScreen({ navigation }) {
  const { subjects: SUBJECTS, loading: subjectsLoading } = useSubjects();
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Past Questions</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>JAMB past questions</Text>
          <Text style={styles.infoBody}>
            Practice with real past JAMB questions stored in our database.
            Select a subject to see available years and start practicing.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Select a subject</Text>

        {subjectsLoading ? (
          <Skeleton style={{ marginTop: 12, height: 14, width: '40%' }} />
        ) : SUBJECTS.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={styles.subjectRow}
            onPress={() => navigation.navigate('PastExam', { subject: s })}
            activeOpacity={0.8}
          >
            <SubjectBadge name={s.name} size="sm" />
            <View style={styles.subjectInfo}>
              <Text style={styles.subjectName}>{s.name}</Text>
              <Text style={styles.subjectTopics}>{s.topics.length} topics</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { minWidth: 60 },
  backText: { color: COLORS.secondary, fontWeight: '700', fontSize: 14 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.primary },

  container: { padding: 16 },

  infoCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  infoTitle: { color: '#ffffff', fontSize: 15, fontWeight: '800', marginBottom: 6 },
  infoBody: { color: '#C5D4CF', fontSize: 13, lineHeight: 20 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 10,
  },

  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  subjectInfo: { flex: 1 },
  subjectName: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  subjectTopics: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  arrow: { color: COLORS.secondary, fontWeight: '700', fontSize: 16 },
});
