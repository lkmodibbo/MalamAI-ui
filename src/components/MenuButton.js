import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/colors';
import { useSidebar } from '../navigation/SidebarProvider';

/**
 * Opens the app sidebar. This is the only way between the main sections now
 * that the bottom tab bar is gone, so every tab screen header shows one.
 */
export default function MenuButton({ style, tone = 'dark' }) {
  const { openSidebar } = useSidebar();
  const barColor = tone === 'light' ? COLORS.textWhite : COLORS.primary;

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={openSidebar}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <View style={[styles.bar, { backgroundColor: barColor }]} />
      <View style={[styles.bar, { backgroundColor: barColor }]} />
      <View style={[styles.bar, styles.barShort, { backgroundColor: barColor }]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 34,
    height: 34,
    marginRight: 10,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  bar: {
    width: 20,
    height: 2,
    borderRadius: 2,
    marginVertical: 2.5,
  },
  barShort: {
    width: 13,
  },
});
