export function extractGrokText(data) {
  return data?.choices?.[0]?.message?.content || '';
}

export function isQuotaError(err) {
  return err?.status === 429 || /quota|rate.limit|RESOURCE_EXHAUSTED/i.test(err?.message || '');
}

export function parseQuestionJson(text) {
  const cleanedText = String(text || '')
    .replace(/```json/gi, '```')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(cleanedText);
  } catch (e) {
    const objectStart = cleanedText.indexOf('{');
    const objectEnd = cleanedText.lastIndexOf('}');
    const arrayStart = cleanedText.indexOf('[');
    const arrayEnd = cleanedText.lastIndexOf(']');
    const hasArray = arrayStart !== -1 && arrayEnd > arrayStart;
    const hasObject = objectStart !== -1 && objectEnd > objectStart;
    const useArray = hasArray && (!hasObject || arrayStart < objectStart);
    const start = useArray ? arrayStart : objectStart;
    const end = useArray ? arrayEnd : objectEnd;

    if (start === -1 || end === -1 || end <= start) {
      throw new Error('Unable to find questions JSON in AI response.');
    }

    return JSON.parse(cleanedText.slice(start, end + 1));
  }
}

export function normalizeOptions(rawOptions) {
  const letters = ['A', 'B', 'C', 'D'];

  if (Array.isArray(rawOptions)) {
    return rawOptions.slice(0, 4).reduce((acc, option, index) => {
      const text = typeof option === 'string'
        ? option
        : option?.text || option?.value || option?.option || option?.answer;

      if (text) acc[letters[index]] = String(text).trim();
      return acc;
    }, {});
  }

  if (rawOptions && typeof rawOptions === 'object') {
    return Object.entries(rawOptions).reduce((acc, [key, value]) => {
      const letter = String(key).trim().toUpperCase().slice(0, 1);
      const text = typeof value === 'string'
        ? value
        : value?.text || value?.value || value?.option || value?.answer;

      if (letters.includes(letter) && text) {
        acc[letter] = String(text).trim();
      }

      return acc;
    }, {});
  }

  return {};
}

export function normalizeAnswer(rawAnswer, options) {
  const answer = String(rawAnswer || '').trim();
  const upperAnswer = answer.toUpperCase();

  if (options[upperAnswer]) return upperAnswer;

  const matchedOption = Object.entries(options).find(([, text]) => (
    String(text || '').trim().toLowerCase() === answer.toLowerCase()
  ));

  return matchedOption?.[0] || '';
}

export function normalizeQuestion(rawQuestion) {
  const options = normalizeOptions(rawQuestion?.options || rawQuestion?.choices || rawQuestion?.answers);
  const answer = normalizeAnswer(
    rawQuestion?.answer || rawQuestion?.correctAnswer || rawQuestion?.correct_answer || rawQuestion?.correct,
    options,
  );
  const questionText = rawQuestion?.question || rawQuestion?.prompt || rawQuestion?.text;

  if (!questionText || Object.keys(options).length < 2 || !answer) {
    throw new Error(`Question response is missing required fields: ${JSON.stringify(rawQuestion)}`);
  }

  return {
    question: String(questionText).trim(),
    options,
    answer,
    explanation: String(rawQuestion?.explanation || rawQuestion?.reason || '').trim(),
  };
}

