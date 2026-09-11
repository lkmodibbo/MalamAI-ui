import AsyncStorage from '@react-native-async-storage/async-storage';

import { Platform } from 'react-native';

// A physical device cannot reach the packager host on localhost, so set
// EXPO_PUBLIC_API_URL to your machine's LAN address when testing on hardware.
const DEFAULT_API = 'http://localhost:5000/api';

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API).replace(/\/$/, '');

if (!process.env.EXPO_PUBLIC_API_URL && Platform.OS !== 'web') {
  console.warn(
    `[api] EXPO_PUBLIC_API_URL is not set, falling back to ${DEFAULT_API}. ` +
    'On a physical device set it to your computer\'s LAN address in frontend/.env.'
  );
}

// Requests are aborted after this long so a hung or unreachable server surfaces
// an error instead of leaving the UI spinning forever.
const REQUEST_TIMEOUT_MS = 15000;

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function getToken() {
  return await AsyncStorage.getItem(TOKEN_KEY);
}

// Lets the navigation layer react when a token expires mid-session.
let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export async function clearSession() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

async function handleExpiredSession() {
  await clearSession();
  try {
    unauthorizedHandler?.();
  } catch (err) {
    console.warn('[api] unauthorized handler failed:', err.message);
  }
}

async function request(endpoint, options = {}) {
  const { requireAuth, timeout = REQUEST_TIMEOUT_MS, headers: extraHeaders, ...fetchOptions } = options;
  const token = await getToken();

  if (requireAuth && !token) {
    throw new Error('Please login to continue.');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...extraHeaders,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let res;
  try {
    res = await fetch(`${BASE_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('The server took too long to respond. Please try again.');
    }
    throw new Error('Cannot reach the server. Check your connection.');
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || 'Something went wrong' };
  }

  if (!res.ok) {
    // A rejected token means the stored session is dead; drop it so the user
    // is not stranded in a logged-in UI where every request fails.
    if (res.status === 401 && token) {
      await handleExpiredSession();
      throw new Error('Your session has expired. Please login again.');
    }
    if (res.status === 403) {
      const err = new Error(data.error || data.message || 'You do not have permission to do that.');
      err.status = 403;
      throw err;
    }
    throw new Error(data.error || data.message || 'Something went wrong');
  }

  return data;
}

export async function hasAuthToken() {
  return Boolean(await getToken());
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
  if (!data?.token) {
    throw new Error('Login failed: the server did not return a session token.');
  }

  // Save token automatically after login
  await AsyncStorage.multiSet([
    [TOKEN_KEY, data.token],
    [USER_KEY, JSON.stringify(data.user || {})],
  ]);
  return data;
}

export async function logout() {
  await clearSession();
}

export async function getMe() {
  return await request('/auth/me', { requireAuth: true });
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
// QUIZ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function saveQuizAttempt(attemptData) {
  return await request('/quiz/attempt', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify(attemptData),
  });
}

export async function getQuizHistory() {
  return await request('/quiz/history', { requireAuth: true });
}

export async function getQuizStats() {
  return await request('/quiz/stats', { requireAuth: true });
}
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PAST EXAM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getPastExamYears(subjectId) {
  return await request(`/past-exams/years/${subjectId}`);
}

export async function getPastExamQuestions(subjectId, year) {
  return await request(
    `/past-exams/questions?subject_id=${subjectId}&year=${year}`
  );
}

export async function submitPastExam(subjectId, year, answers, timeTaken) {
  return await request('/past-exams/submit', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify({
      subject_id: subjectId,
      year,
      answers,
      time_taken: timeTaken,
    }),
  });
}

export async function getPastExamHistory() {
  return await request('/past-exams/history', { requireAuth: true });
}

export async function getPastExamStats() {
  return await request('/past-exams/stats', { requireAuth: true });
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
    const data = await request(`/questions?${params}`, { requireAuth: true });
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
    const data = await request(`/questions/past?${params}`, { requireAuth: true });
    return data.questions || [];
  } catch (err) {
    console.warn('[getPastQuestions] failed:', err.message);
    return [];
  }
}

export async function gradeQuiz(answers) {
  return await request('/quiz/grade', {
    method: 'POST',
    body: JSON.stringify({ answers }),
    requireAuth: true,
  });
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

export async function getProfileRemote() {
  return await request('/profile', { requireAuth: true });
}

export async function saveProfileRemote(profile) {
  return await request('/profile', {
    method: 'PUT',
    requireAuth: true,
    body: JSON.stringify({
      name: profile.name,
      examDate: profile.examDate,
      selectedSubjects: profile.selectedSubjects,
      avatarUri: profile.avatarUri,
      onboardingComplete: profile.onboardingComplete,
    }),
  });
}

export async function getNotesRemote() {
  return await request('/notes', { requireAuth: true });
}

export async function saveNoteRemote(note) {
  return await request('/notes', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify({
      subject_id: note.subjectId,
      subject_name: note.subjectName,
      topic: note.topic,
      note: note.note,
    }),
  });
}

export async function deleteNoteRemote(subjectId, topic) {
  return await request('/notes', {
    method: 'DELETE',
    requireAuth: true,
    body: JSON.stringify({ subject_id: subjectId, topic }),
  });
}

export async function getLeaderboard() {
  return await request('/leaderboard/global');
}

export async function getSubjectLeaderboard(subjectId) {
  return await request(`/leaderboard/subject/${subjectId}`);
}

export async function getMyRank() {
  return await request('/leaderboard/my-rank', { requireAuth: true });
}

export async function getNotifications() {
  return await request('/notifications', { requireAuth: true });
}

export async function getUnreadCount() {
  return await request('/notifications/unread-count', { requireAuth: true });
}

export async function markNotificationRead(id) {
  return await request(`/notifications/${id}/read`, { method: 'PATCH', requireAuth: true });
}

export async function markAllNotificationsRead() {
  return await request('/notifications/read-all', { method: 'PATCH', requireAuth: true });
}

export async function getBookmarks() {
  return await request('/bookmarks', { requireAuth: true });
}

export async function addBookmark(questionId) {
  return await request('/bookmarks', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify({ question_id: questionId }),
  });
}

export async function removeBookmark(questionId) {
  return await request(`/bookmarks/${questionId}`, { method: 'DELETE', requireAuth: true });
}

export async function saveMockExam(payload) {
  return await request('/mock-exams', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify(payload),
  });
}

export async function getMockExamHistory() {
  return await request('/mock-exams/history', { requireAuth: true });
}

export async function getAdminDashboard() {
  return await request('/admin/dashboard', { requireAuth: true });
}

export async function getAdminUsers(page = 1, limit = 20, q = '') {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (q.trim()) params.set('q', q.trim());
  return await request(`/admin/users?${params}`, { requireAuth: true });
}

export async function changeAdminUserRole(userId, isAdmin) {
  return await request(`/admin/users/${encodeURIComponent(userId)}/role`, {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify({ is_admin: !!isAdmin }),
  });
}

export async function getAdminUser(id) {
  return await request(`/admin/users/${id}`, { requireAuth: true });
}

export async function getAdminLeaderboard(subjectId) {
  const qs = subjectId ? `?subject=${encodeURIComponent(subjectId)}` : '';
  return await request(`/admin/leaderboard${qs}`, { requireAuth: true });
}

export async function getAdminPastOverview() {
  return await request('/admin/past-questions/overview', { requireAuth: true });
}

export async function getAdminPastQuestions({ subject, year, q, page = 1, limit = 20, deleted = false } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (subject) params.set('subject', subject);
  if (year) params.set('year', String(year));
  if (q) params.set('q', q);
  if (deleted) params.set('deleted', '1');
  return await request(`/admin/past-questions?${params}`, { requireAuth: true });
}

export async function getAdminAudit({ page = 1, limit = 50, action = '', resource = '' } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (action) params.set('action', action);
  if (resource) params.set('resource', resource);
  return await request(`/admin/audit?${params}`, { requireAuth: true });
}

export async function getAdminAuditCSV({ action = '', resource = '' } = {}) {
  const params = new URLSearchParams();
  if (action) params.set('action', action);
  if (resource) params.set('resource', resource);

  const token = await getToken();
  const headers = {
    'Content-Type': 'text/csv',
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}/admin/audit/export?${params}`, { headers, signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      const txt = await res.text();
      let json = {};
      try { json = JSON.parse(txt); } catch {}
      throw new Error(json.error || txt || 'Could not export CSV');
    }
    return await res.text();
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('The server took too long to respond.');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function addAdminPastQuestion(payload) {
  return await request('/admin/past-questions', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify(payload),
  });
}

export async function bulkAddAdminPastQuestions(questions) {
  return await request('/admin/past-questions/bulk', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify({ questions }),
  });
}

export async function deleteAdminPastQuestion(id) {
  return await request(`/admin/past-questions/${id}`, {
    method: 'DELETE',
    requireAuth: true,
  });
}

export async function restoreAdminPastQuestion(id) {
  return await request(`/admin/past-questions/${id}/restore`, { method: 'POST', requireAuth: true });
}

export async function sendAdminAnnouncement({ title, message, type = 'info' }) {
  return await request('/admin/notify-all', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify({ title, message, type }),
  });
}

export async function getAdminOverview() {
  return await request('/admin/overview', { requireAuth: true });
}

export async function addAdminSubject(payload) {
  return await request('/admin/subjects', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminSubject(id) {
  return await request(`/admin/subjects/${id}`, { method: 'DELETE', requireAuth: true });
}

export async function getAdminTopics(subject) {
  const qs = subject ? `?subject=${encodeURIComponent(subject)}` : '';
  return await request(`/admin/topics${qs}`, { requireAuth: true });
}

export async function addAdminTopic(payload) {
  return await request('/admin/topics', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminTopic(id) {
  return await request(`/admin/topics/${id}`, { method: 'DELETE', requireAuth: true });
}

export async function getAdminPracticeQuestions({ subject, topic, page = 1, limit = 20, deleted = false } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (subject) params.set('subject', subject);
  if (topic) params.set('topic', String(topic));
  if (deleted) params.set('deleted', '1');
  return await request(`/admin/questions?${params}`, { requireAuth: true });
}

export async function addAdminPracticeQuestion(payload) {
  return await request('/admin/questions', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify(payload),
  });
}

export async function bulkAddAdminPracticeQuestions(questions) {
  return await request('/admin/questions/bulk', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify({ questions }),
  });
}

export async function deleteAdminPracticeQuestion(id) {
  return await request(`/admin/questions/${id}`, { method: 'DELETE', requireAuth: true });
}

export async function restoreAdminPracticeQuestion(id) {
  return await request(`/admin/questions/${id}/restore`, { method: 'POST', requireAuth: true });
}

export async function saveAiQuestions(subjectId, topicId, questions) {
  return await request('/questions/save-ai', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify({
      subject_id: subjectId,
      topic_id: topicId || null,
      questions,
    }),
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI  (all calls proxied through backend — keys never leave the server)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Send a multi-turn chat message to Malam AI.
 * @param {Array<{role: string, content: string}>} messages
 * @param {number|null} conversationId  — pass to persist the exchange to a conversation
 * @returns {Promise<{reply: string, usage: {used: number, limit: number}}>}
 */
export async function sendAiChat(messages, conversationId = null) {
  return await request('/ai/chat', {
    method: 'POST',
    requireAuth: true,
    timeout: 30000,
    body: JSON.stringify({
      messages,
      ...(conversationId && { conversation_id: conversationId }),
    }),
  });
}

/**
 * Generate AI content (explanation, questions, flashcards, step_by_step, why_wrong).
 *
 * @param {'explanation'|'questions'|'flashcards'|'step_by_step'|'why_wrong'} type
 * @param {object} params  — subject, topic, question, selectedOption, correctOption, count
 * @returns {Promise<{result: string, cached: boolean, usage: object}>}
 */
export async function generateAiContent(type, params = {}) {
  return await request('/ai/generate', {
    method: 'POST',
    requireAuth: true,
    timeout: 30000,
    body: JSON.stringify({ type, ...params }),
  });
}

/**
 * Fetch today's remaining AI usage for the logged-in student.
 * @returns {Promise<{chat: {used, limit}, generate: {used, limit}}>}
 */
export async function getAiUsage() {
  return await request('/ai/usage', { requireAuth: true });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI CONVERSATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getConversations() {
  return await request('/ai/conversations', { requireAuth: true });
}

export async function createConversation(title = 'New Chat') {
  return await request('/ai/conversations', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify({ title }),
  });
}

export async function getConversation(id) {
  return await request(`/ai/conversations/${id}`, { requireAuth: true });
}

export async function renameConversation(id, title) {
  return await request(`/ai/conversations/${id}`, {
    method: 'PATCH',
    requireAuth: true,
    body: JSON.stringify({ title }),
  });
}

export async function deleteConversation(id) {
  return await request(`/ai/conversations/${id}`, {
    method: 'DELETE',
    requireAuth: true,
  });
}

/**
 * Generate (or return cached) today's personalised study plan.
 * The backend builds it from the student's profile + weak topics + exam date.
 * @returns {Promise<{plan: {plan: Array, summary: string}, cached: boolean}>}
 */
export async function getAiStudyPlan() {
  return await request('/ai/study-plan', {
    method: 'POST',
    requireAuth: true,
    timeout: 30000,
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADMIN — AI STATS & QUESTION REVIEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getAdminAiStats() {
  return await request('/admin/ai-stats', { requireAuth: true });
}

export async function getAdminAiQuestions({ status = 'pending', page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ status, page: String(page), limit: String(limit) });
  return await request(`/admin/ai-questions?${params}`, { requireAuth: true });
}

export async function approveAdminAiQuestion(id) {
  return await request(`/admin/ai-questions/${id}/approve`, { method: 'PATCH', requireAuth: true });
}

export async function rejectAdminAiQuestion(id) {
  return await request(`/admin/ai-questions/${id}/reject`, { method: 'PATCH', requireAuth: true });
}
