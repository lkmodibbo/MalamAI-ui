import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfileKey } from './useStudentProfile';
import { hasAuthToken, saveProfileRemote } from '../services/apiService';
import useIsMounted from './useIsMounted';

const EXAM_DATE_KEY = 'exam_date';
const EXAM_START_KEY = 'exam_start_date';
const MS_PER_DAY = 86400000;

async function getAuthUser() {
  try {
    const raw = await AsyncStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function getScopedKey(key) {
  const user = await getAuthUser();
  const scope = user?.id || user?.email || null;
  return scope ? `${key}:${scope}` : key;
}

async function getStoredDate(key) {
  try {
    const scopedKey = await getScopedKey(key);
    const raw = await AsyncStorage.getItem(scopedKey);
    if (!raw) return null;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch (error) {
    console.warn('[useExamCountdown] failed to read date', error);
    return null;
  }
}

async function getExamDateFromProfile() {
  try {
    const profileKey = await getProfileKey();
    const raw = await AsyncStorage.getItem(profileKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.examDate) return null;
    const date = new Date(parsed.examDate);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

async function persistDate(key, date) {
  try {
    const scopedKey = await getScopedKey(key);
    await AsyncStorage.setItem(scopedKey, date.toISOString());
  } catch (error) {
    console.warn('[useExamCountdown] failed to save date', error);
  }
}

async function persistDateToProfile(date) {
  try {
    const profileKey = await getProfileKey();
    const raw = await AsyncStorage.getItem(profileKey);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed.examDate = date.toISOString();
    await AsyncStorage.setItem(profileKey, JSON.stringify(parsed));
  } catch (error) {
    console.warn('[useExamCountdown] failed to sync date to profile', error);
  }
}

export default function useExamCountdown() {
  const [examDate, setExamDateState] = useState(null);
  const [startDate, setStartDateState] = useState(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useIsMounted();

  const loadDates = useCallback(async () => {
    // Try dedicated key first, fall back to student_profile
    const storedExam = (await getStoredDate(EXAM_DATE_KEY)) || (await getExamDateFromProfile());
    const storedStart = await getStoredDate(EXAM_START_KEY);

    // If we found a date in profile but not in the dedicated key, backfill it
    if (storedExam && !(await getStoredDate(EXAM_DATE_KEY))) {
      await persistDate(EXAM_DATE_KEY, storedExam);
    }

    if (!isMounted()) return;
    setExamDateState(storedExam);
    setStartDateState(storedStart);
    setLoading(false);
  }, [isMounted]);

  useEffect(() => {
    loadDates();
  }, [loadDates]);

  const setExamDate = useCallback(async (date) => {
    const parsed = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('Invalid date provided.');
    }

    const existingStart = startDate || new Date();
    // Write to both keys so both hooks stay in sync
    await persistDate(EXAM_DATE_KEY, parsed);
    await persistDateToProfile(parsed);
    try {
      if (await hasAuthToken()) {
        await saveProfileRemote({ examDate: parsed.toISOString() });
      }
    } catch (error) {
      console.warn('[useExamCountdown] remote exam date sync skipped', error.message);
    }
    if (!startDate) {
      await persistDate(EXAM_START_KEY, existingStart);
    }
    if (isMounted()) {
      setExamDateState(parsed);
      setStartDateState(existingStart);
    }
    return parsed;
  }, [startDate, isMounted]);

  const daysRemaining = useMemo(() => {
    if (!examDate) return null;
    const exam = new Date(examDate);
    const now = new Date();
    exam.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return Math.ceil((exam.getTime() - now.getTime()) / MS_PER_DAY);
  }, [examDate]);

  const progressPercent = useMemo(() => {
    if (!examDate || !startDate) return 0;
    const now = new Date().getTime();
    const startMs = startDate.getTime();
    const endMs = examDate.getTime();
    if (endMs <= startMs) return 100;
    const elapsed = Math.min(Math.max(now - startMs, 0), endMs - startMs);
    return Math.round((elapsed / (endMs - startMs)) * 100);
  }, [examDate, startDate]);

  return {
    examDate,
    startDate,
    daysRemaining,
    progressPercent,
    setExamDate,
    loading,
  };
}
