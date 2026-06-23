import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

const OPTIONS = [
  { key: 'english-only', label: 'English only', icon: '🇳🇬' },
  { key: 'english-hausa', label: 'English + Hausa', icon: '🤝' },
  { key: 'hausa-heavy', label: 'Hausa-heavy', icon: '🌍' },
];

export default function LanguageModeSelector({ value, onChange }) {
  return (
    <View style={styles.root}>
      {OPTIONS.map((option) => {
        const active = value === option.key;
        return (
          <TouchableOpacity
            key={option.key}
            style={[styles.option, active ? styles.optionActive : styles.optionInactive]}
            onPress={() => onChange(option.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.icon, active ? styles.optionTextActive : styles.optionTextInactive]}>{option.icon}</Text>
            <Text style={[styles.label, active ? styles.optionTextActive : styles.optionTextInactive]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    backgroundColor: '#e8efe8',
    borderRadius: 24,
    padding: 4,
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 20,
    marginHorizontal: 2,
    minWidth: 100,
  },
  optionActive: {
    backgroundColor: '#0a7c4f',
  },
  optionInactive: {
    backgroundColor: '#d8e3d8',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  icon: {
    fontSize: 18,
    marginBottom: 4,
  },
  optionTextActive: {
    color: '#ffffff',
  },
  optionTextInactive: {
    color: '#4b6d4d',
  },
});
