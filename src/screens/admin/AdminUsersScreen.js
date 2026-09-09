import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getAdminUsers } from '../../services/apiService';
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

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, true)} />}
      >
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

        {users.map((user) => (
          <TouchableOpacity
            key={user.id}
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
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>
        ))}

        {users.length < total ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => load(page + 1)}>
            <Text style={styles.primaryBtnText}>Load more</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
