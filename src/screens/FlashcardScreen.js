import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, PanResponder } from 'react-native';
import FlashCard from './FlashCard';
import { parseQuestionJson } from '../services/grok';
import { generateAiContent } from '../services/apiService';

function extractCardTip(rawBack) {
  const cleaned = String(rawBack || '').trim();
  const tipMatch = cleaned.match(/^(.*?)(?:\n\s*Memory tip:\s*)([\s\S]+)$/i);

  if (tipMatch) {
    return { back: tipMatch[1].trim(), tip: tipMatch[2].trim() };
  }

  return { back: cleaned, tip: '' };
}

export default function FlashcardScreen({ subject, topic, startPractice }) {
  const [deck, setDeck] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [flipped, setFlipped] = useState(false);
  const totalCards = useRef(0);

  const subjectName = subject?.name || 'this subject';
  const displayTopic = topic || subjectName;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 20,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 80) {
          handleGotIt();
        } else if (gestureState.dx < -80) {
          handleStillLearning();
        }
      },
    })
  ).current;

  const loadFlashcards = async () => {
    if (!displayTopic) return;
    setLoading(true);
    setError('');
    setDeck([]);
    setFlipped(false);

    try {
      const data = await generateAiContent('flashcards', {
        subject: subjectName,
        topic:   displayTopic,
      });
      const parsed = parseQuestionJson(data.result);
      const cards  = Array.isArray(parsed?.cards) ? parsed.cards : [];

      if (cards.length === 0) {
        throw new Error('Grok did not return any flashcards.');
      }

      const normalized = cards.slice(0, 8).map((card) => {
        const front = String(card.front || card.question || '').trim();
        const rawBack = String(card.back || card.answer || '').trim();
        const { back, tip } = extractCardTip(rawBack);
        return { front, back, tip };
      }).filter((card) => card.front && card.back);

      if (normalized.length === 0) {
        throw new Error('No valid flashcards could be generated for this topic.');
      }

      totalCards.current = normalized.length;
      setDeck(normalized);
    } catch (err) {
      console.warn('[FlashcardScreen] loadFlashcards failed', err);
      setError(err.message || 'Unable to load flashcards.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlashcards();
  }, [displayTopic]);

  const handleFlip = () => {
    setFlipped((prev) => !prev);
  };

  const handleStillLearning = () => {
    if (deck.length <= 1) return;
    setDeck((prevDeck) => [...prevDeck.slice(1), prevDeck[0]]);
    setFlipped(false);
  };

  const handleGotIt = () => {
    setDeck((prevDeck) => prevDeck.slice(1));
    setFlipped(false);
  };

  const remaining = deck.length;
  const currentCard = deck[0];
  const initialCount = totalCards.current || 8;

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0F8A72" />
        <Text style={styles.loaderText}>Generating flashcards for {displayTopic}…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadFlashcards}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentCard) {
    return (
      <View style={styles.completionContainer}>
        <Text style={styles.completionTitle}>Ya yi kyau! All cards done!</Text>
        <TouchableOpacity style={styles.practiceBtn} onPress={startPractice}>
          <Text style={styles.practiceBtnText}>Start Practice Quiz</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.progressText}>{remaining} of {initialCount} cards remaining</Text>
      <View style={styles.cardArea} {...panResponder.panHandlers}>
        <FlashCard
          card={currentCard}
          subjectName={subject?.name}
          flipped={flipped}
          onFlip={handleFlip}
        />
      </View>
      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleStillLearning}>
          <Text style={styles.secondaryBtnText}>Still learning</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleGotIt}>
          <Text style={styles.primaryBtnText}>Got it</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  progressText: {
    color: '#0F8A72',
    fontWeight: '800',
    marginBottom: 18,
  },
  cardArea: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  controlsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  secondaryBtn: {
    flex: 0.48,
    backgroundColor: '#e8ece7',
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#4f5f4d',
    fontWeight: '800',
  },
  primaryBtn: {
    flex: 0.48,
    backgroundColor: '#0F8A72',
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  loaderContainer: {
    minHeight: 420,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    marginTop: 14,
    color: '#4f5f4d',
    fontSize: 15,
  },
  errorText: {
    color: '#b00020',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 18,
  },
  retryBtn: {
    backgroundColor: '#0F8A72',
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: 999,
  },
  retryText: {
    color: '#fff',
    fontWeight: '800',
  },
  completionContainer: {
    minHeight: 420,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  completionTitle: {
    color: '#0F8A72',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 24,
  },
  practiceBtn: {
    backgroundColor: '#0F8A72',
    paddingVertical: 16,
    paddingHorizontal: 26,
    borderRadius: 999,
  },
  practiceBtnText: {
    color: '#fff',
    fontWeight: '800',
  },
});
