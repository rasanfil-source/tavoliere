import { readFileSync, writeFileSync } from 'node:fs';

const translations = {
  'admin.avatar.noFileSelected': {
    it: 'Nessun file selezionato',
    en: 'No file chosen',
    es: 'Ningún archivo seleccionado',
    fr: 'Aucun fichier sélectionné',
    de: 'Keine Datei ausgewählt'
  },
  'admin.people.ready': {
    it: 'Pronto',
    en: 'Ready',
    es: 'Listo',
    fr: 'Prêt',
    de: 'Bereit'
  },
  'admin.people.completeProfile': {
    it: 'Completa i dati del responsabile',
    en: 'Complete manager details',
    es: 'Completa los datos del responsable',
    fr: 'Complétez les coordonnées du responsable',
    de: 'Daten des Verantwortlichen vervollständigen'
  },
  'admin.invitations.recentCount': {
    it: '{count} inviti recenti',
    en: '{count} recent invitations',
    es: '{count} invitaciones recientes',
    fr: '{count} invitations récentes',
    de: '{count} aktuelle Einladungen'
  },
  'admin.invitations.revoking': {
    it: 'Revoco l\'invito…',
    en: 'Revoking invitation…',
    es: 'Revocando invitación…',
    fr: 'Révocation de l\'invitation…',
    de: 'Einladung wird widerrufen…'
  },
  'admin.invitations.revoke': {
    it: 'Revoca',
    en: 'Revoke',
    es: 'Revocar',
    fr: 'Révoquer',
    de: 'Widerrufen'
  },
  'admin.invitations.revokeFailed': {
    it: 'Invito non revocato',
    en: 'Invitation could not be revoked',
    es: 'No se pudo revocar la invitación',
    fr: 'L\'invitation n\'a pas pu être révoquée',
    de: 'Einladung konnte nicht widerrufen werden'
  },
  'admin.accounts.noOtherAdmins': {
    it: 'Nessun altro amministratore attivo',
    en: 'No other active administrators',
    es: 'Ningún otro administrador activo',
    fr: 'Aucun autre administrateur actif',
    de: 'Keine weiteren aktiven Administratoren'
  },
  'admin.accounts.activeCount': {
    it: '{count} amministratori attivi',
    en: '{count} active administrators',
    es: '{count} administradores activos',
    fr: '{count} administrateurs actifs',
    de: '{count} aktive Administratoren'
  },
  'admin.accounts.revokeAccess': {
    it: 'Revoca accesso',
    en: 'Revoke access',
    es: 'Revocar acceso',
    fr: 'Révoquer l\'accès',
    de: 'Zugriff widerrufen'
  }
};

const languages = ['it', 'en', 'es', 'fr', 'de'];

for (const lang of languages) {
  const filePath = `./prototypes/firebase-spark-pwa/public/i18n/${lang}.json`;
  const catalog = JSON.parse(readFileSync(filePath, 'utf8'));

  for (const [key, values] of Object.entries(translations)) {
    catalog[key] = values[lang];
  }

  const sorted = {};
  Object.keys(catalog).sort().forEach(k => {
    sorted[k] = catalog[k];
  });

  writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
  console.log(`Updated ${lang}.json: ${Object.keys(sorted).length} keys`);
}
