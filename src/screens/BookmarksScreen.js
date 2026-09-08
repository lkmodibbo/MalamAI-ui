import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getBookmarks, removeBookmark } from '../services/apiService';

export default function BookmarksScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await getBookmarks();
      setItems(data.bookmarks || []);
    } catch (err) {
      setError(err.message || 'Could not load bookmarks.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const handleRemove = (item) => {
    Alert.alert('Remove bookmark', 'Take this question off your saved list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeBookmark(item.id);
            setItems((prev) => prev.filter((q) => q.id !== item.id));
          } catch (err) {
            Alert.alert('Error', err.message || 'Could not remove bookmark.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bookmarks</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        {loading ? (
          <ActivityIndicator color="#14283D" style={{ marginTop: 24 }} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No saved questions yet</Text>
            <Text style={styles.emptyBody}>Bookmark a past question while practising so you can revise it later.</Text>
          </View>
        ) : (
          items.map((item) => {
            const open = openId === item.id;
            return (
              <View key={item.id} style={styles.card}>
                <TouchableOpacity onPress={() => setOpenId(open ? null : item.id)} activeOpacity={0.8}>
                  <Text style={styles.meta}>{item.subject_name} · {item.year}</Text>
                  <Text style={styles.question}>{item.question}</Text>
                </TouchableOpacity>
                {open && (
                  <View style={styles.details}>
                    {['A', 'B', 'C', 'D'].map((key) => (
                      <Text key={key} style={styles.option}>
                        {key}. {item[`option_${key.toLowerCase()}`]}
                      </Text>
                    ))}
                    <Text style={styles.answer}>Correct: {item.answer}</Text>
                    {item.explanation ? <Text style={styles.explain}>{item.explanation}</Text> : null}
                    <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(item)}>
                      <Text style={styles.removeText}>Remove bookmark</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
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
    borderBottomColor: '#D2DDD7',
  },
  backBtn: { minWidth: 60 },
  backText: { color: '#0F8A72', fontWeight: '700' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#14283D' },
  content: { padding: 16 },
  card: {
    backgroundColor: '#F3F7F5',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D2DDD7',
  },
  meta: { color: '#5A6B68', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  question: { color: '#14283D', fontWeight: '800', fontSize: 14, lineHeight: 20 },
  details: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#D2DDD7', paddingTop: 12 },
  option: { color: '#31415f', fontSize: 13, marginBottom: 4 },
  answer: { color: '#1e8449', fontWeight: '800', marginTop: 8 },
  explain: { color: '#5A6B68', fontSize: 12, lineHeight: 18, marginTop: 6 },
  removeBtn: { marginTop: 12, alignSelf: 'flex-start' },
  removeText: { color: '#c0392b', fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 48 },
  emptyTitle: { fontWeight: '800', color: '#14283D', fontSize: 16, marginBottom: 6 },
  emptyBody: { color: '#5A6B68', textAlign: 'center', lineHeight: 20 },
  error: { color: '#c0392b', textAlign: 'center', marginTop: 20 },
});
