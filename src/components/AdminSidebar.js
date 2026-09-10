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

export const ADMIN_NAV_ITEMS = [
  { label: 'Overview', route: 'AdminHome' },
  { label: 'Users', route: 'AdminUsers' },
  { label: 'Leaderboard', route: 'AdminBoard' },
  { label: 'Upload', route: 'AdminUpload' },
  { label: 'Content', route: 'AdminContent' },
  { label: 'Audit', route: 'AdminAudit' },
];

export default function AdminSidebar({ visible, onClose, onNavigate, activeRoute }) {
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

  // Close first, then navigate — avoids leaving the drawer open on the next screen.
  const handlePress = (route) => {
    onClose?.();
    // Defer navigation one tick so the modal can dismiss cleanly.
    requestAnimationFrame(() => {
      onNavigate?.(route);
    });
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlayRoot}>
        <Animated.View style={[styles.scrim, { opacity: slide }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.panel,
            {
              width: panelWidth,
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 16,
              transform: [{ translateX }],
            },
          ]}
        >
          <View style={styles.headerSmall}>
            <View>
              <Text style={styles.headerEyebrow}>Console</Text>
              <Text style={styles.headerTitle}>Admin</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtnSmall}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {ADMIN_NAV_ITEMS.map((it) => {
              const active = activeRoute === it.route;
              return (
                <TouchableOpacity
                  key={it.route}
                  style={[styles.item, active && styles.itemActive]}
                  onPress={() => handlePress(it.route)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.itemLabel, active && styles.itemLabelActive]}>{it.label}</Text>
                  <Text style={[styles.itemArrow, active && styles.itemArrowActive]}>→</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayRoot: { flex: 1, flexDirection: 'row' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 61, 56, 0.55)' },
  panel: {
    backgroundColor: COLORS.adminHero,
    borderRightWidth: 1,
    borderRightColor: 'rgba(196, 163, 90, 0.28)',
    elevation: 16,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 2, height: 0 },
  },
  headerSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(230, 244, 239, 0.12)',
  },
  headerEyebrow: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textWhite, marginTop: 2 },
  closeBtnSmall: { paddingHorizontal: 6, paddingVertical: 2 },
  closeText: { fontSize: 16, color: COLORS.textOnDark, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 10, paddingBottom: 12 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  itemActive: {
    backgroundColor: 'rgba(196, 163, 90, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(196, 163, 90, 0.45)',
  },
  itemLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textOnDark },
  itemLabelActive: { color: COLORS.gold },
  itemArrow: { fontSize: 15, color: 'rgba(230, 244, 239, 0.45)' },
  itemArrowActive: { color: COLORS.gold },
});
