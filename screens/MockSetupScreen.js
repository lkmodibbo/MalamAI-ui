import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SUBJECTS from '../constants/subjects';

export default function MockSetupScreen({ navigation }) {
  const [selected, setSelected] = useState(SUBJECTS.slice(0, 4).map((s) => s.id));

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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mock Exam Setup</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Info card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🎓 JAMB Mock Exam</Text>
          <Text style={styles.infoBody}>
            Select your 4 JAMB subjects. You'll get 40 questions per subject — 160 total — in 90 minutes.
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

        {/* Counter */}
        <View style={styles.counterRow}>
          <Text style={styles.counterText}>Select subjects</Text>
          <View style={[styles.counterBadge, selected.length === 4 && styles.counterBadgeFull]}>
            <Text style={styles.counterBadgeText}>{selected.length}/4</Text>
          </View>
        </View>

        {/* Subject list */}
        {SUBJECTS.map((s) => {
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
              <Text style={styles.itemEmoji}>{s.emoji}</Text>
              <Text style={[styles.itemName, on && styles.itemNameOn]} numberOfLines={1}>
                {s.name}
              </Text>
              {on && <Text style={styles.itemTick}>●</Text>}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[styles.startBtn, selected.length !== 4 && styles.startBtnDisabled]}
          onPress={handleStart}
          activeOpacity={0.85}
        >
          <Text style={styles.startBtnText}>
            {selected.length === 4 ? 'Start Mock Exam →' : `Select ${4 - selected.length} more subject${4 - selected.length !== 1 ? 's' : ''}`}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dde3ef',
  },
  backBtn: { minWidth: 60 },
  backText: { color: '#2e4a7a', fontWeight: '700', fontSize: 14 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#1b2a4a' },

  container: { padding: 16 },

  infoCard: {
    backgroundColor: '#1b2a4a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  infoTitle: { color: '#ffffff', fontSize: 14, fontWeight: '800', marginBottom: 6 },
  infoBody: { color: '#b0bfd8', fontSize: 12, lineHeight: 18, marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statVal: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  statLabel: { color: '#b0bfd8', fontSize: 10, marginTop: 2 },

  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  counterText: { fontSize: 14, fontWeight: '700', color: '#6b7c9a' },
  counterBadge: {
    backgroundColor: '#f4f6fb',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#dde3ef',
  },
  counterBadgeFull: { backgroundColor: '#1b2a4a', borderColor: '#1b2a4a' },
  counterBadgeText: { fontWeight: '800', color: '#1b2a4a', fontSize: 13 },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f6fb',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#dde3ef',
    gap: 10,
  },
  itemOn: { backgroundColor: '#e6f0ff', borderColor: '#1b2a4a' },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#c5cfe0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#1b2a4a', borderColor: '#1b2a4a' },
  checkmark: { color: '#ffffff', fontWeight: '900', fontSize: 11 },
  itemEmoji: { fontSize: 18 },
  itemName: { flex: 1, fontSize: 13, fontWeight: '700', color: '#1b2a4a' },
  itemNameOn: { color: '#1b2a4a' },
  itemTick: { color: '#1b2a4a', fontSize: 10 },

  startBtn: {
    marginTop: 8,
    backgroundColor: '#1b2a4a',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startBtnDisabled: { backgroundColor: '#c5cfe0' },
  startBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
});
