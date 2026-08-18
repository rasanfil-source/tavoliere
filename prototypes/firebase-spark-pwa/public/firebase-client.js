import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendEmailVerification,
  signOut,
  inMemoryPersistence,
  linkWithCredential,
  browserLocalPersistence,
  setPersistence,
  updatePassword,
  sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js';
import {
  Timestamp,
  deleteDoc,
  doc,
  getFirestore,
  serverTimestamp,
  setDoc
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';

export const firebaseConfig = {
  apiKey: 'AIzaSyCpU6mbE1vUtFfhnQUULkjuvzPGhIv3ZTY',
  authDomain: 'tavola-comune.firebaseapp.com',
  projectId: 'tavola-comune',
  storageBucket: 'tavola-comune.firebasestorage.app',
  messagingSenderId: '116770230630',
  appId: '1:116770230630:web:766fc9f384c0b60fb178a7'
};

const missingConfigValues = Object.entries(firebaseConfig)
  .filter(([, value]) => value.startsWith('INSERISCI_'))
  .map(([key]) => key);

export const isFirebaseConfigured = missingConfigValues.length === 0;
export const missingFirebaseConfigValues = missingConfigValues;

export const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

const authReadyPromise = auth
  ? new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  })
  : Promise.resolve(null);

const googleProvider = new GoogleAuthProvider();
const authPersistenceReady = auth
  ? setPersistence(auth, browserLocalPersistence)
    // Private browsing and embedded webviews can reject localStorage. Keep
    // the current tab usable in that exceptional case.
    .catch(() => setPersistence(auth, inMemoryPersistence))
    .catch(() => undefined)
  : Promise.resolve();

export function watchAuth(callback) {
  if (!auth) {
    callback(null);
    return () => undefined;
  }

  return onAuthStateChanged(auth, callback);
}

export function signInWithGoogle() {
  if (!auth) {
    return Promise.reject(new Error('Firebase non configurato'));
  }

  return authPersistenceReady.then(() => signInWithPopup(auth, googleProvider));
}

export async function signInAdministratorWithEmail(email, password) {
  if (!auth) {
    throw new Error('Firebase non configurato');
  }
  await authPersistenceReady;
  const credential = await signInWithEmailAndPassword(
    auth,
    String(email || '').trim(),
    String(password || '')
  );
  if (!credential.user.emailVerified) {
    await signOut(auth);
    const error = new Error('Conferma prima il tuo indirizzo email usando il messaggio ricevuto');
    error.code = 'auth/email-not-verified';
    throw error;
  }
  return credential;
}

export async function createAdministratorWithEmail(email, password) {
  if (!auth) {
    throw new Error('Firebase non configurato');
  }
  await authPersistenceReady;
  const credential = await createUserWithEmailAndPassword(
    auth,
    String(email || '').trim(),
    String(password || '')
  );
  await sendEmailVerification(credential.user, {
    url: window.location.href
  });
  await signOut(auth);
  return credential;
}

export async function reuseAdministratorAccountForInvitation(email, password) {
  if (!auth) {
    throw new Error('Firebase non configurato');
  }
  await authPersistenceReady;
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedPassword = String(password || '');
  const credential = await signInWithPopup(auth, googleProvider);
  const authenticatedEmail = String(credential.user.email || '').trim().toLowerCase();

  if (!normalizedEmail || authenticatedEmail !== normalizedEmail) {
    await signOut(auth);
    const error = new Error('Accedi con lo stesso indirizzo indicato nell invito');
    error.code = 'auth/invitation-email-mismatch';
    throw error;
  }

  if (normalizedPassword.length >= 6) {
    const hasPasswordAccess = credential.user.providerData.some(
      (provider) => provider.providerId === 'password'
    );
    if (hasPasswordAccess) {
      await updatePassword(credential.user, normalizedPassword);
    } else {
      await linkWithCredential(
        credential.user,
        EmailAuthProvider.credential(normalizedEmail, normalizedPassword)
      );
    }
  }

  return credential;
}

export function signOutCurrentUser() {
  if (!auth) {
    return Promise.resolve();
  }

  return signOut(auth);
}

export function getCurrentUser() {
  return auth ? auth.currentUser : null;
}

export function waitForAuthReady() {
  return authReadyPromise;
}

export function signInAnonymousUser() {
  if (!auth) {
    return Promise.reject(new Error('Firebase non configurato'));
  }

  return authPersistenceReady.then(() => signInAnonymously(auth));
}

