import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function ExamCountdownCard({ daysRemaining, progressPercent, examDate, onSetDate }) {
  const hasDate = Boolean(examDate);
  const examText = hasDate
    ? daysRemaining < 0
      ? 'JAMB day has arrived! Ka shirya? Good luck!'
      : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} to JAMB`
    : 'Set your exam date';

  const progressValue = hasDate ? progressPercent : 0;
  const progressWidth = `${Math.min(Math.max(progressValue, 0), 100)}%`;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.countdownText}>{examText}</Text>
        {!hasDate && (
          <TouchableOpacity onPress={onSetDate} style={styles.setDateBtn}>
            <Text style={styles.setDateText}>Set date →</Text>
          </TouchableOpacity>
        )}
      </View>
      {hasDate && (
        <Text style={styles.dateLabel}>
          📅 {examDate instanceof Date ? examDate.toDateString() : new Date(examDate).toDateString()}
        </Text>
      )}
      {hasDate && daysRemaining >= 0 && (
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: progressWidth }]} />
        </View>
      )}
      {hasDate && daysRemaining < 0 && (
        <Text style={styles.subText}>Your exam date is today or has passed.</Text>
      )}
      {!hasDate && (
        <Text style={styles.subText}>Add your JAMB date so MalamAI can build a daily study plan.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#1b2a4a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  countdownText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    flex: 1,
    marginRight: 10,
  },
  setDateBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  setDateText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  dateLabel: {
    color: '#b0bfd8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    backgroundColor: '#ffffff',
    borderRadius: 999,
  },
  subText: {
    color: '#b0bfd8',
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
  },
});
