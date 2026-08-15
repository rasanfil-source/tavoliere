import fs from 'fs';

let content = fs.readFileSync('public/app.js', 'utf8');

const dialogReplacements = [
  // Deactivate center
  {
    from: `    const decision = await showActionDialog({
      title: 'Disattiva centro',
      message: \`\${name} non sarà più disponibile nei collegamenti. I dati resteranno conservati per un eventuale recupero amministrativo.\`,
      confirmLabel: 'Disattiva centro',
      destructive: true
    });`,
    to: `    const decision = await showActionDialog({
      title: t('dialog.deactivateCenter.title'),
      message: t('dialog.deactivateCenter.message', { name }),
      confirmLabel: t('dialog.deactivateCenter.title'),
      destructive: true
    });`
  },
  // Extend calendar
  {
    from: `    const decision = await showActionDialog({
      title: 'Estendi calendario prenotazioni',
      message: 'Vuoi rendere disponibili le prenotazioni fino a 365 giorni da oggi?',
      confirmLabel: 'Estendi calendario'
    });`,
    to: `    const decision = await showActionDialog({
      title: t('dialog.extendCalendar.title'),
      message: t('dialog.extendCalendar.message'),
      confirmLabel: t('dialog.extendCalendar.title')
    });`
  },
  // Rotate link
  {
    from: `    const decision = await showActionDialog({
      title: 'Rigenera collegamento',
      message: \`Il collegamento \${label} precedente e le sessioni già aperte con quel collegamento verranno revocati.\`,
      confirmLabel: 'Rigenera'
    });`,
    to: `    const decision = await showActionDialog({
      title: t('dialog.rotateLink.title'),
      message: t('dialog.rotateLink.message', { label }),
      confirmLabel: t('common.actions.reset')
    });`
  },
  // Transfer ownership
  {
    from: `  const decision = await showActionDialog({
    title: 'Trasferisci la responsabilità',
    message: \`Il nuovo responsabile sarà \${successor.email || successor.adminUid}. Dopo il trasferimento avrà il controllo completo del centro.\`,
    confirmLabel: 'Trasferisci',
    requiredText: t('dialog.transferOwnership.requiredText'),
    checkboxLabel: 'Revoca il mio precedente accesso al centro',
    destructive: true
  });`,
    to: `  const decision = await showActionDialog({
    title: t('dialog.transferOwnership.title'),
    message: t('dialog.transferOwnership.message', { email: successor.email || successor.adminUid }),
    confirmLabel: t('dialog.transferOwnership.title'),
    requiredText: t('dialog.transferOwnership.requiredText'),
    checkboxLabel: t('dialog.transferOwnership.revokeMyAccess'),
    destructive: true
  });`
  },
  // Revoke invite
  {
    from: `  const decision = await showActionDialog({
    title: 'Revoca invito',
    message: 'Il collegamento non potrà più essere usato.',
    confirmLabel: 'Revoca invito',
    destructive: true
  });`,
    to: `  const decision = await showActionDialog({
    title: t('dialog.revokeInvitation.title'),
    message: t('dialog.revokeInvitation.message'),
    confirmLabel: t('dialog.revokeInvitation.title'),
    destructive: true
  });`
  },
  // Revoke admin
  {
    from: `  const decision = await showActionDialog({
    title: 'Revoca amministratore',
    message: \`\${account?.email || 'Questo amministratore'} perderà subito l’accesso al centro.\`,
    confirmLabel: 'Revoca accesso',
    destructive: true
  });`,
    to: `  const decision = await showActionDialog({
    title: t('dialog.revokeAdmin.title'),
    message: t('dialog.revokeAdmin.message', { email: account?.email || t('role.admin') }),
    confirmLabel: t('dialog.revokeAdmin.title'),
    destructive: true
  });`
  },
  // Remove avatar
  {
    from: `  const decision = await showActionDialog({
    title: 'Rimuovi icona',
    message: 'L’icona del centro verrà rimossa.',
    confirmLabel: 'Rimuovi icona',
    destructive: true
  });`,
    to: `  const decision = await showActionDialog({
    title: t('dialog.removeAvatar.title'),
    message: t('dialog.removeAvatar.message'),
    confirmLabel: t('dialog.removeAvatar.title'),
    destructive: true
  });`
  },
  // Discard changes
  {
    from: `  const decision = await showActionDialog({
    title: 'Modifiche non salvate',
    message: 'Vuoi abbandonare le modifiche apportate alla persona?',
    confirmLabel: 'Abbandona modifiche',
    destructive: true
  });`,
    to: `  const decision = await showActionDialog({
    title: t('dialog.discardChanges.title'),
    message: t('dialog.discardChanges.message'),
    confirmLabel: t('dialog.discardChanges.title'),
    destructive: true
  });`
  },
  // Clear selection
  {
    from: `    const decision = await showActionDialog({
      title: 'Svuota selezione',
      message: 'Le prenotazioni interessate verranno rimosse.',
      confirmLabel: 'Svuota selezione',
      destructive: true
    });`,
    to: `    const decision = await showActionDialog({
      title: t('dialog.clearSelection.title'),
      message: t('dialog.clearSelection.message'),
      confirmLabel: t('dialog.clearSelection.title'),
      destructive: true
    });`
  },
  // Delete person
  {
    from: `  const decision = await showActionDialog({
    title: 'Elimina definitivamente la persona',
    message: \`Verranno eliminati \${participant.displayName}, le prenotazioni e gli accessi personali collegati. Non sarà possibile ripristinarli.\`,
    confirmLabel: 'Elimina persona',
    requiredText: 'ELIMINA',
    destructive: true
  });`,
    to: `  const decision = await showActionDialog({
    title: t('dialog.deletePerson.title'),
    message: t('dialog.deletePerson.message', { name: participant.displayName }),
    confirmLabel: t('admin.people.delete'),
    requiredText: 'ELIMINA',
    destructive: true
  });`
  }
];

let replaced = 0;
for (const item of dialogReplacements) {
  if (content.includes(item.from)) {
    content = content.replace(item.from, item.to);
    replaced++;
  } else {
    console.warn('Could not match dialog snippet:\n' + item.from.slice(0, 50));
  }
}

fs.writeFileSync('public/app.js', content, 'utf8');
console.log(`Replaced ${replaced} dialog snippets in public/app.js!`);
