import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SUBJECTS from '../constants/subjects';
import useIsMounted from './useIsMounted';

const WEAKNESS_LOG_KEY = 'weakness_log';
const MAX_WEAKNESS_ENTRIES = 200;

async function getStoredWeaknessLog() {
  try {
    const raw = await AsyncStorage.getItem(WEAKNESS_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('[useWeaknessTracker] failed to read storage', error);
    return [];
  }
}

async function persistWeaknessLog(entries) {
  try {
    await AsyncStorage.setItem(WEAKNESS_LOG_KEY, JSON.stringify(entries));
    return entries;
  } catch (error) {
    console.warn('[useWeaknessTracker] failed to save storage', error);
    return entries;
  }
}

function summarizeWeakTopics(entries) {
  const map = new Map();

  entries.forEach((entry) => {
    const topic = String(entry.topic || '').trim();
    const subjectId = String(entry.subjectId || '').trim();
    // Older log entries were written without a subject name; recover it from the id
    // so subject badges have something to render.
    const subjectName = String(entry.subjectName || '').trim()
      || SUBJECTS.find((item) => item.id === subjectId)?.name
      || '';
    const key = `${subjectId}||${topic}`;
    const existing = map.get(key) || {
      topic,
      subjectId,
      subjectName,
      count: 0,
      lastSeen: 0,
    };

    existing.count += 1;
    existing.lastSeen = Math.max(existing.lastSeen, entry.timestamp || 0);
    map.set(key, existing);
  });

  return Array.from(map.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.lastSeen - a.lastSeen;
  });
}

export default function useWeaknessTracker() {
  const [weakTopics, setWeakTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const isMounted = useIsMounted();

  const refreshWeakTopics = useCallback(async () => {
    const entries = await getStoredWeaknessLog();
    const summary = summarizeWeakTopics(entries);
    if (isMounted()) {
      setWeakTopics(summary);
      setLoading(false);
    }
    return summary;
  }, [isMounted]);

  useEffect(() => {
    refreshWeakTopics();
  }, [refreshWeakTopics]);

  const logWrongAnswer = useCallback(async (topic, subject = {}, questionText = '') => {
    if (!topic || !subject) return;

    const entries = await getStoredWeaknessLog();
    const nextEntries = [
      ...entries,
      {
        topic: String(topic).trim(),
        subjectId: String(subject.id || subject.subjectId || '').trim(),
        subjectName: String(subject.name || subject.subjectName || '').trim(),
        timestamp: Date.now(),
        questionText: String(questionText || '').trim(),
      },
    ].slice(-MAX_WEAKNESS_ENTRIES);

    await persistWeaknessLog(nextEntries);
    if (isMounted()) setWeakTopics(summarizeWeakTopics(nextEntries));
    return nextEntries;
  }, [isMounted]);

  const getWeakTopics = useCallback(async () => {
    const entries = await getStoredWeaknessLog();
    return summarizeWeakTopics(entries);
  }, []);

  return {
    weakTopics,
    loading,
    refreshWeakTopics,
    logWrongAnswer,
    getWeakTopics,
  };
}