export function formatTechnicalAuthPassword(password) {
  const raw = String(password || '').trim();
  if (raw.length < 6) {
    return `${raw}#TC${raw.length}`;
  }
  return raw;
}

export function signInResidentTechnicalUser(email, password) {
  if (!auth) {
    return Promise.reject(new Error('Firebase non configurato'));
  }

  const technicalPassword = formatTechnicalAuthPassword(password);
  return authPersistenceReady.then(() => signInWithEmailAndPassword(auth, email, technicalPassword));
}

const RESIDENT_TECHNICAL_EMAIL_DOMAIN = '@tavola-comune.local';
const RESIDENT_TECHNICAL_EMAIL_PREFIX = 'residenti+';
const ADMINISTRATOR_TECHNICAL_EMAIL_PREFIX = 'amministratori+';
const residentTechnicalEmailPattern = /^residenti\+[A-Za-z0-9_-]{1,120}@tavola-comune\.local$/i;
const administratorTechnicalEmailPattern = /^amministratori\+[A-Za-z0-9_-]{1,120}@tavola-comune\.local$/i;
let residentMaintenanceAuth = null;

export function getResidentTechnicalEmail(centerId) {
  const normalizedCenterId = String(centerId || '').trim().toLowerCase();
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(normalizedCenterId)) {
    throw new Error('Identificativo del centro non valido');
  }
  return `${RESIDENT_TECHNICAL_EMAIL_PREFIX}${normalizedCenterId}${RESIDENT_TECHNICAL_EMAIL_DOMAIN}`;
}

export function isResidentTechnicalEmail(email) {
  return residentTechnicalEmailPattern.test(String(email || '').trim());
}

export function getAdministratorTechnicalEmail(centerId) {
  const normalizedCenterId = String(centerId || '').trim().toLowerCase();
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(normalizedCenterId)) {
    throw new Error('Identificativo del centro non valido');
  }
  return `${ADMINISTRATOR_TECHNICAL_EMAIL_PREFIX}${normalizedCenterId}${RESIDENT_TECHNICAL_EMAIL_DOMAIN}`;
}

export function isAdministratorTechnicalEmail(email) {
  return administratorTechnicalEmailPattern.test(String(email || '').trim());
}

async function getResidentMaintenanceAuth() {
  if (!isFirebaseConfigured) throw new Error('Firebase non configurato');
  if (!residentMaintenanceAuth) {
    const appName = 'tavola-comune-resident-maintenance';
    const secondaryApp = getApps().find((candidate) => candidate.name === appName)
      || initializeApp(firebaseConfig, appName);
    residentMaintenanceAuth = getAuth(secondaryApp);
    await setPersistence(residentMaintenanceAuth, inMemoryPersistence);
  }
  return residentMaintenanceAuth;
}

// Verifica la password comune senza sostituire la sessione Firebase principale.
// È essenziale quando un amministratore entra nelle viste operative e poi torna
// al pannello di controllo.
export async function verifyResidentCommonPassword(centerId, password) {
  const maintenanceAuth = await getResidentMaintenanceAuth();
  const email = getResidentTechnicalEmail(centerId);
  const technicalPassword = formatTechnicalAuthPassword(password);
  try {
    return await signInWithEmailAndPassword(maintenanceAuth, email, technicalPassword);
  } finally {
    await signOut(maintenanceAuth).catch(() => undefined);
  }
}

// La seconda istanza Auth non modifica la sessione dell'amministratore.
export async function setResidentTechnicalPassword(centerId, previousPassword, nextPassword) {
  const email = getResidentTechnicalEmail(centerId);
  const next = String(nextPassword || '');
  const previous = String(previousPassword || '');
  if (next.length < 4 || next.length > 32) {
    throw new Error('La password comune deve avere tra 4 e 32 caratteri');
  }

  const formattedNext = formatTechnicalAuthPassword(next);
  const formattedPrevious = previous ? formatTechnicalAuthPassword(previous) : '';

  const maintenanceAuth = await getResidentMaintenanceAuth();
  try {
    let credential = null;
    if (formattedPrevious) {
      try {
        credential = await signInWithEmailAndPassword(maintenanceAuth, email, formattedPrevious);
      } catch (error) {
        if (error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') {
          credential = await signInWithEmailAndPassword(maintenanceAuth, email, formattedNext).catch(() => null);
        } else if (error?.code !== 'auth/user-not-found') {
          throw error;
        }
      }
    }

    if (!credential) {
      try {
        credential = await createUserWithEmailAndPassword(maintenanceAuth, email, formattedNext);
        return { email, created: true };
      } catch (error) {
        if (error?.code !== 'auth/email-already-in-use') throw error;
        credential = await signInWithEmailAndPassword(maintenanceAuth, email, formattedNext)
          .catch(async () => {
            if (formattedPrevious) {
              return signInWithEmailAndPassword(maintenanceAuth, email, formattedPrevious);
            }
            throw error;
          });
        if (credential) {
          if (formattedPrevious !== formattedNext) {
            await updatePassword(credential.user, formattedNext);
          }
          return { email, created: false };
        }
        throw error;
      }
    }

    if (formattedPrevious !== formattedNext) {
      await updatePassword(credential.user, formattedNext);
    }
    return { email, created: false };
  } finally {
    await signOut(maintenanceAuth).catch(() => undefined);
  }
}

