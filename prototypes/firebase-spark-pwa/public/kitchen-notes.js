import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import { db } from './firebase-client.js?v=20260817q';
import { getActiveCenterId } from './center-context.js?v=20260816h';
import { formatDateId } from './date-utils.mjs?v=20260816g';

export { formatDateId } from './date-utils.mjs?v=20260816g';

const MAX_NOTE_LENGTH = 1000;
const MAX_DAILY_NOTE_LENGTH = 8000;
const MAX_DAILY_NOTES = 50;
const NOTE_CACHE_MS = 60 * 1000;
const noteCache = new Map();

function normalizeMessages(data, mealDate) {
  const messages = Array.isArray(data?.messages)
    ? data.messages
      .filter((message) => message && typeof message.text === 'string' && message.text.trim())
      .map((message, index) => ({
        id: String(message.id || `${mealDate}-${index}`),
        text: message.text.trim(),
        createdAt: typeof message.createdAt === 'string' ? message.createdAt : ''
      }))
    : [];
  if (messages.length > 0) return messages;
  const legacyText = typeof data?.text === 'string' ? data.text.trim() : '';
  return legacyText ? [{ id: `legacy-${mealDate}`, text: legacyText, createdAt: '' }] : [];
}

function noteValue(mealDate, data = {}) {
  const messages = normalizeMessages(data, mealDate);
  return {
    mealDate,
    messages,
    text: messages.map((message) => message.text).join('\n'),
    updatedAt: data.updatedAt || null
  };
}

function buildStoredNote(mealDate, messages) {
  return {
    centerId: getActiveCenterId(),
    mealDate,
    text: messages.map((message) => message.text).join('\n').slice(0, MAX_NOTE_LENGTH),
    messages,
    updatedAt: serverTimestamp()
  };
}

export async function loadKitchenNote(date = new Date(), options = {}) {
  if (!db) {
    throw new Error('Firebase non configurato');
  }

  const mealDate = formatDateId(date);
  const cached = noteCache.get(mealDate);
  if (!options.forceRefresh && cached && Date.now() - cached.loadedAt < NOTE_CACHE_MS) {
    return cached.value;
  }
  const noteRef = doc(db, 'centers', getActiveCenterId(), 'kitchenNotes', mealDate);
  const noteSnap = await getDoc(noteRef);

  if (!noteSnap.exists()) {
    const value = { mealDate, messages: [], text: '', updatedAt: null };
    noteCache.set(mealDate, { loadedAt: Date.now(), value });
    return value;
  }

  const value = noteValue(mealDate, noteSnap.data());
  noteCache.set(mealDate, { loadedAt: Date.now(), value });
  return value;
}

export async function saveKitchenNote(date, text) {
  if (!db) {
    throw new Error('Firebase non configurato');
  }

  const normalizedText = String(text || '').trim();
  if (!normalizedText) {
    throw new Error('Scrivi una nota prima di inviarla.');
  }
  if (normalizedText.length > MAX_NOTE_LENGTH) {
    throw new Error('La nota non può superare 1000 caratteri.');
  }

  const mealDate = formatDateId(date);
  const noteRef = doc(db, 'centers', getActiveCenterId(), 'kitchenNotes', mealDate);
  let savedMessages = [];
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(noteRef);
    const messages = snapshot.exists() ? normalizeMessages(snapshot.data(), mealDate) : [];
    if (messages.length >= MAX_DAILY_NOTES) {
      throw new Error('Per questa giornata sono già presenti troppe note.');
    }
    const nextMessages = [...messages, {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
      text: normalizedText,
      createdAt: new Date().toISOString()
    }];
    if (nextMessages.reduce((total, message) => total + message.text.length, 0) > MAX_DAILY_NOTE_LENGTH) {
      throw new Error('Le note della giornata superano la lunghezza massima consentita.');
    }
    transaction.set(noteRef, buildStoredNote(mealDate, nextMessages));
    savedMessages = nextMessages;
  });

  const value = noteValue(mealDate, { messages: savedMessages, updatedAt: new Date() });
  noteCache.set(mealDate, { loadedAt: Date.now(), value });
  return value;
}

export async function removeKitchenNoteMessage(date, messageId) {
  if (!db) {
    throw new Error('Firebase non configurato');
  }
  const mealDate = formatDateId(date);
  const noteRef = doc(db, 'centers', getActiveCenterId(), 'kitchenNotes', mealDate);
  let savedMessages = [];
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(noteRef);
    const messages = snapshot.exists() ? normalizeMessages(snapshot.data(), mealDate) : [];
    savedMessages = messages.filter((message) => message.id !== String(messageId || ''));
    if (savedMessages.length === messages.length) return;
    transaction.set(noteRef, buildStoredNote(mealDate, savedMessages));
  });
  const value = noteValue(mealDate, { messages: savedMessages, updatedAt: new Date() });
  noteCache.set(mealDate, { loadedAt: Date.now(), value });
  return value;
}

export function addCalendarDays(date, amount) {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  result.setDate(result.getDate() + amount);
  return result;
}
