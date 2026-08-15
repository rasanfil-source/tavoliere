import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { inspectCenterBackup } from '../prototypes/firebase-spark-pwa/public/domain/center-backup.mjs';

const [, , fileArgument, expectedCenterId = ''] = process.argv;
if (!fileArgument) {
  console.error('Uso: npm run backup:inspect -- <file.json> [centerId-atteso]');
  process.exit(2);
}

try {
  const filePath = resolve(fileArgument);
  const backup = JSON.parse(await readFile(filePath, 'utf8'));
  const report = inspectCenterBackup(backup, { expectedCenterId });

  console.log(`Centro: ${report.centerId || 'non identificato'}`);
  console.log(`Documenti: ${report.totalDocuments}`);
  Object.entries(report.counts).forEach(([name, count]) => console.log(`- ${name}: ${count}`));
  report.warnings.forEach((warning) => console.warn(`Avviso: ${warning}`));
  report.errors.forEach((error) => console.error(`Errore: ${error}`));
  console.log(report.valid ? 'Backup valido per la fase di anteprima.' : 'Backup non valido. Nessun dato e stato modificato.');
  process.exit(report.valid ? 0 : 1);
} catch (error) {
  console.error(`Backup non leggibile: ${error.message}`);
  process.exit(1);
}
