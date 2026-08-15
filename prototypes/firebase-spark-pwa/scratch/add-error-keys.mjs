import fs from 'fs';
import path from 'path';

const missingErrorKeys = {
  it: {
    'errors.permission': 'Questa operazione non è autorizzata per il tuo ruolo.',
    'errors.conflict': 'I dati sono cambiati nel frattempo. Aggiorna e ripeti la modifica.',
    'errors.timeout': 'La risposta sta impiegando troppo tempo. Controlla la connessione e riprova.',
    'errors.offline': 'La rete non è disponibile. I dati già caricati restano visibili.',
    'errors.auth.emailInUse': 'Questa email ha già un account: usa Accedi con email.',
    'errors.auth.emailNotVerified': 'Conferma prima il tuo indirizzo email usando il messaggio ricevuto.',
    'errors.auth.tooManyRequests': 'Troppi tentativi ravvicinati. Attendi qualche minuto e riprova.',
    'errors.auth.userDisabled': 'Questo accesso è stato disabilitato.',
    'errors.auth.weakPassword': 'La password deve contenere almeno 6 caratteri.'
  },
  en: {
    'errors.permission': 'This operation is not authorized for your role.',
    'errors.conflict': 'Data changed in the meantime. Refresh and retry the modification.',
    'errors.timeout': 'Response is taking too long. Check your connection and try again.',
    'errors.offline': 'Network unavailable. Loaded data remains visible.',
    'errors.auth.emailInUse': 'This email already has an account: use Sign in with email.',
    'errors.auth.emailNotVerified': 'Please verify your email first using the confirmation message.',
    'errors.auth.tooManyRequests': 'Too many recent attempts. Please wait a few minutes and try again.',
    'errors.auth.userDisabled': 'This account has been disabled.',
    'errors.auth.weakPassword': 'Password must be at least 6 characters.'
  },
  fr: {
    'errors.permission': 'Cette opération n\'est pas autorisée pour votre rôle.',
    'errors.conflict': 'Les données ont changé entre-temps. Actualisez et réessayez la modification.',
    'errors.timeout': 'La réponse prend trop de temps. Vérifiez votre connexion et réessayez.',
    'errors.offline': 'Le réseau est indisponible. Les données chargées restent visibles.',
    'errors.auth.emailInUse': 'Cet e-mail a déjà un compte : utilisez Connexion par e-mail.',
    'errors.auth.emailNotVerified': 'Veuillez d\'abord confirmer votre e-mail avec le message reçu.',
    'errors.auth.tooManyRequests': 'Trop de tentatives rapprochées. Veuillez patienter quelques minutes.',
    'errors.auth.userDisabled': 'Cet accès a été désactivé.',
    'errors.auth.weakPassword': 'Le mot de passe doit comporter au moins 6 caractères.'
  },
  es: {
    'errors.permission': 'Esta operación no está autorizada para tu rol.',
    'errors.conflict': 'Los datos han cambiado mientras tanto. Actualiza y repite la modificación.',
    'errors.timeout': 'La respuesta está tardando demasiado. Comprueba tu conexión e inténtalo de nuevo.',
    'errors.offline': 'La red no está disponible. Los datos ya cargados permanecen visibles.',
    'errors.auth.emailInUse': 'Este correo ya tiene una cuenta: usa Iniciar sesión con correo.',
    'errors.auth.emailNotVerified': 'Confirma primero tu dirección de correo usando el mensaje recibido.',
    'errors.auth.tooManyRequests': 'Demasiados intentos seguidos. Espera unos minutos e inténtalo de nuevo.',
    'errors.auth.userDisabled': 'Este acceso ha sido deshabilitado.',
    'errors.auth.weakPassword': 'La contraseña debe contener al menos 6 caracteres.'
  },
  de: {
    'errors.permission': 'Diese Aktion ist für Ihre Rolle nicht autorisiert.',
    'errors.conflict': 'Die Daten wurden zwischenzeitlich geändert. Aktualisieren und wiederholen.',
    'errors.timeout': 'Die Antwort dauert zu lange. Verbindung prüfen und erneut versuchen.',
    'errors.offline': 'Das Netzwerk ist nicht verfügbar. Geladene Daten bleiben sichtbar.',
    'errors.auth.emailInUse': 'Diese E-Mail hat bereits ein Konto: Bitte mit E-Mail anmelden.',
    'errors.auth.emailNotVerified': 'Bitte bestätigen Sie zuerst Ihre E-Mail über die empfangene Nachricht.',
    'errors.auth.tooManyRequests': 'Zu viele Versuche in kurzer Zeit. Bitte warten Sie einige Minuten.',
    'errors.auth.userDisabled': 'Dieser Zugang wurde deaktiviert.',
    'errors.auth.weakPassword': 'Das Passwort muss mindestens 6 Zeichen lang sein.'
  }
};

for (const dir of ['public/i18n', 'public/LOCALE']) {
  for (const [lang, keys] of Object.entries(missingErrorKeys)) {
    const file = path.join(dir, `${lang}.json`);
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      Object.assign(data, keys);
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    }
  }
}

console.log('Error keys added to catalogs!');
