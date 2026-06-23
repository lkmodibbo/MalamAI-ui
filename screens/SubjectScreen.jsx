import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, LayoutAnimation,
  Platform, UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import SUBJECTS from '../constants/subjects';
import HomeReviewCard from '../components/HomeReviewCard';
import useSRS from '../hooks/useSRS';
import useStudentProfile from '../src/hooks/useStudentProfile';
import { COLORS } from '../constants/colors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function SubjectScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [openSubjectId, setOpenSubjectId] = useState(null);
  const { dueCount, refreshQueue } = useSRS();
  const { profile, loading } = useStudentProfile();

  useFocusEffect(
    useCallback(() => { refreshQueue(); }, [refreshQueue]),
  );

  const selectedSubjectIds = profile?.selectedSubjects || [];

  // All subjects — show selected first, then the rest
  const orderedSubjects = useMemo(() => {
    const selected = SUBJECTS.filter((s) => selectedSubjectIds.includes(s.id));
    const rest = SUBJECTS.filter((s) => !selectedSubjectIds.includes(s.id));
    return [...selected, ...rest];
  }, [selectedSubjectIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orderedSubjects;
    return orderedSubjects.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.topics.some((t) => t.toLowerCase().includes(q))
    );
  }, [search, orderedSubjects]);

  const toggleSubject = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenSubjectId((current) => (current === id ? null : id));
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backBtn}>
          <Text style={styles.backText}>← Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>JAMB Subjects</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <HomeReviewCard dueCount={dueCount} onPress={() => navigation.navigate('Review')} />

        {/* Search */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search subject or topic…"
            placeholderTextColor="#8aab8a"
            clearButtonMode="while-editing"
          />
        </View>

        {/* Quick action buttons */}
        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('PastQuestions')}>
            <Text style={styles.quickBtnText}>📜 Past Questions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickBtn, styles.quickBtnDark]} onPress={() => navigation.navigate('MockSetup')}>
            <Text style={[styles.quickBtnText, styles.quickBtnTextDark]}>🎓 Mock Exam</Text>
          </TouchableOpacity>
        </View>

        {/* Section label */}
        {!loading && selectedSubjectIds.length > 0 && !search && (
          <Text style={styles.sectionLabel}>Your subjects are shown first</Text>
        )}

        {filtered.length === 0 && (
          <Text style={styles.emptyText}>No subjects match "{search}"</Text>
        )}

        {/* Accordion list */}
        {filtered.map((subject) => {
          const isOpen = openSubjectId === subject.id;
          const isSelected = selectedSubjectIds.includes(subject.id);

          return (
            <View key={subject.id} style={[styles.accordion, isSelected && styles.accordionSelected]}>
              {/* Subject header row */}
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => toggleSubject(subject.id)}
                activeOpacity={0.8}
              >
                <View style={styles.accordionLeft}>
                  <Text style={styles.subjectEmoji}>{subject.emoji}</Text>
                  <View>
                    <Text style={styles.subjectName}>{subject.name}</Text>
                    <Text style={styles.topicCount}>{subject.topics.length} topics</Text>
                  </View>
                </View>
                <View style={styles.accordionRight}>
                  {isSelected && (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeText}>My subject</Text>
                    </View>
                  )}
                  <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
                </View>
              </TouchableOpacity>

              {/* Topics list */}
              {isOpen && (
                <View style={styles.topicsContainer}>
                  {/* Tap subject name to open without a topic */}
                  <TouchableOpacity
                    style={styles.topicRowGeneral}
                    onPress={() => navigation.navigate('Learn', { subject })}
                  >
                    <Text style={styles.topicRowGeneralText}>📖 General — {subject.name} overview</Text>
                  </TouchableOpacity>

                  {subject.topics.map((topic, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.topicRow}
                      onPress={() => navigation.navigate('Learn', { subject, topic })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.topicIndex}>
                        <Text style={styles.topicIndexText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.topicText}>{topic}</Text>
                      <Text style={styles.topicArrow}>→</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
  },
  backBtn: {
    minWidth: 60,
  },
  backText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  headerTitle: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
  },
  container: {
    padding: 14,
    paddingBottom: 40,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d5e3d3',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    marginTop: 4,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickBtnDark: {
    backgroundColor: COLORS.primary,
  },
  quickBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  quickBtnTextDark: {
    color: '#ffffff',
  },
  sectionLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  accordion: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#dde8db',
    overflow: 'hidden',
  },
  accordionSelected: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  accordionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  subjectEmoji: {
    fontSize: 26,
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
  topicCount: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  accordionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedBadge: {
    backgroundColor: '#e8f7ee',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  selectedBadgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  chevron: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  topicsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#edf4eb',
    paddingBottom: 8,
  },
  topicRowGeneral: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f0faf3',
  },
  topicRowGeneralText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f4ef',
  },
  topicIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  topicIndexText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  topicText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  topicArrow: {
    color: COLORS.accent,
    fontWeight: '700',
    fontSize: 14,
  },
});
