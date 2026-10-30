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

export const SUPPORTED_LOCALES = ['it', 'en', 'fr', 'es', 'de', 'ca'];
export const DEFAULT_LOCALE = 'it';
const CATALOG_CACHE_KEY = 'sorgenti';

export const KEY_ALIASES = Object.freeze({
  'common.action.exit': 'common.actions.exit',
  'common.action.save': 'common.actions.save',
  'common.action.cancel': 'common.actions.cancel',
  'common.action.delete': 'common.actions.delete',
  'common.action.confirm': 'common.actions.confirm',
  'common.action.close': 'common.actions.close',
});

export const CORE_FALLBACKS = Object.freeze({
  ca: Object.freeze({
    "common.status.loading": "S’està carregant…",
    "calendar.loadFailed": "No s’ha pogut carregar el calendari. Torna-ho a provar.",
    "calendar.retry": "Torna-ho a provar",
    "admin.invitations.invalidId": "Invitació no vàlida. Obre un enllaç d’invitació vàlid.",
    "status.monthUpdated": "Mes actualitzat",
    "bookingFor.title": "Reservar per a altres persones",
    "bookingFor.person": "Resident o hoste",
    "bookingFor.personAria": "Persona per a qui reservar",
    "bookingFor.open": "Obre les reserves de la persona seleccionada",
    "bookingFor.dialogAria": "Reserves per a una altra persona",
    "bookingFor.heading": "Estàs reservant per a {name}",
    "bookingFor.exit": "Surt de {name} i torna a la teva vista",
    "bookingFor.loading": "S’estan carregant les reserves…",
    "bookingFor.updated": "Reserves actualitzades",
    "bookingFor.present": "Present",
    "bookingFor.absent": "Absent",
    "bookingFor.notSaved": "No s’ha desat la reserva",
    "week.operations.referenceDay": "Data de referència",
    "week.operations.chooseDate": "Tria una altra data",
    "week.operations.datePair": "{first} i {second}",
    "week.operations.note.forTomorrow": "Per demà",
    "week.operations.note.forDate": "Per al {date}",
    "admin.access.title": "Administrador",
    "admin.activity.title": "Manteniment",
    "admin.adaptations.appDisplayName.help": "Nom que es mostra a la primera línia de la pantalla inicial.",
    "admin.adaptations.appDisplayName.label": "Nom de presentació",
    "admin.adaptations.appDisplaySubtitle.help": "Frase que es mostra sota el nom a la pantalla inicial.",
    "admin.adaptations.appDisplaySubtitle.label": "Segona línia",
    "admin.adaptations.title": "Aspecte",
    "resident.preferences.defaultViewAria": "Vista inicial en aquest dispositiu",
    "resident.preferences.defaultViewHelp": "La vista inicial predeterminada en aquest dispositiu.",
    "resident.preferences.description": "Personalitza l’aplicació en aquest dispositiu.",
    "resident.preferences.intro": "Aquestes preferències es desen en aquest dispositiu.",
    "resident.preferences.layoutsHelp": "Tria l’aspecte de cada funció per separat.",
    "resident.preferences.save": "Desa les preferències",
    "resident.preferences.title": "Preferències en aquest dispositiu",
    "admin.administrator.help": "El nom, la sigla i el correu electrònic són obligatoris.",
    "admin.administrator.signature.help": "Codi personal per accedir com a resident.",
    "admin.centerSettings.save": "Desa la configuració",
    "admin.commonPassword.help": "Deixa-ho buit per mantenir la contrasenya actual. ",
    "admin.sharedPassword.newLabel": "Contrasenya dels administradors adjunts",
    "admin.sharedPassword.configurationHelp": "Dona als adjunts accés a les funcions operatives autoritzades; no dona accés al control complet.",
    "admin.configuration.identity.title": "Identitat del centre",
    "admin.configuration.password.label": "Contrasenya dels residents",
    "admin.configuration.schedule.title": "Horaris de les reserves",
    "admin.configuration.title": "Configuració",
    "admin.overview.links": "Enllaços operatius",
    "admin.overview.title": "Visió general",
    "admin.people.title": "Persones",
    "app.action.book": "Reserva",
    "app.header.controlPanel": "Tauler de control",
    "app.header.bookings": "Reserves",
    "app.header.pasti": "Àpats",
    "app.header.verifyingAuth": "S’està verificant l’autorització…",
    "app.title.compact": "Reserva",
    "auth.signingOut": "S’està tancant la sessió…",
    "auth.resident.calendarUnavailable": "No es poden obrir les reserves. Torna-ho a provar d’aquí a un moment.",
    "auth.resident.title": "Accés dels residents",
    "common.action.exit": "Surt",
    "common.actions.cancel": "Cancel·la",
    "common.actions.close": "Tanca",
    "common.actions.confirm": "Confirma",
    "common.actions.copy": "Copia",
    "common.actions.delete": "Elimina",
    "common.actions.exit": "Surt",
    "common.actions.refresh": "Actualitza",
    "common.actions.save": "Desa",
    "common.actions.share": "Comparteix",
    "diet.legend.codeLabel": "Número de dieta",
    "diet.legend.help": "Tria una etiqueta o escriu-ne una de nova d’una o dues paraules. Només es mostrarà a la cuina.",
    "diet.legend.labelLabel": "Etiqueta de cuina",
    "diet.legend.labelPlaceholder": "Etiqueta de cuina",
    "diet.legend.validation": "Utilitza una o dues paraules, amb un màxim de 32 caràcters.",
    "kitchen.dietLegend.title": "Recordatori de dietes",
    "errors.conflict": "Les dades han canviat. Actualitza-les i repeteix el canvi.",
    "errors.generic": "S’ha produït un error inesperat. Torna-ho a provar.",
    "errors.offline": "La xarxa no està disponible. Les dades ja carregades continuen visibles.",
    "errors.permission": "El teu rol no permet aquesta operació.",
    "errors.timeout": "La resposta està trigant massa. Comprova la connexió i torna-ho a provar.",
    "kitchen.notes.none": "No hi ha notes per a aquesta data",
    "kitchen.notes": "Notes per a la cuina",
    "kitchen.notes.title": "Notes per a la cuina",
    "admin.sharedPassword.label": "Contrasenya dels administradors adjunts",
    "summary.breakfastNotPlanned": "No previst",
    "summary.breakfastPlanned": "Previst",
    "summary.breakfastTomorrow": "Esmorzar (de demà)",
    "summary.callPerson": "Truca a {name}",
    "summary.contactPerson": "Contacta amb {name}",
    "summary.contactHint": "Toca un comensal per contactar-hi",
    "summary.cover.one": "cobert",
    "summary.cover.other": "coberts",
    "summary.dayAfterTomorrow": "Demà passat",
    "summary.diningMeals": "Àpats al menjador",
    "summary.followingDay": "Dia següent",
    "summary.guests": "Convidats",
    "summary.includedDiets": "Dietes incloses",
    "summary.item": "Concepte",
    "summary.mass": "Missa",
    "summary.messagePerson": "Escriu a {name} per WhatsApp",
    "summary.names": "Comensals",
    "summary.no": "No",
    "summary.noDiet": "Sense dieta",
    "summary.noMeal": "No hi ha cap àpat disponible.",
    "summary.noName": "Sense nom",
    "summary.notSet": "No establert",
    "summary.screensLabel": "Resum en dues pantalles",
    "summary.sickDiets": "Dietes dels malalts",
    "summary.sickMeals": "Àpats per als malalts",
    "summary.swipeHint": "Llisca horitzontalment per passar d’avui a demà.",
    "summary.today": "Avui",
    "summary.tomorrow": "Demà",
    "summary.tray.one": "safata",
    "summary.tray.other": "safates",
    "summary.view.loading": "S’està carregant el resum…",
    "summary.view.noData": "No hi ha dades disponibles",
    "summary.view.title": "Resum",
    "summary.yes": "Sí"
}),
  it: Object.freeze({
    "common.status.loading": "Caricamento…",
    "calendar.loadFailed": "Non è stato possibile caricare il calendario. Riprova.",
    "calendar.retry": "Riprova",
    "admin.invitations.invalidId": "Invito non valido. Apri un collegamento di invito valido.",
    "status.monthUpdated": "Mese aggiornato",
    "bookingFor.title": "Prenoto per altri",
    "bookingFor.person": "Residente o ospite",
    "bookingFor.personAria": "Persona per cui prenotare",
    "bookingFor.open": "Apri prenotazioni della persona selezionata",
    "bookingFor.dialogAria": "Prenotazioni per un’altra persona",
    "bookingFor.heading": "Stai prenotando per {name}",
    "bookingFor.exit": "Abbandona {name} e rientra nella tua vista",
    "bookingFor.loading": "Caricamento prenotazioni…",
    "bookingFor.updated": "Prenotazioni aggiornate",
    "bookingFor.present": "Presente",
    "bookingFor.absent": "Assente",
    "bookingFor.notSaved": "Prenotazione non salvata",
    "week.operations.referenceDay": "Data di riferimento",
    "week.operations.chooseDate": "Scegli un’altra data",
    "week.operations.datePair": "{first} e {second}",
    "week.operations.note.forTomorrow": "Per domani",
    "week.operations.note.forDate": "Per {date}",
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
    'summary.breakfastTomorrow': 'Colazione (di domani)',
    'summary.callPerson': 'Chiama {name}',
    'summary.contactPerson': 'Contatta {name}',
    'summary.contactHint': 'Tocca un commensale per contattarlo',
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
    'kitchen.dietLegend.title': 'Promemoria diete',
    'diet.legend.codeLabel': 'Numero dieta',
    'diet.legend.labelLabel': 'Etichetta cucina',
    'diet.legend.labelPlaceholder': 'Etichetta cucina',
    'diet.legend.help': 'Scegli un’etichetta o scrivine una nuova di una o due parole. Apparirà soltanto in cucina.',
    'diet.legend.validation': 'Usa una o due parole, per un massimo di 32 caratteri.',
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
    'resident.preferences.defaultViewAria': 'Vista di apertura su questo dispositivo',
    'resident.preferences.defaultViewHelp': 'La vista di apertura predefinita su questo dispositivo.',
    'resident.preferences.description': "Personalizza l'app su questo dispositivo.",
    'resident.preferences.intro': 'Queste preferenze restano su questo dispositivo.',
    'resident.preferences.layoutsHelp': "Scegli separatamente l'aspetto delle diverse funzioni.",
    'resident.preferences.save': 'Salva preferenze',
    'resident.preferences.title': 'Preferenze su questo dispositivo',
    'admin.sharedPassword.label': 'Password vice amministratori',
    'admin.sharedPassword.newLabel': 'Password vice amministratori',
    'admin.sharedPassword.configurationHelp': 'Concede ai vice le funzioni operative autorizzate; non dà accesso al controllo completo.',
    'admin.overview.links': 'Link per accedere'
  }),
  en: Object.freeze({
    "common.status.loading": "Loading…",
    "calendar.loadFailed": "The calendar could not be loaded. Please try again.",
    "calendar.retry": "Try again",
    "admin.invitations.invalidId": "Invalid invitation. Open a valid invitation link.",
    "status.monthUpdated": "Month updated",
    "bookingFor.title": "Book for others",
    "bookingFor.person": "Resident or guest",
    "bookingFor.personAria": "Person to book for",
    "bookingFor.open": "Open reservations for the selected person",
    "bookingFor.dialogAria": "Reservations for another person",
    "bookingFor.heading": "You are booking for {name}",
    "bookingFor.exit": "Leave {name} and return to your view",
    "bookingFor.loading": "Loading reservations…",
    "bookingFor.updated": "Reservations updated",
    "bookingFor.present": "Present",
    "bookingFor.absent": "Absent",
    "bookingFor.notSaved": "Reservation not saved",
    "week.operations.referenceDay": "Reference date",
    "week.operations.chooseDate": "Choose another date",
    "week.operations.datePair": "{first} and {second}",
    "week.operations.note.forTomorrow": "For tomorrow",
    "week.operations.note.forDate": "For {date}",
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
    'resident.preferences.defaultViewAria': 'Opening view on this device',
    'resident.preferences.defaultViewHelp': 'The default opening view on this device.',
    'resident.preferences.description': 'Customize the app on this device.',
    'resident.preferences.intro': 'These preferences remain on this device.',
    'resident.preferences.layoutsHelp': 'Choose the appearance of each function separately.',
    'resident.preferences.save': 'Save preferences',
    'resident.preferences.title': 'Preferences on this device',
    'admin.sharedPassword.label': 'Vice-administrator password',
    'admin.sharedPassword.newLabel': 'Vice-administrator password',
    'admin.sharedPassword.configurationHelp': 'Grants vice administrators the authorized operational functions; it does not provide full control.',
    'admin.overview.links': 'Access links'
  }),
  fr: Object.freeze({
    "common.status.loading": "Chargement…",
    "calendar.loadFailed": "Le calendrier n’a pas pu être chargé. Réessayez.",
    "calendar.retry": "Réessayer",
    "admin.invitations.invalidId": "Invitation non valide. Ouvrez un lien d’invitation valide.",
    "status.monthUpdated": "Mois mis à jour",
    "bookingFor.title": "Réserver pour d’autres",
    "bookingFor.person": "Résident ou invité",
    "bookingFor.personAria": "Personne pour qui réserver",
    "bookingFor.open": "Ouvrir les réservations de la personne sélectionnée",
    "bookingFor.dialogAria": "Réservations pour une autre personne",
    "bookingFor.heading": "Vous réservez pour {name}",
    "bookingFor.exit": "Quitter {name} et revenir à votre vue",
    "bookingFor.loading": "Chargement des réservations…",
    "bookingFor.updated": "Réservations actualisées",
    "bookingFor.present": "Présent",
    "bookingFor.absent": "Absent",
    "bookingFor.notSaved": "Réservation non enregistrée",
    "week.operations.referenceDay": "Date de référence",
    "week.operations.chooseDate": "Choisir une autre date",
    "week.operations.datePair": "{first} et {second}",
    "week.operations.note.forTomorrow": "Pour demain",
    "week.operations.note.forDate": "Pour {date}",
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
    'resident.preferences.defaultViewAria': "Vue d'ouverture sur cet appareil",
    'resident.preferences.defaultViewHelp': "La vue d'ouverture par défaut sur cet appareil.",
    'resident.preferences.description': "Personnalisez l'application sur cet appareil.",
    'resident.preferences.intro': 'Ces préférences restent sur cet appareil.',
    'resident.preferences.layoutsHelp': "Choisissez séparément l'apparence des différentes fonctions.",
    'resident.preferences.save': 'Enregistrer les préférences',
    'resident.preferences.title': 'Préférences sur cet appareil',
    'admin.sharedPassword.label': 'Mot de passe des vice-administrateurs',
    'admin.sharedPassword.newLabel': 'Mot de passe des vice-administrateurs',
    'admin.sharedPassword.configurationHelp': 'Accorde aux vice-administrateurs les fonctions opérationnelles autorisées sans donner un contrôle complet.',
    'admin.overview.links': 'Liens d\'accès'
  }),
  es: Object.freeze({
    "common.status.loading": "Cargando…",
    "calendar.loadFailed": "No se ha podido cargar el calendario. Vuelve a intentarlo.",
    "calendar.retry": "Reintentar",
    "admin.invitations.invalidId": "Invitación no válida. Abre un enlace de invitación válido.",
    "status.monthUpdated": "Mes actualizado",
    "bookingFor.title": "Reservar para otras personas",
    "bookingFor.person": "Residente o invitado",
    "bookingFor.personAria": "Persona para quien reservar",
    "bookingFor.open": "Abrir las reservas de la persona seleccionada",
    "bookingFor.dialogAria": "Reservas para otra persona",
    "bookingFor.heading": "Estás reservando para {name}",
    "bookingFor.exit": "Salir de {name} y volver a tu vista",
    "bookingFor.loading": "Cargando reservas…",
    "bookingFor.updated": "Reservas actualizadas",
    "bookingFor.present": "Presente",
    "bookingFor.absent": "Ausente",
    "bookingFor.notSaved": "Reserva no guardada",
    "week.operations.referenceDay": "Fecha de referencia",
    "week.operations.chooseDate": "Elige otra fecha",
    "week.operations.datePair": "{first} y {second}",
    "week.operations.note.forTomorrow": "Para mañana",
    "week.operations.note.forDate": "Para el {date}",
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
    'resident.preferences.defaultViewAria': 'Vista de apertura en este dispositivo',
    'resident.preferences.defaultViewHelp': 'La vista de apertura predeterminada en este dispositivo.',
    'resident.preferences.description': 'Personaliza la aplicación en este dispositivo.',
    'resident.preferences.intro': 'Estas preferencias permanecen en este dispositivo.',
    'resident.preferences.layoutsHelp': 'Elige por separado el aspecto de las distintas funciones.',
    'resident.preferences.save': 'Guardar preferencias',
    'resident.preferences.title': 'Preferencias en este dispositivo',
    'admin.sharedPassword.label': 'Contraseña de viceadministradores',
    'admin.sharedPassword.newLabel': 'Contraseña de viceadministradores',
    'admin.sharedPassword.configurationHelp': 'Concede a los viceadministradores las funciones operativas autorizadas sin dar control completo.',
    'admin.overview.links': 'Enlaces de acceso'
  }),
  de: Object.freeze({
    "common.status.loading": "Wird geladen…",
    "calendar.loadFailed": "Der Kalender konnte nicht geladen werden. Bitte versuche es erneut.",
    "calendar.retry": "Erneut versuchen",
    "admin.invitations.invalidId": "Ungültige Einladung. Öffne einen gültigen Einladungslink.",
    "status.monthUpdated": "Monat aktualisiert",
    "bookingFor.title": "Für andere buchen",
    "bookingFor.person": "Bewohner oder Gast",
    "bookingFor.personAria": "Person, für die gebucht wird",
    "bookingFor.open": "Buchungen der ausgewählten Person öffnen",
    "bookingFor.dialogAria": "Buchungen für eine andere Person",
    "bookingFor.heading": "Sie buchen für {name}",
    "bookingFor.exit": "{name} verlassen und zur eigenen Ansicht zurückkehren",
    "bookingFor.loading": "Buchungen werden geladen…",
    "bookingFor.updated": "Buchungen aktualisiert",
    "bookingFor.present": "Anwesend",
    "bookingFor.absent": "Abwesend",
    "bookingFor.notSaved": "Buchung nicht gespeichert",
    "week.operations.referenceDay": "Bezugsdatum",
    "week.operations.chooseDate": "Anderes Datum wählen",
    "week.operations.datePair": "{first} und {second}",
    "week.operations.note.forTomorrow": "Für morgen",
    "week.operations.note.forDate": "Für {date}",
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
    'resident.preferences.defaultViewAria': 'Startansicht auf diesem Gerät',
    'resident.preferences.defaultViewHelp': 'Die Standard-Startansicht auf diesem Gerät.',
    'resident.preferences.description': 'Passen Sie die App auf diesem Gerät an.',
    'resident.preferences.intro': 'Diese Einstellungen bleiben auf diesem Gerät.',
    'resident.preferences.layoutsHelp': 'Wählen Sie das Erscheinungsbild der verschiedenen Funktionen jeweils separat.',
    'resident.preferences.save': 'Einstellungen speichern',
    'resident.preferences.title': 'Einstellungen auf diesem Gerät',
    'admin.sharedPassword.label': 'Passwort für stellvertretende Administratoren',
    'admin.sharedPassword.newLabel': 'Passwort für stellvertretende Administratoren',
    'admin.sharedPassword.configurationHelp': 'Gewährt stellvertretenden Administratoren die erlaubten operativen Funktionen, jedoch keine vollständige Kontrolle.',
    'admin.overview.links': 'Zugangslinks'
  })
});

