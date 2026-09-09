import React, { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';

export default function Skeleton({ style, variant = 'row', strength = 1 }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);

  useEffect(() => {
    if (!w) return;
    const dur = Math.max(400, 900 / Math.max(0.5, strength));
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: dur, useNativeDriver: true }),
    );
    anim.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [anim, w, strength]);

  const overlayWidth = Math.max(40, Math.round(w * 0.28));
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [-overlayWidth, w + overlayWidth] });

  const baseStyle = { backgroundColor: '#E9EFEE', borderRadius: 8, overflow: 'hidden' };
  if (variant === 'chip') baseStyle.borderRadius = 999;
  if (variant === 'card') baseStyle.borderRadius = 12;

  const overlayOpacity = Math.min(0.6, 0.25 * strength + 0.1);

  return (
    <View
      style={[baseStyle, style]}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      {w > 0 && (
        <Animated.View
          style={{
            position: 'absolute',
            left: -overlayWidth,
            top: 0,
            bottom: 0,
            width: overlayWidth,
            transform: [{ translateX }, { rotate: '12deg' }],
            backgroundColor: `rgba(255,255,255,${overlayOpacity})`,
          }}
        />
      )}
    </View>
  );
}
