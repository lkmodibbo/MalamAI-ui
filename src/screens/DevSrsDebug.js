import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useSRS from '../hooks/useSRS';

export default function DevSrsDebug() {
  const { queue, refreshQueue, markQuestionsReviewed, removeQuestion, clearQueue } = useSRS();

  const markOne = async (q, correct) => {
    await markQuestionsReviewed([{ question: q.question, isCorrect: !!correct }]);
    await refreshQueue();
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Dev: SRS Debug</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.btn} onPress={() => { refreshQueue(); }}>
          <Text style={styles.btnText}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { marginLeft: 8 }]} onPress={() => { Alert.alert('Clear queue', 'Clear all SRS items?', [{ text: 'Cancel' }, { text: 'Clear', onPress: async () => { await clearQueue(); } }]); }}>
          <Text style={styles.btnText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {queue.length === 0 ? (
          <Text style={styles.empty}>Queue is empty</Text>
        ) : queue.map((q) => (
          <View key={q.question} style={styles.card}>
            <Text numberOfLines={2} style={styles.qText}>{q.question}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>sub: {q.subjectId || '—'}</Text>
              <Text style={styles.meta}>rep: {q.repetitions || 0}</Text>
              <Text style={styles.meta}>ef: {(q.ef || 0).toFixed(2)}</Text>
              <Text style={styles.meta}>next: {q.nextReviewDate ? new Date(q.nextReviewDate).toLocaleString() : '—'}</Text>
            </View>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => markOne(q, true)}>
                <Text style={styles.actionText}>Mark Correct</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fff', borderWidth: 1 }]} onPress={() => markOne(q, false)}>
                <Text style={[styles.actionText, { color: '#000' }]}>Mark Wrong</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f8d7da' }]} onPress={() => { Alert.alert('Remove', 'Remove this question from queue?', [{ text: 'Cancel' }, { text: 'Remove', onPress: async () => { await removeQuestion(q.question); await refreshQueue(); } }]); }}>
                <Text style={[styles.actionText, { color: '#6a1b21' }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 18, fontWeight: '800' },
  btn: { backgroundColor: '#14283D', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
  container: { padding: 12 },
  empty: { padding: 12, color: '#666' },
  card: { backgroundColor: '#f7f9f8', padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e6ecea' },
  qText: { fontWeight: '700', color: '#14283D', marginBottom: 8 },
  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  meta: { color: '#5a6b68', fontSize: 12, marginRight: 8 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { backgroundColor: '#0F8A72', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  actionText: { color: '#fff', fontWeight: '700' },
});
