import fs from 'fs';

const content = fs.readFileSync('public/app.js', 'utf8');
const lines = content.split('\n');

const results = [];
lines.forEach((line, idx) => {
  const trimmed = line.trim();
  if (
    trimmed.includes('.textContent =') ||
    trimmed.includes('friendlyErrorMessage(') ||
    trimmed.includes('showActionDialog(') ||
    trimmed.includes('.placeholder =') ||
    trimmed.includes('.innerHTML =') ||
    trimmed.includes('new Intl.DateTimeFormat')
  ) {
    results.push({ line: idx + 1, text: trimmed });
  }
});

console.log(`Found ${results.length} relevant lines:`);
results.forEach(r => console.log(`${r.line}: ${r.text}`));
