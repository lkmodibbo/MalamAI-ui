import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getAdminLeaderboard } from '../../services/apiService';
import SUBJECTS from '../../constants/subjects';
import { adminStyles as styles } from './adminStyles';

export default function AdminLeaderboardScreen({ navigation }) {
  const [subject, setSubject] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await getAdminLeaderboard(subject);
      setRows(data.leaderboard || []);
    } catch (err) {
      setError(err.message || 'Could not load leaderboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [subject]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>Admin</Text>
          <Text style={styles.headerTitle}>Leaderboard</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          <View style={[styles.chipWrap, { flexWrap: 'nowrap' }]}>
            <TouchableOpacity
              style={[styles.chip, !subject && styles.chipOn]}
              onPress={() => setSubject('')}
            >
              <Text style={[styles.chipText, !subject && styles.chipTextOn]}>All subjects</Text>
            </TouchableOpacity>
            {SUBJECTS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.chip, subject === item.id && styles.chipOn]}
                onPress={() => setSubject(item.id)}
              >
                <Text style={[styles.chipText, subject === item.id && styles.chipTextOn]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {loading ? <ActivityIndicator color="#14283D" /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && rows.length === 0 ? (
          <Text style={styles.empty}>No ranked students yet for this filter.</Text>
        ) : null}

        {rows.map((row, index) => (
          <TouchableOpacity
            key={row.id}
            style={styles.listRow}
            onPress={() => (navigation.getParent() || navigation).navigate('AdminUserDetail', { userId: row.id })}
          >
            <Text style={[styles.rank, index < 3 && styles.rankTop]}>{index + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.listTitle}>{row.name}</Text>
              <Text style={styles.listMeta}>{row.email}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.listTitle}>{row.average_score}%</Text>
              <Text style={styles.listMeta}>{row.total_quizzes} quizzes</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
