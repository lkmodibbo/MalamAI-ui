import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import {
  sendAiChat,
  createConversation,
  getConversations,
  getConversation,
  renameConversation,
  deleteConversation,
  getAiUsage,
} from '../services/apiService';
import useNotes from '../hooks/useNotes';
import useStudentProfile from '../hooks/useStudentProfile';
import ChatBubble from '../components/ChatBubble';
import TypingIndicator from '../components/TypingIndicator';
import MenuButton from '../components/MenuButton';
import TokenBar from '../components/TokenBar';

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
  const [messages, setMessages]               = useState([]);
  const [inputText, setInputText]             = useState('');
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');

  // Conversation state
  const [activeConvId, setActiveConvId]       = useState(null);
  const [conversations, setConversations]     = useState([]);
  const [historyOpen, setHistoryOpen]         = useState(false);
  const [historyLoading, setHistoryLoading]   = useState(false);

  // Token usage state
  const [tokenUsage, setTokenUsage]           = useState(null);   // { chat, generate, seconds_until_reset }
  const [tokenLoading, setTokenLoading]       = useState(true);

  const scrollRef = useRef(null);
  const { saveNote } = useNotes();
  const { profile } = useStudentProfile();

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  // ── Fetch token usage on mount ─────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    setTokenLoading(true);
    getAiUsage()
      .then((data) => { if (mounted) setTokenUsage(data); })
      .catch(() => {})
      .finally(() => { if (mounted) setTokenLoading(false); });
    return () => { mounted = false; };
  }, []);

  // ── Load conversation list when drawer opens ───────────────────────────────
  useEffect(() => {
    if (!historyOpen) return;
    let mounted = true;
    setHistoryLoading(true);
    getConversations()
      .then((data) => { if (mounted) setConversations(data.conversations || []); })
      .catch(() => {})
      .finally(() => { if (mounted) setHistoryLoading(false); });
    return () => { mounted = false; };
  }, [historyOpen]);

  // ── Start a new blank conversation ────────────────────────────────────────
  const startNewChat = useCallback(async () => {
    setMessages([]);
    setError('');
    setActiveConvId(null);
    setHistoryOpen(false);
  }, []);

  // ── Open an existing conversation ─────────────────────────────────────────
  const openConversation = useCallback(async (id) => {
    setHistoryOpen(false);
    try {
      const data = await getConversation(id);
      const loaded = (data.messages || []).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      setMessages(loaded);
      setActiveConvId(id);
      setError('');
    } catch {
      Alert.alert('Error', 'Could not load conversation.');
    }
  }, []);

  // ── Delete a conversation from the list ───────────────────────────────────
  const handleDeleteConversation = useCallback((id, title) => {
    Alert.alert(
      'Delete chat?',
      `"${title}" will be permanently deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteConversation(id);
              setConversations((prev) => prev.filter((c) => c.id !== id));
              if (activeConvId === id) {
                setMessages([]);
                setActiveConvId(null);
              }
            } catch {
              Alert.alert('Error', 'Could not delete conversation.');
            }
          },
        },
      ]
    );
  }, [activeConvId]);

  // ── Send a message ─────────────────────────────────────────────────────────
  const submitMessage = useCallback(async (text) => {
    const trimmed = String(text || '').trim();
    if (!trimmed || loading) return;

    const nextMessages = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInputText('');
    setError('');
    setLoading(true);

    // Auto-create a conversation on the first message of a new chat
    let convId = activeConvId;
    if (!convId) {
      try {
        // Title = first 60 chars of the opening message
        const title = trimmed.slice(0, 60);
        const data  = await createConversation(title);
        convId = data.conversation.id;
        setActiveConvId(convId);
      } catch {
        // Non-fatal — chat still works, just won't be persisted
        console.warn('[ChatScreen] could not create conversation');
      }
    }

    try {
      const data = await sendAiChat(nextMessages, convId);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      // Update token bar from the usage returned in the response
      if (data.usage) {
        setTokenUsage((prev) => prev ? {
          ...prev,
          chat: {
            used:      data.usage.used,
            limit:     data.usage.limit,
            remaining: Math.max(0, data.usage.limit - data.usage.used),
          },
        } : prev);
      }
    } catch (err) {
      console.warn('[ChatScreen] AI failure', err);
      const msg = err.message?.includes('daily limit')
        ? err.message
        : 'Unable to reach Malam AI. Check your connection and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, activeConvId]);

  // ── Save AI reply as a note ────────────────────────────────────────────────
  const handleSaveAsNote = async (messageText) => {
    const snippet = String(messageText || '').trim().slice(0, 50);
    const topic   = snippet ? `AI: ${snippet}…` : 'Malam AI answer';
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
    setActiveConvId(null);
  };

  // ── Conversation history drawer ────────────────────────────────────────────
  const renderHistoryItem = ({ item }) => (
    <View style={styles.historyItem}>
      <TouchableOpacity
        style={styles.historyItemBody}
        onPress={() => openConversation(item.id)}
        activeOpacity={0.75}
      >
        <Text style={styles.historyTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.historyDate}>
          {new Date(item.updated_at).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short',
          })}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.historyDeleteBtn}
        onPress={() => handleDeleteConversation(item.id, item.title)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.historyDeleteText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

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
                {loading ? 'Typing…' : profile?.name ? `Hi ${profile.name.split(' ')[0]}` : 'JAMB Tutor'}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setHistoryOpen(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.iconBtnText}>☰</Text>
            </TouchableOpacity>
            {messages.length > 0 && (
              <TouchableOpacity onPress={clearChat} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>New</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Token bar */}
        <TokenBar
          chat={tokenUsage?.chat}
          generate={tokenUsage?.generate}
          secondsUntilReset={tokenUsage?.seconds_until_reset}
          loading={tokenLoading}
        />

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

      {/* Conversation history drawer (modal) */}
      <Modal
        visible={historyOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setHistoryOpen(false)}
      >
        <TouchableOpacity
          style={styles.drawerOverlay}
          activeOpacity={1}
          onPress={() => setHistoryOpen(false)}
        />
        <View style={styles.drawer}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Chat History</Text>
            <TouchableOpacity onPress={startNewChat} style={styles.newChatBtn}>
              <Text style={styles.newChatBtnText}>+ New Chat</Text>
            </TouchableOpacity>
          </View>

          {historyLoading ? (
            <Text style={styles.drawerEmpty}>Loading…</Text>
          ) : conversations.length === 0 ? (
            <Text style={styles.drawerEmpty}>No saved chats yet.</Text>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderHistoryItem}
              contentContainerStyle={styles.drawerList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </Modal>
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerMenu: { marginRight: 0 },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { color: COLORS.textWhite, fontWeight: '900', fontSize: 18 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  headerStatus: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  iconBtnText: { fontSize: 16, color: COLORS.primary },
  clearBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1, borderColor: COLORS.border,
  },
  clearBtnText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 13 },

  // Messages
  messagesContainer: { padding: 16, paddingBottom: 20, flexGrow: 1 },
  chatColumn: { paddingBottom: 8 },
  typingWrapper: { marginTop: 8, alignItems: 'flex-start' },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 28, paddingHorizontal: 8 },
  emptyAvatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.background,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyAvatarText: { fontSize: 26, fontWeight: '900', color: COLORS.primary, letterSpacing: 1 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.primary, textAlign: 'center', marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  suggestedLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, alignSelf: 'flex-start', marginBottom: 10 },
  suggestedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%' },
  suggestedChip: {
    width: '48.2%', backgroundColor: COLORS.background, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 12,
    borderWidth: 1, borderColor: COLORS.border, minHeight: 48, justifyContent: 'center',
  },
  suggestedText: { color: COLORS.primary, fontWeight: '700', fontSize: 13, lineHeight: 18 },

  // Error
  errorBox: {
    backgroundColor: '#fdf0f0', borderRadius: 12, padding: 12,
    marginTop: 8, borderWidth: 1, borderColor: '#f5c6cb',
  },
  errorText: { color: '#c0392b', fontSize: 13, textAlign: 'center' },

  // Input
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10,
    borderTopWidth: 1, borderTopColor: '#DCE6E2',
    backgroundColor: COLORS.surfaceWhite, gap: 8,
  },
  input: {
    flex: 1, minHeight: 46, maxHeight: 120, borderRadius: 18,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    color: COLORS.primary, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16,
  },
  sendBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.disabled },
  sendIcon: { color: COLORS.textWhite, fontSize: 18, fontWeight: '900' },

  // Drawer overlay
  drawerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  drawer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.surfaceWhite,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  drawerHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  drawerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.primary },
  newChatBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
  },
  newChatBtnText: { color: COLORS.textWhite, fontWeight: '800', fontSize: 13 },
  drawerList: { paddingHorizontal: 16, paddingVertical: 8 },
  drawerEmpty: { textAlign: 'center', color: COLORS.textMuted, padding: 24, fontSize: 14 },

  // History item
  historyItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  historyItemBody: { flex: 1 },
  historyTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  historyDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  historyDeleteBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  historyDeleteText: { color: COLORS.textMuted, fontSize: 14 },
});
