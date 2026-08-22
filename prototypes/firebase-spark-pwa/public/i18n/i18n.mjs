/**
 * Modulo i18n - Internazionalizzazione per Prenotazione pasti
 * 
 * Funzionalità:
 * - Traduzioni con fallback a cascata (locale → italiano → chiave mancante)
 * - Interpolazione variabili: t('greeting.name', { name: 'Mario' })
 * - Pluralizzazione Intl.PluralRules: t('meal.count', { count: 3 })
 * - Formattazione date, numeri, liste con Intl
 * - Persistenza preferenze utente (localStorage protetto)
 * - Aggiornamento dinamico DOM con data-i18n
 */

export const SUPPORTED_LOCALES = ['it', 'en', 'fr', 'es', 'de'];
export const DEFAULT_LOCALE = 'it';
const CATALOG_RELEASE = '20260822a';

export const KEY_ALIASES = Object.freeze({
  'common.action.exit': 'common.actions.exit',
  'common.action.save': 'common.actions.save',
  'common.action.cancel': 'common.actions.cancel',
  'common.action.delete': 'common.actions.delete',
  'common.action.confirm': 'common.actions.confirm',
  'common.action.close': 'common.actions.close',
});

export const CORE_FALLBACKS = Object.freeze({
  it: Object.freeze({
    'app.title.compact': 'Prenotarsi',
    'app.header.controlPanel': 'Pannello di controllo',
    'app.header.verifyingAuth': 'Accesso al pannello in corso…',
    'auth.signingOut': 'Uscita in corso…',
    'auth.resident.calendarUnavailable': 'Non riesco ad aprire le prenotazioni. Riprova tra un momento.',
    'common.actions.exit': 'Esci',
    'common.action.exit': 'Esci',
    'common.actions.save': 'Salva',
    'common.actions.cancel': 'Annulla',
    'common.actions.delete': 'Elimina',
    'common.actions.confirm': 'Conferma',
    'common.actions.close': 'Chiudi',
    'common.actions.copy': 'Copia',
    'common.actions.share': 'Condividi',
    'common.actions.refresh': 'Aggiorna',
    'errors.generic': 'Operazione non riuscita.',
    'errors.permission': 'Questa operazione non è autorizzata per il tuo ruolo.',
    'errors.conflict': 'I dati sono cambiati nel frattempo. Aggiorna e riprova.',
    'errors.timeout': 'L’operazione sta impiegando troppo tempo. Riprova.',
    'errors.offline': 'La rete non è disponibile. I dati già caricati restano visibili.',
    'app.action.book': 'Prenota',
    'app.header.bookings': 'Prenotazioni',
    'app.header.pasti': 'Pasti',
    'summary.breakfastNotPlanned': 'Non prevista',
    'summary.breakfastPlanned': 'Prevista',
    'summary.callPerson': 'Chiama {name}',
    'summary.contactPerson': 'Contatta {name}',
    'summary.cover.one': 'coperto',
    'summary.cover.other': 'coperti',
    'summary.dayAfterTomorrow': 'Dopodomani',
    'summary.diningMeals': 'Pasti in sala',
    'summary.followingDay': 'Giorno successivo',
    'summary.guests': 'Invitati',
    'summary.includedDiets': 'Incluse diete',
    'summary.item': 'Voce',
    'summary.mass': 'Messa',
    'summary.messagePerson': 'Scrivi a {name} su WhatsApp',
    'summary.names': 'Commensali',
    'summary.no': 'No',
    'summary.noDiet': 'Nessuna dieta',
    'summary.noMeal': 'Nessun pasto disponibile.',
    'summary.noName': 'Nessun nome',
    'summary.notSet': 'Non impostato',
    'summary.screensLabel': 'Riepilogo su due schermate',
    'summary.sickDiets': 'Diete ammalati',
    'summary.sickMeals': 'Pasti per ammalati',
    'summary.swipeHint': 'Scorri orizzontalmente per passare da oggi a domani.',
    'summary.today': 'Oggi',
    'summary.tomorrow': 'Domani',
    'summary.tray.one': 'vassoio',
    'summary.tray.other': 'vassoi',
    'summary.view.loading': 'Caricamento riepilogo…',
    'summary.view.noData': 'Nessun dato disponibile',
    'summary.view.title': 'Riepilogo',
    'summary.yes': 'Sì',
    'kitchen.notes.none': 'Nessuna nota per questa data',
    'kitchen.notes': 'Note per la cucina',
    'kitchen.notes.title': 'Note per la cucina',
    'auth.resident.title': 'Accesso residenti',
    'admin.overview.title': 'Area amministrazione',
    'admin.adaptations.title': 'Aspetto',
    'admin.adaptations.appDisplayName.label': 'Nome di presentazione',
    'admin.adaptations.appDisplayName.help': 'Nome mostrato come prima riga nella schermata iniziale.',
    'admin.adaptations.appDisplaySubtitle.label': 'Seconda riga',
    'admin.adaptations.appDisplaySubtitle.help': 'Frase mostrata sotto il nome nella schermata iniziale.',
    'admin.access.title': 'Amministratore',
    'admin.activity.title': 'Manutenzione',
    'admin.people.title': 'Persone',
    'admin.administrator.help': 'Nome, sigla ed email sono obbligatori.',
    'admin.administrator.signature.help': 'Codice personale usato per accedere come residente.',
    'admin.centerSettings.save': 'Salva configurazione',
    'admin.commonPassword.help': 'Lascia vuoto per non modificare la password attuale. ',
    'admin.configuration.identity.title': 'Identità centro',
    'admin.configuration.password.label': 'Password residenti',
    'admin.configuration.schedule.title': 'Orari delle prenotazioni',
    'admin.configuration.title': 'Configurazione',
    'admin.sharedPassword.label': 'Password vice amministratori',
    'admin.sharedPassword.newLabel': 'Password vice amministratori',
    'admin.sharedPassword.configurationHelp': 'Concede ai vice le funzioni operative autorizzate; non dà accesso al controllo completo.',
    'admin.overview.links': 'Link per accedere'
  }),
  en: Object.freeze({
    'app.title.compact': 'Book meals',
    'app.header.controlPanel': 'Control panel',
    'app.header.verifyingAuth': 'Opening the control panel…',
    'auth.signingOut': 'Signing out…',
    'auth.resident.calendarUnavailable': 'Reservations could not be opened. Please try again in a moment.',
    'common.actions.exit': 'Log out',
    'common.action.exit': 'Log out',
    'common.actions.save': 'Save',
    'common.actions.cancel': 'Cancel',
    'common.actions.delete': 'Delete',
    'common.actions.confirm': 'Confirm',
    'common.actions.close': 'Close',
    'common.actions.copy': 'Copy',
    'common.actions.share': 'Share',
    'common.actions.refresh': 'Refresh',
    'errors.generic': 'The operation could not be completed.',
    'errors.permission': 'This operation is not authorized for your role.',
    'errors.conflict': 'The data changed in the meantime. Refresh and try again.',
    'errors.timeout': 'The operation is taking too long. Try again.',
    'errors.offline': 'Network unavailable. Loaded data remains visible.',
    'app.action.book': 'Book',
    'app.header.bookings': 'Bookings',
    'app.header.pasti': 'Meals',
    'auth.resident.title': 'Resident access',
    'admin.overview.title': 'Administration area',
    'admin.adaptations.title': 'Appearance',
    'admin.adaptations.appDisplayName.label': 'Display name',
    'admin.adaptations.appDisplayName.help': 'Name shown as the first line on the startup screen.',
    'admin.adaptations.appDisplaySubtitle.label': 'Second line',
    'admin.adaptations.appDisplaySubtitle.help': 'Phrase shown below the name on the startup screen.',
    'admin.access.title': 'Administrator',
    'admin.activity.title': 'Maintenance',
    'admin.people.title': 'People',
    'admin.administrator.help': 'Name, code and email are required.',
    'admin.administrator.signature.help': 'Personal code used to sign in as a resident.',
    'admin.centerSettings.save': 'Save settings',
    'admin.commonPassword.help': 'Leave blank to keep the current password. ',
    'admin.configuration.identity.title': 'Center identity',
    'admin.configuration.password.label': 'Resident password',
    'admin.configuration.schedule.title': 'Reservation times',
    'admin.configuration.title': 'Configuration',
    'admin.sharedPassword.label': 'Vice-administrator password',
    'admin.sharedPassword.newLabel': 'Vice-administrator password',
    'admin.sharedPassword.configurationHelp': 'Grants vice administrators the authorized operational functions; it does not provide full control.',
    'admin.overview.links': 'Access links'
  }),
  fr: Object.freeze({
    'app.title.compact': 'Réserver',
    'app.header.controlPanel': 'Panneau de contrôle',
    'app.header.verifyingAuth': 'Ouverture du panneau de contrôle…',
    'auth.signingOut': 'Déconnexion en cours…',
    'auth.resident.calendarUnavailable': 'Impossible d’ouvrir les réservations. Réessayez dans un instant.',
    'common.actions.exit': 'Se déconnecter',
    'common.action.exit': 'Se déconnecter',
    'common.actions.save': 'Enregistrer',
    'common.actions.cancel': 'Annuler',
    'common.actions.delete': 'Supprimer',
    'common.actions.confirm': 'Confirmer',
    'common.actions.close': 'Fermer',
    'common.actions.copy': 'Copier',
    'common.actions.share': 'Partager',
    'common.actions.refresh': 'Actualiser',
    'errors.generic': 'L’opération n’a pas pu être terminée.',
    'errors.permission': 'Cette opération n’est pas autorisée pour votre rôle.',
    'errors.conflict': 'Les données ont changé. Actualisez puis réessayez.',
    'errors.timeout': 'L’opération prend trop de temps. Réessayez.',
    'errors.offline': 'Le réseau est indisponible. Les données chargées restent visibles.',
    'app.action.book': 'Réserver',
    'app.header.bookings': 'Réservations',
    'app.header.pasti': 'Repas',
    'auth.resident.title': 'Accès résidents',
    'admin.overview.title': 'Espace administration',
    'admin.adaptations.title': 'Apparence',
    'admin.adaptations.appDisplayName.label': 'Nom de présentation',
    'admin.adaptations.appDisplayName.help': 'Nom affiché sur la première ligne de l’écran de démarrage.',
    'admin.adaptations.appDisplaySubtitle.label': 'Deuxième ligne',
    'admin.adaptations.appDisplaySubtitle.help': 'Phrase affichée sous le nom sur l’écran de démarrage.',
    'admin.access.title': 'Administrateur',
    'admin.activity.title': 'Maintenance',
    'admin.people.title': 'Personnes',
    'admin.administrator.help': 'Le nom, le sigle et l’adresse e-mail sont obligatoires.',
    'admin.administrator.signature.help': 'Code personnel utilisé pour se connecter comme résident.',
    'admin.centerSettings.save': 'Enregistrer les paramètres',
    'admin.commonPassword.help': 'Laissez vide pour conserver le mot de passe actuel. ',
    'admin.configuration.identity.title': 'Identité du centre',
    'admin.configuration.password.label': 'Mot de passe des résidents',
    'admin.configuration.schedule.title': 'Horaires des réservations',
    'admin.configuration.title': 'Configuration',
    'admin.sharedPassword.label': 'Mot de passe des vice-administrateurs',
    'admin.sharedPassword.newLabel': 'Mot de passe des vice-administrateurs',
    'admin.sharedPassword.configurationHelp': 'Accorde aux vice-administrateurs les fonctions opérationnelles autorisées sans donner un contrôle complet.',
    'admin.overview.links': 'Liens d\'accès'
  }),
  es: Object.freeze({
    'app.title.compact': 'Reservar',
    'app.header.controlPanel': 'Panel de control',
    'app.header.verifyingAuth': 'Abriendo el panel de control…',
    'auth.signingOut': 'Cerrando sesión…',
    'auth.resident.calendarUnavailable': 'No se pueden abrir las reservas. Inténtalo de nuevo en un momento.',
    'common.actions.exit': 'Cerrar sesión',
    'common.action.exit': 'Cerrar sesión',
    'common.actions.save': 'Guardar',
    'common.actions.cancel': 'Cancelar',
    'common.actions.delete': 'Eliminar',
    'common.actions.confirm': 'Confirmar',
    'common.actions.close': 'Cerrar',
    'common.actions.copy': 'Copiar',
    'common.actions.share': 'Compartir',
    'common.actions.refresh': 'Actualizar',
    'errors.generic': 'No se pudo completar la operación.',
    'errors.permission': 'Esta operación no está autorizada para tu rol.',
    'errors.conflict': 'Los datos han cambiado. Actualiza e inténtalo de nuevo.',
    'errors.timeout': 'La operación está tardando demasiado. Inténtalo de nuevo.',
    'errors.offline': 'La red no está disponible. Los datos ya cargados permanecen visibles.',
    'app.action.book': 'Reservar',
    'app.header.bookings': 'Reservas',
    'app.header.pasti': 'Comidas',
    'auth.resident.title': 'Acceso residentes',
    'admin.overview.title': 'Área de administración',
    'admin.adaptations.title': 'Apariencia',
    'admin.adaptations.appDisplayName.label': 'Nombre de presentación',
    'admin.adaptations.appDisplayName.help': 'Nombre mostrado en la primera línea de la pantalla inicial.',
    'admin.adaptations.appDisplaySubtitle.label': 'Segunda línea',
    'admin.adaptations.appDisplaySubtitle.help': 'Frase mostrada debajo del nombre en la pantalla inicial.',
    'admin.access.title': 'Administrador',
    'admin.activity.title': 'Mantenimiento',
    'admin.people.title': 'Personas',
    'admin.administrator.help': 'El nombre, el código y el correo electrónico son obligatorios.',
    'admin.administrator.signature.help': 'Código personal usado para acceder como residente.',
    'admin.centerSettings.save': 'Guardar configuración',
    'admin.commonPassword.help': 'Déjalo vacío para conservar la contraseña actual. ',
    'admin.configuration.identity.title': 'Identidad del centro',
    'admin.configuration.password.label': 'Contraseña de residentes',
    'admin.configuration.schedule.title': 'Horarios de reserva',
    'admin.configuration.title': 'Configuración',
    'admin.sharedPassword.label': 'Contraseña de viceadministradores',
    'admin.sharedPassword.newLabel': 'Contraseña de viceadministradores',
    'admin.sharedPassword.configurationHelp': 'Concede a los viceadministradores las funciones operativas autorizadas sin dar control completo.',
    'admin.overview.links': 'Enlaces de acceso'
  }),
  de: Object.freeze({
    'app.title.compact': 'Buchen',
    'app.header.controlPanel': 'Systemsteuerung',
    'app.header.verifyingAuth': 'Bedienfeld wird geöffnet…',
    'auth.signingOut': 'Abmeldung läuft…',
    'auth.resident.calendarUnavailable': 'Die Reservierungen konnten nicht geöffnet werden. Bitte versuche es gleich noch einmal.',
    'common.actions.exit': 'Abmelden',
    'common.action.exit': 'Abmelden',
    'common.actions.save': 'Speichern',
    'common.actions.cancel': 'Abbrechen',
    'common.actions.delete': 'Löschen',
    'common.actions.confirm': 'Bestätigen',
    'common.actions.close': 'Schliessen',
    'common.actions.copy': 'Kopieren',
    'common.actions.share': 'Teilen',
    'common.actions.refresh': 'Aktualisieren',
    'errors.generic': 'Der Vorgang konnte nicht abgeschlossen werden.',
    'errors.permission': 'Diese Aktion ist für Ihre Rolle nicht autorisiert.',
    'errors.conflict': 'Die Daten wurden geändert. Aktualisieren Sie und versuchen Sie es erneut.',
    'errors.timeout': 'Der Vorgang dauert zu lange. Versuchen Sie es erneut.',
    'errors.offline': 'Das Netzwerk ist nicht verfügbar. Geladene Daten bleiben sichtbar.',
    'app.action.book': 'Buchen',
    'app.header.bookings': 'Buchungen',
    'app.header.pasti': 'Mahlzeiten',
    'auth.resident.title': 'Bewohner-Zugang',
    'admin.overview.title': 'Verwaltungsbereich',
    'admin.adaptations.title': 'Erscheinungsbild',
    'admin.adaptations.appDisplayName.label': 'Anzeigename',
    'admin.adaptations.appDisplayName.help': 'Name in der ersten Zeile des Startbildschirms.',
    'admin.adaptations.appDisplaySubtitle.label': 'Zweite Zeile',
    'admin.adaptations.appDisplaySubtitle.help': 'Text unter dem Namen auf dem Startbildschirm.',
    'admin.access.title': 'Administrator',
    'admin.activity.title': 'Wartung',
    'admin.people.title': 'Personen',
    'admin.administrator.help': 'Name, Kürzel und E-Mail-Adresse sind erforderlich.',
    'admin.administrator.signature.help': 'Persönliches Kürzel für die Anmeldung als Bewohner.',
    'admin.centerSettings.save': 'Einstellungen speichern',
    'admin.commonPassword.help': 'Leer lassen, um das aktuelle Passwort beizubehalten. ',
    'admin.configuration.identity.title': 'Identität des Zentrums',
    'admin.configuration.password.label': 'Bewohner-Passwort',
    'admin.configuration.schedule.title': 'Reservierungszeiten',
    'admin.configuration.title': 'Konfiguration',
    'admin.sharedPassword.label': 'Passwort für stellvertretende Administratoren',
    'admin.sharedPassword.newLabel': 'Passwort für stellvertretende Administratoren',
    'admin.sharedPassword.configurationHelp': 'Gewährt stellvertretenden Administratoren die erlaubten operativen Funktionen, jedoch keine vollständige Kontrolle.',
    'admin.overview.links': 'Zugangslinks'
  })
});

