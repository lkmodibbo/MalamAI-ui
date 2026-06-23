import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { callGrokMultiTurn } from '../src/utils/grok';
import useNotes from '../src/hooks/useNotes';
import ChatBubble from '../components/ChatBubble';
import TypingIndicator from '../components/TypingIndicator';

const SUGGESTED = [
  'Explain photosynthesis',
  'Solve quadratic equations',
  'JAMB English tips',
  'Speed vs velocity',
  'Causes of Nigerian Civil War',
  'What is osmosis?',
];

const DEFAULT_SUBJECT = { id: 'chat', name: 'Malam AI Chat', emoji: '🤖' };

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
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 70}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
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
                <Text style={styles.emptyAvatarText}>🤖</Text>
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
                    <Text style={styles.suggestedText}>{q}</Text>
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
            placeholderTextColor="#8ba3c7"
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
  root: { flex: 1, backgroundColor: '#ffffff' },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dde3ef',
    backgroundColor: '#ffffff',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1b2a4a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1b2a4a',
  },
  headerStatus: {
    fontSize: 12,
    color: '#6b7c9a',
    marginTop: 1,
  },
  clearBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dde3ef',
  },
  clearBtnText: {
    color: '#6b7c9a',
    fontWeight: '700',
    fontSize: 13,
  },

  // Messages
  messagesContainer: {
    padding: 16,
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
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  emptyAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f4f6fb',
    borderWidth: 1,
    borderColor: '#dde3ef',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyAvatarText: { fontSize: 36 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1b2a4a',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6b7c9a',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  suggestedLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7c9a',
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
    backgroundColor: '#f4f6fb',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#dde3ef',
  },
  suggestedText: {
    color: '#1b2a4a',
    fontWeight: '600',
    fontSize: 13,
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
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#dde3ef',
    backgroundColor: '#ffffff',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    backgroundColor: '#f4f6fb',
    borderWidth: 1,
    borderColor: '#dde3ef',
    color: '#1b2a4a',
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1b2a4a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#c5cfe0',
  },
  sendIcon: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
});
