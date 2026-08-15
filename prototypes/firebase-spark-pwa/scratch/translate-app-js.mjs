import fs from 'fs';

let content = fs.readFileSync('public/app.js', 'utf8');

const replacements = [
  // Network offline messages
  {
    from: "elements.offlineBanner.textContent = 'Connessione assente. I dati inseriti restano nella schermata; potrai salvarli quando torni online.';",
    to: "elements.offlineBanner.textContent = t('network.offline.guardedAction');"
  },
  {
    from: "elements.offlineBanner.textContent = formattedTime\n      ? `Offline · modifiche sospese. Restano visibili i dati aggiornati alle ${formattedTime}.`\n      : 'Offline · modifiche sospese. Restano visibili gli ultimi dati disponibili.';",
    to: "elements.offlineBanner.textContent = formattedTime\n      ? t('network.offline.bannerWithTime', { time: formattedTime })\n      : t('network.offline.banner');"
  },
  // Auth statuses
  {
    from: "elements.authStatus.textContent = 'Accesso in verifica';",
    to: "elements.authStatus.textContent = t('app.header.checkingAccess');"
  },
  {
    from: "elements.authStatus.textContent = 'Accesso amministratore';",
    to: "elements.authStatus.textContent = t('role.admin');"
  },
  {
    from: "elements.authStatus.textContent = 'Verifico autorizzazione...';",
    to: "elements.authStatus.textContent = t('app.header.verifyingAuth');"
  },
  {
    from: "elements.authStatus.textContent = r ? t.email || 'Proprietario della piattaforma' : m ? t.email || 'Amministratore autenticato' : f ? 'Invito in attesa della tua risposta' : s.needsInitialization ? 'Inizializza il tuo centro' : s.invitationError ? 'Invito non valido o scaduto' : d === 'REJECTED' ? 'Invito rifiutato' : 'Account non autorizzato';",
    to: "elements.authStatus.textContent = r ? t.email || t('role.platformOwner') : m ? t.email || t('role.authenticatedAdmin') : f ? t('app.header.invitationPending') : s.needsInitialization ? t('app.header.initYourCenter') : s.invitationError ? t('app.header.invitationInvalid') : d === 'REJECTED' ? t('app.header.invitationRejected') : t('app.header.unauthorizedAccount');"
  },
  {
    from: "const roleLabels = { OWNER: 'Responsabile del centro', ADMIN: 'Amministratore', RESIDENT: 'Residente' };",
    to: "const roleLabels = { OWNER: t('role.owner'), ADMIN: t('role.admin'), RESIDENT: t('role.resident') };"
  },
  {
    from: "elements.authUid.textContent = currentRoleLabel ? 'Ruolo: ' + currentRoleLabel : '';",
    to: "elements.authUid.textContent = currentRoleLabel ? t('role.verified', { role: currentRoleLabel }) : '';"
  },
  // Invitation response text
  {
    from: "elements.adminInviteAcceptText.textContent = d === 'REJECTED' ? 'Hai rifiutato questo invito. Il responsabile vedrà la tua risposta.' : f ? 'Sei stato invitato come amministratore del centro. Vuoi accettare questo incarico?' : 'Questo invito non è più valido o è scaduto.';",
    to: "elements.adminInviteAcceptText.textContent = d === 'REJECTED' ? t('admin.invitations.rejectedNotice') : f ? t('admin.invitations.acceptPrompt') : t('admin.invitations.invalidOrExpired');"
  },
  // Title center
  {
    from: "elements.titleCenter.textContent = isAdminView ? 'Pannello di controllo' : centerName;",
    to: "elements.titleCenter.textContent = isAdminView ? t('app.header.controlPanel') : centerName;"
  },
  // Kitchen day title
  {
    from: "elements.kitchenDayTitle.textContent = state.kitchenDayOffset === 1 ? 'Domani' : 'Oggi';",
    to: "elements.kitchenDayTitle.textContent = state.kitchenDayOffset === 1 ? t('time.tomorrow') : t('time.today');"
  },
  // Admin participant select placeholder
  {
    from: "elements.adminParticipantSelect.innerHTML = '<option value=\"\">Scegli una persona</option>'",
    to: "elements.adminParticipantSelect.innerHTML = `<option value=\"\">${escapeHtml(t('admin.people.selectPerson'))}</option>`"
  },
  // Admin person status
  {
    from: "elements.adminStatus.textContent = nextActive ? 'Persona riattivata' : 'Persona sospesa';",
    to: "elements.adminStatus.textContent = nextActive ? t('admin.people.saved') : t('admin.people.saved');"
  },
  {
    from: "elements.adminGuestStatus.textContent = 'Inserisci un numero da 1 a 999';",
    to: "elements.adminGuestStatus.textContent = t('admin.people.guestInvalidNumber');"
  },
  {
    from: "elements.adminGuestStatus.textContent = `${existing.displayName} è già presente`;",
    to: "elements.adminGuestStatus.textContent = t('admin.people.guestExists', { name: existing.displayName });"
  },
  {
    from: "elements.adminGuestStatus.textContent = 'Aggiungo...';",
    to: "elements.adminGuestStatus.textContent = t('admin.people.guestAdding');"
  },
  {
    from: "elements.adminGuestStatus.textContent = `Ospite ${guestNumber} aggiunto`;",
    to: "elements.adminGuestStatus.textContent = t('admin.people.guestAdded', { number: guestNumber });"
  },
  {
    from: "elements.adminStatus.textContent = 'Nuova persona';",
    to: "elements.adminStatus.textContent = t('admin.people.newPerson');"
  },
  {
    from: "elements.adminStatus.textContent = 'Modifiche non salvate';",
    to: "elements.adminStatus.textContent = t('admin.people.unsavedChanges');"
  },
  {
    from: "elements.adminStatus.textContent = 'Modifiche annullate';",
    to: "elements.adminStatus.textContent = t('admin.people.changesCancelled');"
  },
  {
    from: "elements.adminStatus.textContent = 'Salvo...';",
    to: "elements.adminStatus.textContent = t('status.saving');"
  },
  {
    from: "elements.adminStatus.textContent = 'Persona salvata';",
    to: "elements.adminStatus.textContent = t('admin.people.saved');"
  },
  {
    from: "elements.adminStatus.textContent = 'Elimino la persona...';",
    to: "elements.adminStatus.textContent = t('admin.people.deleting');"
  },
  {
    from: "elements.adminStatus.textContent = `${participant.displayName} eliminato`;",
    to: "elements.adminStatus.textContent = t('admin.people.deleted', { name: participant.displayName });"
  },
  {
    from: "elements.adminStatus.textContent = 'Eliminazione annullata';",
    to: "elements.adminStatus.textContent = t('admin.people.deleteCancelled');"
  },
  {
    from: "elements.adminStatus.textContent = 'Solo il responsabile o un amministratore può eliminare definitivamente una persona';",
    to: "elements.adminStatus.textContent = t('admin.people.onlyOwnerCanDelete');"
  },
  {
    from: "elements.adminStatus.textContent = 'Solo l amministratore può eliminare un vice amministratore';",
    to: "elements.adminStatus.textContent = t('admin.people.onlyAdminCanDeleteVice');"
  },
  // Week operations
  {
    from: "elements.weekOperationsStatus.textContent = 'Aggiorno...';",
    to: "elements.weekOperationsStatus.textContent = t('week.operations.status.updating');"
  },
  {
    from: "elements.weekOperationsStatus.textContent = 'Pronto';",
    to: "elements.weekOperationsStatus.textContent = t('week.operations.status.ready');"
  },
  {
    from: "elements.weekHealthStatus.textContent = 'Salvo...';",
    to: "elements.weekHealthStatus.textContent = t('week.operations.health.saving');"
  },
  {
    from: "elements.weekHealthStatus.textContent = sickPeople.length > 0 ? 'Elenco ammalati salvato' : 'Nessun ammalato';",
    to: "elements.weekHealthStatus.textContent = sickPeople.length > 0 ? t('week.operations.health.saved') : t('week.operations.health.empty');"
  },
  {
    from: "elements.weekHealthStatus.textContent = sickCount > 0\n    ? `${sickCount} ammalato/i`\n    : 'Nessun ammalato';",
    to: "elements.weekHealthStatus.textContent = sickCount > 0\n    ? t('week.operations.health.count', { count: sickCount })\n    : t('week.operations.health.empty');"
  },
  {
    from: "elements.weekDietStatus.textContent = 'Salvo...';",
    to: "elements.weekDietStatus.textContent = t('week.operations.diet.saving');"
  },
  {
    from: "elements.weekDietStatus.textContent = dietTag === 'STANDARD'\n      ? 'Dieta standard ripristinata'\n      : 'Dieta salvata';",
    to: "elements.weekDietStatus.textContent = dietTag === 'STANDARD'\n      ? t('week.operations.diet.standardRestored')\n      : t('week.operations.diet.saved');"
  },
  {
    from: "elements.weekDietStatus.textContent = 'Rimuovo...';",
    to: "elements.weekDietStatus.textContent = t('week.operations.diet.removing');"
  },
  {
    from: "elements.weekDietStatus.textContent = 'Dieta occasionale rimossa';",
    to: "elements.weekDietStatus.textContent = t('week.operations.diet.removed');"
  },
  {
    from: "elements.weekDietStatus.textContent = assignments.length > 0\n    ? `${assignments.length} diete attive`\n    : 'Nessuna dieta';",
    to: "elements.weekDietStatus.textContent = assignments.length > 0\n    ? t('week.operations.diet.count', { count: assignments.length })\n    : t('week.operations.diet.empty');"
  },
  {
    from: "elements.weekKitchenNoteStatus.textContent = 'Salvo...';",
    to: "elements.weekKitchenNoteStatus.textContent = t('week.operations.note.saving');"
  },
  {
    from: "elements.weekKitchenNoteStatus.textContent = state.weekOperationalNote?.text ? 'Nota presente' : 'Nessuna nota';",
    to: "elements.weekKitchenNoteStatus.textContent = state.weekOperationalNote?.text ? t('week.operations.note.present') : t('week.operations.note.empty');"
  },
  {
    from: "elements.weekKitchenNoteStatus.textContent = elements.weekKitchenNoteInput.value.trim()\n      ? 'Nota salvata'\n      : 'Nota rimossa';",
    to: "elements.weekKitchenNoteStatus.textContent = elements.weekKitchenNoteInput.value.trim()\n      ? t('week.operations.note.saved')\n      : t('week.operations.note.removed');"
  },
  // Export
  {
    from: "elements.adminStatus.textContent = 'Preparo esportazione...';",
    to: "elements.adminStatus.textContent = t('admin.export.preparing');"
  },
  {
    from: "elements.adminStatus.textContent = 'Esportazione pronta: ' + backup.totalDocuments + ' documenti';",
    to: "elements.adminStatus.textContent = t('admin.export.ready', { count: backup.totalDocuments });"
  },
  // Avatar
  {
    from: "elements.adminCenterAvatarStatus.textContent = 'L\\'icona sarà attiva dopo aver inserito la password comune e salvato il centro.';",
    to: "elements.adminCenterAvatarStatus.textContent = t('admin.avatar.needsCommonPassword');"
  },
  {
    from: "elements.adminCenterAvatarStatus.textContent = 'Salvo l\\'icona...';",
    to: "elements.adminCenterAvatarStatus.textContent = t('admin.avatar.saving');"
  },
  {
    from: "elements.adminCenterAvatarStatus.textContent = 'Icona del centro salvata.';",
    to: "elements.adminCenterAvatarStatus.textContent = t('admin.avatar.saved');"
  },
  {
    from: "elements.adminCenterAvatarStatus.textContent = 'Rimuovo l\\'icona...';",
    to: "elements.adminCenterAvatarStatus.textContent = t('admin.avatar.removing');"
  },
  {
    from: "elements.adminCenterAvatarStatus.textContent = 'Icona rimossa.';",
    to: "elements.adminCenterAvatarStatus.textContent = t('admin.avatar.removed');"
  },
  // Empty states
  {
    from: "elements.participantMeals.innerHTML = '<p class=\"empty-state\">Nessun partecipante disponibile.</p>';",
    to: "elements.participantMeals.innerHTML = `<p class=\"empty-state\">${escapeHtml(t('admin.people.noParticipants'))}</p>`;"
  },
  // Dialogs
  {
    from: "title: 'Elimina persona',",
    to: "title: t('dialog.deletePerson.title'),"
  },
  {
    from: "message: `Vuoi eliminare definitivamente ${participant.displayName} dal centro? Verranno rimossi tutti i dati anagrafici e i pasti futuri.`,",
    to: "message: t('dialog.deletePerson.message', { name: participant.displayName }),"
  },
  {
    from: "title: 'Rimuovi icona del centro',",
    to: "title: t('dialog.removeAvatar.title'),"
  },
  {
    from: "message: 'L\\'icona personalizzata verrà rimossa e il centro tornerà all\\'icona predefinita.',",
    to: "message: t('dialog.removeAvatar.message'),"
  },
  {
    from: "title: 'Trasferisci responsabilità del centro',",
    to: "title: t('dialog.transferOwnership.title'),"
  },
  {
    from: "message: `Stai per nominare ${successor.displayName} responsabile del centro. Manterrai il ruolo di amministratore, ma non potrai più modificare questa nomina.`,",
    to: "message: t('dialog.transferOwnership.message', { name: successor.displayName }),"
  },
  {
    from: "requiredText: 'TRASFERISCI',",
    to: "requiredText: t('dialog.transferOwnership.requiredText'),"
  },
  {
    from: "title: 'Messe del mese',",
    to: "title: t('dialog.changeMassMonth.title'),"
  },
  {
    from: "message: nextStatus ? 'Vuoi impostare la Messa come celebrata per tutti i giorni del mese visualizzato?' : 'Vuoi impostare la Messa come NON celebrata per tutti i giorni del mese visualizzato?',",
    to: "message: t('dialog.changeMassMonth.message'),"
  },
  // Calendar status
  {
    from: "elements.calendarStatus.textContent = selectedWeekId === currentWeekId\n    ? 'Settimana corrente'\n    : `Settimana del ${formatCalendarWeekLabel(state.weekStartDate)}`;",
    to: "elements.calendarStatus.textContent = selectedWeekId === currentWeekId\n    ? t('calendar.status.currentWeek')\n    : t('calendar.status.weekOf', { date: formatCalendarWeekLabel(state.weekStartDate) });"
  },
  {
    from: "return time\n    ? `${message}. Dati precedenti delle ${time}.`\n    : `${message}. Restano visibili i dati già caricati.`;",
    to: "return time\n    ? t('calendar.status.previousDataAt', { message, time })\n    : t('calendar.status.dataRetained', { message });"
  },
  // Kitchen error message
  {
    from: "return 'Accesso cucina non pronto. Accedi come amministratore e aggiorna il calendario pasti.';",
    to: "return t('kitchen.accessNotReady');"
  },
  {
    from: "return 'Nessun dato cucina disponibile.';",
    to: "return t('kitchen.empty');"
  }
];

let replacedCount = 0;
for (const { from, to } of replacements) {
  if (content.includes(from)) {
    content = content.replace(from, to);
    replacedCount++;
  } else {
    console.warn('Could not find match for:\n' + from.slice(0, 60) + '...');
  }
}

fs.writeFileSync('public/app.js', content, 'utf8');
console.log(`Successfully replaced ${replacedCount} patterns in public/app.js!`);
