import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/colors';

const SLIDES = [
  {
    image: require('../../assets/Images/hero-study.jpg'),
    kicker: 'AI tutor',
    title: 'A malam for every topic',
    subtitle: 'Clear explanations when JAMB maths or English gets stuck.',
  },
  {
    image: require('../../assets/Images/cbt-focus.jpg'),
    kicker: 'CBT practice',
    title: 'Train like exam day',
    subtitle: 'Timed mocks that feel like the real UTME hall.',
  },
  {
    image: require('../../assets/Images/study-together.jpg'),
    kicker: 'Stay consistent',
    title: 'Study with a plan',
    subtitle: 'Quizzes, notes, and review in one place.',
  },
  {
    image: require('../../assets/Images/night-prep.jpg'),
    kicker: 'Your pace',
    title: 'Revise when it is quiet',
    subtitle: 'Night sessions that actually stick.',
  },
  {
    image: require('../../assets/Images/exam-ready.jpg'),
    kicker: 'Exam ready',
    title: 'Walk in prepared',
    subtitle: 'Fix weak areas before JAMB day.',
  },
];

const SLIDE_DURATION = 3800;
const FADE_DURATION = 650;

export default function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex((prev) => {
          const next = (prev + 1) % SLIDES.length;
          setNextIndex((next + 1) % SLIDES.length);
          return next;
        });
        fadeAnim.setValue(0);
      });
    }, SLIDE_DURATION);

    return () => clearInterval(interval);
  }, [fadeAnim]);

  const current = SLIDES[currentIndex];

  return (
    <View style={styles.container}>
      <Image source={SLIDES[currentIndex].image} style={styles.image} resizeMode="cover" />
      <Animated.Image
        source={SLIDES[nextIndex].image}
        style={[styles.image, styles.imageOverlay, { opacity: fadeAnim }]}
        resizeMode="cover"
      />

      <View style={styles.scrim} />

      <View style={styles.caption}>
        <View style={styles.kicker}>
          <Text style={styles.kickerText}>{current.kicker}</Text>
        </View>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.subtitle}>{current.subtitle}</Text>
      </View>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 268,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.primary,
    position: 'relative',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 40, 61, 0.38)',
  },
  caption: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 28,
  },
  kicker: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(15, 138, 114, 0.92)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  kickerText: {
    color: COLORS.textWhite,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    color: COLORS.textWhite,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
    marginBottom: 4,
  },
  subtitle: {
    color: COLORS.textOnDark,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    maxWidth: 300,
  },
  dots: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: {
    backgroundColor: COLORS.textWhite,
    width: 18,
  },
});