let currentLocale = DEFAULT_LOCALE;
let catalogs = new Map();
let isDevelopment = false;

/**
 * Lettura protetta di localStorage
 */
export function readStoredLocale() {
  try {
    return localStorage.getItem('tavolaComune.locale');
  } catch {
    return null;
  }
}

/**
 * Scrittura protetta in localStorage
 */
export function saveStoredLocale(locale) {
  try {
    localStorage.setItem('tavolaComune.locale', locale);
  } catch {
    // Storage non disponibile (es. iframe restrittivo, privacy mode)
  }
}

/**
 * Inizializza il modulo i18n (chiamato esplicitamente dal bootstrap dell'app)
 * @param {Object} options - Opzioni di configurazione
 * @param {boolean} options.development - Modalità sviluppo (mostra chiavi mancanti)
 * @param {string|null} options.centerLocale - Lingua predefinita del centro se presente
 */
export async function initI18n({ development = false, centerLocale = null } = {}) {
  isDevelopment = development;
  const userLocale = readStoredLocale();
  const hasUserChoice = Boolean(userLocale && SUPPORTED_LOCALES.includes(userLocale));
  const locale = resolveLocale(centerLocale);
  await setLocale(locale, { persist: hasUserChoice });
  applyTranslations(document);
  return locale;
}

