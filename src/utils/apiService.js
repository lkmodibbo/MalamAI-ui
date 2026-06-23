import AsyncStorage from '@react-native-async-storage/async-storage';

import { Platform } from 'react-native';

// On web (browser) use localhost. On device use your machine's LAN IP.
const BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:5000/api'
  : 'http://192.168.146.202:5000/api';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function getToken() {
  return await AsyncStorage.getItem('auth_token');
}

async function request(endpoint, options = {}) {
  const token = await getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || 'Something went wrong' };
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || 'Something went wrong');
  }

  return data;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUTH
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function register(name, email, password) {
  // Backend returns no token — user must verify email first
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  return data; // { message, email }
}

export async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  // Save token automatically after login
  await AsyncStorage.setItem('auth_token', data.token);
  await AsyncStorage.setItem('auth_user', JSON.stringify(data.user));
  return data;
}

export async function logout() {
  await AsyncStorage.removeItem('auth_token');
  await AsyncStorage.removeItem('auth_user');
}

export async function getMe() {
  return await request('/auth/me');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUBJECTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getSubjects() {
  return await request('/subjects');
}

export async function getTopics(subjectId) {
  return await request(`/subjects/${subjectId}/topics`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// QUESTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getQuestions(subjectId, topicId, count = 5) {
  return await request(
    `/questions?subject=${subjectId}&topic=${topicId}&count=${count}`
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// QUIZ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function saveQuizAttempt(attemptData) {
  return await request('/quiz/attempt', {
    method: 'POST',
    body: JSON.stringify(attemptData),
  });
}

export async function getQuizHistory() {
  return await request('/quiz/history');
}

export async function getQuizStats() {
  return await request('/quiz/stats');
}
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FETCH QUESTIONS FROM BACKEND
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function getQuestionsFromDB(subjectId, topicId, count = 5) {
  try {
    const params = new URLSearchParams({
      subject: subjectId,
      count:   String(count),
      ...(topicId && { topic: String(topicId) }),
    });
    const data = await request(`/questions?${params}`);
    return data.questions || [];
  } catch (err) {
    console.warn('[getQuestionsFromDB] failed:', err.message);
    return []; // return empty so app falls back to Groq
  }
}

export async function getPastQuestions(subjectId, year, count = 10) {
  try {
    const params = new URLSearchParams({
      subject: subjectId,
      count:   String(count),
      ...(year && { year: String(year) }),
    });
    const data = await request(`/questions/past?${params}`);
    return data.questions || [];
  } catch (err) {
    console.warn('[getPastQuestions] failed:', err.message);
    return [];
  }
}
export async function registerUser(name, email, password) {
  const data = await request('/auth/register', {
    method: 'POST',
    body:   JSON.stringify({ name, email, password }),
  });
  return data; // no token yet — user must verify email first
}

export async function resendVerificationEmail(email) {
  return await request('/auth/resend-verification', {
    method: 'POST',
    body:   JSON.stringify({ email }),
  });
}

export async function forgotPassword(email) {
  return await request('/auth/forgot-password', {
    method: 'POST',
    body:   JSON.stringify({ email }),
  });
}

export async function resetPassword(token, password) {
  return await request('/auth/reset-password', {
    method: 'POST',
    body:   JSON.stringify({ token, password }),
  });
}
