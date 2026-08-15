import fs from 'fs';

const html = fs.readFileSync('public/index.html', 'utf8');

// Let's find any occurrences of data-i18n on an element that contains child HTML tags
const regex = /<([a-zA-Z0-9\-]+)\s+[^>]*?data-i18n="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g;
let match;
let total = 0;
let issues = [];

while ((match = regex.exec(html)) !== null) {
  total++;
  const tag = match[1];
  const key = match[2];
  const content = match[3];
  
  if (/<[a-zA-Z0-9\-]+/.test(content)) {
    issues.push({ tag, key, content: content.trim() });
  }
}

console.log(`Total data-i18n elements checked: ${total}`);
if (issues.length > 0) {
  console.log(`Found ${issues.length} elements with inner HTML tags:`);
  for (const issue of issues) {
    console.log(`- <${issue.tag} data-i18n="${issue.key}">: ${issue.content}`);
  }
} else {
  console.log('✅ ALL data-i18n elements contain ONLY plain text! No inner markup lost.');
}
