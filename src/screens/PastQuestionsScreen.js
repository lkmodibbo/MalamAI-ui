import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Skeleton from '../components/Skeleton';
import { COLORS } from '../constants/colors';
import useSelectedSubjects from '../hooks/useSelectedSubjects';
import SubjectBadge from '../components/SubjectBadge';

export default function PastQuestionsScreen({ navigation }) {
  const { subjects, loading } = useSelectedSubjects();

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
            Practice with real past JAMB questions for the subjects you selected.
            Pick a subject to see available years and start practicing.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Your subjects</Text>

        {loading ? (
          <Skeleton style={{ marginTop: 12, height: 14, width: '40%' }} />
        ) : subjects.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No subjects selected</Text>
            <Text style={styles.emptyBody}>
              Choose your JAMB subjects in Profile to practice past questions.
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Profile')}>
              <Text style={styles.emptyBtnText}>Choose subjects</Text>
            </TouchableOpacity>
          </View>
        ) : (
          subjects.map((s) => (
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
          ))
        )}

        {subjects.length > 0 ? (
          <TouchableOpacity style={styles.editLink} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.editLinkText}>Edit subjects in Profile →</Text>
          </TouchableOpacity>
        ) : null}

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
    backgroundColor: COLORS.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.headerBorder,
  },
  backBtn: { minWidth: 60 },
  backText: { color: COLORS.link, fontWeight: '700', fontSize: 14 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  container: { padding: 16 },
  infoCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  infoTitle: { color: COLORS.textWhite, fontSize: 14, fontWeight: '800', marginBottom: 6 },
  infoBody: { color: COLORS.textOnDark, fontSize: 12, lineHeight: 18 },
  sectionLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 10,
    fontWeight: '700',
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  subjectInfo: { flex: 1 },
  subjectName: { color: COLORS.primary, fontWeight: '800', fontSize: 15 },
  subjectTopics: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  arrow: { color: COLORS.link, fontWeight: '700', fontSize: 16 },
  emptyCard: {
    backgroundColor: COLORS.surfaceWhite,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
  },
  emptyTitle: { color: COLORS.primary, fontWeight: '900', fontSize: 15, marginBottom: 6 },
  emptyBody: { color: COLORS.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 14 },
  emptyBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyBtnText: { color: COLORS.textWhite, fontWeight: '800', fontSize: 14 },
  editLink: { alignItems: 'center', paddingVertical: 12 },
  editLinkText: { color: COLORS.link, fontWeight: '800', fontSize: 13 },
});
