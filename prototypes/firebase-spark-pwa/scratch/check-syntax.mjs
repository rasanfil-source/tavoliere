import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function checkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      checkDir(fullPath);
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) {
      try {
        execSync(`node --check "${fullPath}"`);
        console.log(`OK: ${fullPath}`);
      } catch (e) {
        console.error(`FAIL: ${fullPath}`, e.message);
        process.exit(1);
      }
    }
  }
}

checkDir('public');
console.log('ALL PUBLIC JS/MJS FILES PASSED SYNTAX CHECK!');
