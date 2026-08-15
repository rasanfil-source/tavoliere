import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp, doc, getDoc, writeBatch } from 'firebase/firestore';
import { buildCenterRestorePlan } from '../prototypes/firebase-spark-pwa/public/domain/center-restore.mjs';

const args = process.argv.slice(2);
const apply = args.includes('--apply-emulator');
const positional = args.filter((argument) => !argument.startsWith('--'));
const [filePath, expectedCenterId = ''] = positional;

if (!filePath) {
  console.error('Uso: npm run backup:restore-emulator -- <backup.json> <centerId> [--apply-emulator]');
  process.exit(1);
}

const backup = JSON.parse(await readFile(filePath, 'utf8'));
let plan;
try {
  plan = buildCenterRestorePlan(backup, { expectedCenterId });
} catch (error) {
  console.error(error.message);
  (error.inspection?.errors || []).forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`Centro: ${plan.centerId}`);
console.log(`Scritture previste: ${plan.totalWrites}`);
Object.entries(plan.inspection.counts).forEach(([name, count]) => {
  console.log(`- ${name}: ${count}`);
});
plan.inspection.warnings.forEach((message) => console.warn(`Avviso: ${message}`));

if (!apply) {
  console.log('Anteprima completata. Nessun dato e stato scritto.');
  process.exit(0);
}

const emulator = parseEmulatorAddress(process.env.FIRESTORE_EMULATOR_HOST);
if (!emulator) {
  console.error('FIRESTORE_EMULATOR_HOST non e impostato. La scrittura e consentita soltanto sull Emulator.');
  process.exit(1);
}

const projectId = process.env.GCLOUD_PROJECT || 'demo-tavola-comune-restore';
const testEnvironment = await initializeTestEnvironment({
  projectId,
  firestore: emulator
});

try {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    for (let offset = 0; offset < plan.operations.length; offset += 400) {
      const batch = writeBatch(firestore);
      for (const operation of plan.operations.slice(offset, offset + 400)) {
        const reference = doc(firestore, operation.path);
        const data = reviveFirestoreValues(operation.data);
        if (operation.mode === 'merge') {
          batch.set(reference, data, { merge: true });
        } else {
          batch.set(reference, data);
        }
      }
      await batch.commit();
      console.log(`Confermate ${Math.min(offset + 400, plan.operations.length)} di ${plan.operations.length} scritture.`);
    }
    let verifiedWrites = 0;
    for (let offset = 0; offset < plan.operations.length; offset += 100) {
      const snapshots = await Promise.all(plan.operations
        .slice(offset, offset + 100)
        .map((operation) => getDoc(doc(firestore, operation.path))));
      if (snapshots.some((snapshot) => !snapshot.exists())) {
        throw new Error('La verifica ha rilevato documenti mancanti dopo il ripristino.');
      }
      verifiedWrites += snapshots.length;
    }
    console.log(`Verificate ${verifiedWrites} scritture sull Emulator.`);
  });
  console.log('Ripristino Emulator completato. Verifica i dati prima di qualunque procedura sul centro reale.');
} finally {
  await testEnvironment.cleanup();
}

function parseEmulatorAddress(value) {
  const match = String(value || '').match(/^([^:]+):(\d+)$/);
  return match ? { host: match[1], port: Number(match[2]) } : null;
}

function reviveFirestoreValues(value) {
  if (Array.isArray(value)) {
    return value.map(reviveFirestoreValues);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  if (Number.isFinite(value.seconds) && Number.isFinite(value.nanoseconds)) {
    return new Timestamp(value.seconds, value.nanoseconds);
  }
  return Object.fromEntries(Object.entries(value).map(([key, nested]) => [
    key,
    reviveFirestoreValues(nested)
  ]));
}
