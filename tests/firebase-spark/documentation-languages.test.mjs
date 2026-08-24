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

const translatedDocumentSets = [
  [
    'docs/GUIDA_ALL_USO.md',
    'docs/en/USER_GUIDE.md',
    'docs/es/GUIA_DE_USO.md'
  ],
  [
    'docs/ARCHITETTURA_E_SICUREZZA.md',
    'docs/en/ARCHITECTURE_AND_SECURITY.md',
    'docs/es/ARQUITECTURA_Y_SEGURIDAD.md'
  ],
  [
    'docs/OPERATIONS.md',
    'docs/en/OPERATIONS.md',
    'docs/es/OPERACIONES.md'
  ]
];

test('la documentazione pubblica esiste in italiano inglese e spagnolo', () => {
  for (const relativePath of documentationPages) {
    const absolutePath = resolve(repositoryRoot, relativePath);
    assert.equal(existsSync(absolutePath), true, `Pagina mancante: ${relativePath}`);
    const source = readFileSync(absolutePath, 'utf8');
    assert.match(source, /🇮🇹\s+\[!\[Italiano\]/);
    assert.match(source, /🇬🇧\s+\[!\[English\]/);
    assert.match(source, /🇪🇸\s+\[!\[Español\]/);
  }
});

test('italiano resta la pagina predefinita del repository', () => {
  const readme = readFileSync(resolve(repositoryRoot, 'README.md'), 'utf8');
  assert.match(readme, /🇮🇹\s+\[!\[Italiano\]\(https:\/\/img\.shields\.io\/badge\/Italiano-16615a/);
  assert.match(readme, /\]\(README\.en\.md\)/);
  assert.match(readme, /\]\(README\.es\.md\)/);
});

test('le guide principali sono complete e collegate nelle tre lingue', () => {
  for (const documentSet of translatedDocumentSets) {
    for (const relativePath of documentSet) {
      const source = readFileSync(resolve(repositoryRoot, relativePath), 'utf8');
      assert.ok(source.length > 3000, `Documento troppo breve: ${relativePath}`);
      assert.doesNotMatch(source, /traduzione non aggiornata|translation is not up to date|traducci[oó]n no actualizada/i);

      for (const siblingPath of documentSet) {
        const siblingName = siblingPath.split('/').at(-1);
        assert.match(source, new RegExp(siblingName.replaceAll('.', '\\.')),
          `${relativePath} non collega ${siblingName}`);
      }
    }
  }
});

test('i README indirizzano alla documentazione della propria lingua', () => {
  const expectedLinks = new Map([
    ['README.md', ['docs/GUIDA_ALL_USO.md', 'docs/ARCHITETTURA_E_SICUREZZA.md', 'docs/SVILUPPO_E_TEST.md', 'docs/OPERATIONS.md']],
    ['README.en.md', ['docs/en/USER_GUIDE.md', 'docs/en/ARCHITECTURE_AND_SECURITY.md', 'docs/en/DEVELOPMENT_AND_TESTING.md', 'docs/en/OPERATIONS.md']],
    ['README.es.md', ['docs/es/GUIA_DE_USO.md', 'docs/es/ARQUITECTURA_Y_SEGURIDAD.md', 'docs/es/DESARROLLO_Y_PRUEBAS.md', 'docs/es/OPERACIONES.md']]
  ]);

  for (const [relativePath, links] of expectedLinks) {
    const source = readFileSync(resolve(repositoryRoot, relativePath), 'utf8');
    for (const link of links) {
      assert.match(source, new RegExp(link.replaceAll('.', '\\.').replaceAll('/', '\\/')),
        `${relativePath} non collega ${link}`);
    }
  }
});

test('i README mostrano la firma HappyDuck con immagine e contatto email', () => {
  for (const relativePath of ['README.md', 'README.en.md', 'README.es.md']) {
    const source = readFileSync(resolve(repositoryRoot, relativePath), 'utf8');
    assert.match(source, /prototypes\/firebase-spark-pwa\/public\/icons\/happyduck-badge\.png/);
    assert.match(source, /href="mailto:rasanfil@gmail\.com"/);
  }
  assert.equal(existsSync(resolve(repositoryRoot,
    'prototypes/firebase-spark-pwa/public/icons/happyduck-badge.png')), true);
});

test('i README mostrano le schermate anonimizzate nei punti funzionali', () => {
  const screenshots = [
    'docs/images/prenotazioni-settimana.png',
    'docs/images/prenotazioni-mese.png',
    'docs/images/riepilogo.png',
    'docs/images/cucina.png'
  ];
  for (const screenshot of screenshots) {
    assert.equal(existsSync(resolve(repositoryRoot, screenshot)), true, `Schermata mancante: ${screenshot}`);
  }
  for (const relativePath of ['README.md', 'README.en.md', 'README.es.md']) {
    const source = readFileSync(resolve(repositoryRoot, relativePath), 'utf8');
    for (const screenshot of screenshots) {
      assert.match(source, new RegExp(screenshot.replaceAll('.', '\\.').replaceAll('/', '\\/')),
        `${relativePath} non mostra ${screenshot}`);
    }
  }
});

test('la documentazione usa Oggi a tavola come unico nome pubblico', () => {
  for (const relativePath of ['README.md', 'README.en.md', 'README.es.md']) {
    const source = readFileSync(resolve(repositoryRoot, relativePath), 'utf8');
    assert.match(source, /^# Oggi a tavola/m);
    assert.doesNotMatch(source, /Tutti a tavola/);
  }
});

test('il responsabile non viene documentato come profilo distinto dall amministratore', () => {
  const italian = readFileSync(resolve(repositoryRoot, 'README.md'), 'utf8');
  const english = readFileSync(resolve(repositoryRoot, 'README.en.md'), 'utf8');
  const spanish = readFileSync(resolve(repositoryRoot, 'README.es.md'), 'utf8');
  assert.doesNotMatch(italian, /\| Responsabile del centro \|/);
  assert.doesNotMatch(english, /\| Centre owner \|/);
  assert.doesNotMatch(spanish, /\| Responsable del centro \|/);
  assert.match(italian, /Il centro ha un unico amministratore/);
  assert.match(english, /Each centre has one administrator/);
  assert.match(spanish, /Cada centro tiene un único administrador/);
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
