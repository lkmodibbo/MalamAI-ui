import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import SUBJECTS from '../../constants/subjects';
import {
  addAdminPastQuestion,
  bulkAddAdminPastQuestions,
  deleteAdminPastQuestion,
  getAdminPastOverview,
  getAdminPastQuestions,
} from '../../services/apiService';
import { YEARS, adminStyles as styles } from './adminStyles';

const EMPTY_FORM = {
  subject_id: 'english',
  year: '2024',
  question: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  answer: 'A',
  explanation: '',
};

export default function AdminPastQuestionsScreen({ navigation }) {
  const [tab, setTab] = useState('upload');
  const [form, setForm] = useState(EMPTY_FORM);
  const [bulkText, setBulkText] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [overview, setOverview] = useState([]);
  const [library, setLibrary] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterSubject, setFilterSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const loadLibrary = useCallback(async (nextPage = 1, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [board, list] = await Promise.all([
        getAdminPastOverview(),
        getAdminPastQuestions({ subject: filterSubject, page: nextPage, limit: 15 }),
      ]);
      setOverview(board.overview || []);
      setLibrary(nextPage === 1 ? (list.questions || []) : (prev) => [...prev, ...(list.questions || [])]);
      setTotal(list.total || 0);
      setPage(nextPage);
    } catch (err) {
      setError(err.message || 'Could not load past questions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterSubject]);

  useFocusEffect(useCallback(() => {
    loadLibrary(1);
  }, [loadLibrary]));

  const subjectName = useMemo(() => {
    const map = Object.fromEntries(SUBJECTS.map((s) => [s.id, s.name]));
    return (id) => map[id] || id;
  }, []);

  const handleSaveOne = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await addAdminPastQuestion({
        ...form,
        year: parseInt(form.year, 10),
      });
      setForm({ ...EMPTY_FORM, subject_id: form.subject_id, year: form.year });
      setMessage('Past question uploaded.');
      loadLibrary(1);
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleBulk = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const parsed = JSON.parse(bulkText);
      const questions = Array.isArray(parsed) ? parsed : parsed.questions;
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('JSON must be an array of questions.');
      }
      const data = await bulkAddAdminPastQuestions(questions);
      setMessage(data.message || 'Bulk upload complete.');
      setBulkText('');
      loadLibrary(1);
    } catch (err) {
      setError(err.message || 'Bulk upload failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item) => {
    Alert.alert('Delete question', 'Remove this past question?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAdminPastQuestion(item.id);
            setLibrary((prev) => prev.filter((row) => row.id !== item.id));
            setTotal((n) => Math.max(0, n - 1));
          } catch (err) {
            setError(err.message || 'Delete failed.');
          }
        },
      },
    ]);
  };

  const pickJsonFile = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setBulkText(await file.text());
      setTab('upload');
    };
    input.click();
  };

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
          <Text style={styles.headerTitle}>Past questions</Text>
        </View>

        <Text style={styles.muted}>{total} in bank</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadLibrary(1, true)} />}
      >
        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tab, tab === 'upload' && styles.tabOn]} onPress={() => setTab('upload')}>
            <Text style={[styles.tabText, tab === 'upload' && styles.tabTextOn]}>Upload</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, tab === 'library' && styles.tabOn]} onPress={() => setTab('library')}>
            <Text style={[styles.tabText, tab === 'library' && styles.tabTextOn]}>Library</Text>
          </TouchableOpacity>
        </View>

        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {tab === 'upload' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Add one JAMB question</Text>
              <Text style={styles.fieldLabel}>Subject</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={[styles.chipWrap, { flexWrap: 'nowrap' }]}>
                  {SUBJECTS.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.chip, form.subject_id === item.id && styles.chipOn]}
                      onPress={() => setField('subject_id', item.id)}
                    >
                      <Text style={[styles.chipText, form.subject_id === item.id && styles.chipTextOn]}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.fieldLabel}>Year</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={[styles.chipWrap, { flexWrap: 'nowrap' }]}>
                  {YEARS.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[styles.chip, String(form.year) === String(year) && styles.chipOn]}
                      onPress={() => setField('year', String(year))}
                    >
                      <Text style={[styles.chipText, String(form.year) === String(year) && styles.chipTextOn]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.fieldLabel}>Question</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                multiline
                value={form.question}
                onChangeText={(v) => setField('question', v)}
                placeholder="Type the JAMB question"
                placeholderTextColor="#7D8E8A"
              />
              {['a', 'b', 'c', 'd'].map((letter) => (
                <View key={letter}>
                  <Text style={styles.fieldLabel}>Option {letter.toUpperCase()}</Text>
                  <TextInput
                    style={styles.input}
                    value={form[`option_${letter}`]}
                    onChangeText={(v) => setField(`option_${letter}`, v)}
                    placeholder={`Option ${letter.toUpperCase()}`}
                    placeholderTextColor="#7D8E8A"
                  />
                </View>
              ))}

              <Text style={styles.fieldLabel}>Correct answer</Text>
              <View style={styles.chipWrap}>
                {['A', 'B', 'C', 'D'].map((letter) => (
                  <TouchableOpacity
                    key={letter}
                    style={[styles.chip, form.answer === letter && styles.chipOn]}
                    onPress={() => setField('answer', letter)}
                  >
                    <Text style={[styles.chipText, form.answer === letter && styles.chipTextOn]}>{letter}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Explanation</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                multiline
                value={form.explanation}
                onChangeText={(v) => setField('explanation', v)}
                placeholder="Why this is the answer"
                placeholderTextColor="#7D8E8A"
              />

              <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveOne} disabled={saving}>
                {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryBtnText}>Upload question</Text>}
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Bulk JSON upload</Text>
              <Text style={styles.muted}>
                Paste an array of questions. Each item needs subject_id, year, question, option_a–d, answer, and optional explanation.
              </Text>
              <TextInput
                style={[styles.input, styles.textarea, { minHeight: 140, marginTop: 10 }]}
                multiline
                value={bulkText}
                onChangeText={setBulkText}
                placeholder='[{"subject_id":"english","year":2023,"question":"...","option_a":"...","option_b":"...","option_c":"...","option_d":"...","answer":"A"}]'
                placeholderTextColor="#7D8E8A"
              />
              {Platform.OS === 'web' ? (
                <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#0F8A72' }]} onPress={pickJsonFile}>
                  <Text style={styles.primaryBtnText}>Choose JSON file</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.primaryBtn} onPress={handleBulk} disabled={saving}>
                <Text style={styles.primaryBtnText}>Upload JSON</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Coverage by subject</Text>
              {overview.length === 0 ? (
                <Text style={styles.muted}>No past questions uploaded yet.</Text>
              ) : overview.map((row) => (
                <Text key={`${row.subject_id}-${row.year}`} style={styles.listMeta}>
                  {subjectName(row.subject_id)} · {row.year} · {row.count} questions
                </Text>
              ))}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={[styles.chipWrap, { flexWrap: 'nowrap' }]}>
                <TouchableOpacity
                  style={[styles.chip, !filterSubject && styles.chipOn]}
                  onPress={() => setFilterSubject('')}
                >
                  <Text style={[styles.chipText, !filterSubject && styles.chipTextOn]}>All</Text>
                </TouchableOpacity>
                {SUBJECTS.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.chip, filterSubject === item.id && styles.chipOn]}
                    onPress={() => setFilterSubject(item.id)}
                  >
                    <Text style={[styles.chipText, filterSubject === item.id && styles.chipTextOn]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {loading && library.length === 0 ? <ActivityIndicator color="#14283D" /> : null}
            {library.map((item) => (
              <View key={item.id} style={styles.card}>
                <Text style={styles.listMeta}>{subjectName(item.subject_id)} · {item.year} · {item.answer}</Text>
                <Text style={[styles.listTitle, { marginTop: 6 }]}>{item.question}</Text>
                <Text style={styles.listMeta}>A. {item.option_a}</Text>
                <Text style={styles.listMeta}>B. {item.option_b}</Text>
                <Text style={styles.listMeta}>C. {item.option_c}</Text>
                <Text style={styles.listMeta}>D. {item.option_d}</Text>
                <TouchableOpacity style={[styles.dangerBtn, { marginTop: 10, alignSelf: 'flex-start' }]} onPress={() => handleDelete(item)}>
                  <Text style={styles.dangerBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))}

            {library.length < total ? (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => loadLibrary(page + 1)}>
                <Text style={styles.primaryBtnText}>Load more</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
