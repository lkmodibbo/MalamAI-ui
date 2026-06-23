import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SRS_STORAGE_KEY = 'srs_queue';
const ONE_DAY_MS = 86400000;

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

  const refreshQueue = useCallback(async () => {
    const stored = await getStoredQueue();
    setQueue(stored);
    setLoading(false);
    return stored;
  }, []);

  useEffect(() => {
    refreshQueue();
  }, [refreshQueue]);

  const dueQuestions = useMemo(() => {
    const now = Date.now();
    return queue.filter((item) => item?.nextReviewDate <= now);
  }, [queue]);

  const dueCount = dueQuestions.length;

  const saveMissedQuestions = useCallback(async (questions = [], selectedAnswers = {}, topic, subjectId) => {
    const storedQueue = await getStoredQueue();
    const queueByQuestion = new Map(storedQueue.map((item) => [item.question, item]));
    const now = Date.now();

    questions.forEach((item, index) => {
      const selected = String(selectedAnswers[index] || '').trim().toUpperCase();
      const correct = String(item.answer || '').trim().toUpperCase();

      if (!selected || selected !== correct) {
        const nextReviewDate = now + ONE_DAY_MS;
        queueByQuestion.set(item.question, {
          question: item.question,
          options: item.options,
          answer: correct,
          explanation: String(item.explanation || '').trim(),
          topic: topic || '',
          subjectId: subjectId || '',
          nextReviewDate,
          interval: ONE_DAY_MS,
        });
      }
    });

    const updatedQueue = Array.from(queueByQuestion.values());
    await persistQueue(updatedQueue);
    setQueue(updatedQueue);
    return updatedQueue;
  }, []);

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

      const currentInterval = Number(existing.interval) || ONE_DAY_MS;
      const nextInterval = isCorrect ? currentInterval * 2 : ONE_DAY_MS;
      const nextReviewDate = now + nextInterval;

      queueByQuestion.set(question, {
        ...existing,
        interval: nextInterval,
        nextReviewDate,
      });
    });

    const updatedQueue = Array.from(queueByQuestion.values());
    await persistQueue(updatedQueue);
    setQueue(updatedQueue);
    return updatedQueue;
  }, []);

  return {
    queue,
    loading,
    dueQuestions,
    dueCount,
    refreshQueue,
    saveMissedQuestions,
    getDueReviewQuestions,
    markQuestionsReviewed,
  };
}
