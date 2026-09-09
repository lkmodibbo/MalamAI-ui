import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getAdminAudit, getAdminAuditCSV } from '../../services/apiService';
import { adminStyles as styles } from './adminStyles';

export default function AdminAuditScreen({ navigation }) {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const data = await getAdminAudit({ page: p, limit, action: actionFilter, resource: resourceFilter });
      setLogs(p === 1 ? (data.logs || []) : (prev) => [...prev, ...(data.logs || [])]);
      setTotal(data.total || 0);
      setPage(p);
    } catch (err) {
      console.warn('[AdminAudit] load failed', err.message);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useFocusEffect(useCallback(() => { load(1); }, [load]));

  const doExport = async () => {
    setExporting(true);
    try {
      const csv = await getAdminAuditCSV({ action: actionFilter, resource: resourceFilter });
      setCsvContent(csv);
      setCsvOpen(true);
    } catch (err) {
      console.warn('[AdminAudit] export failed', err.message || err);
      alert(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>Admin</Text>
          <Text style={styles.headerTitle}>Audit log</Text>
        </View>
        <Text style={styles.muted}>{total} entries</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <TextInput
          placeholder="Action filter"
          value={actionFilter}
          onChangeText={setActionFilter}
          style={{ flex: 1, borderWidth: 1, borderColor: '#E6E6E6', borderRadius: 8, padding: 8 }}
        />
        <TextInput
          placeholder="Resource type"
          value={resourceFilter}
          onChangeText={setResourceFilter}
          style={{ flex: 1, borderWidth: 1, borderColor: '#E6E6E6', borderRadius: 8, padding: 8 }}
        />
        <TouchableOpacity onPress={() => load(1)} style={[styles.primaryBtn, { paddingHorizontal: 12, alignSelf: 'center' }]}>
          <Text style={styles.primaryBtnText}>Search</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={doExport} style={[styles.primaryBtn, { paddingHorizontal: 12, marginLeft: 8, alignSelf: 'center' }]}> 
          {exporting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Export CSV</Text>}
        </TouchableOpacity>
      </View>

      <FlatList
        contentContainerStyle={styles.content}
        data={logs}
        keyExtractor={(item) => String(item.id)}
        onEndReached={() => { if (!loading && logs.length < total) load(page + 1); }}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.listMeta}>{item.admin_name || 'System'} · {item.resource_type || ''} · {item.resource_id || ''}</Text>
            <Text style={[styles.listTitle, { marginTop: 6 }]}>{item.action}</Text>
            {item.details ? <Text style={styles.listMeta}>{JSON.stringify(item.details)}</Text> : null}
            <Text style={styles.muted}>{new Date(item.created_at).toLocaleString()}</Text>
          </View>
        )}
        ListEmptyComponent={loading ? <ActivityIndicator color="#14283D" /> : <Text style={styles.empty}>No audit entries.</Text>}
      />

      <Modal visible={csvOpen} animationType="slide" onRequestClose={() => setCsvOpen(false)}>
        <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Exported CSV</Text>
            <TouchableOpacity onPress={() => setCsvOpen(false)} style={styles.headerSide}><Text style={styles.headerAction}>Close</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 12 }}>
            <TextInput value={csvContent} multiline style={{ minHeight: 300, borderWidth: 1, borderColor: '#E6E6E6', padding: 8 }} editable={false} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
