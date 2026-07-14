import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  ScrollView, StyleSheet, Platform, Modal, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useStudentProfile from '../src/hooks/useStudentProfile';
import useNotes from '../src/hooks/useNotes';
import SUBJECTS from '../constants/subjects';
import { logout } from '../src/utils/apiService';

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
      <SafeAreaView style={styles.root}>
        <View style={styles.centred}>
          <Text style={styles.loadingText}>Loading profile…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Avatar + Name ── */}
        <View style={styles.heroCard}>
          <TouchableOpacity onPress={pickAvatar} activeOpacity={0.85} style={styles.avatarWrap}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{getInitials(profile?.name)}</Text>
              </View>
            )}
            <View style={styles.avatarCameraBadge}>
              <Text style={styles.avatarCameraIcon}>📷</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.heroInfo}>
            {editingName ? (
              <TextInput
                style={styles.nameInput}
                value={draftName}
                onChangeText={setDraftName}
                placeholder="Your name"
                placeholderTextColor="#8a9c8a"
                autoFocus
              />
            ) : (
              <Text style={styles.heroName}>{profile?.name || 'Student'}</Text>
            )}
            <Text style={styles.heroSub}>JAMB Student</Text>
          </View>
          <TouchableOpacity
            style={styles.editPill}
            onPress={() => { setEditingName((v) => !v); setEditingSubjects(false); setShowDatePicker(false); }}
          >
            <Text style={styles.editPillText}>{editingName ? 'Cancel' : '✏️ Edit'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.logoutPill}
            onPress={handleLogout}
          >
            <Text style={styles.logoutPillText}>Log out</Text>
          </TouchableOpacity>
        </View>

        {editingName && (
          <TouchableOpacity style={styles.saveBtn} onPress={() => saveField('name')}>
            <Text style={styles.saveBtnText}>Save Name</Text>
          </TouchableOpacity>
        )}

        {/* ── Exam Countdown ── */}
        <View style={styles.countdownCard}>
          <View style={styles.countdownLeft}>
            <Text style={styles.countdownEmoji}>🎓</Text>
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
            <Text style={styles.cardTitle}>📅 Exam Date</Text>
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
            <Text style={styles.cardTitle}>📚 My Subjects</Text>
            <TouchableOpacity
              onPress={() => { setEditingSubjects((v) => !v); setEditingName(false); setShowDatePicker(false); }}
            >
              <Text style={styles.editLink}>{editingSubjects ? 'Cancel' : 'Change'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tagsRow}>
            {selectedTags.map((s) => (
              <View key={s.id} style={styles.tagChip}>
                <Text style={{ fontSize: 14 }}>{s.emoji}</Text>
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
                        {s.emoji} {s.name}
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

        {/* ── My Notes ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📝 My Notes</Text>

          {notesLoading ? (
            <Text style={styles.mutedText}>Loading notes…</Text>
          ) : notes.length === 0 ? (
            <Text style={styles.mutedText}>
              No notes yet. Open a topic in Learn mode and tap "Save note".
            </Text>
          ) : (
            notes.map((group) => (
              <View key={group.subjectId || group.subjectName} style={styles.noteGroup}>
                <Text style={styles.noteGroupHeader}>
                  {group.subjectEmoji} {group.subjectName}
                </Text>
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
                        <Text style={styles.noteChevron}>{isExpanded ? '▲' : '▼'}</Text>
                      </View>
                      {isExpanded && (
                        <View style={styles.noteBody}>
                          <Text style={styles.noteBodyText}>{note.note || 'No content saved.'}</Text>
                          <TouchableOpacity
                            style={styles.editNoteBtn}
                            onPress={() => navigation?.navigate('EditNote', { note })}
                          >
                            <Text style={styles.editNoteBtnText}>✏️ Edit note</Text>
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
  border: '1px solid #d5e3d3',
  backgroundColor: '#f5f8f3',
  color: '#1a382b',
  marginTop: '8px',
  boxSizing: 'border-box',
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f2f6f2' },
  content: { padding: 16, paddingBottom: 40 },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#0a7c4f', fontWeight: '700', fontSize: 16 },

  // Hero
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a7c4f',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    gap: 14,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2e4a7a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#2e4a7a',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#ffffff',
    borderRadius: 999,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCameraIcon: { fontSize: 12 },
  avatarText: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
  heroInfo: { flex: 1 },
  heroName: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  heroSub: { color: '#b8dfc9', fontSize: 13, marginTop: 2 },
  nameInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    fontSize: 15,
    color: '#1a382b',
  },
  editPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  editPillText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  logoutPill: {
    marginLeft: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  logoutPillText: { color: '#ffecec', fontWeight: '700', fontSize: 12 },

  // Countdown
  countdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1b2a4a',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  countdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  countdownEmoji: { fontSize: 28 },
  countdownLabel: { color: '#b0bfd8', fontSize: 12, fontWeight: '700' },
  countdownDate: { color: '#ffffff', fontSize: 14, fontWeight: '800', marginTop: 2 },
  countdownRight: { alignItems: 'center' },
  countdownDays: { color: '#ffffff', fontSize: 32, fontWeight: '900', lineHeight: 36 },
  countdownDaysLabel: { color: '#b0bfd8', fontSize: 11, fontWeight: '700' },

  // Generic card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e8f0e7',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: { color: '#0a7c4f', fontSize: 15, fontWeight: '800' },
  editLink: { color: '#0a7c4f', fontWeight: '700', fontSize: 13 },

  // Date picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    width: '88%',
  },
  pickerTitle: { fontSize: 16, fontWeight: '800', color: '#1b2a4a', textAlign: 'center', marginBottom: 8 },

  // Save button
  saveBtn: {
    backgroundColor: '#0a7c4f',
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
    width: '48%',
    backgroundColor: '#f4f6fb',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dde3ef',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagText: { color: '#1b2a4a', fontWeight: '600', fontSize: 12, flex: 1 },
  editHint: { color: '#8aab8a', fontSize: 12, marginBottom: 10, marginTop: 4 },
  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  subjectChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d5e3d3',
    backgroundColor: '#f5f8f3',
  },
  subjectChipOn: { backgroundColor: '#0a7c4f', borderColor: '#0a7c4f' },
  subjectChipLocked: { opacity: 0.85 },
  subjectChipText: { color: '#1b432d', fontWeight: '700', fontSize: 12 },
  subjectChipTextOn: { color: '#ffffff' },

  // Notes
  noteGroup: { marginTop: 14 },
  noteGroupHeader: { fontSize: 13, fontWeight: '800', color: '#0a7c4f', marginBottom: 8 },
  noteRow: {
    backgroundColor: '#f5f8f3',
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#d5e3d3',
    overflow: 'hidden',
  },
  noteRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  noteTopic: { flex: 1, fontSize: 13, fontWeight: '800', color: '#1a382b' },
  noteDate: { fontSize: 11, color: '#8aab8a' },
  noteChevron: { fontSize: 11, color: '#0a7c4f', fontWeight: '700' },
  noteBody: {
    borderTopWidth: 1,
    borderTopColor: '#d5e3d3',
    padding: 12,
    backgroundColor: '#ffffff',
  },
  noteBodyText: { fontSize: 13, color: '#314b36', lineHeight: 20 },
  editNoteBtn: {
    marginTop: 10,
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#0a7c4f',
    borderRadius: 999,
  },
  editNoteBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  mutedText: { color: '#8aab8a', fontSize: 13, lineHeight: 20, marginTop: 4 },

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
  logoutModalTitle: { fontSize: 16, fontWeight: '800', color: '#1b2a4a', marginBottom: 14, textAlign: 'center' },
  logoutModalActions: { flexDirection: 'row', gap: 10 },
  logoutModalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#f4f6fb',
  },
  logoutModalBtnText: { color: '#1b2a4a', fontWeight: '800' },
  logoutModalConfirm: {
    backgroundColor: '#d64545',
  },
});
