import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

export default function HomeReviewCard({ dueCount = 0, onPress }) {
  if (dueCount <= 0) return null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.row}>
        <View style={styles.textBlock}>
          <Text style={styles.title}>Review due</Text>
          <Text style={styles.subtitle}>You have {dueCount} questions to review today</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{dueCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textBlock: {
    flex: 1,
  },
  title: {
    color: COLORS.textWhite,
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 3,
  },
  subtitle: {
    color: '#C5D4CF',
    fontSize: 13,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginLeft: 12,
  },
  badgeText: {
    color: COLORS.textWhite,
    fontWeight: '800',
    fontSize: 14,
  },
});