/**
 * Risolve la lingua con la seguente precedenza controllata:
 * 1. Preferenza utente esplicita (localStorage)
 * 2. Lingua predefinita del centro (centerLocale)
 * 3. Lingua browser (navigator.languages)
 * 4. Italiano (DEFAULT_LOCALE)
 */
export function resolveLocale(centerLocale = null) {
  const userLocale = readStoredLocale();
  if (userLocale && SUPPORTED_LOCALES.includes(userLocale)) {
    return userLocale;
  }

  if (centerLocale && SUPPORTED_LOCALES.includes(centerLocale)) {
    return centerLocale;
  }

  if (typeof navigator !== 'undefined' && navigator.languages) {
    for (const lang of navigator.languages) {
      const shortLang = lang.split('-')[0].toLowerCase();
      if (SUPPORTED_LOCALES.includes(shortLang)) {
        return shortLang;
      }
    }
  }

  return DEFAULT_LOCALE;
}

/**
 * Carica un catalogo traduzioni per una specifica lingua.
 * Garantisce che il catalogo italiano sia SEMPRE in cache per il fallback.
 * @param {string} locale - Codice lingua (es. 'en', 'fr')
 * @returns {Promise<Object>} Catalogo traduzioni
 */
async function loadCatalog(locale) {
  // Garantisci prima il caricamento del catalogo italiano per il fallback
  if (locale !== DEFAULT_LOCALE && !catalogs.has(DEFAULT_LOCALE)) {
    await loadCatalog(DEFAULT_LOCALE);
  }

  if (catalogs.has(locale)) {
    return catalogs.get(locale);
  }

  try {
    const catalogUrl = new URL(`./${locale}.json`, import.meta.url);
    const catalogFetchUrl = new URL(catalogUrl.href);
    catalogFetchUrl.searchParams.set('v', CATALOG_RELEASE);
    let catalog = null;

    if (typeof fetch === 'function') {
      try {
        const response = await fetch(catalogFetchUrl.href);
        if (response && response.ok) {
          catalog = await response.json();
        }
      } catch {
        // Fallback per ambienti node senza supporto file:// in fetch
      }
    }

    if (!catalog && typeof process !== 'undefined' && process.versions?.node) {
      const fs = await import('fs');
      const { fileURLToPath } = await import('url');
      const filePath = fileURLToPath(catalogUrl);
      if (fs.existsSync(filePath)) {
        catalog = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
    }

    if (!catalog) {
      throw new Error(`Catalogo non trovato: ${locale}`);
    }

    catalogs.set(locale, catalog);
    return catalog;
  } catch (error) {
    console.warn(`Errore caricamento catalogo ${locale}:`, error.message);
    if (locale !== DEFAULT_LOCALE) {
      return loadCatalog(DEFAULT_LOCALE);
    }
    return {};
  }
}

/**
 * Imposta la lingua corrente e carica il catalogo
 * @param {string} locale - Codice lingua
 * @param {Object|boolean} [options={ persist: true }] - Opzioni
 */
export async function setLocale(locale, options = {}) {
  const { persist = true } = typeof options === 'boolean' ? { persist: options } : options;

  if (!SUPPORTED_LOCALES.includes(locale)) {
    console.warn(`Lingua non supportata: ${locale}. Fallback a ${DEFAULT_LOCALE}`);
    locale = DEFAULT_LOCALE;
  }

  await loadCatalog(locale);

  if (!catalogs.has(locale) && locale !== DEFAULT_LOCALE) {
    currentLocale = DEFAULT_LOCALE;
  } else {
    currentLocale = locale;
  }

  if (typeof document !== 'undefined') {
    document.documentElement.lang = currentLocale;
    document.documentElement.dir = getDirection(currentLocale);

    try {
      const isKitchen = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('view') === 'kitchen';
      const titleKey = isKitchen ? 'app.title.kitchen' : 'app.title';
      const translatedTitle = t(titleKey);
      if (translatedTitle && translatedTitle !== titleKey) {
        document.title = translatedTitle;
      }
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        const descKey = 'app.meta.description';
        const translatedDesc = t(descKey);
        if (translatedDesc && translatedDesc !== descKey) {
          metaDescription.setAttribute('content', translatedDesc);
        }
      }
    } catch {
      // Ignora errori di parsing URL o document in ambienti ridotti
    }
  }

  if (persist) {
    saveStoredLocale(currentLocale);
  }
  applyTranslations(document);
  return currentLocale;
}

