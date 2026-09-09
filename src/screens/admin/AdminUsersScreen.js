import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, Alert,
  Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getAdminUsers, changeAdminUserRole, getMe } from '../../services/apiService';
import SUBJECTS from '../../constants/subjects';
import { adminStyles as styles } from './adminStyles';

function initials(name) {
  const parts = String(name || 'U').trim().split(/\s+/);
  return parts.length === 1
    ? parts[0].slice(0, 2).toUpperCase()
    : `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function subjectNames(ids = []) {
  return ids
    .map((id) => SUBJECTS.find((s) => s.id === id)?.name || id)
    .slice(0, 3)
    .join(', ');
}

export default function AdminUsersScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [changingUserId, setChangingUserId] = useState(null);
  const [currentAdminId, setCurrentAdminId] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async (nextPage = 1, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await getAdminUsers(nextPage, 20, query);
      setUsers(nextPage === 1 ? (data.users || []) : (prev) => [...prev, ...(data.users || [])]);
      setTotal(data.total || 0);
      setPage(nextPage);
    } catch (err) {
      setError(err.message || 'Could not load users.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [query]);

  useFocusEffect(useCallback(() => { load(1); }, [load]));

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

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.adminOpenBtn}
          onPress={() => {
            if (navigation.canGoBack && navigation.canGoBack()) navigation.goBack();
            else (navigation.getParent() || navigation).navigate('AdminDashboard');
          }}
        >
          <Text style={styles.adminOpenBtnText}>‹</Text>
        </TouchableOpacity>

        <View style={{ flex: 1, paddingHorizontal: 8 }}>
          <Text style={styles.headerEyebrow}>Admin</Text>
          <Text style={styles.headerTitle}>Users</Text>
        </View>

        <Text style={styles.muted}>{total} registered</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.searchBox}>
          <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search name or email"
              placeholderTextColor="#7D8E8A"
              onSubmitEditing={() => load(1)}
              returnKeyType="search"
            />
          </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading && users.length === 0 ? <ActivityIndicator color="#14283D" /> : null}
        {!loading && users.length === 0 ? <Text style={styles.empty}>No users found.</Text> : null}

        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          onEndReached={() => { if (!loading && users.length < total) load(page + 1); }}
          onEndReachedThreshold={0.5}
          refreshing={refreshing}
          onRefresh={() => load(1, true)}
          renderItem={({ item: user }) => (
            <TouchableOpacity
              style={styles.listRow}
              onPress={() => (navigation.getParent() || navigation).navigate('AdminUserDetail', { userId: user.id })}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(user.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle} numberOfLines={1}>{user.name}</Text>
                <Text style={styles.listMeta} numberOfLines={1}>{user.email}</Text>
                <Text style={styles.listMeta} numberOfLines={1}>
                  {user.selected_subjects?.length || 0} subjects
                  {user.selected_subjects?.length ? ` · ${subjectNames(user.selected_subjects)}` : ''}
                  {` · ${user.quiz_count} quizzes`}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                {changingUserId === user.id ? (
                  <ActivityIndicator />
                ) : user.id === currentAdminId && user.is_admin ? (
                  <View style={[styles.smallPill, { backgroundColor: '#F3F4F6' }]}>
                    <Text style={[styles.smallPillText, { color: '#6B7280' }]}>You</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.smallPill, { backgroundColor: user.is_admin ? '#E6F2FF' : '#14283D' }]}
                    onPress={() => {
                      const willDemote = user.is_admin;
                      const doChange = async () => {
                        try {
                          setChangingUserId(user.id);
                          await changeAdminUserRole(user.id, !user.is_admin);
                          setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_admin: !u.is_admin } : u)));
                        } catch (err) {
                          Alert.alert('Error', err.message || 'Failed to change role');
                        } finally {
                          setChangingUserId(null);
                        }
                      };

                      if (willDemote) {
                        Alert.alert(
                          'Confirm demotion',
                          `Are you sure you want to remove admin rights from ${user.name}?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Demote', style: 'destructive', onPress: doChange },
                          ]
                        );
                      } else {
                        doChange();
                      }
                    }}
                  >
                    <Text style={[styles.smallPillText, { color: user.is_admin ? '#0B4A6F' : '#fff' }]}>{user.is_admin ? 'Admin' : 'Make admin'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
