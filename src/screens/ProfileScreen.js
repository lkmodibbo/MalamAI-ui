import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  ScrollView, StyleSheet, Platform, Modal, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useStudentProfile from '../hooks/useStudentProfile';
import useNotes from '../hooks/useNotes';
import SUBJECTS from '../constants/subjects';
import SubjectBadge from '../components/SubjectBadge';
import MenuButton from '../components/MenuButton';
import { COLORS } from '../constants/colors';
import { logout, getQuizStats } from '../services/apiService';

// expo-image-picker crashes on web at module load — lazy require it
const ImagePicker = Platform.OS !== 'web'
  ? require('expo-image-picker')
  : null;

const DateTimePicker = Platform.OS !== 'web'
  ? require('@react-native-community/datetimepicker').default
  : null;

function getInitials(name) {
  if (!name) return 'MA';
  const parts = name.trim().split(/\s+/);
  return parts.length === 1
    ? parts[0].slice(0, 2).toUpperCase()
    : `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatDate(value) {
  if (!value) return 'Not set yet';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return 'Not set yet';
  return d.toDateString();
}

function formatNoteDate(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ProfileScreen({ navigation }) {
  const { profile, loading, saveProfile } = useStudentProfile();
  const { notes, loading: notesLoading } = useNotes();

  const [editingName, setEditingName] = useState(false);
  const [editingSubjects, setEditingSubjects] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftSubjects, setDraftSubjects] = useState(['english']);
  const [draftExamDate, setDraftExamDate] = useState(new Date());
  const [message, setMessage] = useState('');
  const [expandedNote, setExpandedNote] = useState(null); // key of expanded note
  const [avatarUri, setAvatarUri] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [stats, setStats] = useState(null);
  const [streak, setStreak] = useState({ current_streak: 0, longest_streak: 0 });

  useEffect(() => {
    if (!loading && profile) {
      setDraftName(profile.name || '');
      setDraftSubjects(profile.selectedSubjects || ['english']);
      setDraftExamDate(
        profile.examDate instanceof Date ? profile.examDate : new Date(profile.examDate || Date.now())
      );
      setAvatarUri(profile.avatarUri || null);
    }
  }, [loading, profile]);

  useEffect(() => {
    getQuizStats()
      .then((data) => {
        setStats(data.stats || null);
        setStreak(data.streak || { current_streak: 0, longest_streak: 0 });
      })
      .catch(() => {});
  }, []);

  const pickAvatar = async () => {
    if (!ImagePicker) {
      Alert.alert('Not supported', 'Photo upload is not available on web.');
      return;
    }

    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photo library to set a profile picture.');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      try {
        await saveProfile({ ...profile, avatarUri: uri });
        showMsg('✓ Photo updated');
      } catch (err) {
        console.warn('[ProfileScreen] save avatar failed', err);
      }
    }
  };

  const daysRemaining = useMemo(() => {
    if (!profile?.examDate) return null;
    const target = new Date(profile.examDate);
    const today = new Date();
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diff = target.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diff / 86400000));
  }, [profile]);

  const selectedTags = useMemo(
    () => SUBJECTS.filter((s) => draftSubjects.includes(s.id)),
    [draftSubjects],
  );

  const toggleSubject = (id) => {
    if (id === 'english') return;
    setDraftSubjects((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  };

  const showMsg = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 2500);
  };

  const saveField = async (field) => {
    try {
      if (!profile) return;
      await saveProfile({
        ...profile,
        name: field === 'name' ? draftName.trim() : profile.name,
        selectedSubjects: field === 'subjects' ? draftSubjects : profile.selectedSubjects,
        examDate: field === 'date' ? draftExamDate : profile.examDate,
      });
      setEditingName(false);
      setEditingSubjects(false);
      setShowDatePicker(false);
      showMsg('✓ Saved');
    } catch (err) {
      console.warn('[ProfileScreen] saveField failed', err);
      showMsg('Save failed. Try again.');
    }
  };

  const handleLogout = () => setShowLogoutModal(true);

  const handleConfirmLogout = async () => {
    const rootNav = navigation.getParent()?.getParent() || navigation.getParent() || navigation;
    try {
      rootNav.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (err) {
      console.warn('[ProfileScreen] navigation.reset failed', err);
    }

    try {
      await logout();
    } catch (err) {
      console.warn('[ProfileScreen] logout failed', err);
    }
    setShowLogoutModal(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <View style={styles.centred}>
          <Text style={styles.loadingText}>Loading profile…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.pageHeader}>
        <View style={styles.headerLeft}>
          <MenuButton />
          <View>
            <Text style={styles.headerEyebrow}>Account</Text>
            <Text style={styles.headerTitle}>Profile</Text>
          </View>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Avatar + Name ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <TouchableOpacity onPress={pickAvatar} activeOpacity={0.85} style={styles.avatarWrap}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{getInitials(profile?.name)}</Text>
                </View>
              )}
              <View style={styles.avatarCameraBadge}>
                <Text style={styles.avatarCameraLabel}>Edit</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.heroInfo}>
              {editingName ? (
                <TextInput
                  style={styles.nameInput}
                  value={draftName}
                  onChangeText={setDraftName}
                  placeholder="Your name"
                  placeholderTextColor="#7D8E8A"
                  autoFocus
                />
              ) : (
                <Text style={styles.heroName} numberOfLines={1}>{profile?.name || 'Student'}</Text>
              )}
              <Text style={styles.heroSub}>JAMB Student</Text>
            </View>
          </View>
          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.heroAction}
              onPress={() => { setEditingName((v) => !v); setEditingSubjects(false); setShowDatePicker(false); }}
            >
              <Text style={styles.heroActionText}>{editingName ? 'Cancel' : 'Edit name'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.heroActionDanger} onPress={handleLogout}>
              <Text style={styles.heroActionDangerText}>Log out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {editingName && (
          <TouchableOpacity style={styles.saveBtn} onPress={() => saveField('name')}>
            <Text style={styles.saveBtnText}>Save Name</Text>
          </TouchableOpacity>
        )}

        {/* ── Exam Countdown ── */}
        <View style={styles.countdownCard}>
          <View style={styles.countdownLeft}>
            <View>
              <Text style={styles.countdownLabel}>JAMB Exam</Text>
              <Text style={styles.countdownDate}>{formatDate(profile?.examDate)}</Text>
            </View>
          </View>
          <View style={styles.countdownRight}>
            <Text style={styles.countdownDays}>
              {daysRemaining !== null ? daysRemaining : '—'}
            </Text>
            <Text style={styles.countdownDaysLabel}>days left</Text>
          </View>
        </View>

        {/* ── Exam Date Edit ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Exam date</Text>
            <TouchableOpacity
              onPress={() => { setShowDatePicker((v) => !v); setEditingName(false); setEditingSubjects(false); }}
            >
              <Text style={styles.editLink}>{showDatePicker ? 'Cancel' : 'Change'}</Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && Platform.OS === 'web' && (
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={draftExamDate instanceof Date && !isNaN(draftExamDate)
                ? draftExamDate.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                if (e.target.value) {
                  const d = new Date(e.target.value);
                  setDraftExamDate(d);
                  saveField('date');
                }
              }}
              style={webInputStyle}
            />
          )}

          {showDatePicker && Platform.OS === 'ios' && DateTimePicker && (
            <Modal visible transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowDatePicker(false)}
              >
                <TouchableOpacity activeOpacity={1} style={styles.pickerCard}>
                  <Text style={styles.pickerTitle}>Pick exam date</Text>
                  <DateTimePicker
                    value={draftExamDate}
                    mode="date"
                    display="spinner"
                    minimumDate={new Date()}
                    onChange={(_, d) => { if (d) setDraftExamDate(d); }}
                    style={{ width: '100%' }}
                    themeVariant="light"
                  />
                  <TouchableOpacity style={styles.saveBtn} onPress={() => saveField('date')}>
                    <Text style={styles.saveBtnText}>Confirm</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>
          )}

          {showDatePicker && Platform.OS === 'android' && DateTimePicker && (
            <DateTimePicker
              value={draftExamDate}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={(_, d) => {
                setShowDatePicker(false);
                if (d) { setDraftExamDate(d); saveField('date'); }
              }}
            />
          )}
        </View>

        {/* ── Selected Subjects ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>My subjects</Text>
            <TouchableOpacity
              onPress={() => { setEditingSubjects((v) => !v); setEditingName(false); setShowDatePicker(false); }}
            >
              <Text style={styles.editLink}>{editingSubjects ? 'Cancel' : 'Change'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tagsRow}>
            {selectedTags.map((s) => (
              <View key={s.id} style={styles.tagChip}>
                <SubjectBadge name={s.name} size="sm" />
                <Text style={styles.tagText} numberOfLines={1}>{s.name}</Text>
              </View>
            ))}
          </View>

          {editingSubjects && (
            <>
              <Text style={styles.editHint}>Tap to select / deselect. Use of English is required.</Text>
              <View style={styles.subjectGrid}>
                {SUBJECTS.map((s) => {
                  const selected = draftSubjects.includes(s.id);
                  const locked = s.id === 'english';
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.subjectChip, selected && styles.subjectChipOn, locked && styles.subjectChipLocked]}
                      onPress={() => toggleSubject(s.id)}
                      activeOpacity={locked ? 1 : 0.7}
                    >
                      <Text style={[styles.subjectChipText, selected && styles.subjectChipTextOn]}>
                        {s.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={() => saveField('subjects')}>
                <Text style={styles.saveBtnText}>Save Subjects</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Study stats</Text>
          <View style={styles.tagsRow}>
            <View style={styles.tagChip}>
              <Text style={styles.tagText}>{stats?.total_quizzes || 0} quizzes</Text>
            </View>
            <View style={styles.tagChip}>
              <Text style={styles.tagText}>{stats?.average_score || 0}% avg</Text>
            </View>
            <View style={styles.tagChip}>
              <Text style={styles.tagText}>{streak.current_streak || 0} day streak</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Shortcuts</Text>
          {[
            { label: 'My progress', route: 'Progress' },
            { label: 'Leaderboard', route: 'Leaderboard' },
            { label: 'Notifications', route: 'Notifications' },
            { label: 'Bookmarks', route: 'Bookmarks' },
            { label: 'Settings', route: 'Settings' },
            { label: 'Weak areas', route: 'Weakness' },
          ].map((item, index) => (
            <TouchableOpacity
              key={item.route}
              style={[styles.shortcutRow, index === 0 && styles.shortcutRowFirst]}
              onPress={() => navigation.navigate(item.route)}
            >
              <Text style={styles.shortcutLabel}>{item.label}</Text>
              <Text style={styles.noteChevron}>→</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── My Notes ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>My notes</Text>

          {notesLoading ? (
            <Text style={styles.mutedText}>Loading notes…</Text>
          ) : notes.length === 0 ? (
            <Text style={styles.mutedText}>
              No notes yet. Open a topic in Learn mode and tap "Save note".
            </Text>
          ) : (
            notes.map((group) => (
              <View key={group.subjectId || group.subjectName} style={styles.noteGroup}>
                <View style={styles.noteGroupHeaderRow}>
                  <SubjectBadge name={group.subjectName} size="sm" />
                  <Text style={styles.noteGroupHeader}>{group.subjectName}</Text>
                </View>
                {group.notes.map((note) => {
                  const isExpanded = expandedNote === note.key;
                  return (
                    <TouchableOpacity
                      key={note.key}
                      style={styles.noteRow}
                      onPress={() => setExpandedNote(isExpanded ? null : note.key)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.noteRowTop}>
                        <Text style={styles.noteTopic} numberOfLines={1}>{note.topic}</Text>
                        <Text style={styles.noteDate}>{formatNoteDate(note.timestamp)}</Text>
                        <Text style={styles.noteChevron}>{isExpanded ? '−' : '+'}</Text>
                      </View>
                      {isExpanded && (
                        <View style={styles.noteBody}>
                          <Text style={styles.noteBodyText}>{note.note || 'No content saved.'}</Text>
                          <TouchableOpacity
                            style={styles.editNoteBtn}
                            onPress={() => navigation?.navigate('EditNote', { note })}
                          >
                            <Text style={styles.editNoteBtnText}>Edit note</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))
          )}
        </View>

        {message ? (
          <View style={styles.messageBanner}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        {/* Logout confirmation modal */}
        <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
          <View style={styles.logoutModalOverlay}>
            <View style={styles.logoutModalCard}>
              <Text style={styles.logoutModalTitle}>Are you sure you want to log out?</Text>
              <View style={styles.logoutModalActions}>
                <TouchableOpacity style={styles.logoutModalBtn} onPress={() => setShowLogoutModal(false)}>
                  <Text style={styles.logoutModalBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.logoutModalBtn, styles.logoutModalConfirm]} onPress={handleConfirmLogout}>
                  <Text style={[styles.logoutModalBtnText, { color: '#fff' }]}>Yes, log out</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const webInputStyle = {
  width: '100%',
  padding: '12px 14px',
  fontSize: '15px',
  borderRadius: '12px',
  border: '1px solid #D2DDD7',
  backgroundColor: COLORS.background,
  color: COLORS.primary,
  marginTop: '8px',
  boxSizing: 'border-box',
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: COLORS.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.headerBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerEyebrow: {
    color: COLORS.textMuted,
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  headerTitle: {
    color: COLORS.primary,
    fontWeight: '900',
    fontSize: 24,
    marginTop: 2,
  },
  content: { padding: 16, paddingBottom: 40 },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: COLORS.primary, fontWeight: '700', fontSize: 16 },

  heroCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.surfaceWhite,
    borderRadius: 999,
    paddingHorizontal: 8,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCameraLabel: { fontSize: 10, fontWeight: '800', color: COLORS.primary },
  avatarText: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
  heroInfo: { flex: 1 },
  heroName: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  heroSub: { color: '#C5D4CF', fontSize: 13, marginTop: 2 },
  nameInput: {
    backgroundColor: COLORS.surfaceWhite,
    borderRadius: 12,
    padding: 10,
    fontSize: 15,
    color: COLORS.primary,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 8,
  },
  heroAction: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  heroActionText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  heroActionDanger: {
    flex: 1,
    backgroundColor: 'rgba(255,236,236,0.14)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  heroActionDangerText: { color: '#ffecec', fontWeight: '800', fontSize: 13 },

  // Countdown
  countdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  countdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  countdownLabel: { color: '#C5D4CF', fontSize: 12, fontWeight: '700' },
  countdownDate: { color: '#ffffff', fontSize: 14, fontWeight: '800', marginTop: 2 },
  countdownRight: { alignItems: 'center' },
  countdownDays: { color: '#ffffff', fontSize: 32, fontWeight: '900', lineHeight: 36 },
  countdownDaysLabel: { color: '#C5D4CF', fontSize: 11, fontWeight: '700' },

  // Generic card
  card: {
    backgroundColor: COLORS.surfaceWhite,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: { color: COLORS.primary, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    minHeight: 48,
    borderTopWidth: 1,
    borderTopColor: '#E4EDE9',
    gap: 10,
  },
  shortcutRowFirst: { borderTopWidth: 0, marginTop: 4 },
  shortcutLabel: { flex: 1, color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  editLink: { color: COLORS.link, fontWeight: '700', fontSize: 13 },

  // Date picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerCard: {
    backgroundColor: COLORS.surfaceWhite,
    borderRadius: 20,
    padding: 20,
    width: '88%',
  },
  pickerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.primary, textAlign: 'center', marginBottom: 8 },

  // Save button
  saveBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },

  // Subjects
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  editHint: { color: COLORS.textMuted, fontSize: 12, marginBottom: 10, marginTop: 4 },
  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  subjectChip: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  subjectChipOn: { backgroundColor: COLORS.accent, borderColor: '#0F8A72' },
  subjectChipLocked: { opacity: 0.85 },
  subjectChipText: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },
  subjectChipTextOn: { color: '#ffffff' },

  // Notes
  noteGroup: { marginTop: 14 },
  noteGroupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  noteGroupHeader: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  noteRow: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  noteRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  noteTopic: { flex: 1, fontSize: 13, fontWeight: '800', color: COLORS.primary },
  noteDate: { fontSize: 11, color: COLORS.textMuted },
  noteChevron: { fontSize: 13, color: COLORS.link, fontWeight: '700' },
  noteBody: {
    borderTopWidth: 1,
    borderTopColor: '#D2DDD7',
    padding: 12,
    backgroundColor: COLORS.surfaceWhite,
  },
  noteBodyText: { fontSize: 13, color: '#1A4D4A', lineHeight: 20 },
  editNoteBtn: {
    marginTop: 10,
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 999,
  },
  editNoteBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  mutedText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 20, marginTop: 4 },

  // Message
  messageBanner: {
    backgroundColor: '#eafaf1',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27ae60',
  },
  messageText: { color: '#1e8449', fontWeight: '700', fontSize: 13 },
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoutModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  logoutModalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.primary, marginBottom: 14, textAlign: 'center' },
  logoutModalActions: { flexDirection: 'row', gap: 10 },
  logoutModalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: COLORS.background,
  },
  logoutModalBtnText: { color: COLORS.primary, fontWeight: '800' },
  logoutModalConfirm: {
    backgroundColor: '#d64545',
  },
});