/**
 * Ottiene la lingua corrente
 * @returns {string} Codice lingua
 */
export function getLocale() {
  return currentLocale;
}

function getFallbackCatalog(locale) {
  if (catalogs.has(locale)) return catalogs.get(locale);
  if (typeof process !== 'undefined' && process.versions?.node) {
    try {
      const fs = globalThis.process?.getBuiltinModule?.('fs');
      const url = globalThis.process?.getBuiltinModule?.('url');
      if (fs && url) {
        const filePath = url.fileURLToPath(new URL(`./${locale}.json`, import.meta.url));
        if (fs.existsSync(filePath)) {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          catalogs.set(locale, data);
          return data;
        }
      }
    } catch {}
  }
  return {};
}

/**
 * Traduce una chiave con interpolazione e pluralizzazione
 * @param {string} key - Chiave di traduzione
 * @param {Object} variables - Variabili per interpolazione
 * @param {Object} options - Opzioni aggiuntive
 * @returns {string} Testo tradotto
 */
export function t(key, variables = {}, options = {}) {
  if (!key) return '';
  const alias = KEY_ALIASES[key] || key;
  const catalog = catalogs.get(currentLocale) || getFallbackCatalog(currentLocale);
  const defaultCatalog = catalogs.get(DEFAULT_LOCALE) || getFallbackCatalog(DEFAULT_LOCALE);
  
  let message = catalog[key] ?? catalog[alias];
  
  if (message === undefined) {
    message = defaultCatalog[key] ?? defaultCatalog[alias];
    if (message === undefined) {
      const core = CORE_FALLBACKS[currentLocale]?.[key]
        ?? CORE_FALLBACKS[currentLocale]?.[alias]
        ?? CORE_FALLBACKS[DEFAULT_LOCALE]?.[key]
        ?? CORE_FALLBACKS[DEFAULT_LOCALE]?.[alias];
      if (core !== undefined) {
        message = core;
      } else if (options.fallback !== undefined) {
        message = options.fallback;
      } else {
        return isDevelopment ? `⟦missing:${key}⟧` : key;
      }
    }
  }

  if (variables.count !== undefined) {
    const pluralRule = getPluralRule(currentLocale, variables.count);
    const pluralKey = `${key}.${pluralRule}`;
    const pluralMessage = catalog[pluralKey] || defaultCatalog[pluralKey];
    if (pluralMessage) {
      message = pluralMessage;
    }
  }

  return interpolate(message, variables);
}

