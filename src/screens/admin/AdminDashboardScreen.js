import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { getAdminDashboard, logout, sendAdminAnnouncement } from '../../services/apiService';
import { adminStyles as styles } from './adminStyles';

function resetToPublicHome(navigation) {
  let current = navigation;
  for (let i = 0; i < 6 && current; i += 1) {
    const names = current.getState?.()?.routeNames || [];
    if (names.includes('Home')) {
      current.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] }),
      );
      return;
    }
    current = current.getParent?.();
  }
}

export default function AdminDashboardScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showLogout, setShowLogout] = useState(false);
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceBody, setAnnounceBody] = useState('');
  const [announceMsg, setAnnounceMsg] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setStats(await getAdminDashboard());
    } catch (err) {
      setError(err.message || 'Could not load dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const confirmLogout = async () => {
    try {
      resetToPublicHome(navigation);
    } catch (err) {
      console.warn('[AdminDashboard] navigation reset failed', err);
    }
    try {
      await logout();
    } catch (err) {
      console.warn('[AdminDashboard] logout failed', err);
    }
    setShowLogout(false);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerSide} />
        <View>
          <Text style={styles.headerEyebrow}>Admin</Text>
          <Text style={styles.headerTitle}>Overview</Text>
        </View>
        <TouchableOpacity style={styles.logoutPill} onPress={() => setShowLogout(true)} activeOpacity={0.8}>
          <Text style={styles.logoutPillText}>Log out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        {loading ? <ActivityIndicator color="#14283D" style={{ marginTop: 24 }} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {stats ? (
          <View style={styles.statGrid}>
            <View style={[styles.statTile, styles.statTileFeatured]}>
              <Text style={[styles.statValue, styles.statValueOnDark]}>{stats.users?.total || 0}</Text>
              <Text style={[styles.statLabel, styles.statLabelOnDark]}>Registered users</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{stats.users?.verified || 0}</Text>
              <Text style={styles.statLabel}>Verified</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{stats.questions?.past_jamb || 0}</Text>
              <Text style={styles.statLabel}>Past questions</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{stats.quiz_attempts?.average_score || 0}%</Text>
              <Text style={styles.statLabel}>Avg quiz score</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Send announcement</Text>
          <Text style={styles.muted}>Pushes a notification to every verified student.</Text>
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            placeholder="Title"
            placeholderTextColor="#7D8E8A"
            value={announceTitle}
            onChangeText={setAnnounceTitle}
          />
          <TextInput
            style={[styles.input, styles.textarea, { marginTop: 8 }]}
            multiline
            placeholder="Message"
            placeholderTextColor="#7D8E8A"
            value={announceBody}
            onChangeText={setAnnounceBody}
          />
          {announceMsg ? <Text style={styles.success}>{announceMsg}</Text> : null}
          <TouchableOpacity
            style={styles.primaryBtn}
            disabled={sending}
            onPress={async () => {
              setSending(true);
              setAnnounceMsg('');
              try {
                const data = await sendAdminAnnouncement({ title: announceTitle.trim(), message: announceBody.trim() });
                setAnnounceTitle('');
                setAnnounceBody('');
                setAnnounceMsg(data.message || 'Announcement sent.');
              } catch (err) {
                setError(err.message || 'Could not send announcement.');
              } finally {
                setSending(false);
              }
            }}
          >
            {sending ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryBtnText}>Send to all students</Text>}
          </TouchableOpacity>
        </View>

        <Text style={styles.cardTitle}>Shortcuts</Text>
        {[
          { label: 'Registered users', tab: 'AdminUsers' },
          { label: 'Student leaderboard', tab: 'AdminBoard' },
          { label: 'Upload past questions', tab: 'AdminUpload' },
          { label: 'Subjects, topics & practice', route: 'AdminContent' },
        ].map((item) => (
          <TouchableOpacity
            key={item.tab || item.route}
            style={styles.listRow}
            onPress={() => (item.route
              ? (navigation.getParent() || navigation).navigate(item.route)
              : navigation.navigate(item.tab))}
          >
            <Text style={[styles.listTitle, { flex: 1 }]}>{item.label}</Text>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={showLogout} transparent animationType="fade" onRequestClose={() => setShowLogout(false)}>
        <View style={styles.logoutModalOverlay}>
          <View style={styles.logoutModalCard}>
            <Text style={styles.logoutModalTitle}>Log out of the admin console?</Text>
            <View style={styles.logoutModalActions}>
              <TouchableOpacity style={styles.logoutModalBtn} onPress={() => setShowLogout(false)}>
                <Text style={styles.logoutModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.logoutModalBtn, styles.logoutModalConfirm]} onPress={confirmLogout}>
                <Text style={[styles.logoutModalBtnText, { color: '#fff' }]}>Yes, log out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
