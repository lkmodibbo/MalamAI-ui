import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useSelectedSubjects from '../hooks/useSelectedSubjects';
import SubjectBadge from '../components/SubjectBadge';
import Skeleton from '../components/Skeleton';
import { COLORS } from '../constants/colors';

export default function MockSetupScreen({ navigation }) {
  const { subjects, selectedIds, loading } = useSelectedSubjects();
  const [selected, setSelected] = useState([]);

  // Prefill from the student's chosen JAMB subjects (max 4).
  useEffect(() => {
    if (!subjects.length) {
      setSelected([]);
      return;
    }
    setSelected(subjects.slice(0, 4).map((s) => s.id));
  }, [subjects]);

  const toggle = (id) => {
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= 4) {
        Alert.alert('4 subjects max', 'JAMB allows exactly 4 subjects. Deselect one to add another.');
        return cur;
      }
      return [...cur, id];
    });
  };

  const handleStart = () => {
    if (selected.length !== 4) {
      Alert.alert('Select 4 subjects', 'Please select exactly 4 subjects to start.');
      return;
    }
    navigation.navigate('MockExam', { subjectIds: selected });
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mock Exam Setup</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>JAMB mock exam</Text>
          <Text style={styles.infoBody}>
            Choose 4 subjects from the ones you selected for JAMB. You'll get 40 questions per subject — 160 total — in 90 minutes.
          </Text>
          <View style={styles.statsRow}>
            {[['160', 'Questions'], ['90', 'Minutes'], ['400', 'Max Score']].map(([val, label]) => (
              <View key={label} style={styles.statItem}>
                <Text style={styles.statVal}>{val}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.counterRow}>
          <Text style={styles.counterText}>Your subjects</Text>
          <View style={[styles.counterBadge, selected.length === 4 && styles.counterBadgeFull]}>
            <Text style={styles.counterBadgeText}>{selected.length}/4</Text>
          </View>
        </View>

        {loading ? (
          <Skeleton style={{ marginTop: 12, height: 14, width: '40%' }} />
        ) : subjects.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No subjects selected</Text>
            <Text style={styles.emptyBody}>
              Add your JAMB subjects in Profile before starting a mock exam.
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Profile')}>
              <Text style={styles.emptyBtnText}>Choose subjects</Text>
            </TouchableOpacity>
          </View>
        ) : (
          subjects.map((s) => {
            const on = selected.includes(s.id);
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.item, on && styles.itemOn]}
                onPress={() => toggle(s.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, on && styles.checkboxOn]}>
                  {on && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <SubjectBadge name={s.name} size="sm" />
                <Text style={[styles.itemName, on && styles.itemNameOn]} numberOfLines={1}>
                  {s.name}
                </Text>
                {on && <Text style={styles.itemTick}>●</Text>}
              </TouchableOpacity>
            );
          })
        )}

        {subjects.length > 0 && subjects.length < 4 ? (
          <Text style={styles.hint}>
            You have {subjects.length} subject{subjects.length === 1 ? '' : 's'} saved.
            JAMB mocks need 4 — add more in Profile.
          </Text>
        ) : null}

        {selectedIds.length > 0 ? (
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.editLink}>
            <Text style={styles.editLinkText}>Edit subjects in Profile →</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.startBtn, selected.length !== 4 && styles.startBtnDisabled]}
          onPress={handleStart}
          disabled={selected.length !== 4}
          activeOpacity={0.85}
        >
          <Text style={styles.startBtnText}>Start mock exam</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceWhite },
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
  backText: { color: COLORS.link, fontWeight: '700', fontSize: 14 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  container: { padding: 16 },
  infoCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  infoTitle: { color: COLORS.textWhite, fontSize: 14, fontWeight: '800', marginBottom: 6 },
  infoBody: { color: COLORS.textOnDark, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statVal: { color: COLORS.textWhite, fontSize: 18, fontWeight: '900' },
  statLabel: { color: COLORS.textOnDark, fontSize: 10, marginTop: 2 },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  counterText: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
  counterBadge: {
    backgroundColor: COLORS.background,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  counterBadgeFull: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  counterBadgeText: { fontWeight: '800', color: COLORS.primary, fontSize: 13 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  itemOn: { backgroundColor: COLORS.selected, borderColor: COLORS.primary },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: COLORS.disabled,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark: { color: COLORS.textWhite, fontWeight: '900', fontSize: 11 },
  itemName: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.primary },
  itemNameOn: { color: COLORS.primary },
  itemTick: { color: COLORS.primary, fontSize: 10 },
  emptyCard: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
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
  hint: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 8,
  },
  editLink: { paddingVertical: 10, alignItems: 'center' },
  editLinkText: { color: COLORS.link, fontWeight: '800', fontSize: 13 },
  startBtn: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startBtnDisabled: { backgroundColor: COLORS.disabled },
  startBtnText: { color: COLORS.textWhite, fontSize: 15, fontWeight: '800' },
});