/**
 * Interpolazione variabili in un messaggio
 * @param {string} message - Messaggio con placeholder {name}
 * @param {Object} variables - Variabili da sostituire
 * @returns {string} Messaggio interpolato
 */
function interpolate(message, variables) {
  if (!variables || typeof message !== 'string') {
    return message;
  }

  return message.replace(/\{(\w+)\}/g, (match, key) => {
    return variables.hasOwnProperty(key) ? variables[key] : match;
  });
}

/**
 * Ottiene la regola di pluralizzazione per una lingua e un numero
 * @param {string} locale - Codice lingua
 * @param {number} count - Numero per determinare il plurale
 * @returns {string} Regola di pluralizzazione ('one', 'other', ecc.)
 */
function getPluralRule(locale, count) {
  try {
    const pluralRules = new Intl.PluralRules(locale);
    return pluralRules.select(count);
  } catch {
    return count === 1 ? 'one' : 'other';
  }
}

/**
 * Ottiene la direzione del testo per una lingua
 * @param {string} locale - Codice lingua
 * @returns {string} 'ltr' o 'rtl'
 */
function getDirection(locale) {
  const rtlLocales = ['ar', 'he', 'fa', 'ur'];
  return rtlLocales.includes(locale) ? 'rtl' : 'ltr';
}

