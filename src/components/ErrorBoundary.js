import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/colors';

/**
 * Catches render-time crashes anywhere below it. Without this a single thrown
 * error unmounts the whole tree and leaves the user staring at a blank screen
 * with no way back.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.kicker}>Something broke</Text>
          <Text style={styles.title}>The app hit an unexpected error</Text>
          <Text style={styles.body}>
            Your saved work is safe. Try again, and if this keeps happening
            please restart the app.
          </Text>

          {__DEV__ ? (
            <ScrollView style={styles.details}>
              <Text style={styles.detailsText}>
                {error?.message || String(error)}
              </Text>
            </ScrollView>
          ) : null}

          <Pressable
            style={styles.button}
            onPress={this.handleReset}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.textLight,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textMuted,
  },
  details: {
    maxHeight: 140,
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },
  detailsText: {
    fontSize: 12,
    color: COLORS.wrong,
  },
  button: {
    marginTop: 20,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.accentText,
    fontSize: 15,
    fontWeight: '800',
  },
});
