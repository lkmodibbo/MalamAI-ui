export function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;

  if (Array.isArray(parts)) {
    return parts
      .filter((part) => part?.text)
      .map((part) => part.text)
      .join('\n')
      .trim();
  }

  return '';
}

export function isQuotaError(err) {
  return err?.status === 429 || /quota|RESOURCE_EXHAUSTED/i.test(err?.message || '');
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
    throw new Error('Gemini did not return a questions array.');
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
    throw new Error(`Gemini returned ${uniqueQuestions.length} usable questions instead of ${expectedCount}. Tap Try Again.`);
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

export function buildFlashcardPrompt(topic, subjectName) {
  const safeTopic = String(topic || '').trim();
  const safeSubject = String(subjectName || '').trim();

  return `Generate 8 flashcards for the topic "${safeTopic}" in ${safeSubject}. Return only valid JSON with the 
          format:\n\n{ "cards": [ { "front": "Term or question", "back": "Definition or answer" } ] }\n\nEach card 
          should be simple, clear, and suitable for a Nigerian SS3 student. If possible, include a short memory tip 
          in the back text by appending a sentence starting with \"Memory tip:\".`;
}

export function buildGeminiSystemPrompt() {
  return 'You are Malam AI, a friendly Nigerian JAMB tutor. Answer every question in clear, simple English that an SS3 student can follow. Include occasional Hausa encouragement such as "Nagode", "Ka yi kyau", or "Kar ka damu" when it fits naturally.';
}

export function buildGeminiMultiTurnPrompt(messages) {
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

  return `${buildGeminiSystemPrompt()}\n\n${conversation}\n\nReply as Malam AI in a supportive tutor tone, using simple English and occasional Hausa encouragement.`;
}

export async function callGeminiMultiTurn(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('callGeminiMultiTurn requires a non-empty messages array.');
  }

  const prompt = buildGeminiMultiTurnPrompt(messages);
  return callGemini(prompt);
}

export function buildGeminiUrl(endpoint, apiKey) {
  try {
    const url = new URL(endpoint);
    url.searchParams.set('key', apiKey);
    return url.toString();
  } catch (err) {
    const separator = endpoint.includes('?') ? '&' : '?';
    return `${endpoint}${separator}key=${encodeURIComponent(apiKey)}`;
  }
}

export async function callGemini(prompt) {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  const endpoint = process.env.EXPO_PUBLIC_GEMINI_API_URL;

  if (!apiKey) {
    throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY in environment. Check your .env file and restart the dev server.');
  }

  if (!endpoint) {
    throw new Error('Missing EXPO_PUBLIC_GEMINI_API_URL in environment. Check your .env file and restart the dev server.');
  }

  const res = await fetch(buildGeminiUrl(endpoint, apiKey), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    let message = text;

    try {
      const data = JSON.parse(text);
      message = data?.error?.message || text;
    } catch {
      message = text;
    }

    const error = new Error(`API error: ${res.status} ${message}`);
    error.status = res.status;
    throw error;
  }

  const data = await res.json();
  const text = extractGeminiText(data);

  if (!text) {
    const blockReason = data?.promptFeedback?.blockReason;
    throw new Error(blockReason
      ? `Gemini blocked the response: ${blockReason}`
      : `No text returned from API: ${JSON.stringify(data)}`);
  }

  return text;
}
