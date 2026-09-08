import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfileRemote, hasAuthToken, saveProfileRemote } from '../services/apiService';
import useIsMounted from './useIsMounted';

const PROFILE_KEY = 'student_profile';
const ONBOARDING_KEY = 'onboarding_complete';

async function getAuthUser() {
  try {
    const raw = await AsyncStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getUserScope(user) {
  return user?.id || user?.email || null;
}

async function getScopedKey(key) {
  const user = await getAuthUser();
  const scope = getUserScope(user);
  return scope ? `${key}:${scope}` : key;
}

export async function getProfileKey() {
  return getScopedKey(PROFILE_KEY);
}

export async function getOnboardingKey() {
  return getScopedKey(ONBOARDING_KEY);
}

function parseProfile(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed) return null;
    return {
      name: parsed.name || '',
      selectedSubjects: Array.isArray(parsed.selectedSubjects) && parsed.selectedSubjects.length > 0
        ? parsed.selectedSubjects
        : ['english'],
      examDate: parsed.examDate ? new Date(parsed.examDate) : null,
      avatarUri: parsed.avatarUri || null,
    };
  } catch (error) {
    console.warn('[useStudentProfile] parseProfile failed', error);
    return null;
  }
}

export async function getProfile() {
  try {
    const [key, authUser] = await Promise.all([getProfileKey(), getAuthUser()]);
    const raw = await AsyncStorage.getItem(key);
    return parseProfile(raw) || {
      name: authUser?.name || '',
      selectedSubjects: ['english'],
      examDate: null,
      avatarUri: null,
    };
  } catch (error) {
    console.warn('[useStudentProfile] getProfile failed', error);
    return { name: '', selectedSubjects: ['english'], examDate: null, avatarUri: null };
  }
}

export async function saveProfile(profile) {
  try {
    const key = await getProfileKey();
    const examDate =
      profile.examDate instanceof Date
        ? profile.examDate
        : profile.examDate
          ? new Date(profile.examDate)
          : null;
    const normalized = {
      name: (profile.name || '').trim(),
      selectedSubjects: Array.isArray(profile.selectedSubjects) && profile.selectedSubjects.length > 0
        ? profile.selectedSubjects
        : ['english'],
      examDate: examDate && !Number.isNaN(examDate.getTime()) ? examDate.toISOString() : null,
      avatarUri: profile.avatarUri || null,
    };
    await AsyncStorage.setItem(key, JSON.stringify(normalized));
    // Keep the dedicated exam date key in sync so useExamCountdown picks it up immediately.
    if (normalized.examDate) {
      await AsyncStorage.setItem(await getScopedKey('exam_date'), normalized.examDate);
    }
    try {
      if (await hasAuthToken()) {
        const remoteAvatar = normalized.avatarUri
          && (normalized.avatarUri.startsWith('http://') || normalized.avatarUri.startsWith('https://'))
          ? normalized.avatarUri
          : undefined;
        await saveProfileRemote({
          name: normalized.name,
          examDate: normalized.examDate,
          selectedSubjects: normalized.selectedSubjects,
          avatarUri: remoteAvatar,
          onboardingComplete: profile.onboardingComplete,
        });
      }
    } catch (error) {
      console.warn('[useStudentProfile] remote save skipped', error.message);
    }
    return {
      name: normalized.name,
      selectedSubjects: normalized.selectedSubjects,
      examDate: normalized.examDate ? new Date(normalized.examDate) : null,
      avatarUri: normalized.avatarUri,
    };
  } catch (error) {
    console.warn('[useStudentProfile] saveProfile failed', error);
    throw error;
  }
}

export async function isOnboardingComplete() {
  try {
    const key = await getOnboardingKey();
    const raw = await AsyncStorage.getItem(key);
    return raw === 'true';
  } catch (error) {
    console.warn('[useStudentProfile] isOnboardingComplete failed', error);
    return false;
  }
}

export async function setOnboardingComplete(value = true) {
  try {
    const key = await getOnboardingKey();
    await AsyncStorage.setItem(key, value ? 'true' : 'false');
  } catch (error) {
    console.warn('[useStudentProfile] setOnboardingComplete failed', error);
  }
}

export default function useStudentProfile() {
  const [profile, setProfile] = useState({ name: '', selectedSubjects: ['english'], examDate: null });
  const [loading, setLoading] = useState(true);
  const isMounted = useIsMounted();

  const loadProfile = useCallback(async () => {
    let nextProfile = await getProfile();
    try {
      if (!(await hasAuthToken())) {
        if (isMounted()) {
          setProfile(nextProfile);
          setLoading(false);
        }
        return;
      }
      const remote = await getProfileRemote();
      const remoteProfile = remote?.profile;
      if (remoteProfile) {
        nextProfile = {
          name: remoteProfile.name || nextProfile.name,
          selectedSubjects: remoteProfile.selectedSubjects?.length
            ? remoteProfile.selectedSubjects
            : nextProfile.selectedSubjects,
          examDate: remoteProfile.examDate ? new Date(remoteProfile.examDate) : nextProfile.examDate,
          avatarUri: remoteProfile.avatarUri || nextProfile.avatarUri,
        };
        const key = await getProfileKey();
        await AsyncStorage.setItem(key, JSON.stringify({
          name: nextProfile.name,
          selectedSubjects: nextProfile.selectedSubjects,
          examDate: nextProfile.examDate ? nextProfile.examDate.toISOString() : null,
          avatarUri: nextProfile.avatarUri || null,
        }));
      }
    } catch (error) {
      console.warn('[useStudentProfile] remote load skipped', error.message);
    }
    if (!isMounted()) return;
    setProfile(nextProfile);
    setLoading(false);
  }, [isMounted]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const saveProfileState = useCallback(async (nextProfile) => {
    const saved = await saveProfile({ ...profile, ...nextProfile });
    if (isMounted()) setProfile(saved);
    return saved;
  }, [profile, isMounted]);

  return {
    profile,
    loading,
    saveProfile: saveProfileState,
    reloadProfile: loadProfile,
  };
}
