import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/colors';

const SIZES = {
  sm: { box: 28, radius: 8, font: 12 },
  md: { box: 38, radius: 10, font: 16 },
  lg: { box: 52, radius: 14, font: 22 },
};

// Two letters read better for subjects that share a first letter
// (Government / Geography, Physics / Public Admin).
export function subjectInitials(name) {
  const clean = String(name || '').replace(/^use of\s+/i, '').trim();
  if (!clean) return '';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export default function SubjectBadge({ name, size = 'md', tone = 'light', style }) {
  // Nothing sensible to abbreviate — render no tile rather than a placeholder.
  if (!String(name || '').trim()) return null;

  const dims = SIZES[size] || SIZES.md;
  const dark = tone === 'dark';

  return (
    <View
      style={[
        styles.base,
        { width: dims.box, height: dims.box, borderRadius: dims.radius },
        dark ? styles.dark : styles.light,
        style,
      ]}
    >
      <Text style={[styles.text, { fontSize: dims.font }, dark ? styles.textDark : styles.textLight]}>
        {subjectInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  light: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dark: {
    backgroundColor: COLORS.primary,
  },
  text: {
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  textLight: { color: COLORS.primary },
  textDark: { color: COLORS.textWhite },
});
