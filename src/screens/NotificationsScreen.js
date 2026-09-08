import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  getNotifications, markNotificationRead, markAllNotificationsRead,
} from '../services/apiService';

function formatWhen(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

export default function NotificationsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await getNotifications();
      setItems(data.notifications || []);
    } catch (err) {
      setError(err.message || 'Could not load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const handleRead = async (item) => {
    if (item.is_read) return;
    try {
      await markNotificationRead(item.id);
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)));
    } catch (err) {
      console.warn('[NotificationsScreen] mark read failed', err);
    }
  };

  const handleReadAll = async () => {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.warn('[NotificationsScreen] mark all failed', err);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={handleReadAll} style={styles.backBtn}>
          <Text style={styles.markAll}>Read all</Text>
        </TouchableOpacity>
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
            <Text style={styles.emptyTitle}>You're all caught up</Text>
            <Text style={styles.emptyBody}>Streaks, quiz updates and admin messages will show here.</Text>
          </View>
        ) : (
          items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.card, !item.is_read && styles.cardUnread]}
              onPress={() => handleRead(item)}
              activeOpacity={0.8}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {!item.is_read && <View style={styles.dot} />}
              </View>
              <Text style={styles.cardBody}>{item.message}</Text>
              <Text style={styles.cardMeta}>{formatWhen(item.created_at)}</Text>
            </TouchableOpacity>
          ))
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
  backBtn: { minWidth: 70 },
  backText: { color: '#0F8A72', fontWeight: '700' },
  markAll: { color: '#0F8A72', fontWeight: '700', fontSize: 12, textAlign: 'right' },
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
  cardUnread: { backgroundColor: '#eef4ff', borderColor: '#14283D' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontWeight: '800', color: '#14283D', fontSize: 14, flex: 1, marginRight: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#14283D' },
  cardBody: { color: '#31415f', fontSize: 13, lineHeight: 19, marginTop: 6 },
  cardMeta: { color: '#5A6B68', fontSize: 11, marginTop: 8 },
  empty: { alignItems: 'center', paddingTop: 48 },
  emptyTitle: { fontWeight: '800', color: '#14283D', fontSize: 16, marginBottom: 6 },
  emptyBody: { color: '#5A6B68', textAlign: 'center', lineHeight: 20 },
  error: { color: '#c0392b', textAlign: 'center', marginTop: 20 },
});
