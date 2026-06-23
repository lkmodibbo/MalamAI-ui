import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';

export default function HomeReviewCard({ dueCount = 0, onPress }) {
  if (dueCount <= 0) return null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.row}>
        <Text style={styles.icon}>🧠</Text>
        <View style={styles.textBlock}>
          <Text style={styles.title}>Review Due</Text>
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
    backgroundColor: '#1b2a4a',
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 26,
    marginRight: 12,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 3,
  },
  subtitle: {
    color: '#b0bfd8',
    fontSize: 13,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  badgeText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
});
