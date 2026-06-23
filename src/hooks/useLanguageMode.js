import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_MODE_KEY = 'language_mode';
const DEFAULT_LANGUAGE_MODE = 'english-hausa';
const VALID_MODES = ['english-only', 'english-hausa', 'hausa-heavy'];

function normalizeMode(value) {
  if (typeof value !== 'string') return DEFAULT_LANGUAGE_MODE;
  const normalized = value.trim().toLowerCase();
  return VALID_MODES.includes(normalized) ? normalized : DEFAULT_LANGUAGE_MODE;
}

export async function getMode() {
  try {
    const raw = await AsyncStorage.getItem(LANGUAGE_MODE_KEY);
    return normalizeMode(raw);
  } catch (error) {
    console.warn('[useLanguageMode] getMode failed', error);
    return DEFAULT_LANGUAGE_MODE;
  }
}

export async function setMode(mode) {
  try {
    const normalized = normalizeMode(mode);
    await AsyncStorage.setItem(LANGUAGE_MODE_KEY, normalized);
    return normalized;
  } catch (error) {
    console.warn('[useLanguageMode] setMode failed', error);
    return DEFAULT_LANGUAGE_MODE;
  }
}

export function getSystemPrompt(mode = DEFAULT_LANGUAGE_MODE) {
  const normalized = normalizeMode(mode);

  if (normalized === 'english-only') {
    return `You are MalamAI, a patient and encouraging JAMB tutor for Nigerian secondary school students.
Use only standard English in every response. Do not include any Hausa words, phrases, or greetings.
Explain concepts in clear, simple English, using relatable examples and short paragraphs.
Answer as a Nigerian tutor but keep all teaching content purely English.`;
  }

  if (normalized === 'hausa-heavy') {
    return `You are MalamAI, a patient and encouraging JAMB tutor for Nigerian secondary school students.
Use heavy Hausa support in responses: about 50% of the answer may be in Hausa, and full Hausa sentences are allowed.
Use English only for technical terms or phrases that need clarity. Keep explanations simple and easy to follow.
Where appropriate, include Hausa encouragement or explanation alongside English technical terms.`;
  }

  return `You are MalamAI, a patient and encouraging JAMB tutor for Nigerian secondary school students.
Use mostly English with short Hausa phrases in the response. About 80% of the content should be English and up to 20% Hausa.
Use Hausa for short encouragement and familiar expressions only, such as "Sai haka!", "Nagode", "Ka yi kyau", "Kada ka damu", and "Latsa mu fara".
Keep the teaching content primarily in English.`;
}

export default function useLanguageMode() {
  const [mode, setModeState] = useState(DEFAULT_LANGUAGE_MODE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadMode() {
      const saved = await getMode();
      if (mounted) {
        setModeState(saved);
        setLoading(false);
      }
    }

    loadMode();

    return () => {
      mounted = false;
    };
  }, []);

  const updateMode = useCallback(async (nextMode) => {
    const saved = await setMode(nextMode);
    setModeState(saved);
    return saved;
  }, []);

  return {
    mode,
    loading,
    setMode: updateMode,
  };
}
