import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import useNotes from '../hooks/useNotes';
import SubjectBadge from '../components/SubjectBadge';

export default function EditNoteScreen({ route, navigation }) {
  const { note } = route.params || {};
  const { updateNote } = useNotes();
  const [noteText, setNoteText] = useState(note?.note || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleSave = async () => {
    if (!note || !note.subjectId || !note.topic) return;
    if (!noteText.trim()) {
      Alert.alert('Note is empty', 'Please type something before saving.');
      return;
    }

    setSaving(true);
    try {
      await updateNote(
        { id: note.subjectId, name: note.subjectName },
        note.topic,
        noteText
      );
      navigation.goBack();
    } catch (error) {
      console.warn('[EditNoteScreen] save failed', error);
      Alert.alert('Save failed', 'Unable to update the note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save changes'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>Edit note for</Text>
        <View style={styles.topicRow}>
          <SubjectBadge name={note?.subjectName} size="sm" />
          <Text style={styles.topicLabel}>{note?.topic}</Text>
        </View>
        <TextInput
          style={styles.input}
          value={noteText}
          onChangeText={setNoteText}
          placeholder="Update your notes here…"
          multiline
          textAlignVertical="top"
          placeholderTextColor="#9aa299"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecefe7',
  },
  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  backText: {
    color: '#0F8A72',
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: '#0F8A72',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  body: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F8A72',
    marginBottom: 4,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  topicLabel: {
    color: '#4b6d4d',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d7ded5',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#f8faf6',
    color: '#222',
    fontSize: 16,
    lineHeight: 22,
  },
});