export function normalizeQuestionText(question) {
  return String(question || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function normalizeQuestionList(rawQuestions, expectedCount) {
  const items = Array.isArray(rawQuestions) ? rawQuestions : rawQuestions?.questions;

  if (!Array.isArray(items)) {
    throw new Error('Grok did not return a questions array.');
  }

  const uniqueQuestions = [];
  const seenQuestions = new Set();

  items.forEach((item) => {
    const question = normalizeQuestion(item);
    const questionKey = normalizeQuestionText(question.question);

    if (!seenQuestions.has(questionKey)) {
      seenQuestions.add(questionKey);
      uniqueQuestions.push(question);
    }
  });

  if (uniqueQuestions.length < expectedCount) {
    throw new Error(`Grok returned ${uniqueQuestions.length} usable questions instead of ${expectedCount}. Tap Try Again.`);
  }

  return uniqueQuestions.slice(0, expectedCount);
}

export function getStepByStepPrompt(question, answer, optionText) {
  const safeQuestion = String(question || '').trim();
  const safeAnswer = String(answer || '').trim();
  const safeOptionText = String(optionText || '').trim();

  return `A Nigerian SS3 student got this JAMB question wrong. Show the full step-by-step working in simple English a student at that 
          level would understand. Use numbered steps. If it is a calculation, show every arithmetic step. End with a one-line memory 
          tip.\n\nQuestion: ${safeQuestion}\nCorrect answer: ${safeAnswer}${safeOptionText ? `, ${safeOptionText}` : ''}`;
}

export function buildWhyWrongPrompt(question, selectedOption, selectedText, correctOption, correctText) {
  const safeQuestion = String(question || '').trim();
  const safeSelectedOption = String(selectedOption || '').trim();
  const safeSelectedText = String(selectedText || '').trim();
  const safeCorrectOption = String(correctOption || '').trim();
  const safeCorrectText = String(correctText || '').trim();

  return `A Nigerian SS3 student answered this JAMB question incorrectly. Explain why their answer was wrong and help them understand 
          the correct approach. Use simple English and be encouraging.\n\nQuestion: ${safeQuestion}\n\nStudent selected: ${safeSelectedOption}. ${safeSelectedText}\nCorrect answer: ${safeCorrectOption}. ${safeCorrectText}\n\nExplain the correct approach in 2-3 sentences.`;
}

export function buildFlashcardPrompt(topic, subjectName) {
  const safeTopic = String(topic || '').trim();
  const safeSubject = String(subjectName || '').trim();

  return `Generate 8 flashcards for the topic "${safeTopic}" in ${safeSubject}. Return only valid JSON with the 
          format:\n\n{ "cards": [ { "front": "Term or question", "back": "Definition or answer" } ] }\n\nEach card 
          should be simple, clear, and suitable for a Nigerian SS3 student. If possible, include a short memory tip 
          in the back text by appending a sentence starting with \"Memory tip:\".`;
}

export function buildGrokSystemPrompt() {
  return 'You are Malam AI, a friendly Nigerian JAMB tutor. Answer every question in clear, simple English that an SS3 student can follow. Include occasional Hausa encouragement such as "Nagode", "Ka yi kyau", or "Kar ka damu" when it fits naturally.';
}

export function buildGrokMultiTurnPrompt(messages) {
  const safeMessages = Array.isArray(messages) ? messages : [];

  const conversation = safeMessages.map((message) => {
    const content = String(message.content || message.text || '').trim();
    const role = message.role === 'assistant'
      ? 'Malam AI'
      : message.role === 'user'
        ? 'Student'
        : 'System';

    return `${role}: ${content}`;
  }).join('\n\n');

  return `${buildGrokSystemPrompt()}\n\n${conversation}\n\nReply as Malam AI in a supportive tutor tone, using simple English and occasional Hausa encouragement.`;
}

export async function callGrokMultiTurn(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('callGrokMultiTurn requires a non-empty messages array.');
  }

  const prompt = buildGrokMultiTurnPrompt(messages);
  return callGrok(prompt);
}

export async function callGrok(prompt) {
  const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
  const endpoint = process.env.EXPO_PUBLIC_GROQ_API_URL;

  if (!apiKey) {
    throw new Error('Missing EXPO_PUBLIC_GROQ_API_KEY in environment. Check your .env file and restart the dev server.');
  }

  if (!endpoint) {
    throw new Error('Missing EXPO_PUBLIC_GROQ_API_URL in environment. Check your .env file and restart the dev server.');
  }

  // Try models in order — if one hits quota (429), fall through to the next
  const models = [
    process.env.EXPO_PUBLIC_GROQ_MODEL || 'llama-3.3-70b-versatile', // primary
    'llama-3.1-8b-instant',   // fallback 1 — faster, lighter
    'gemma2-9b-it',           // fallback 2 — good for JSON
  ];

  let lastError = null;

  for (const model of models) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });

      if (!res.ok) {
        const raw = await res.text();
        let message = raw;
        try {
          const data = JSON.parse(raw);
          message = data?.error?.message || raw;
        } catch {
          message = raw;
        }

        const error = new Error(`API error: ${res.status} ${message}`);
        error.status = res.status;

        if (res.status === 429) {
          console.warn(`[callGrok] ${model} quota hit — trying next model`);
          lastError = error;
          continue;
        }

        throw error;
      }

      const data = await res.json();
      const text = extractGrokText(data);

      if (!text) {
        throw new Error(`No text returned from Groq API using model: ${model}`);
      }

      console.log(`[callGrok] responded using model: ${model}`);
      return text;

    } catch (err) {
      if (err.status === 429) {
        lastError = err;
        continue; // quota — try next model
      }
      throw err; // any other error — stop immediately
    }
  }

  // All models exhausted
  throw lastError || new Error('All Groq models are quota exhausted. Please try again in a few minutes.');
}
