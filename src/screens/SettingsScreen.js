import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, Alert, ToastAndroid, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useExamCountdown from '../hooks/useExamCountdown';
import LanguageModeSelector from '../components/LanguageModeSelector';
import { getMode, setMode } from '../hooks/useLanguageMode';

const DateTimePicker = Platform.OS !== 'web'
  ? require('@react-native-community/datetimepicker').default
  : null;

export default function SettingsScreen({ navigation }) {
  const { examDate, setExamDate, loading } = useExamCountdown();
  const [selectedDate, setSelectedDate] = useState(examDate || new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const [languageMode, setLanguageMode] = useState('english-hausa');

  useEffect(() => {
    if (examDate) setSelectedDate(examDate);
  }, [examDate]);

  useEffect(() => {
    async function loadLanguageMode() {
      const mode = await getMode();
      setLanguageMode(mode);
    }
    loadLanguageMode();
  }, []);

  const showToast = (message) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('', message);
    }
  };

  const handleLanguageChange = async (nextMode) => {
    try {
      const savedMode = await setMode(nextMode);
      setLanguageMode(savedMode);
      showToast('Language updated! Ka yi kyau!');
    } catch (error) {
      console.warn('[SettingsScreen] set language mode failed', error);
      Alert.alert('Save failed', 'Could not update language mode. Try again.');
    }
  };

  // FIX 1: Use 'calendar' display on Android so a real calendar grid appears
  // instead of the default spinner. On iOS the inline picker handles this automatically.
  const handleDateChange = (event, date) => {
    const isAndroid = Platform.OS === 'android';
    const dismissed = event?.type === 'dismissed' || event?.nativeEvent?.action === 'dismissed';

    if (isAndroid) {
      setShowPicker(false);
      if (dismissed || !date) return;
    }

    if (date) {
      setSelectedDate(date);
      if (isAndroid) {
        handleSaveDate(date);
      }
    }
  };

  // FIX 4: Extracted save logic into its own function that accepts a date argument
  // so Android can call it immediately from handleDateChange
  const handleSaveDate = async (dateToSave) => {
    const date = dateToSave || selectedDate;
    try {
      await setExamDate(date);
      setSaved(true);
      setSavedMessage(`✓ Saved! Exam on ${date.toDateString()}`);
      showToast('Exam date saved! Ka yi kyau!');
      setTimeout(() => {
        setSaved(false);
        setSavedMessage('');
      }, 3000);
    } catch (error) {
      console.warn('[SettingsScreen] save exam date failed', error);
      Alert.alert('Save failed', 'Could not save the exam date. Try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.backBtn} />
      </View>

      <View>
        {/* Language Section */}
        <Text style={styles.sectionLabel}>Content Language</Text>
        <LanguageModeSelector value={languageMode} onChange={handleLanguageChange} />

        {/* Exam Date Section */}
        <Text style={styles.sectionLabel}>JAMB Exam Date</Text>
        <Text style={styles.hint}>
          Tap below to open the calendar and pick your exam date.
        </Text>

        <TouchableOpacity
          style={[styles.dateButton, saved && styles.dateButtonSaved]}
          onPress={() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (selectedDate && selectedDate.getTime() < today.getTime()) {
              setSelectedDate(new Date());
            }
            setShowPicker(true);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.dateButtonTextWrap}>
            <Text style={styles.dateButtonLabel}>Exam date</Text>
            <Text style={styles.dateButtonValue}>
              {selectedDate ? selectedDate.toDateString() : 'Tap to select'}
            </Text>
          </View>
          {saved && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>

        {Platform.OS === 'web' ? (
          showPicker && (
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                if (e.target.value) {
                  const picked = new Date(e.target.value);
                  setSelectedDate(picked);
                  setShowPicker(false);
                  handleSaveDate(picked);
                }
              }}
              style={webDateInputStyle}
            />
          )
        ) : Platform.OS === 'ios' ? (
          <Modal
            visible={showPicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowPicker(false)}
          >
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}
              activeOpacity={1}
              onPress={() => setShowPicker(false)}
            >
              <TouchableOpacity activeOpacity={1} style={styles.pickerCard}>
                <Text style={styles.pickerTitle}>Pick your exam date</Text>
                <DateTimePicker
                  value={selectedDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                  style={{ width: '100%' }}
                  themeVariant="light"
                />
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={() => {
                    setShowPicker(false);
                    handleSaveDate(selectedDate);
                  }}
                >
                  <Text style={styles.saveBtnText}>Confirm date</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        ) : (
          showPicker && (
            <DateTimePicker
              value={selectedDate || new Date()}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )
        )}

        {!showPicker && (
          <TouchableOpacity
            style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
            onPress={() => handleSaveDate(selectedDate)}
            disabled={loading}
          >
            <Text style={styles.saveBtnText}>
              {loading ? 'Saving…' : 'Save exam date'}
            </Text>
          </TouchableOpacity>
        )}

        {savedMessage ? (
          <View style={styles.savedBanner}>
            <Text style={styles.savedText}>{savedMessage}</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const webDateInputStyle = {
  width: '100%',
  padding: '14px 16px',
  fontSize: '15px',
  borderRadius: '14px',
  border: '1.5px solid #D2DDD7',
  backgroundColor: '#F3F7F5',
  color: '#14283D',
  outline: 'none',
  boxSizing: 'border-box',
  marginBottom: '16px',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#D2DDD7',
  },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 60,
  },
  backText: {
    color: '#14283D',
    fontWeight: '700',
    fontSize: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#14283D',
  },
  body: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5A6B68',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 20,
    marginBottom: 10,
  },
  hint: {
    fontSize: 13,
    color: '#5A6B68',
    marginBottom: 10,
    lineHeight: 18,
  },
  dateButton: {
    backgroundColor: '#F3F7F5',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#D2DDD7',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateButtonSaved: {
    borderColor: '#27ae60',
    backgroundColor: '#eafaf1',
  },
  dateButtonTextWrap: {
    flex: 1,
  },
  dateButtonLabel: {
    fontSize: 11,
    color: '#5A6B68',
    marginBottom: 2,
  },
  dateButtonValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#14283D',
  },
  checkmark: {
    fontSize: 18,
    color: '#27ae60',
    fontWeight: '900',
  },
  saveBtn: {
    backgroundColor: '#14283D',
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnDisabled: {
    backgroundColor: '#B5C4BF',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  savedBanner: {
    marginTop: 14,
    backgroundColor: '#eafaf1',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#27ae60',
    alignItems: 'center',
  },
  savedText: {
    color: '#1e8449',
    fontWeight: '700',
    fontSize: 14,
  },
  pickerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    width: '88%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#14283D',
    textAlign: 'center',
    marginBottom: 8,
  },
});
