import fs from 'fs';
import path from 'path';

const extraTranslations = {
  it: {
    'dialog.deactivateCenter.title': 'Disattiva centro',
    'dialog.deactivateCenter.message': '{name} non sarà più disponibile nei collegamenti. I dati resteranno conservati per un eventuale recupero amministrativo.',
    'dialog.extendCalendar.title': 'Estendi calendario prenotazioni',
    'dialog.extendCalendar.message': 'Vuoi rendere disponibili le prenotazioni fino a 365 giorni da oggi?',
    'dialog.rotateLink.title': 'Rigenera collegamento',
    'dialog.rotateLink.message': 'Il collegamento {label} precedente e le sessioni già aperte con quel collegamento verranno revocati.',
    'dialog.transferOwnership.title': 'Trasferisci la responsabilità',
    'dialog.transferOwnership.message': 'Il nuovo responsabile sarà {email}. Dopo il trasferimento avrà il controllo completo del centro.',
    'dialog.transferOwnership.revokeMyAccess': 'Revoca il mio precedente accesso al centro',
    'dialog.revokeInvitation.title': 'Revoca invito',
    'dialog.revokeInvitation.message': 'Il collegamento non potrà più essere usato.',
    'dialog.revokeAdmin.title': 'Revoca amministratore',
    'dialog.revokeAdmin.message': '{email} perderà subito l’accesso al centro.',
    'dialog.removeAvatar.title': 'Rimuovi icona',
    'dialog.removeAvatar.message': 'L’icona del centro verrà rimossa.',
    'dialog.discardChanges.title': 'Modifiche non salvate',
    'dialog.discardChanges.message': 'Vuoi abbandonare le modifiche apportate alla persona?',
    'dialog.clearSelection.title': 'Svuota selezione',
    'dialog.clearSelection.message': 'Le prenotazioni interessate verranno rimosse.',
    'dialog.deletePerson.title': 'Elimina persona',
    'dialog.deletePerson.message': 'Verranno eliminati {name}, le prenotazioni e gli accessi personali collegati. Non sarà possibile ripristinarli.'
  },
  en: {
    'dialog.deactivateCenter.title': 'Deactivate center',
    'dialog.deactivateCenter.message': '{name} will no longer be accessible via links. Data will be preserved for administrative recovery.',
    'dialog.extendCalendar.title': 'Extend booking calendar',
    'dialog.extendCalendar.message': 'Make bookings available up to 365 days from today?',
    'dialog.rotateLink.title': 'Regenerate link',
    'dialog.rotateLink.message': 'The previous {label} link and open sessions using it will be revoked.',
    'dialog.transferOwnership.title': 'Transfer responsibility',
    'dialog.transferOwnership.message': 'The new manager will be {email}. After transfer, they will have full control.',
    'dialog.transferOwnership.revokeMyAccess': 'Revoke my previous access to the center',
    'dialog.revokeInvitation.title': 'Revoke invitation',
    'dialog.revokeInvitation.message': 'The link can no longer be used.',
    'dialog.revokeAdmin.title': 'Revoke administrator',
    'dialog.revokeAdmin.message': '{email} will immediately lose access to the center.',
    'dialog.removeAvatar.title': 'Remove icon',
    'dialog.removeAvatar.message': 'The center icon will be removed.',
    'dialog.discardChanges.title': 'Unsaved changes',
    'dialog.discardChanges.message': 'Abandon changes made to this person?',
    'dialog.clearSelection.title': 'Clear selection',
    'dialog.clearSelection.message': 'The selected bookings will be removed.',
    'dialog.deletePerson.title': 'Delete person',
    'dialog.deletePerson.message': '{name}, associated bookings, and access links will be deleted permanently.'
  },
  fr: {
    'dialog.deactivateCenter.title': 'Désactiver le centre',
    'dialog.deactivateCenter.message': '{name} ne sera plus accessible via les liens. Les données seront conservées.',
    'dialog.extendCalendar.title': 'Étendre le calendrier des réservations',
    'dialog.extendCalendar.message': 'Rendre les réservations disponibles jusqu\'à 365 jours à partir d\'aujourd\'hui ?',
    'dialog.rotateLink.title': 'Régénérer le lien',
    'dialog.rotateLink.message': 'Le lien {label} précédent et les sessions ouvertes avec celui-ci seront révoqués.',
    'dialog.transferOwnership.title': 'Transférer la responsabilité',
    'dialog.transferOwnership.message': 'Le nouveau responsable sera {email}. Après transfert, il aura le contrôle complet.',
    'dialog.transferOwnership.revokeMyAccess': 'Révoquer mon accès précédent au centre',
    'dialog.revokeInvitation.title': 'Révoquer l\'invitation',
    'dialog.revokeInvitation.message': 'Le lien ne pourra plus être utilisé.',
    'dialog.revokeAdmin.title': 'Révoquer l\'administrateur',
    'dialog.revokeAdmin.message': '{email} perdra immédiatement l\'accès au centre.',
    'dialog.removeAvatar.title': 'Supprimer l\'icône',
    'dialog.removeAvatar.message': 'L\'icône du centre sera supprimée.',
    'dialog.discardChanges.title': 'Modifications non enregistrées',
    'dialog.discardChanges.message': 'Abandonner les modifications apportées à cette personne ?',
    'dialog.clearSelection.title': 'Vider la sélection',
    'dialog.clearSelection.message': 'Les réservations sélectionnées seront supprimées.',
    'dialog.deletePerson.title': 'Supprimer la personne',
    'dialog.deletePerson.message': '{name}, les réservations et les accès associés seront définitivement supprimés.'
  },
  es: {
    'dialog.deactivateCenter.title': 'Desactivar centro',
    'dialog.deactivateCenter.message': '{name} ya no estará disponible mediante enlaces. Los datos se conservarán.',
    'dialog.extendCalendar.title': 'Extender calendario de reservas',
    'dialog.extendCalendar.message': '¿Habilitar reservas hasta 365 días a partir de hoy?',
    'dialog.rotateLink.title': 'Regenerar enlace',
    'dialog.rotateLink.message': 'El enlace {label} anterior y las sesiones abiertas se revocarán.',
    'dialog.transferOwnership.title': 'Transferir la responsabilidad',
    'dialog.transferOwnership.message': 'El nuevo responsable será {email}. Tras el traspaso tendrá control total.',
    'dialog.transferOwnership.revokeMyAccess': 'Revocar mi acceso anterior al centro',
    'dialog.revokeInvitation.title': 'Revocar invitación',
    'dialog.revokeInvitation.message': 'El enlace ya no se podrá utilizar.',
    'dialog.revokeAdmin.title': 'Revocar administrador',
    'dialog.revokeAdmin.message': '{email} perderá de inmediato el acceso al centro.',
    'dialog.removeAvatar.title': 'Eliminar icono',
    'dialog.removeAvatar.message': 'Se eliminará el icono del centro.',
    'dialog.discardChanges.title': 'Cambios no guardados',
    'dialog.discardChanges.message': '¿Deseas descartar los cambios realizados a esta persona?',
    'dialog.clearSelection.title': 'Vaciar selección',
    'dialog.clearSelection.message': 'Se eliminarán las reservas seleccionadas.',
    'dialog.deletePerson.title': 'Eliminar persona',
    'dialog.deletePerson.message': 'Se eliminarán definitivamente {name}, las reservas y los accesos vinculados.'
  },
  de: {
    'dialog.deactivateCenter.title': 'Zentrum deaktivieren',
    'dialog.deactivateCenter.message': '{name} ist nicht mehr über Links erreichbar. Die Daten bleiben erhalten.',
    'dialog.extendCalendar.title': 'Buchungskalender erweitern',
    'dialog.extendCalendar.message': 'Buchungen bis zu 365 Tage ab heute verfügbar machen?',
    'dialog.rotateLink.title': 'Link neu erstellen',
    'dialog.rotateLink.message': 'Der bisherige Link {label} und damit geöffnete Sitzungen werden widerrufen.',
    'dialog.transferOwnership.title': 'Verantwortung übertragen',
    'dialog.transferOwnership.message': 'Der neue Leiter wird {email}. Nach der Übertragung hat er die volle Kontrolle.',
    'dialog.transferOwnership.revokeMyAccess': 'Meinen bisherigen Zugang zum Zentrum widerrufen',
    'dialog.revokeInvitation.title': 'Einladung widerrufen',
    'dialog.revokeInvitation.message': 'Der Link kann nicht mehr verwendet werden.',
    'dialog.revokeAdmin.title': 'Administrator widerrufen',
    'dialog.revokeAdmin.message': '{email} verliert sofort den Zugang zum Zentrum.',
    'dialog.removeAvatar.title': 'Symbol entfernen',
    'dialog.removeAvatar.message': 'Das Zentrumssymbol wird entfernt.',
    'dialog.discardChanges.title': 'Ungespeicherte Änderungen',
    'dialog.discardChanges.message': 'Änderungen an dieser Person verwerfen?',
    'dialog.clearSelection.title': 'Auswahl leeren',
    'dialog.clearSelection.message': 'Die ausgewählten Buchungen werden entfernt.',
    'dialog.deletePerson.title': 'Person löschen',
    'dialog.deletePerson.message': '{name}, zugehörige Buchungen und Zugangslinks werden dauerhaft gelöscht.'
  }
};

for (const dir of ['public/i18n', 'public/LOCALE']) {
  for (const [lang, translations] of Object.entries(extraTranslations)) {
    const filePath = path.join(dir, `${lang}.json`);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      Object.assign(data, translations);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    }
  }
}

console.log('Dialog translation keys applied to all catalogs.');
