import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const documentationPages = [
  'README.md',
  'README.en.md',
  'README.es.md',
  'CONTRIBUTING.md',
  'CONTRIBUTING.en.md',
  'CONTRIBUTING.es.md',
  'SECURITY.md',
  'SECURITY.en.md',
  'SECURITY.es.md',
  'docs/GUIDA_ALL_USO.md',
  'docs/ARCHITETTURA_E_SICUREZZA.md',
  'docs/SVILUPPO_E_TEST.md',
  'docs/OPERATIONS.md',
  'docs/en/USER_GUIDE.md',
  'docs/en/ARCHITECTURE_AND_SECURITY.md',
  'docs/en/DEVELOPMENT_AND_TESTING.md',
  'docs/en/OPERATIONS.md',
  'docs/es/GUIA_DE_USO.md',
  'docs/es/ARQUITECTURA_Y_SEGURIDAD.md',
  'docs/es/DESARROLLO_Y_PRUEBAS.md',
  'docs/es/OPERACIONES.md'
];

test('la documentazione pubblica esiste in italiano inglese e spagnolo', () => {
  for (const relativePath of documentationPages) {
    const absolutePath = resolve(repositoryRoot, relativePath);
    assert.equal(existsSync(absolutePath), true, `Pagina mancante: ${relativePath}`);
    const source = readFileSync(absolutePath, 'utf8');
    assert.match(source, /img\.shields\.io\/badge\/lingua-Italiano-/);
    assert.match(source, /img\.shields\.io\/badge\/language-English-/);
    assert.match(source, /img\.shields\.io\/badge\/idioma-Espa%C3%B1ol-/);
  }
});

test('italiano resta la pagina predefinita del repository', () => {
  const readme = readFileSync(resolve(repositoryRoot, 'README.md'), 'utf8');
  assert.match(readme, /lingua-Italiano-16615a/);
  assert.match(readme, /\]\(README\.en\.md\)/);
  assert.match(readme, /\]\(README\.es\.md\)/);
});

test('tutti i collegamenti locali della documentazione hanno una destinazione', () => {
  for (const relativePath of documentationPages) {
    const absolutePath = resolve(repositoryRoot, relativePath);
    const source = readFileSync(absolutePath, 'utf8');
    for (const match of source.matchAll(/\]\(([^)]+)\)/g)) {
      const rawTarget = match[1].trim();
      if (!rawTarget
          || rawTarget.startsWith('http://')
          || rawTarget.startsWith('https://')
          || rawTarget.startsWith('mailto:')
          || rawTarget.startsWith('#')) {
        continue;
      }
      const withoutAnchor = rawTarget.split('#', 1)[0];
      const target = resolve(dirname(absolutePath), decodeURIComponent(withoutAnchor));
      assert.equal(existsSync(target), true, `${relativePath} → ${rawTarget}`);
    }
  }
});