let currentLocale = DEFAULT_LOCALE;
let catalogs = new Map();
const catalogLoads = new Map();
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
    // Persistenza non disponibile, ad esempio in un iframe con restrizioni o in navigazione privata.
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
  if (catalogs.has(locale)) return catalogs.get(locale);
  if (catalogLoads.has(locale)) return catalogLoads.get(locale);
  let request;
  request = loadCatalogUncached(locale).finally(() => {
    if (catalogLoads.get(locale) === request) catalogLoads.delete(locale);
  });
  catalogLoads.set(locale, request);
  return request;
}

async function loadCatalogUncached(locale) {
  // Il catalogo italiano di riserva e quello della lingua selezionata si caricano in parallelo perché sono indipendenti.
  const fallbackPromise = locale !== DEFAULT_LOCALE && !catalogs.has(DEFAULT_LOCALE)
    ? loadCatalog(DEFAULT_LOCALE)
    : Promise.resolve();

  if (catalogs.has(locale)) {
    await fallbackPromise;
    return catalogs.get(locale);
  }

  try {
    // Il modulo compilato risiede in /assets; i cataloghi mantengono il proprio percorso pubblico stabile.
    const catalogUrl = typeof window !== 'undefined'
      ? new URL(`/i18n/${locale}.json`, window.location.href)
      : new URL(`./${locale}.json`, import.meta.url);
    const catalogFetchUrl = new URL(catalogUrl.href);
    catalogFetchUrl.searchParams.set('v', CATALOG_CACHE_KEY);
    let catalog = null;

    if (typeof fetch === 'function') {
      try {
        const response = await fetch(catalogFetchUrl.href, { cache: 'no-cache' });
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

    await fallbackPromise;
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
  // Le forme plurali possono esistere senza una chiave base nel catalogo.
  if (variables.count !== undefined) {
    const pluralKey = `${alias}.${getPluralRule(currentLocale, variables.count)}`;
    const otherKey = `${alias}.other`;
    const pluralMessage = catalog[pluralKey] ?? catalog[otherKey]
      ?? CORE_FALLBACKS[currentLocale]?.[pluralKey] ?? CORE_FALLBACKS[currentLocale]?.[otherKey]
      ?? defaultCatalog[pluralKey] ?? defaultCatalog[otherKey]
      ?? CORE_FALLBACKS[DEFAULT_LOCALE]?.[pluralKey] ?? CORE_FALLBACKS[DEFAULT_LOCALE]?.[otherKey];
    if (pluralMessage !== undefined) return interpolate(pluralMessage, variables);
  }
  
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
            label = element.ownerDocument.createElement('span');
            label.className = 'btn-label';
            for (const child of [...element.childNodes]) {
              if (child.nodeType === 3) child.remove();
            }
            label.textContent = translated;
            element.appendChild(label);
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
