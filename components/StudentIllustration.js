import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';

export default function StudentIllustration() {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const screenGlow = useRef(new Animated.Value(0.7)).current;
  const bookFloat = useRef(new Animated.Value(0)).current;
  const dotPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Student body floating up/down
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 2000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ]),
    ).start();

    // Screen glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(screenGlow, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(screenGlow, { toValue: 0.6, duration: 1500, useNativeDriver: true }),
      ]),
    ).start();

    // Book float (offset timing from body)
    Animated.loop(
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(bookFloat, { toValue: -10, duration: 1800, useNativeDriver: true }),
        Animated.timing(bookFloat, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ]),
    ).start();

    // Dot pulse (Wi-Fi / signal indicator)
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulse, { toValue: 1.4, duration: 700, useNativeDriver: true }),
        Animated.timing(dotPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <View style={styles.scene}>

      {/* Desk surface */}
      <View style={styles.desk} />

      {/* Monitor stand */}
      <View style={styles.monitorStand} />
      <View style={styles.monitorBase} />

      {/* Monitor screen */}
      <Animated.View style={[styles.monitor, { opacity: screenGlow }]}>
        {/* Screen content lines */}
        <View style={[styles.screenLine, { width: '70%' }]} />
        <View style={[styles.screenLine, { width: '50%', marginTop: 5 }]} />
        <View style={[styles.screenLine, { width: '60%', marginTop: 5 }]} />
        {/* Glowing dot = cursor */}
        <Animated.View style={[styles.cursor, { transform: [{ scale: dotPulse }] }]} />
      </Animated.View>

      {/* Monitor bezel */}
      <View style={styles.monitorBezel} />

      {/* Floating book */}
      <Animated.View style={[styles.book, { transform: [{ translateY: bookFloat }] }]}>
        <View style={styles.bookSpine} />
        <View style={styles.bookPage} />
        <View style={[styles.bookLine, { top: 10 }]} />
        <View style={[styles.bookLine, { top: 18 }]} />
        <View style={[styles.bookLine, { top: 26 }]} />
      </Animated.View>

      {/* Student body */}
      <Animated.View style={[styles.student, { transform: [{ translateY: floatAnim }] }]}>
        {/* Head */}
        <View style={styles.head}>
          {/* Eyes */}
          <View style={styles.eyes}>
            <View style={styles.eye} />
            <View style={styles.eye} />
          </View>
          {/* Smile */}
          <View style={styles.smile} />
        </View>

        {/* Neck */}
        <View style={styles.neck} />

        {/* Body / torso */}
        <View style={styles.torso}>
          {/* Arms */}
          <View style={[styles.arm, styles.armLeft]} />
          <View style={[styles.arm, styles.armRight]} />
        </View>
      </Animated.View>

      {/* Floating stars / sparkles */}
      <Animated.View style={[styles.sparkle, styles.sparkle1, { transform: [{ translateY: floatAnim }] }]}>
        <View style={styles.star} />
      </Animated.View>
      <Animated.View style={[styles.sparkle, styles.sparkle2, { transform: [{ translateY: bookFloat }] }]}>
        <View style={[styles.star, { width: 8, height: 8 }]} />
      </Animated.View>
      <Animated.View style={[styles.sparkle, styles.sparkle3, { transform: [{ translateY: floatAnim }] }]}>
        <View style={[styles.star, { width: 6, height: 6 }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },

  // Desk
  desk: {
    position: 'absolute',
    bottom: 18,
    width: '85%',
    height: 12,
    backgroundColor: '#2e4a7a',
    borderRadius: 6,
  },

  // Monitor stand
  monitorStand: {
    position: 'absolute',
    bottom: 30,
    left: '50%',
    marginLeft: -4,
    width: 8,
    height: 30,
    backgroundColor: '#b0bfd8',
    borderRadius: 4,
  },
  monitorBase: {
    position: 'absolute',
    bottom: 29,
    left: '50%',
    marginLeft: -20,
    width: 40,
    height: 8,
    backgroundColor: '#b0bfd8',
    borderRadius: 4,
  },

  // Monitor
  monitorBezel: {
    position: 'absolute',
    bottom: 58,
    left: '50%',
    marginLeft: -62,
    width: 124,
    height: 84,
    backgroundColor: '#1b2a4a',
    borderRadius: 10,
  },
  monitor: {
    position: 'absolute',
    bottom: 62,
    left: '50%',
    marginLeft: -56,
    width: 112,
    height: 72,
    backgroundColor: '#3b5bdb',
    borderRadius: 7,
    padding: 10,
    justifyContent: 'center',
  },
  screenLine: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 2,
  },
  cursor: {
    position: 'absolute',
    bottom: 10,
    right: 14,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#74c0fc',
  },

  // Book (floating right side)
  book: {
    position: 'absolute',
    bottom: 90,
    right: '12%',
    width: 40,
    height: 52,
    backgroundColor: '#e74c3c',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bookSpine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: '#c0392b',
  },
  bookPage: {
    position: 'absolute',
    left: 8,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff5f5',
  },
  bookLine: {
    position: 'absolute',
    left: 12,
    right: 4,
    height: 3,
    backgroundColor: '#e0b0b0',
    borderRadius: 2,
  },

  // Student
  student: {
    position: 'absolute',
    bottom: 29,
    left: '22%',
    alignItems: 'center',
  },
  head: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f9c784',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e8a854',
  },
  eyes: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
    marginTop: -4,
  },
  eye: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1b2a4a',
  },
  smile: {
    width: 14,
    height: 7,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: '#1b2a4a',
  },
  neck: {
    width: 12,
    height: 8,
    backgroundColor: '#f9c784',
  },
  torso: {
    width: 48,
    height: 44,
    backgroundColor: '#1b2a4a',
    borderRadius: 8,
    alignItems: 'center',
    position: 'relative',
  },
  arm: {
    position: 'absolute',
    width: 12,
    height: 32,
    backgroundColor: '#1b2a4a',
    borderRadius: 6,
    top: 4,
  },
  armLeft: {
    left: -10,
    transform: [{ rotate: '15deg' }],
  },
  armRight: {
    right: -10,
    transform: [{ rotate: '-15deg' }],
  },

  // Sparkles
  sparkle: { position: 'absolute' },
  sparkle1: { top: 20, left: '10%' },
  sparkle2: { top: 10, right: '20%' },
  sparkle3: { top: 40, left: '35%' },
  star: {
    width: 10,
    height: 10,
    backgroundColor: '#f9c784',
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
    opacity: 0.7,
  },
});
