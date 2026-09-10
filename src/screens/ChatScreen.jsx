import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS } from '../constants/colors';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { callGrokMultiTurn } from '../services/grok';
import useNotes from '../hooks/useNotes';
import ChatBubble from '../components/ChatBubble';
import TypingIndicator from '../components/TypingIndicator';
import MenuButton from '../components/MenuButton';

const SUGGESTED = [
  'Explain photosynthesis',
  'Solve quadratic equations',
  'JAMB English tips',
  'Speed vs velocity',
  'Causes of Nigerian Civil War',
  'What is osmosis?',
];

const DEFAULT_SUBJECT = { id: 'chat', name: 'Malam AI Chat' };

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);
  const { saveNote } = useNotes();

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  const submitMessage = useCallback(async (text) => {
    const trimmed = String(text || '').trim();
    if (!trimmed || loading) return;

    const nextMessages = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInputText('');
    setError('');
    setLoading(true);

    try {
      const aiResponse = await callGrokMultiTurn(nextMessages);
      setMessages((prev) => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (err) {
      console.warn('[ChatScreen] AI failure', err);
      setError('Unable to reach Malam AI. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [loading, messages]);

  const handleSaveAsNote = async (messageText) => {
    const snippet = String(messageText || '').trim().slice(0, 50);
    const topic = snippet ? `AI: ${snippet}…` : 'Malam AI answer';
    try {
      await saveNote(DEFAULT_SUBJECT, topic, messageText);
      Alert.alert('Saved ✓', 'This answer has been saved to your notes.');
    } catch {
      Alert.alert('Save failed', 'Please try again.');
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError('');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MenuButton style={styles.headerMenu} />
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>M</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>Malam AI</Text>
              <Text style={styles.headerStatus}>
                {loading ? 'Typing…' : 'JAMB Tutor'}
              </Text>
            </View>
          </View>
          {messages.length > 0 && (
            <TouchableOpacity onPress={clearChat} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyAvatar}>
                <Text style={styles.emptyAvatarText}>MA</Text>
              </View>
              <Text style={styles.emptyTitle}>Ask me anything about JAMB</Text>
              <Text style={styles.emptySubtitle}>
                I can explain topics, solve problems, and help you prepare.{'\n'}
                Nagode — let's get started!
              </Text>
              <Text style={styles.suggestedLabel}>Try asking:</Text>
              <View style={styles.suggestedGrid}>
                {SUGGESTED.map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={styles.suggestedChip}
                    onPress={() => submitMessage(q)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.suggestedText} numberOfLines={2}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.chatColumn}>
              {messages.map((msg, i) => (
                <ChatBubble
                  key={`${msg.role}-${i}`}
                  message={msg.content}
                  isUser={msg.role === 'user'}
                  onSaveNote={msg.role === 'assistant'
                    ? () => handleSaveAsNote(msg.content)
                    : undefined}
                />
              ))}
              {loading && (
                <View style={styles.typingWrapper}>
                  <TypingIndicator />
                </View>
              )}
            </View>
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Ask a JAMB question…"
            placeholderTextColor="#7D8E8A"
            value={inputText}
            onChangeText={setInputText}
            returnKeyType="send"
            onSubmitEditing={() => submitMessage(inputText)}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => submitMessage(inputText)}
            disabled={!inputText.trim() || loading}
            activeOpacity={0.85}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F7F5' },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.headerBorder,
    backgroundColor: COLORS.surfaceWhite,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerMenu: {
    marginRight: 0,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    color: COLORS.textWhite,
    fontWeight: '900',
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  headerStatus: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  clearBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clearBtnText: {
    color: COLORS.textMuted,
    fontWeight: '700',
    fontSize: 13,
  },

  // Messages
  messagesContainer: {
    padding: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  chatColumn: {
    paddingBottom: 8,
  },
  typingWrapper: {
    marginTop: 8,
    alignItems: 'flex-start',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 28,
    paddingHorizontal: 8,
  },
  emptyAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyAvatarText: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  suggestedLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  suggestedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  suggestedChip: {
    width: '48.2%',
    backgroundColor: COLORS.background,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 48,
    justifyContent: 'center',
  },
  suggestedText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18,
  },

  // Error
  errorBox: {
    backgroundColor: '#fdf0f0',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  errorText: {
    color: '#c0392b',
    fontSize: 13,
    textAlign: 'center',
  },

  // Input
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#DCE6E2',
    backgroundColor: COLORS.surfaceWhite,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.disabled,
  },
  sendIcon: {
    color: COLORS.textWhite,
    fontSize: 18,
    fontWeight: '900',
  },
});
