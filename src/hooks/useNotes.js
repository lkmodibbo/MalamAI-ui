import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTES_PREFIX = 'notes_';

function slugify(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function noteKey(subjectId, topic) {
  return `${NOTES_PREFIX}${String(subjectId || 'unknown')}_${slugify(topic || 'general')}`;
}

async function parseStoredNoteValue(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('[useNotes] failed to parse note', error);
    return null;
  }
}

async function getStoredNoteKeys() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return keys.filter((key) => key.startsWith(NOTES_PREFIX));
  } catch (error) {
    console.warn('[useNotes] failed to list keys', error);
    return [];
  }
}

async function queryNotes() {
  const keys = await getStoredNoteKeys();
  if (keys.length === 0) return [];

  const entries = await AsyncStorage.multiGet(keys);
  return entries.reduce((acc, [key, value]) => {
    const note = parseStoredNoteValue(value);
    if (note) {
      acc.push({ key, ...note });
    }
    return acc;
  }, []);
}

function groupNotesBySubject(notes) {
  const groups = notes.reduce((acc, note) => {
    const subjectKey = note.subjectId || note.subjectName || 'unknown';
    if (!acc[subjectKey]) {
      acc[subjectKey] = {
        subjectId: note.subjectId,
        subjectName: note.subjectName,
        subjectEmoji: note.subjectEmoji,
        notes: [],
      };
    }
    acc[subjectKey].notes.push(note);
    return acc;
  }, {});

  return Object.values(groups).map((group) => ({
    ...group,
    notes: group.notes.sort((a, b) => b.timestamp - a.timestamp),
  })).sort((a, b) => String(a.subjectName).localeCompare(String(b.subjectName)));
}

export default function useNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshNotes = useCallback(async () => {
    const allNotes = await queryNotes();
    const grouped = groupNotesBySubject(allNotes);
    setNotes(grouped);
    setLoading(false);
    return grouped;
  }, []);

  useEffect(() => {
    refreshNotes();
  }, [refreshNotes]);

  const saveNote = useCallback(async (subject, topic, noteText) => {
    if (!subject || !topic) {
      throw new Error('Subject and topic are required to save a note.');
    }

    const key = noteKey(subject.id, topic);
    const entry = {
      topic: String(topic).trim(),
      subjectId: String(subject.id || '').trim(),
      subjectName: String(subject.name || '').trim(),
      subjectEmoji: String(subject.emoji || '').trim(),
      note: String(noteText || '').trim(),
      timestamp: Date.now(),
    };

    await AsyncStorage.setItem(key, JSON.stringify(entry));
    await refreshNotes();
    return entry;
  }, [refreshNotes]);

  const updateNote = useCallback(async (subject, topic, noteText) => {
    return saveNote(subject, topic, noteText);
  }, [saveNote]);

  const deleteNote = useCallback(async (subject, topic) => {
    if (!subject || !topic) {
      throw new Error('Subject and topic are required to delete a note.');
    }

    const key = noteKey(subject.id, topic);
    await AsyncStorage.removeItem(key);
    await refreshNotes();
  }, [refreshNotes]);

  const getNotesBySubject = useCallback(async () => {
    return refreshNotes();
  }, [refreshNotes]);

  const getNote = useCallback(async (subject, topic) => {
    if (!subject || !topic) return null;
    const key = noteKey(subject.id, topic);
    const raw = await AsyncStorage.getItem(key);
    const note = raw ? await parseStoredNoteValue(raw) : null;
    return note ? { key, ...note } : null;
  }, []);

  return {
    notes,
    loading,
    refreshNotes,
    saveNote,
    getNotesBySubject,
    updateNote,
    deleteNote,
    getNote,
  };
}
