import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SUBJECTS from '../constants/subjects';
import { getSubjects } from '../services/apiService';

// Four screens use this hook and each remount refetches. Holding the merged
// result here keeps navigation between them from hitting the network again.
let cachedSubjects = null;
const SUBJECTS_CACHE_KEY = 'subjects_cache';

export default function useSubjects() {
  const [subjects, setSubjects] = useState(cachedSubjects || SUBJECTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      // Try to hydrate from AsyncStorage first for offline support.
      try {
        if (!cachedSubjects) {
          const raw = await AsyncStorage.getItem(SUBJECTS_CACHE_KEY);
          if (raw) {
            cachedSubjects = JSON.parse(raw);
            if (mounted) setSubjects(cachedSubjects);
          }
        }
      } catch (err) {
        // ignore storage errors and continue to network fetch
      }
      try {
        const data = await getSubjects();
        const rows = data.subjects || [];
        if (!rows.length) return;

        // /subjects returns each subject's topics, so the local list is only a
        // fallback for subjects the server does not know about yet.
        const merged = rows.map((row) => {
          const local = SUBJECTS.find((item) => item.id === row.id);
          const remoteTopics = Array.isArray(row.topics) ? row.topics.filter(Boolean) : [];
          return {
            id: row.id,
            name: row.name || local?.name || row.id,
            color: local?.color || '#14283D',
            topics: remoteTopics.length > 0 ? remoteTopics : (local?.topics || []),
          };
        });

        const seen = new Set(merged.map((item) => item.id));
        SUBJECTS.forEach((item) => {
          if (!seen.has(item.id)) merged.push(item);
        });

        cachedSubjects = merged;
        // persist merged subjects for offline use
        try {
          await AsyncStorage.setItem(SUBJECTS_CACHE_KEY, JSON.stringify(merged));
        } catch (err) {
          // ignore storage failures
        }
        if (mounted) setSubjects(merged);
      } catch {
        if (mounted) setSubjects(cachedSubjects || SUBJECTS);
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  return { subjects, loading };
}