export async function setAdministratorTechnicalPassword(centerId, previousPassword, nextPassword) {
  const email = getAdministratorTechnicalEmail(centerId);
  const next = String(nextPassword || '');
  const previous = String(previousPassword || '');
  if (next.length < 6 || next.length > 64) {
    throw new Error('La password amministratori deve avere tra 6 e 64 caratteri');
  }

  const maintenanceAuth = await getResidentMaintenanceAuth();
  const formattedNext = formatTechnicalAuthPassword(next);
  const formattedPrevious = previous ? formatTechnicalAuthPassword(previous) : '';
  try {
    let credential = null;
    if (formattedPrevious) {
      credential = await signInWithEmailAndPassword(maintenanceAuth, email, formattedPrevious)
        .catch((error) => {
          if (error?.code === 'auth/user-not-found') return null;
          throw error;
        });
    }
    if (!credential) {
      try {
        credential = await createUserWithEmailAndPassword(maintenanceAuth, email, formattedNext);
        return { email, created: true };
      } catch (error) {
        if (error?.code !== 'auth/email-already-in-use') throw error;
        if (!formattedPrevious) {
          const alreadyConfigured = await signInWithEmailAndPassword(
            maintenanceAuth,
            email,
            formattedNext
          ).catch(() => null);
          if (alreadyConfigured) return { email, created: false };
          const missing = new Error('Inserisci anche la password amministratori attuale');
          missing.code = 'auth/current-administrator-password-required';
          throw missing;
        }
        throw error;
      }
    }
    if (formattedPrevious !== formattedNext) {
      await updatePassword(credential.user, formattedNext);
    }
    return { email, created: false };
  } finally {
    await signOut(maintenanceAuth).catch(() => undefined);
  }
}

export async function authorizeResidentAdministratorSession({
  centerId,
  participantId,
  password,
  passwordVersion
}) {
  const primaryUser = getCurrentUser();
  if (!primaryUser?.isAnonymous) {
    throw new Error('Accedi prima come residente');
  }
  const normalizedParticipantId = String(participantId || '').trim();
  if (!normalizedParticipantId) throw new Error('Identità residente non disponibile');
  const normalizedVersion = Number(passwordVersion || 0);
  if (!Number.isInteger(normalizedVersion) || normalizedVersion < 1) {
    throw new Error('La password amministratori non è ancora impostata');
  }

  const maintenanceAuth = await getResidentMaintenanceAuth();
  const email = getAdministratorTechnicalEmail(centerId);
  const technicalPassword = formatTechnicalAuthPassword(password);
  try {
    await signInWithEmailAndPassword(maintenanceAuth, email, technicalPassword);
    await deleteDoc(doc(db, 'centers', centerId, 'viceSessions', primaryUser.uid)).catch((error) => {
      if (error?.code !== 'not-found') throw error;
    });
    const maintenanceDb = getFirestore(maintenanceAuth.app);
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    await setDoc(doc(maintenanceDb, 'centers', centerId, 'viceSessions', primaryUser.uid), {
      centerId,
      authUid: primaryUser.uid,
      participantId: normalizedParticipantId,
      passwordVersion: normalizedVersion,
      status: 'ACTIVE',
      expiresAt,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { expiresAt: expiresAt.toDate(), passwordVersion: normalizedVersion };
  } finally {
    await signOut(maintenanceAuth).catch(() => undefined);
  }
}

export async function updateAdministratorPassword(newPassword) {
  const user = getCurrentUser();
  if (!user) throw new Error('Nessun utente autenticato');
  await updatePassword(user, String(newPassword));
}

export async function sendAdminPasswordResetEmail(email) {
  if (!auth) throw new Error('Firebase non configurato');
  await sendPasswordResetEmail(auth, String(email || '').trim(), {
    url: window.location.href
  });
}
