import React, { useEffect } from 'react';
import { Text, TouchableWithoutFeedback, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolate,
  useDerivedValue,
} from 'react-native-reanimated';

export default function FlashCard({ card, subjectEmoji, flipped, onFlip }) {
  const rotation = useSharedValue(flipped ? 180 : 0);

  useEffect(() => {
    rotation.value = withTiming(flipped ? 180 : 0, { duration: 400 });
  }, [flipped, rotation]);

  const frontAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${rotation.value}deg` },
    ],
    opacity: interpolate(rotation.value, [0, 90], [1, 0], Extrapolate.CLAMP),
  }));

  const backAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${rotation.value + 180}deg` },
    ],
    opacity: interpolate(rotation.value, [90, 180], [0, 1], Extrapolate.CLAMP),
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  }));

  return (
    <TouchableWithoutFeedback onPress={onFlip}>
      <View style={styles.cardWrapper}>
        <Text style={styles.watermark}>{subjectEmoji || '📘'}</Text>
        <Animated.View style={[styles.cardFace, styles.cardFront, frontAnimatedStyle]}>
          <Text style={styles.cardTitle}>{card.front}</Text>
          <Text style={styles.cardHint}>Tap to reveal</Text>
        </Animated.View>
        <Animated.View style={[styles.cardFace, styles.cardBack, backAnimatedStyle]}>
          <Text style={styles.backText}>{card.back}</Text>
          {card.tip ? <Text style={styles.memoryTip}>Memory tip: {card.tip}</Text> : null}
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    width: '90%',
    minHeight: 200,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#0a7c4f',
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute',
    fontSize: 120,
    color: '#0a7c4f',
    opacity: 0.08,
    top: '35%',
    left: '20%',
  },
  cardFace: {
    width: '100%',
    minHeight: 300,
    borderRadius: 20,
    padding: 10,
    backfaceVisibility: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFront: {
    backgroundColor: '#ffffff',
  },
  cardBack: {
    backgroundColor: '#e4f5ec',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0a7c4f',
    textAlign: 'center',
    marginBottom: 10,
  },
  cardHint: {
    marginTop: 10,
    color: '#7a7a7a',
    fontSize: 16,
  },
  backText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f3c2b',
    textAlign: 'center',
    lineHeight: 26,
  },
  memoryTip: {
    marginTop: 10,
    color: '#b46a08',
    fontStyle: 'italic',
    textAlign: 'center',
    fontSize: 19,
  },
});