/**
 * Applica le traduzioni a tutti gli elementi con data-i18n
 * @param {Element} root - Elemento radice da cui iniziare
 */
export function applyTranslations(root = document) {
  if (!root) return;

  root.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.getAttribute('data-i18n');
    if (key) {
      const translated = t(key);
      // Non sovrascrivere mai con la chiave tecnica se non trovata
      if (translated && translated !== key && !translated.startsWith('⟦missing:')) {
        const textTarget = element.querySelector?.('[data-i18n-text]') || element;
        if (textTarget !== element) {
          textTarget.textContent = translated;
        } else if (element.querySelector?.('svg')) {
          let label = element.querySelector?.('.btn-label');
          if (label) {
            label.textContent = translated;
          } else {
            element.textContent = translated;
          }
        } else {
          element.textContent = translated;
        }
      }
    }
  });

  root.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    const key = element.getAttribute('data-i18n-aria-label');
    if (key) {
      const translated = t(key);
      if (translated && translated !== key && !translated.startsWith('⟦missing:')) {
        element.setAttribute('aria-label', translated);
      }
    }
  });

  root.querySelectorAll('[data-i18n-title]').forEach((element) => {
    const key = element.getAttribute('data-i18n-title');
    if (key) {
      const translated = t(key);
      if (translated && translated !== key && !translated.startsWith('⟦missing:')) {
        element.setAttribute('title', translated);
      }
    }
  });

  root.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    const key = element.getAttribute('data-i18n-placeholder');
    if (key) {
      const translated = t(key);
      if (translated && translated !== key && !translated.startsWith('⟦missing:')) {
        element.setAttribute('placeholder', translated);
      }
    }
  });
}

