import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DateTimePicker = Platform.OS !== 'web'
  ? require('@react-native-community/datetimepicker').default
  : null;
import { saveProfile, setOnboardingComplete } from '../src/hooks/useStudentProfile';
import SUBJECTS from '../constants/subjects';

const SUBJECT_OPTIONS = SUBJECTS;

export default function OnboardingScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState(['english']);
  const [examDate, setExamDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadAccountName() {
      try {
        const raw = await AsyncStorage.getItem('auth_user');
        const user = raw ? JSON.parse(raw) : null;
        if (user?.name) setName(user.name);
      } catch (error) {
        console.warn('[OnboardingScreen] failed to load account name', error);
      }
    }
    loadAccountName();
  }, []);

  const canContinue = useMemo(() => {
    if (step === 1) return name.trim().length > 0;
    if (step === 2) return selectedSubjects.length > 0;
    if (step === 3) return Boolean(examDate);
    return false;
  }, [name, selectedSubjects, examDate, step]);

  const currentTitle = useMemo(() => {
    if (step === 1) return "Welcome to MalamAI! What's your name?";
    if (step === 2) return 'Which subjects are you sitting for JAMB?';
    if (step === 3) return 'When is your JAMB exam?';
    return '';
  }, [step]);

  const toggleSubject = (subjectId) => {
    if (subjectId === 'english') return;
    setSelectedSubjects((current) => {
      if (current.includes(subjectId)) {
        return current.filter((id) => id !== subjectId);
      }
      return [...current, subjectId];
    });
  };

  const handleDateChange = (_, date) => {
    setShowPicker(Platform.OS === 'ios'); // keep open on iOS, close on Android
    if (date) {
      setExamDate(date);
    }
  };

  const handleContinue = async () => {
    if (!canContinue) return;
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    setSaving(true);
    try {
      await saveProfile({ name: name.trim(), selectedSubjects, examDate });
      await setOnboardingComplete(true);
      navigation.replace('MainTabs');
    } catch (error) {
      console.warn('[OnboardingScreen] failed to save profile', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.headerBar} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.stepLabel}>Step {step} of 3</Text>
        <View style={styles.dotsRow}>
          {[1, 2, 3].map((item) => (
            <View key={item} style={[styles.dot, item === step && styles.dotActive]} />
          ))}
        </View>

        <Text style={styles.question}>{currentTitle}</Text>

        {step === 1 && (
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="#8a9c8a"
          />
        )}

        {step === 2 && (
          <View style={styles.subjectGrid}>
            {SUBJECT_OPTIONS.map((subject) => {
              const selected = selectedSubjects.includes(subject.id);
              const locked = subject.id === 'english';
              return (
                <TouchableOpacity
                  key={subject.id}
                  style={[
                    styles.subjectChip,
                    selected ? styles.subjectChipSelected : styles.subjectChipDefault,
                    locked && styles.subjectChipLocked,
                  ]}
                  onPress={() => toggleSubject(subject.id)}
                  activeOpacity={locked ? 1 : 0.7}
                >
                  <Text style={[styles.subjectText, selected && styles.subjectTextSelected]}>
                    {subject.emoji} {subject.name}
                  </Text>
                  {locked && <Text style={styles.lockText}>🔒</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {step === 3 && (
          <View style={styles.dateSection}>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={examDate ? examDate.toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  if (e.target.value) setExamDate(new Date(e.target.value));
                }}
                style={webDateInputStyle}
              />
            ) : (
              <>
                <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowPicker(true)}>
                  <Text style={styles.datePickerText}>
                    📅  {examDate ? examDate.toDateString() : 'Tap to select exam date'}
                  </Text>
                </TouchableOpacity>
                {showPicker && (
                  <DateTimePicker
                    value={examDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                  />
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.actionButton, !canContinue && styles.actionButtonDisabled]}
        onPress={handleContinue}
        disabled={!canContinue || saving}
      >
        <Text style={styles.actionText}>{step < 3 ? 'Continue →' : saving ? 'Saving…' : 'Finish Setup'}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const webDateInputStyle = {
  width: '100%',
  padding: '16px',
  fontSize: '16px',
  borderRadius: '18px',
  border: '1px solid #d6e4d7',
  backgroundColor: '#f5f8f3',
  color: '#17422e',
  outline: 'none',
  boxSizing: 'border-box',
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerBar: {
    height: 80,
    backgroundColor: '#1b2a4a',
  },
  container: {
    padding: 24,
    paddingTop: 28,
    flexGrow: 1,
  },
  stepLabel: {
    color: '#889f87',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    marginBottom: 28,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: '#dce6dc',
    marginRight: 8,
  },
  dotActive: {
    backgroundColor: '#2e4a7a',
  },
  question: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 36,
    color: '#20392f',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#f5f8f3',
    borderRadius: 18,
    padding: 18,
    fontSize: 16,
    color: '#1c3f2c',
    borderWidth: 1,
    borderColor: '#d6e4d7',
  },
  subjectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  subjectChip: {
    minWidth: '48%',
    margin: 8,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#d5e3d3',
    justifyContent: 'center',
  },
  subjectChipDefault: {
    backgroundColor: '#f6faf6',
  },
  subjectChipSelected: {
    backgroundColor: '#1b2a4a',
    borderColor: '#1b2a4a',
  },
  subjectChipLocked: {
    opacity: 0.9,
  },
  subjectText: {
    color: '#21452d',
    fontWeight: '700',
    fontSize: 14,
  },
  subjectTextSelected: {
    color: '#ffffff',
  },
  lockText: {
    fontSize: 12,
    color: '#ffffff',
    marginTop: 6,
  },
  dateSection: {
    marginTop: 10,
  },
  datePickerButton: {
    backgroundColor: '#f5f8f3',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#d6e4d7',
  },
  datePickerText: {
    fontSize: 16,
    color: '#17422e',
  },
  actionButton: {
    backgroundColor: '#1b2a4a',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: '#90ad90',
  },
  actionText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
  },
});
