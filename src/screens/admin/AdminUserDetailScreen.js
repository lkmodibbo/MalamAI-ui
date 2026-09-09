import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getAdminUser, changeAdminUserRole, getMe } from '../../services/apiService';
import { Alert } from 'react-native';
import SUBJECTS from '../../constants/subjects';
import SubjectBadge from '../../components/SubjectBadge';
import { adminStyles as styles } from './adminStyles';

function enrolledList(enrolled = []) {
  return enrolled.map((item) => {
    const match = SUBJECTS.find((s) => s.id === item.id);
    return {
      id: item.id,
      name: match?.name || item.name || item.id,
    };
  });
}

function formatDate(value) {
  if (!value) return 'Not set';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Not set';
  return d.toDateString();
}

export default function AdminUserDetailScreen({ navigation, route }) {
  const userId = route.params?.userId;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [changingRole, setChangingRole] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setData(await getAdminUser(userId));
    } catch (err) {
      setError(err.message || 'Could not load user.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useFocusEffect(useCallback(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await getMe();
        if (mounted) setCurrentAdminId(me?.id || null);
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []));

  const handleToggleRole = () => {
    if (!user) return;
    const willDemote = user.is_admin;
    if (willDemote) {
      Alert.alert(
        'Confirm demotion',
        `Remove admin privileges from ${user.name}? This cannot be undone here.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Demote', style: 'destructive', onPress: () => changeRole() },
        ]
      );
    } else {
      changeRole();
    }
  };

  const changeRole = async () => {
    try {
      setChangingRole(true);
      await changeAdminUserRole(user.id, !user.is_admin);
      setData((d) => ({ ...d, user: { ...d.user, is_admin: !d.user.is_admin } }));
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not change role.');
    } finally {
      setChangingRole(false);
    }
  };

  const user = data?.user;
  const stats = data?.stats;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerSide} onPress={() => navigation.goBack()}>
          <Text style={styles.headerAction}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Details</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        {loading ? <ActivityIndicator color="#14283D" /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {user ? (
          <>
            <View style={[styles.card, { backgroundColor: '#0F3D38' }]}>
              <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: '900' }}>{user.name}</Text>
              <Text style={{ color: '#C5D4CF', marginTop: 4 }}>{user.email}</Text>
              <Text style={{ color: '#C5D4CF', marginTop: 8, fontSize: 12 }}>
                Joined {formatDate(user.created_at)} · Exam {formatDate(user.exam_date)}
              </Text>
              <Text style={{ color: '#C5D4CF', marginTop: 4, fontSize: 12 }}>
                {user.is_verified ? 'Verified' : 'Unverified'}
                {user.is_admin ? ' · Admin' : ''}
                {user.onboarding_complete ? ' · Onboarded' : ' · Onboarding pending'}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Enrolled subjects</Text>
              {data.enrolled?.length ? (
                <View style={styles.chipWrap}>
                  {enrolledList(data.enrolled).map((subject) => (
                    <View key={subject.id} style={[styles.chip, styles.subjectChip]}>
                      <SubjectBadge name={subject.name} size="sm" />
                      <Text style={styles.chipText}>{subject.name}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.muted}>No subjects selected yet.</Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Admin controls</Text>
              <Text style={styles.muted}>Toggle admin access for this user.</Text>
              <View style={{ marginTop: 12 }}>
                <TouchableOpacity
                  style={[styles.smallPill, { backgroundColor: user.is_admin ? '#E6F2FF' : '#14283D' }]}
                  onPress={handleToggleRole}
                  disabled={changingRole || (user.id === currentAdminId && user.is_admin)}
                >
                  <Text style={[styles.smallPillText, { color: user.is_admin ? '#0B4A6F' : '#fff' }]}>
                    {user.id === currentAdminId && user.is_admin ? 'You' : (user.is_admin ? 'Revoke admin' : 'Grant admin')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.statGrid}>
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{stats?.quizzes?.total || 0}</Text>
                <Text style={styles.statLabel}>Quizzes · {stats?.quizzes?.average_score || 0}%</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{stats?.past_exams?.total || 0}</Text>
                <Text style={styles.statLabel}>Past exams · {stats?.past_exams?.average_score || 0}%</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{stats?.streak?.current_streak || 0}</Text>
                <Text style={styles.statLabel}>Current streak</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{stats?.mocks?.total || 0}</Text>
                <Text style={styles.statLabel}>Mock exams</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Recent quizzes</Text>
              {data.recent_quizzes?.length ? data.recent_quizzes.map((item) => (
                <View key={item.id} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#E4EDE9' }}>
                  <Text style={styles.listTitle}>{item.topic_name || item.subject_id}</Text>
                  <Text style={styles.listMeta}>
                    {item.score}/{item.total} · {formatDate(item.created_at)}
                  </Text>
                </View>
              )) : <Text style={styles.muted}>No quizzes yet.</Text>}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Recent past exams</Text>
              {data.recent_past_exams?.length ? data.recent_past_exams.map((item) => (
                <View key={item.id} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#E4EDE9' }}>
                  <Text style={styles.listTitle}>{item.subject_id} {item.year}</Text>
                  <Text style={styles.listMeta}>
                    {item.score}/{item.total} · {formatDate(item.completed_at)}
                  </Text>
                </View>
              )) : <Text style={styles.muted}>No past exams yet.</Text>}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