/**
 * Formatta una data secondo la lingua corrente
 * @param {Date|string|number} value - Data da formattare
 * @param {Object} options - Opzioni Intl.DateTimeFormat
 * @returns {string} Data formattata
 */
export function formatDate(value, options = {}) {
  const date = typeof value === 'string' || typeof value === 'number' 
    ? new Date(value) 
    : value;
  
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  const mergedOptions = { ...defaultOptions, ...options };
  
  try {
    return new Intl.DateTimeFormat(currentLocale, mergedOptions).format(date);
  } catch {
    return date.toLocaleDateString(currentLocale);
  }
}

/**
 * Formatta un numero secondo la lingua corrente
 * @param {number} value - Numero da formattare
 * @param {Object} options - Opzioni Intl.NumberFormat
 * @returns {string} Numero formattato
 */
export function formatNumber(value, options = {}) {
  if (typeof value !== 'number' || isNaN(value)) {
    return String(value);
  }

  const defaultOptions = {};
  const mergedOptions = { ...defaultOptions, ...options };
  
  try {
    return new Intl.NumberFormat(currentLocale, mergedOptions).format(value);
  } catch {
    return String(value);
  }
}

/**
 * Formatta una lista di valori secondo la lingua corrente
 * @param {Array<string>} values - Lista di valori
 * @param {Object} options - Opzioni Intl.ListFormat
 * @returns {string} Lista formattata
 */
