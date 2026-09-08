import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useIsMounted from './useIsMounted';

/**
 * Tracks onboarding / setup progress for the dashboard progress bar.
 *
 * Steps:
 *  1. Profile name set
 *  2. Exam date set
 *  3. At least one topic visited (learn mode)
 *  4. At least one quiz completed (score screen reached)
 */

const TOPIC_VISITED_KEY  = 'progress_topic_visited';
const QUIZ_DONE_KEY      = 'progress_quiz_done';

async function getScopedKey(key) {
  try {
    const raw = await AsyncStorage.getItem('auth_user');
    const user = raw ? JSON.parse(raw) : null;
    const scope = user?.id || user?.email || null;
    return scope ? `${key}:${scope}` : key;
  } catch {
    return key;
  }
}

/** Call this from LearnScreen when the explanation loads */
export async function markTopicVisited() {
  try {
    const key = await getScopedKey(TOPIC_VISITED_KEY);
    await AsyncStorage.setItem(key, 'true');
  } catch (e) {
    console.warn('[useSetupProgress] markTopicVisited failed', e);
  }
}

/** Call this from ScoreScreen on mount */
export async function markQuizDone() {
  try {
    const key = await getScopedKey(QUIZ_DONE_KEY);
    await AsyncStorage.setItem(key, 'true');
  } catch (e) {
    console.warn('[useSetupProgress] markQuizDone failed', e);
  }
}

export default function useSetupProgress(profile) {
  const [steps, setSteps] = useState({
    nameSet:      false,
    examDateSet:  false,
    topicVisited: false,
    quizDone:     false,
  });
  const isMounted = useIsMounted();

  const refresh = useCallback(async () => {
    try {
      const [tvKey, qdKey] = await Promise.all([
        getScopedKey(TOPIC_VISITED_KEY),
        getScopedKey(QUIZ_DONE_KEY),
      ]);
      const [tv, qd] = await Promise.all([
        AsyncStorage.getItem(tvKey),
        AsyncStorage.getItem(qdKey),
      ]);

      if (!isMounted()) return;
      setSteps({
        nameSet:      Boolean(profile?.name?.trim()),
        examDateSet:  Boolean(profile?.examDate),
        topicVisited: tv === 'true',
        quizDone:     qd === 'true',
      });
    } catch (e) {
      console.warn('[useSetupProgress] refresh failed', e);
    }
  }, [profile?.name, profile?.examDate, isMounted]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const completedCount = Object.values(steps).filter(Boolean).length;
  const totalSteps = 4;
  const percent = Math.round((completedCount / totalSteps) * 100);
  const isComplete = completedCount === totalSteps;

  return { steps, completedCount, totalSteps, percent, isComplete, refresh };
}
