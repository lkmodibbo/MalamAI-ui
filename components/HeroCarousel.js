import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const IMAGES = [
  require('../assets/Images/JambImage-1.jpeg'),
  require('../assets/Images/JambImage-2.jpeg'),
  require('../assets/Images/JambImage-3.jpeg'),
  require('../assets/Images/JambImage-4.jpg'),
  require('../assets/Images/JambImage-5.webp'),
  require('../assets/Images/JambImage-6.jpg'),
  require('../assets/Images/JambImage-7.jpg'),
];

const SLIDE_DURATION = 3000; // 3 seconds per image
const FADE_DURATION = 600;   // 0.6s crossfade

export default function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade in the next image over the current one
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }).start(() => {
        // Once fade is complete, swap indexes and reset opacity
        setCurrentIndex((prev) => {
          const next = (prev + 1) % IMAGES.length;
          setNextIndex((next + 1) % IMAGES.length);
          return next;
        });
        fadeAnim.setValue(0);
      });
    }, SLIDE_DURATION);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      {/* Current image (below) */}
      <Image
        source={IMAGES[currentIndex]}
        style={styles.image}
        resizeMode="cover"
      />

      {/* Next image fades in on top */}
      <Animated.Image
        source={IMAGES[nextIndex]}
        style={[styles.image, styles.imageOverlay, { opacity: fadeAnim }]}
        resizeMode="cover"
      />

      {/* Dot indicators */}
      <View style={styles.dots}>
        {IMAGES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === currentIndex && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    overflow: 'hidden',
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
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    backgroundColor: '#ffffff',
    width: 18,
  },
});
