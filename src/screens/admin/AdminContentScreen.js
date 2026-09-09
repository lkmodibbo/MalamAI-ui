import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  addAdminPracticeQuestion,
  addAdminSubject,
  addAdminTopic,
  bulkAddAdminPracticeQuestions,
  deleteAdminPracticeQuestion,
  restoreAdminPracticeQuestion,
  deleteAdminSubject,
  deleteAdminTopic,
  getAdminOverview,
  getAdminPracticeQuestions,
  getAdminTopics,
} from '../../services/apiService';
import SubjectBadge from '../../components/SubjectBadge';
import { adminStyles as styles } from './adminStyles';

export default function AdminContentScreen({ navigation }) {
  const [tab, setTab] = useState('subjects');
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [subjectForm, setSubjectForm] = useState({ id: '', name: '' });
  const [topicName, setTopicName] = useState('');
  const [questionForm, setQuestionForm] = useState({
    subject_id: 'english',
    question: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    answer: 'A',
    explanation: '',
  });
  const [bulkText, setBulkText] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState(new Set());
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
        const [overview, topicData, questionData] = await Promise.all([
          getAdminOverview(),
          getAdminTopics(subjectFilter),
          getAdminPracticeQuestions({ subject: subjectFilter, limit: 20, deleted: tab === 'trash' }),
        ]);
      setSubjects(overview.subjects || []);
      setTopics(topicData.topics || []);
      setQuestions(questionData.questions || []);
    } catch (err) {
      setError(err.message || 'Could not load content.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [subjectFilter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const flash = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 2500);
  };

  const toggleSelectQuestion = (id) => {
    setSelectedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const buildQuestionsCSV = (items) => {
    const escape = (v) => {
      if (v === null || v === undefined) return '';
      const s = typeof v === 'string' ? v : JSON.stringify(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const header = ['id','subject_id','topic_id','question','option_a','option_b','option_c','option_d','answer','explanation','year','created_at'];
    const lines = [header.join(',')];
    for (const it of items) {
      lines.push([
        it.id,
        it.subject_id || it.subject_name || '',
        it.topic_id || '',
        it.question || '',
        it.option_a || '',
        it.option_b || '',
        it.option_c || '',
        it.option_d || '',
        it.answer || '',
        it.explanation || '',
        it.year || '',
        it.created_at || '',
      ].map(escape).join(','));
    }
    return lines.join('\n');
  };

  const exportSelectedQuestions = () => {
    const sel = questions.filter((q) => selectedQuestions.has(q.id));
    if (sel.length === 0) return Alert.alert('No selection', 'Pick some questions to export.');
    setExporting(true);
    try {
      const csv = buildQuestionsCSV(sel);
      setCsvContent(csv);
      setCsvOpen(true);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not build CSV');
    } finally {
      setExporting(false);
    }
  };

  const deleteSelectedQuestions = async () => {
    const sel = Array.from(selectedQuestions);
    if (sel.length === 0) return Alert.alert('No selection', 'Pick some questions to delete.');
    Alert.alert('Confirm delete', `Delete ${sel.length} questions? This will soft-delete them.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await Promise.all(sel.map((id) => deleteAdminPracticeQuestion(id)));
          setSelectedQuestions(new Set());
          setSelectMode(false);
          load();
        } catch (err) {
          Alert.alert('Error', err.message || 'Bulk delete failed');
        }
      } }
    ]);
  };

  const confirmDelete = (title, onYes) => {
    Alert.alert(title, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onYes },
    ]);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerSide} onPress={() => navigation.goBack()}>
          <Text style={styles.headerAction}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Content</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        <View style={styles.tabRow}>
          {['subjects', 'topics', 'questions', 'trash'].map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.tab, tab === item && styles.tabOn]}
              onPress={() => setTab(item)}
            >
              <Text style={[styles.tabText, tab === item && styles.tabTextOn]}>
                {item[0].toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <ActivityIndicator color="#14283D" /> : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={[styles.chipWrap, { flexWrap: 'nowrap' }]}>
            <TouchableOpacity
              style={[styles.chip, !subjectFilter && styles.chipOn]}
              onPress={() => setSubjectFilter('')}
            >
              <Text style={[styles.chipText, !subjectFilter && styles.chipTextOn]}>All</Text>
            </TouchableOpacity>
            {subjects.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.chip, subjectFilter === item.id && styles.chipOn]}
                onPress={() => {
                  setSubjectFilter(item.id);
                  setQuestionForm((prev) => ({ ...prev, subject_id: item.id }));
                }}
              >
                <Text style={[styles.chipText, subjectFilter === item.id && styles.chipTextOn]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {tab === 'subjects' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Add subject</Text>
              <TextInput style={styles.input} placeholder="id e.g. mathematics" placeholderTextColor="#7D8E8A" value={subjectForm.id} onChangeText={(v) => setSubjectForm((p) => ({ ...p, id: v }))} autoCapitalize="none" />
              <TextInput style={[styles.input, { marginTop: 8 }]} placeholder="Name" placeholderTextColor="#7D8E8A" value={subjectForm.name} onChangeText={(v) => setSubjectForm((p) => ({ ...p, name: v }))} />
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={async () => {
                  try {
                    await addAdminSubject(subjectForm);
                    setSubjectForm({ id: '', name: '' });
                    flash('Subject saved.');
                    load();
                  } catch (err) {
                    setError(err.message);
                  }
                }}
              >
                <Text style={styles.primaryBtnText}>Save subject</Text>
              </TouchableOpacity>
            </View>
            {subjects.map((item) => (
              <View key={item.id} style={styles.listRow}>
                <SubjectBadge name={item.name} size="md" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle}>{item.name}</Text>
                  <Text style={styles.listMeta}>{item.id} · {item.topic_count} topics</Text>
                </View>
                <TouchableOpacity
                  style={styles.dangerBtn}
                  onPress={() => confirmDelete('Delete subject?', async () => {
                    await deleteAdminSubject(item.id);
                    load();
                  })}
                >
                  <Text style={styles.dangerBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        ) : null}

        {tab === 'topics' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Add topic</Text>
              <Text style={styles.muted}>Select a subject chip above, then add a topic name.</Text>
              <TextInput style={[styles.input, { marginTop: 10 }]} placeholder="Topic name" placeholderTextColor="#7D8E8A" value={topicName} onChangeText={setTopicName} />
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={async () => {
                  if (!subjectFilter) {
                    setError('Pick a subject first.');
                    return;
                  }
                  try {
                    await addAdminTopic({ subject_id: subjectFilter, name: topicName });
                    setTopicName('');
                    flash('Topic added.');
                    load();
                  } catch (err) {
                    setError(err.message);
                  }
                }}
              >
                <Text style={styles.primaryBtnText}>Save topic</Text>
              </TouchableOpacity>
            </View>
            {topics.map((item) => (
              <View key={item.id} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle}>{item.name}</Text>
                  <Text style={styles.listMeta}>{item.subject_name}</Text>
                </View>
                <TouchableOpacity
                  style={styles.dangerBtn}
                  onPress={() => confirmDelete('Delete topic?', async () => {
                    await deleteAdminTopic(item.id);
                    load();
                  })}
                >
                  <Text style={styles.dangerBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        ) : null}

        {tab === 'questions' ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
              <TouchableOpacity style={[styles.smallPill, { marginRight: 8 }]} onPress={() => { setSelectMode((s) => !s); if (selectMode) setSelectedQuestions(new Set()); }}>
                <Text style={styles.smallPillText}>{selectMode ? 'Cancel' : 'Select'}</Text>
              </TouchableOpacity>
              {selectMode ? (
                <>
                  <TouchableOpacity style={[styles.primaryBtn, { marginRight: 8 }]} onPress={exportSelectedQuestions}><Text style={styles.primaryBtnText}>{exporting ? 'Exporting...' : 'Export'}</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.dangerBtn} onPress={deleteSelectedQuestions}><Text style={styles.dangerBtnText}>Delete</Text></TouchableOpacity>
                </>
              ) : null}
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Add practice question</Text>
              <TextInput style={[styles.input, styles.textarea]} multiline placeholder="Question" placeholderTextColor="#7D8E8A" value={questionForm.question} onChangeText={(v) => setQuestionForm((p) => ({ ...p, question: v }))} />
              {['a', 'b', 'c', 'd'].map((letter) => (
                <TextInput
                  key={letter}
                  style={[styles.input, { marginTop: 8 }]}
                  placeholder={`Option ${letter.toUpperCase()}`}
                  placeholderTextColor="#7D8E8A"
                  value={questionForm[`option_${letter}`]}
                  onChangeText={(v) => setQuestionForm((p) => ({ ...p, [`option_${letter}`]: v }))}
                />
              ))}
              <View style={[styles.chipWrap, { marginTop: 10 }]}>
                {['A', 'B', 'C', 'D'].map((letter) => (
                  <TouchableOpacity
                    key={letter}
                    style={[styles.chip, questionForm.answer === letter && styles.chipOn]}
                    onPress={() => setQuestionForm((p) => ({ ...p, answer: letter }))}
                  >
                    <Text style={[styles.chipText, questionForm.answer === letter && styles.chipTextOn]}>{letter}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={[styles.input, styles.textarea, { marginTop: 8 }]} multiline placeholder="Explanation" placeholderTextColor="#7D8E8A" value={questionForm.explanation} onChangeText={(v) => setQuestionForm((p) => ({ ...p, explanation: v }))} />
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={async () => {
                  try {
                    await addAdminPracticeQuestion({
                      ...questionForm,
                      subject_id: subjectFilter || questionForm.subject_id,
                    });
                    setQuestionForm((p) => ({ ...p, question: '', option_a: '', option_b: '', option_c: '', option_d: '', explanation: '' }));
                    flash('Practice question saved.');
                    load();
                  } catch (err) {
                    setError(err.message);
                  }
                }}
              >
                <Text style={styles.primaryBtnText}>Save question</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Bulk JSON</Text>
              <TextInput
                style={[styles.input, styles.textarea, { minHeight: 120 }]}
                multiline
                value={bulkText}
                onChangeText={setBulkText}
                placeholder='[{"subject_id":"english","question":"...","option_a":"...","option_b":"...","option_c":"...","option_d":"...","answer":"A"}]'
                placeholderTextColor="#7D8E8A"
              />
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={async () => {
                  try {
                    const parsed = JSON.parse(bulkText);
                    const list = Array.isArray(parsed) ? parsed : parsed.questions;
                    const data = await bulkAddAdminPracticeQuestions(list);
                    flash(data.message || 'Uploaded.');
                    setBulkText('');
                    load();
                  } catch (err) {
                    setError(err.message);
                  }
                }}
              >
                <Text style={styles.primaryBtnText}>Upload JSON</Text>
              </TouchableOpacity>
            </View>

            {questions.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  {selectMode ? (
                    <TouchableOpacity onPress={() => toggleSelectQuestion(item.id)} style={{ width: 36, alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: selectedQuestions.has(item.id) ? '#14283D' : '#fff' }} />
                    </TouchableOpacity>
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listMeta}>{item.subject_name || item.subject_id}</Text>
                    <Text style={[styles.listTitle, { marginTop: 6 }]}>{item.question}</Text>
                  </View>
                </View>
                {!selectMode ? (
                  <TouchableOpacity
                    style={[styles.dangerBtn, { marginTop: 10, alignSelf: 'flex-start' }]}
                    onPress={() => confirmDelete('Delete question?', async () => {
                      await deleteAdminPracticeQuestion(item.id);
                      load();
                    })}
                  >
                    <Text style={styles.dangerBtnText}>Delete</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </>
        ) : null}

        <Modal visible={csvOpen} animationType="slide" onRequestClose={() => setCsvOpen(false)}>
          <View style={{ flex: 1 }}>
            <View style={{ padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '700' }}>Exported CSV</Text>
              <TouchableOpacity onPress={() => setCsvOpen(false)}><Text style={{ color: '#0b5' }}>Close</Text></TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 12 }}>
              <TextInput value={csvContent} multiline editable={false} style={{ minHeight: 300, borderWidth: 1, borderColor: '#eee', padding: 8 }} />
            </ScrollView>
          </View>
        </Modal>

        {tab === 'trash' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Trash — practice questions</Text>
              <Text style={styles.muted}>Soft-deleted practice questions. You can restore them.</Text>
            </View>
            {questions.map((item) => (
              <View key={item.id} style={styles.card}>
                <Text style={styles.listMeta}>{item.subject_name || item.subject_id}</Text>
                <Text style={[styles.listTitle, { marginTop: 6 }]}>{item.question}</Text>
                <TouchableOpacity
                  style={[styles.primaryBtn, { marginTop: 10, alignSelf: 'flex-start' }]}
                  onPress={() => Alert.alert('Restore question', 'Restore this question?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Restore', onPress: async () => { await restoreAdminPracticeQuestion(item.id); load(); } },
                  ])}
                >
                  <Text style={styles.primaryBtnText}>Restore</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
