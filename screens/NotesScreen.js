import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import useNotes from '../src/hooks/useNotes';

export default function NotesScreen({ navigation }) {
  const { notes, loading, deleteNote, getNotesBySubject } = useNotes();
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    let mounted = true;
    getNotesBySubject().then((data) => {
      if (mounted) setGroups(data);
    }).catch((error) => {
      console.warn('[NotesScreen] failed to load notes', error);
    });

    return () => { mounted = false; };
  }, [getNotesBySubject]);

  const handleDelete = (subject, topic) => {
    Alert.alert(
      'Delete note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteNote(subject, topic);
              const updated = await getNotesBySubject();
              setGroups(updated);
            } catch (error) {
              console.warn('[NotesScreen] delete failed', error);
            }
          },
        },
      ]
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No notes yet.</Text>
      <Text style={styles.emptySubtitle}>Go to a topic and add your first note!</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>My Notes</Text>

        {loading ? (
          <Text style={styles.loadingText}>Loading notes...</Text>
        ) : groups.length === 0 ? (
          renderEmpty()
        ) : (
          groups.map((group) => (
            <View key={group.subjectId || group.subjectName} style={styles.groupBlock}>
              <Text style={styles.groupHeader}>{group.subjectEmoji} {group.subjectName}</Text>
              {group.notes.map((note) => (
                <View key={note.key} style={styles.noteCard}>
                  <View style={styles.noteHeader}>
                    <Text style={styles.noteTopic}>{note.topic}</Text>
                    <Text style={styles.noteTime}>{new Date(note.timestamp).toLocaleString()}</Text>
                  </View>
                  <Text style={styles.notePreview} numberOfLines={3}>
                    {note.note}
                  </Text>
                  <View style={styles.noteActions}>
                    <TouchableOpacity
                      style={styles.smallButton}
                      onPress={() => navigation.navigate('EditNote', { note })}
                    >
                      <Text style={styles.smallButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.smallButton, styles.deleteButton]}
                      onPress={() => handleDelete({ id: note.subjectId, name: note.subjectName, emoji: note.subjectEmoji }, note.topic)}
                    >
                      <Text style={[styles.smallButtonText, styles.deleteButtonText]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f7f2',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0a7c4f',
    marginBottom: 18,
  },
  loadingText: {
    color: '#4b5d47',
    fontSize: 14,
  },
  emptyState: {
    marginTop: 36,
    alignItems: 'center',
    padding: 24,
    borderRadius: 18,
    backgroundColor: '#eaf8ee',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0a7c4f',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#4b5d47',
    fontSize: 14,
    textAlign: 'center',
  },
  groupBlock: {
    marginBottom: 24,
  },
  groupHeader: {
    color: '#0a7c4f',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  noteCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d7ded5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  noteTopic: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0a7c4f',
    flex: 1,
    marginRight: 12,
  },
  noteTime: {
    color: '#7a7a7a',
    fontSize: 12,
  },
  notePreview: {
    color: '#333',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  noteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#0a7c4f',
  },
  smallButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d7ded5',
    marginLeft: 10,
  },
  deleteButtonText: {
    color: '#b00020',
  },
});
