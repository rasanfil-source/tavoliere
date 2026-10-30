import { collection, doc, getDoc, getDocs, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import { db } from './firebase-client.js?v=20261014b';

// Indice operativo minimo: nessuna email, nome o credenziale dell'account.
export function writeAdministratorDeletionProtection(batch, centerId, uid, membership) {
  batch.set(doc(db, 'centers', centerId, 'administratorDeletionProtection', uid), {
    participantId: membership.participantId || '',
    role: membership.role,
    status: membership.status,
    updatedAt: serverTimestamp()
  });
  batch.set(doc(db, 'centers', centerId, 'participantMetadata', 'administratorProtection'), {
    updatedAt: serverTimestamp()
  }, { merge: true });
}

// Gli amministratori inizializzano l'indice per tutti i centri e conservano
// i permessi dei vice durante la configurazione.
export async function synchronizeAdministratorDeletionProtection(centerId) {
  const metadata = doc(db, 'centers', centerId, 'participantMetadata', 'administratorProtection');
  if ((await getDoc(metadata)).data()?.ready === true) return;
  await runTransaction(db, async transaction => {
    await transaction.get(metadata);
    const accounts = await getDocs(collection(db, 'centers', centerId, 'admins'));
    const indexed = await getDocs(collection(db, 'centers', centerId, 'administratorDeletionProtection'));
    const current = await Promise.all(accounts.docs.map(account => transaction.get(account.ref)));
    const ids = new Set(accounts.docs.map(account => account.id));
    for (let i = 0; i < accounts.docs.length; i++) {
      if (current[i].exists()) writeAdministratorDeletionProtection(transaction, centerId, accounts.docs[i].id, current[i].data());
    }
    for (const item of indexed.docs) {
      if (!ids.has(item.id)) transaction.delete(item.ref);
    }
    transaction.set(metadata, { ready: true, updatedAt: serverTimestamp() });
  });
}
