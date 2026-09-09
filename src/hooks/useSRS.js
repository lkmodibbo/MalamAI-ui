import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useIsMounted from './useIsMounted';

const SRS_STORAGE_KEY = 'srs_queue';
const ONE_DAY_MS = 86400000;
const DEFAULT_EF = 2.5; // ease factor for SM-2-like scheduling

async function getStoredQueue() {
  try {
    const raw = await AsyncStorage.getItem(SRS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('[useSRS] failed to read queue', error);
    return [];
  }
}

async function persistQueue(queue) {
  try {
    await AsyncStorage.setItem(SRS_STORAGE_KEY, JSON.stringify(queue));
    return queue;
  } catch (error) {
    console.warn('[useSRS] failed to save queue', error);
    return queue;
  }
}

export default function useSRS() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const isMounted = useIsMounted();

  // Helper: schedule next review using a simplified SM-2 algorithm
  const scheduleNextFor = useCallback((existing, isCorrect) => {
    const now = Date.now();
    const item = { ...existing };
    item.reviewsCount = Number(item.reviewsCount || 0);
    item.repetitions = Number(item.repetitions || 0);
    item.interval = Number(item.interval || ONE_DAY_MS);
    item.ef = Number(item.ef || DEFAULT_EF);

    if (isCorrect) {
      item.repetitions += 1;
      item.reviewsCount += 1;
      if (item.repetitions === 1) {
        item.interval = ONE_DAY_MS;
      } else if (item.repetitions === 2) {
        item.interval = 6 * ONE_DAY_MS;
      } else {
        item.interval = Math.round(item.interval * item.ef);
      }
      // slightly increase EF on correct
      item.ef = Math.max(1.3, item.ef + 0.05);
    } else {
      // reset repetition but keep it in queue for quick review
      item.repetitions = 0;
      item.reviewsCount += 1;
      item.interval = ONE_DAY_MS;
      item.ef = Math.max(1.3, item.ef - 0.2);
    }
    item.lastReviewed = new Date(now).toISOString();
    item.nextReviewDate = now + item.interval;
    return item;
  }, []);

  const refreshQueue = useCallback(async () => {
    const stored = await getStoredQueue();
    if (isMounted()) {
      setQueue(stored);
      setLoading(false);
    }
    return stored;
  }, [isMounted]);

  const removeQuestion = useCallback(async (questionText) => {
    const stored = await getStoredQueue();
    const filtered = stored.filter((q) => q.question !== questionText);
    await persistQueue(filtered);
    if (isMounted()) setQueue(filtered);
    return filtered;
  }, [isMounted]);

  const clearQueue = useCallback(async () => {
    await persistQueue([]);
    if (isMounted()) setQueue([]);
    return [];
  }, [isMounted]);

  useEffect(() => {
    refreshQueue();
  }, [refreshQueue]);

  const dueQuestions = useMemo(() => {
    const now = Date.now();
    return queue.filter((item) => item?.nextReviewDate <= now);
  }, [queue]);

  const dueCount = dueQuestions.length;

  const getMasteryStats = useCallback(() => {
    const bySubject = {};
    queue.forEach((q) => {
      const sub = q.subjectId || 'unknown';
      bySubject[sub] = bySubject[sub] || { total: 0, mastered: 0 };
      bySubject[sub].total += 1;
      if ((Number(q.repetitions) || 0) >= 3) bySubject[sub].mastered += 1;
    });
    const stats = Object.keys(bySubject).map((sub) => ({
      subjectId: sub,
      total: bySubject[sub].total,
      mastered: bySubject[sub].mastered,
      masteryPercent: Math.round((bySubject[sub].mastered / bySubject[sub].total) * 100),
    }));
    return stats;
  }, [queue]);

  const getQuestionHistory = useCallback((questionText) => {
    if (!questionText) return null;
    const found = queue.find((q) => q.question === questionText);
    if (!found) return null;
    return {
      lastReviewed: found.lastReviewed || null,
      repetitions: Number(found.repetitions || 0),
      reviewsCount: Number(found.reviewsCount || 0),
      ef: Number(found.ef || DEFAULT_EF),
      nextReviewDate: found.nextReviewDate || null,
      subjectId: found.subjectId || null,
    };
  }, [queue]);

  const getUpcomingReviews = useCallback((days = 7) => {
    const now = Date.now();
    const end = now + days * ONE_DAY_MS;
    const buckets = {};
    queue.forEach((q) => {
      if (!q.nextReviewDate || q.nextReviewDate < now || q.nextReviewDate > end) return;
      const day = new Date(q.nextReviewDate);
      day.setHours(0, 0, 0, 0);
      const key = day.toISOString().slice(0, 10);
      buckets[key] = buckets[key] || [];
      buckets[key].push(q);
    });
    return buckets;
  }, [queue]);

  const saveMissedQuestions = useCallback(async (questions = [], selectedAnswers = {}, topic, subjectId) => {
    const storedQueue = await getStoredQueue();
    const queueByQuestion = new Map(storedQueue.map((item) => [item.question, item]));
    const now = Date.now();

    questions.forEach((item, index) => {
      const selected = String(selectedAnswers[index] || '').trim().toUpperCase();
      const correct = String(item.answer || '').trim().toUpperCase();

      if (!selected || selected !== correct) {
        const base = queueByQuestion.get(item.question) || {};
        const merged = {
          question: item.question,
          options: item.options,
          answer: correct,
          explanation: String(item.explanation || '').trim(),
          topic: topic || base.topic || '',
          subjectId: subjectId || base.subjectId || '',
          interval: base.interval || ONE_DAY_MS,
          ef: base.ef || DEFAULT_EF,
          repetitions: base.repetitions || 0,
          reviewsCount: base.reviewsCount || 0,
        };
        const scheduled = scheduleNextFor(merged, false);
        queueByQuestion.set(item.question, scheduled);
      }
    });

    const updatedQueue = Array.from(queueByQuestion.values());
    await persistQueue(updatedQueue);
    if (isMounted()) setQueue(updatedQueue);
    return updatedQueue;
  }, [isMounted]);

  const getDueReviewQuestions = useCallback(async () => {
    const stored = await getStoredQueue();
    const now = Date.now();
    return stored.filter((item) => item?.nextReviewDate <= now);
  }, []);

  const markQuestionsReviewed = useCallback(async (results = []) => {
    const storedQueue = await getStoredQueue();
    const queueByQuestion = new Map(storedQueue.map((item) => [item.question, item]));
    const now = Date.now();

    results.forEach(({ question, isCorrect }) => {
      const existing = queueByQuestion.get(question);
      if (!existing) return;
      const scheduled = scheduleNextFor(existing, !!isCorrect);
      queueByQuestion.set(question, scheduled);
    });

    const updatedQueue = Array.from(queueByQuestion.values());
    await persistQueue(updatedQueue);
    if (isMounted()) setQueue(updatedQueue);
    return updatedQueue;
  }, [isMounted]);

  return {
    queue,
    loading,
    dueQuestions,
    dueCount,
    refreshQueue,
    saveMissedQuestions,
    getDueReviewQuestions,
    markQuestionsReviewed,
    getMasteryStats,
    getUpcomingReviews,
    removeQuestion,
    clearQueue,
    getQuestionHistory,
  };
}
