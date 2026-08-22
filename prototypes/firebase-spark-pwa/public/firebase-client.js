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

const initialAuthReadyPromise = auth
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

let authMutationDepth = 0;
let authMutationStablePromise = Promise.resolve();
let resolveAuthMutationStable = null;

function beginAuthMutation() {
  if (authMutationDepth === 0) {
    authMutationStablePromise = new Promise((resolve) => {
      resolveAuthMutationStable = resolve;
    });
  }
  authMutationDepth += 1;
}

function endAuthMutation() {
  authMutationDepth = Math.max(0, authMutationDepth - 1);
  if (authMutationDepth === 0 && resolveAuthMutationStable) {
    const resolve = resolveAuthMutationStable;
    resolveAuthMutationStable = null;
    resolve();
  }
}

async function runAuthMutation(operation) {
  beginAuthMutation();
  try {
    await authPersistenceReady;
    return await operation();
  } finally {
    endAuthMutation();
  }
}

async function waitForStableAuth() {
  await authPersistenceReady;
  await initialAuthReadyPromise;
  while (authMutationDepth > 0) {
    const pending = authMutationStablePromise;
    await pending;
    if (pending === authMutationStablePromise && authMutationDepth === 0) break;
  }
  return auth?.currentUser || null;
}

export function watchAuth(callback) {
  if (!auth) {
    callback(null);
    return () => undefined;
  }

  let active = true;
  let eventRevision = 0;
  const unsubscribe = onAuthStateChanged(auth, () => {
    const revision = ++eventRevision;
    void waitForStableAuth().then((user) => {
      if (active && revision === eventRevision) callback(user);
    });
  });
  return () => {
    active = false;
    unsubscribe();
  };
}

export function signInWithGoogle() {
  if (!auth) {
    return Promise.reject(new Error('Firebase non configurato'));
  }

  return runAuthMutation(() => signInWithPopup(auth, googleProvider));
}

export async function signInAdministratorWithEmail(email, password) {
  if (!auth) {
    throw new Error('Firebase non configurato');
  }
  return runAuthMutation(async () => {
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
  });
}

export async function createAdministratorWithEmail(email, password) {
  if (!auth) {
    throw new Error('Firebase non configurato');
  }
  return runAuthMutation(async () => {
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
  });
}

export async function reuseAdministratorAccountForInvitation(email, password) {
  if (!auth) {
    throw new Error('Firebase non configurato');
  }
  return runAuthMutation(async () => {
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
  });
}

export function signOutCurrentUser() {
  if (!auth) {
    return Promise.resolve();
  }

  return runAuthMutation(() => signOut(auth));
}

export function getCurrentUser() {
  return auth ? auth.currentUser : null;
}

export function waitForAuthReady() {
  return waitForStableAuth();
}

export function signInAnonymousUser() {
  if (!auth) {
    return Promise.reject(new Error('Firebase non configurato'));
  }

  return runAuthMutation(() => signInAnonymously(auth));
}

export function replaceWithAnonymousUser() {
  if (!auth) {
    return Promise.reject(new Error('Firebase non configurato'));
  }
  return runAuthMutation(async () => {
    if (auth.currentUser) await signOut(auth);
    return signInAnonymously(auth);
  });
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
  return runAuthMutation(() => signInWithEmailAndPassword(auth, email, technicalPassword));
}

const RESIDENT_TECHNICAL_EMAIL_DOMAIN = '@tavola-comune.local';
const RESIDENT_TECHNICAL_EMAIL_PREFIX = 'residenti+';
const ADMINISTRATOR_TECHNICAL_EMAIL_PREFIX = 'amministratori+';
const residentTechnicalEmailPattern = /^residenti\+[A-Za-z0-9_-]{1,120}@tavola-comune\.local$/i;
const administratorTechnicalEmailPattern = /^amministratori\+[A-Za-z0-9_-]{1,120}@tavola-comune\.local$/i;
let residentMaintenanceAuth = null;
let residentMaintenanceAuthTail = Promise.resolve();

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

export function getAdministratorTechnicalEmail(centerId, passwordVersion = 0) {
  const normalizedCenterId = String(centerId || '').trim().toLowerCase();
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(normalizedCenterId)) {
    throw new Error('Identificativo del centro non valido');
  }
  const normalizedVersion = Number(passwordVersion || 0);
  const versionSuffix = Number.isInteger(normalizedVersion) && normalizedVersion > 0
    ? `_v${normalizedVersion}`
    : '';
  return `${ADMINISTRATOR_TECHNICAL_EMAIL_PREFIX}${normalizedCenterId}${versionSuffix}${RESIDENT_TECHNICAL_EMAIL_DOMAIN}`;
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

async function acquireResidentMaintenanceAuth() {
  const previous = residentMaintenanceAuthTail;
  let releaseQueue;
  residentMaintenanceAuthTail = new Promise((resolve) => {
    releaseQueue = resolve;
  });
  await previous;
  try {
    const maintenanceAuth = await getResidentMaintenanceAuth();
    return {
      maintenanceAuth,
      async release() {
        await signOut(maintenanceAuth).catch(() => undefined);
        releaseQueue();
      }
    };
  } catch (error) {
    releaseQueue();
    throw error;
  }
}

