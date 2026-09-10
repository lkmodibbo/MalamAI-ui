import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, LayoutAnimation,
  Platform, UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import HomeReviewCard from '../components/HomeReviewCard';
import SubjectBadge from '../components/SubjectBadge';
import MenuButton from '../components/MenuButton';
import useSRS from '../hooks/useSRS';
import useSelectedSubjects from '../hooks/useSelectedSubjects';
import Skeleton from '../components/Skeleton';
import { COLORS } from '../constants/colors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function SubjectScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [openSubjectId, setOpenSubjectId] = useState(null);
  const { dueCount, refreshQueue } = useSRS();
  const { subjects, selectedIds, loading } = useSelectedSubjects();

  useFocusEffect(
    useCallback(() => { refreshQueue(); }, [refreshQueue]),
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.topics.some((t) => t.toLowerCase().includes(q))
    );
  }, [search, subjects]);

  const toggleSubject = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenSubjectId((current) => (current === id ? null : id));
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MenuButton />
          <View>
            <Text style={styles.headerEyebrow}>Study</Text>
            <Text style={styles.headerTitle}>Subjects</Text>
          </View>
        </View>
        <Text style={styles.headerCount}>{filtered.length} papers</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <HomeReviewCard dueCount={dueCount} onPress={() => navigation.navigate('Review')} />

        {/* Search */}
        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search subject or topic…"
            placeholderTextColor="#7D8E8A"
            clearButtonMode="while-editing"
          />
        </View>

        {/* Quick action buttons */}
        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('PastQuestions')}>
            <Text style={styles.quickBtnText}>Past questions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickBtn, styles.quickBtnDark]} onPress={() => navigation.navigate('MockSetup')}>
            <Text style={[styles.quickBtnText, styles.quickBtnTextDark]}>Mock exam</Text>
          </TouchableOpacity>
        </View>

        {!loading && selectedIds.length > 0 && !search ? (
          <Text style={styles.sectionLabel}>Your JAMB subjects</Text>
        ) : null}

        {loading ? (
          <Skeleton style={{ marginTop: 24, height: 16, width: '60%' }} />
        ) : selectedIds.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No subjects selected</Text>
            <Text style={styles.emptyBody}>
              Pick the subjects you are sitting for JAMB in Profile. Only those will show here.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyBtnText}>Choose subjects</Text>
            </TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <Text style={styles.emptyText}>No subjects match "{search}"</Text>
        ) : null}

        {/* Accordion list — only subjects the student selected */}
        {filtered.map((subject) => {
          const isOpen = openSubjectId === subject.id;

          return (
            <View key={subject.id} style={[styles.accordion, styles.accordionSelected]}>
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => toggleSubject(subject.id)}
                activeOpacity={0.8}
              >
                <View style={styles.accordionLeft}>
                  <SubjectBadge name={subject.name} size="md" tone="dark" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subjectName}>{subject.name}</Text>
                    <Text style={styles.topicCount}>{subject.topics.length} topics</Text>
                  </View>
                </View>
                <View style={styles.accordionRight}>
                  <Text style={styles.chevron}>{isOpen ? '−' : '+'}</Text>
                </View>
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.topicsContainer}>
                  <TouchableOpacity
                    style={styles.pastExamBtn}
                    onPress={() => navigation.navigate('PastExam', { subject })}
                  >
                    <Text style={styles.pastExamBtnText}>Past questions</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.topicRowGeneral}
                    onPress={() => navigation.navigate('Learn', { subject })}
                  >
                    <Text style={styles.topicRowGeneralText}>General — {subject.name} overview</Text>
                  </TouchableOpacity>

                  {subject.topics.map((topic, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.topicRow}
                      onPress={() => navigation.navigate('Learn', { subject, topic })}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.topicIndexText}>{index + 1}</Text>
                      <Text style={styles.topicText}>{topic}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {selectedIds.length > 0 ? (
          <TouchableOpacity
            style={styles.editSubjectsBtn}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.85}
          >
            <Text style={styles.editSubjectsText}>Edit subjects in Profile →</Text>
          </TouchableOpacity>
        ) : null}

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
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: COLORS.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.headerBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerEyebrow: {
    color: COLORS.textMuted,
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  headerTitle: {
    color: COLORS.primary,
    fontWeight: '900',
    fontSize: 24,
    marginTop: 2,
  },
  headerCount: {
    color: COLORS.textMuted,
    fontWeight: '700',
    fontSize: 12,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceWhite,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    marginTop: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickBtnDark: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quickBtnText: {
    color: COLORS.primary,
    fontWeight: '800',
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
  emptyCard: {
    backgroundColor: COLORS.surfaceWhite,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  emptyTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
  },
  emptyBody: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  emptyBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyBtnText: {
    color: COLORS.textWhite,
    fontWeight: '800',
    fontSize: 14,
  },
  editSubjectsBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  editSubjectsText: {
    color: COLORS.link,
    fontWeight: '800',
    fontSize: 13,
  },
  accordion: {
    backgroundColor: COLORS.surfaceWhite,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    paddingVertical: 16,
    paddingHorizontal: 14,
    minHeight: 68,
  },
  accordionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
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
    paddingLeft: 10,
  },
  chevron: {
    color: COLORS.textMuted,
    fontWeight: '700',
    fontSize: 18,
  },
  topicsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E4EDE9',
    paddingBottom: 8,
  },
  topicRowGeneral: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.background,
  },
  topicRowGeneralText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 48,
    borderTopWidth: 1,
    borderTopColor: '#E4EDE9',
  },
  topicIndexText: {
    width: 24,
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: '700',
  },
  topicText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  pastExamBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
    alignItems: 'center',
  },
  pastExamBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
});