export function formatList(values, options = {}) {
  if (!Array.isArray(values)) {
    return String(values);
  }

  const defaultOptions = {
    type: 'conjunction',
    style: 'long',
  };

  const mergedOptions = { ...defaultOptions, ...options };
  
  try {
    return new Intl.ListFormat(currentLocale, mergedOptions).format(values);
  } catch {
    return values.join(', ');
  }
}

/**
 * Formatta un orario secondo la lingua corrente
 * @param {Date|string|number} value - Orario da formattare
 * @param {Object} options - Opzioni Intl.DateTimeFormat
 * @returns {string} Orario formattato
 */
export function formatTime(value, options = {}) {
  const date = typeof value === 'string' || typeof value === 'number' 
    ? new Date(value) 
    : value;
  
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  const defaultOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };

  const mergedOptions = { ...defaultOptions, ...options };
  
  try {
    return new Intl.DateTimeFormat(currentLocale, mergedOptions).format(date);
  } catch {
    return date.toLocaleTimeString(currentLocale);
  }
}

/**
 * Localizza un valore enum (es. codice dieta, ruolo)
 * @param {string} namespace - Namespace dell'enum (es. 'diet.option', 'role')
 * @param {string} value - Valore da localizzare
 * @returns {string} Etichetta localizzata
 */
export function localizeEnum(namespace, value) {
  const key = `${namespace}.${value}`;
  return t(key) || value;
}

/**
 * Pulisce la cache dei cataloghi
 */
export function clearCatalogCache() {
  catalogs.clear();
}

/**
 * Verifica che tutti i cataloghi abbiano le stesse chiavi del catalogo italiano
 * @returns {Object} Report di validazione
 */
export function validateCatalogs() {
  const italianCatalog = catalogs.get(DEFAULT_LOCALE) || {};
  const italianKeys = new Set(Object.keys(italianCatalog).filter(k => !k.startsWith('_meta.')));
  
  const report = {
    valid: true,
    missingKeys: {},
    extraKeys: {},
  };

  for (const locale of SUPPORTED_LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    
    const catalog = catalogs.get(locale) || {};
    const catalogKeys = new Set(Object.keys(catalog).filter(k => !k.startsWith('_meta.')));
    
    const missing = [];
    for (const key of italianKeys) {
      if (!catalogKeys.has(key)) {
        missing.push(key);
      }
    }
    
    const extra = [];
    for (const key of catalogKeys) {
      if (!italianKeys.has(key)) {
        extra.push(key);
      }
    }
    
    if (missing.length > 0 || extra.length > 0) {
      report.valid = false;
      report.missingKeys[locale] = missing;
      report.extraKeys[locale] = extra;
    }
  }

  return report;
}
