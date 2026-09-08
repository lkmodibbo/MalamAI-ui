import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
  useWindowDimensions,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';

function personInitials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'S';
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// The five places students actually move between day to day. Everything else
// sits behind "More" so the menu opens as a short, scannable list.
const PRIMARY = [
  { label: 'Home', hint: 'Your dashboard', route: 'Home' },
  { label: 'AI Tutor', hint: 'Ask any JAMB question', route: 'Chat' },
  { label: 'Subjects', hint: 'Browse topics to learn', route: 'Subjects' },
  { label: 'Mock exam', hint: 'Timed CBT-style paper', route: 'MockSetup' },
  { label: 'Review', hint: 'Questions due today', route: 'Review', badgeKey: 'dueCount' },
];

const SECONDARY = [
  { label: 'Past questions', route: 'PastQuestions' },
  { label: 'Notes', route: 'Notes' },
  { label: 'Bookmarks', route: 'Bookmarks' },
  { label: 'My progress', route: 'Progress' },
  { label: 'Weak areas', route: 'Weakness' },
  { label: 'Leaderboard', route: 'Leaderboard' },
  { label: 'Notifications', route: 'Notifications', badgeKey: 'unreadCount' },
  { label: 'Profile', route: 'Profile' },
  { label: 'Settings', route: 'Settings' },
];

const ANIMATION_MS = 220;

export default function AppSidebar({
  visible,
  onClose,
  onNavigate,
  name = 'Student',
  email = '',
  badges = {},
  isAdmin = false,
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [moreOpen, setMoreOpen] = useState(false);

  const countFor = (item) => (item.badgeKey ? Number(badges[item.badgeKey]) || 0 : 0);

  // Rolled up onto the "More" row so a collapsed group never hides an alert.
  const hiddenCount = SECONDARY.reduce((sum, item) => sum + countFor(item), 0);

  const toggleMore = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMoreOpen((open) => !open);
  };

  // Narrow phones get most of the screen, larger phones and tablets get a
  // fixed panel rather than an awkwardly wide one.
  const panelWidth = Math.min(Math.round(width * 0.82), 320);

  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: ANIMATION_MS,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Reopen compact rather than restoring a long expanded list.
    if (!visible) setMoreOpen(false);
  }, [visible, slide]);

  const translateX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [-panelWidth, 0],
  });

  const handlePress = (route) => {
    onClose?.();
    onNavigate?.(route);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlayRoot}>
        <Animated.View style={[styles.scrim, { opacity: slide }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
          />
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
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{personInitials(name)}</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerName} numberOfLines={1}>{name || 'Student'}</Text>
              {email ? (
                <Text style={styles.headerEmail} numberOfLines={1}>{email}</Text>
              ) : (
                <Text style={styles.headerEmail}>JAMB candidate</Text>
              )}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {PRIMARY.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.item}
                onPress={() => handlePress(item.route)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <View style={styles.itemCopy}>
                  <View style={styles.itemTitleRow}>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                    {countFor(item) > 0 ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {countFor(item) > 9 ? '9+' : countFor(item)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.itemHint} numberOfLines={1}>{item.hint}</Text>
                </View>
                <Text style={styles.itemArrow}>→</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.moreRow}
              onPress={toggleMore}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={moreOpen ? 'Hide more features' : 'Show more features'}
              accessibilityState={{ expanded: moreOpen }}
            >
              <Text style={styles.moreLabel}>More</Text>
              {/* Keep unread signal visible while the group is collapsed. */}
              {!moreOpen && hiddenCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{hiddenCount > 9 ? '9+' : hiddenCount}</Text>
                </View>
              ) : null}
              <View style={styles.moreSpacer} />
              <Text style={styles.moreChevron}>{moreOpen ? '▾' : '▸'}</Text>
            </TouchableOpacity>

            {moreOpen
              ? SECONDARY.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={styles.subItem}
                  onPress={() => handlePress(item.route)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                >
                  <Text style={styles.subItemLabel}>{item.label}</Text>
                  {countFor(item) > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {countFor(item) > 9 ? '9+' : countFor(item)}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              ))
              : null}

            {isAdmin ? (
              <TouchableOpacity
                style={[styles.subItem, { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border }]}
                onPress={() => { onClose?.(); onNavigate?.('AdminTabs'); }}
                activeOpacity={0.8}
              >
                <Text style={styles.subItemLabel}>Open admin console</Text>
                <Text style={styles.itemArrow}>→</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.subItem, { marginTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border }]}
              onPress={() => { onClose?.(); onNavigate?.('LOGOUT'); }}
              activeOpacity={0.8}
            >
              <Text style={styles.subItemLabel}>Log out</Text>
              <Text style={styles.itemArrow}>→</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 40, 61, 0.45)',
  },
  panel: {
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    elevation: 16,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 2, height: 0 },
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 15,
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  headerEmail: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  closeText: {
    fontSize: 16,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  moreLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: COLORS.textMuted,
  },
  moreSpacer: {
    flex: 1,
  },
  moreChevron: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  subItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 16,
    paddingVertical: 9,
  },
  subItemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  itemCopy: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  itemHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  itemArrow: {
    fontSize: 15,
    color: COLORS.textLight,
    marginLeft: 10,
  },
  badge: {
    marginLeft: 8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: COLORS.accentText,
    fontSize: 10,
    fontWeight: '800',
  },
});
