import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';

const ANIMATION_MS = 220;

const ITEMS = [
  { label: 'Overview', route: 'AdminHome' },
  { label: 'Users', route: 'AdminUsers' },
  { label: 'Leaderboard', route: 'AdminBoard' },
  { label: 'Upload', route: 'AdminUpload' },
  { label: 'Content', route: 'AdminContent' },
];

export default function AdminSidebar({ visible, onClose, onNavigate }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(Math.round(width * 0.82), 320);
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: ANIMATION_MS,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [-panelWidth, 0] });

  const handlePress = (route) => {
    onClose?.();
    onNavigate?.(route);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlayRoot}>
        <Animated.View style={[styles.scrim, { opacity: slide }]}> 
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.panel, { width: panelWidth, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16, transform: [{ translateX }] }] }>
          <View style={styles.headerSmall}>
            <Text style={styles.headerTitle}>Admin</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtnSmall}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {ITEMS.map((it) => (
              <TouchableOpacity key={it.route} style={styles.item} onPress={() => handlePress(it.route)} activeOpacity={0.8}>
                <Text style={styles.itemLabel}>{it.label}</Text>
                <Text style={styles.itemArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayRoot: { flex: 1, flexDirection: 'row' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20, 40, 61, 0.45)' },
  panel: { backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: COLORS.border, elevation: 16, shadowColor: COLORS.shadow, shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 2, height: 0 } },
  headerSmall: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  closeBtnSmall: { paddingHorizontal: 6, paddingVertical: 2 },
  closeText: { fontSize: 16, color: COLORS.textMuted, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 8, paddingBottom: 12 },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  itemLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  itemArrow: { fontSize: 15, color: COLORS.textLight },
});
