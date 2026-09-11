/**
 * TokenBar — shows the student's daily AI token usage in the chat header.
 *
 * Props:
 *   chat     — { used, limit, remaining }
 *   generate — { used, limit, remaining }
 *   secondsUntilReset — number (from /api/ai/usage)
 *   loading  — bool
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

function formatCountdown(seconds) {
  if (seconds <= 0) return 'Resetting…';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

function TokenPill({ label, used, limit, color }) {
  const remaining  = Math.max(0, limit - used);
  const pct        = limit > 0 ? Math.min(used / limit, 1) : 0;
  const depleted   = remaining === 0;
  const fillAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: pct,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const fillWidth = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.pill}>
      <View style={styles.pillLabelRow}>
        <Text style={styles.pillLabel}>{label}</Text>
        <Text style={[styles.pillCount, depleted && styles.pillCountDepleted]}>
          {depleted ? 'Limit reached' : `${remaining} left`}
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            { width: fillWidth, backgroundColor: depleted ? '#e74c3c' : color },
          ]}
        />
      </View>
    </View>
  );
}

export default function TokenBar({ chat, generate, secondsUntilReset, loading }) {
  const [countdown, setCountdown] = useState(secondsUntilReset ?? 0);

  // Sync when prop updates (fresh fetch)
  useEffect(() => {
    if (typeof secondsUntilReset === 'number') {
      setCountdown(secondsUntilReset);
    }
  }, [secondsUntilReset]);

  // Tick every second
  useEffect(() => {
    if (!countdown) return;
    const id = setInterval(() => setCountdown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [countdown > 0]);  // only restart when it transitions from 0 → positive

  const chatDepleted     = chat     && chat.remaining     === 0;
  const generateDepleted = generate && generate.remaining === 0;
  const anyDepleted      = chatDepleted || generateDepleted;

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading AI tokens…</Text>
      </View>
    );
  }

  if (!chat || !generate) return null;

  return (
    <View style={[styles.container, anyDepleted && styles.containerDepleted]}>
      <View style={styles.pillRow}>
        <TokenPill
          label="Chat"
          used={chat.used}
          limit={chat.limit}
          color="#0F8A72"
        />
        <TokenPill
          label="Generate"
          used={generate.used}
          limit={generate.limit}
          color="#2980b9"
        />
      </View>

      {anyDepleted ? (
        <View style={styles.resetRow}>
          <Text style={styles.resetIcon}>⏱</Text>
          <Text style={styles.resetText}>
            Resets in{' '}
            <Text style={styles.resetCountdown}>{formatCountdown(countdown)}</Text>
          </Text>
        </View>
      ) : (
        <Text style={styles.freeLabel}>Free daily tokens • resets in {formatCountdown(countdown)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F3F7F5',
    borderBottomWidth: 1,
    borderBottomColor: '#DCE6E2',
  },
  containerDepleted: {
    backgroundColor: '#FDF0F0',
    borderBottomColor: '#F5C6CB',
  },

  pillRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 5,
  },

  pill: { flex: 1 },
  pillLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pillLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5A6B68',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pillCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#14283D',
  },
  pillCountDepleted: {
    color: '#e74c3c',
  },

  track: {
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D2DDD7',
    overflow: 'hidden',
  },
  fill: {
    height: 5,
    borderRadius: 999,
  },

  freeLabel: {
    fontSize: 10,
    color: '#8A9BB0',
    textAlign: 'center',
  },
  resetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  resetIcon: { fontSize: 11 },
  resetText: {
    fontSize: 11,
    color: '#c0392b',
    fontWeight: '600',
  },
  resetCountdown: {
    fontWeight: '900',
    color: '#c0392b',
  },
  loadingText: {
    fontSize: 11,
    color: '#8A9BB0',
    textAlign: 'center',
  },
});
