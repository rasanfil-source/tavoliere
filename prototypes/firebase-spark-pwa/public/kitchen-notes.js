import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import { db } from './firebase-client.js?v=20260816b';
import { getActiveCenterId } from './center-context.js?v=20260816b';
import { formatDateId } from './date-utils.mjs?v=20260816b';

export { formatDateId } from './date-utils.mjs?v=20260816b';

const MAX_NOTE_LENGTH = 1000;
const NOTE_CACHE_MS = 60 * 1000;
const noteCache = new Map();

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
    const value = { mealDate, text: '', updatedAt: null };
    noteCache.set(mealDate, { loadedAt: Date.now(), value });
    return value;
  }

  const data = noteSnap.data();
  const value = {
    mealDate,
    text: typeof data.text === 'string' ? data.text : '',
    updatedAt: data.updatedAt || null
  };
  noteCache.set(mealDate, { loadedAt: Date.now(), value });
  return value;
}

export async function saveKitchenNote(date, text) {
  if (!db) {
    throw new Error('Firebase non configurato');
  }

  const normalizedText = String(text || '').trim();
  if (normalizedText.length > MAX_NOTE_LENGTH) {
    throw new Error('La nota non puo superare 1000 caratteri.');
  }

  const mealDate = formatDateId(date);
  const noteRef = doc(db, 'centers', getActiveCenterId(), 'kitchenNotes', mealDate);
  await setDoc(noteRef, {
    centerId: getActiveCenterId(),
    mealDate,
    text: normalizedText,
    updatedAt: serverTimestamp()
  }, { merge: true });

  const value = { mealDate, text: normalizedText, updatedAt: new Date() };
  noteCache.set(mealDate, { loadedAt: Date.now(), value });
  return value;
}

export function addCalendarDays(date, amount) {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  result.setDate(result.getDate() + amount);
  return result;
}