export async function withResidentTechnicalSession(centerId, password, operation) {
  const { maintenanceAuth, release } = await acquireResidentMaintenanceAuth();
  const email = getResidentTechnicalEmail(centerId);
  const technicalPassword = formatTechnicalAuthPassword(password);
  try {
    const credential = await signInWithEmailAndPassword(
      maintenanceAuth,
      email,
      technicalPassword
    );
    return await operation({
      auth: maintenanceAuth,
      db: getFirestore(maintenanceAuth.app),
      user: credential.user
    });
  } finally {
    await release();
  }
}

// Sessione tecnica usata quando il residente inserisce direttamente la
// password amministratori nel modulo iniziale. Non modifica la sessione
// Firebase principale: serve soltanto a validare la password e a eseguire le
// poche operazioni iniziali autorizzate per il vice.
export async function withAdministratorTechnicalSession(
  centerId,
  password,
  passwordVersion,
  operation,
  technicalEmailOverride = ''
) {
  const { maintenanceAuth, release } = await acquireResidentMaintenanceAuth();
  const email = String(technicalEmailOverride || '').trim().toLowerCase()
    || getAdministratorTechnicalEmail(centerId, passwordVersion);
  const technicalPassword = formatTechnicalAuthPassword(password);
  try {
    const credential = await signInWithEmailAndPassword(
      maintenanceAuth,
      email,
      technicalPassword
    );
    return await operation({
      auth: maintenanceAuth,
      db: getFirestore(maintenanceAuth.app),
      user: credential.user,
      email
    });
  } finally {
    await release();
  }
}

// Verifica la password comune senza sostituire la sessione Firebase principale.
// È essenziale quando un amministratore entra nelle viste operative e poi torna
// al pannello di controllo.
export async function verifyResidentCommonPassword(centerId, password) {
  return withResidentTechnicalSession(centerId, password, ({ user }) => user);
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

  const { maintenanceAuth, release } = await acquireResidentMaintenanceAuth();
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
    await release();
  }
}

export async function setAdministratorTechnicalPassword(
  centerId,
  previousPassword,
  nextPassword,
  { currentEmail = '', nextVersion = 1 } = {}
) {
  const email = String(currentEmail || '').trim().toLowerCase()
    || getAdministratorTechnicalEmail(centerId);
  const next = String(nextPassword || '');
  const previous = String(previousPassword || '');
  if (next.length < 6 || next.length > 64) {
    throw new Error('La password amministratori deve avere tra 6 e 64 caratteri');
  }

  const { maintenanceAuth, release } = await acquireResidentMaintenanceAuth();
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
        return { email, uid: credential.user.uid, created: true };
      } catch (error) {
        if (error?.code !== 'auth/email-already-in-use') throw error;
        if (!formattedPrevious) {
          const alreadyConfigured = await signInWithEmailAndPassword(
            maintenanceAuth,
            email,
            formattedNext
          ).catch(() => null);
          if (alreadyConfigured) {
            return { email, uid: alreadyConfigured.user.uid, created: false };
          }

          // L'amministratore già autenticato può sostituire una password condivisa
          // dimenticata. La nuova identità tecnica disattiva quella precedente non
          // appena il centro ne salva l'UID, senza conservare password in Firestore.
          const replacementEmail = getAdministratorTechnicalEmail(centerId, nextVersion);
          let replacement = await signInWithEmailAndPassword(
            maintenanceAuth,
            replacementEmail,
            formattedNext
          ).catch(() => null);
          if (!replacement) {
            replacement = await createUserWithEmailAndPassword(
              maintenanceAuth,
              replacementEmail,
              formattedNext
            );
          }
          return {
            email: replacementEmail,
            uid: replacement.user.uid,
            created: true,
            replaced: true
          };
        }
        throw error;
      }
    }
    if (formattedPrevious !== formattedNext) {
      await updatePassword(credential.user, formattedNext);
    }
    return { email, uid: credential.user.uid, created: false };
  } finally {
    await release();
  }
}

export async function authorizeResidentAdministratorSession({
  centerId,
  participantId,
  password,
  passwordVersion,
  technicalEmail = ''
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

  const { maintenanceAuth, release } = await acquireResidentMaintenanceAuth();
  const email = String(technicalEmail || '').trim().toLowerCase()
    || getAdministratorTechnicalEmail(centerId);
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
    await release();
  }
}

export async function updateAdministratorPassword(newPassword) {
  const user = getCurrentUser();
  if (!user) throw new Error('Nessun utente autenticato');
  const password = String(newPassword || '');
  if (password.length < 6) {
    throw new Error('La password deve contenere almeno 6 caratteri');
  }
  const hasPasswordProvider = user.providerData?.some(
    (provider) => provider.providerId === 'password'
  );
  if (hasPasswordProvider) {
    await updatePassword(user, password);
    return;
  }
  if (!user.email) {
    throw new Error('L’account non ha un indirizzo email utilizzabile');
  }
  await linkWithCredential(user, EmailAuthProvider.credential(user.email, password));
}

export async function sendAdminPasswordResetEmail(email) {
  if (!auth) throw new Error('Firebase non configurato');
  await sendPasswordResetEmail(auth, String(email || '').trim(), {
    url: window.location.href
  });
}
