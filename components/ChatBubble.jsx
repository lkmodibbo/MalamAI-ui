import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ChatBubble({ message, isUser, onSaveNote }) {
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (saved || !onSaveNote) return;
    await onSaveNote();
    setSaved(true);
  };

  return (
    <View style={[styles.row, isUser ? styles.userRow : styles.aiRow]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>M</Text>
        </View>
      )}

      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.text, isUser ? styles.userText : styles.aiText]}>
          {message}
        </Text>

        {!isUser && onSaveNote && (
          <TouchableOpacity
            style={[styles.saveBtn, saved && styles.saveBtnDone]}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Text style={[styles.saveBtnText, saved && styles.saveBtnTextDone]}>
              {saved ? '✓ Saved to notes' : '📋 Save as note'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 5,
    width: '100%',
  },
  userRow: { justifyContent: 'flex-end' },
  aiRow: { justifyContent: 'flex-start' },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1b2a4a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 14,
  },

  bubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  aiBubble: {
    backgroundColor: '#f4f6fb',
    borderWidth: 1,
    borderColor: '#dde3ef',
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: '#1b2a4a',
    borderBottomRightRadius: 4,
  },

  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  aiText: { color: '#1b2a4a' },
  userText: { color: '#ffffff' },

  saveBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dde3ef',
    backgroundColor: '#ffffff',
  },
  saveBtnDone: {
    borderColor: '#27ae60',
    backgroundColor: '#eafaf1',
  },
  saveBtnText: {
    color: '#6b7c9a',
    fontWeight: '700',
    fontSize: 12,
  },
  saveBtnTextDone: {
    color: '#27ae60',
  },
});
