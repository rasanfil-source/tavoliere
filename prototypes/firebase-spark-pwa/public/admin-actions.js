// Caricato soltanto per operazioni amministrative. Nessuna traduzione viene
// valutata durante l'import; state ed elements restano gli stessi oggetti condivisi.
export function createAdminActions({
  CAPABILITIES,
  applyAdminCapabilityVisibility,
  applyResidentPreferences,
  assertViceSelectionLimit,
  assignCenterAdministratorParticipant,
  blockOfflineAction,
  canAssignOperationalRoles,
  canDesignateCenterAdministrator,
  canEditParticipantLiturgy,
  clearAdminParticipantFieldErrors,
  deleteAdminParticipant,
  elements,
  exportCenterData,
  focusInvalidAdminParticipantField,
  friendlyErrorMessage,
  getActiveCenterId,
  getConfiguredAdministratorParticipantId,
  getCurrentUser,
  getLocale,
  hasCurrentCapability,
  linkCurrentAdministratorParticipant,
  listAdminParticipants,
  participantDeletionErrorMessage,
  readAdminDietCode,
  readAdminDietLegendLabel,
  refreshAdminParticipants,
  renderAdminOverview,
  renderAdminPeopleList,
  renderMode,
  requiresAdministratorPassword,
  restoreCenterConfiguration,
  revokeViceAdministratorAccess,
  saveAdminParticipant,
  saveCenterAvatar,
  showActionDialog,
  state,
  syncAdminCenterSettingsForm,
  syncAdminContactForm,
  t,
  togglePasswordVisibility,
  updateAdministratorPassword,
  updateCenterSettings,
  updateKitchenDietLegendEntry,
  validateParticipantProfile
}) {
async function performAdminCenterSettingsSave() {
  if (!hasCurrentCapability(CAPABILITIES.MANAGE_CENTER_SETTINGS)) return;
  elements.adminCenterSettingsSave.disabled = true;
  elements.adminCenterSettingsSave.setAttribute('aria-busy', 'true');
  elements.adminCenterSettingsSection.setAttribute('aria-busy', 'true');
  elements.adminCenterSettingsStatus.textContent = 'Salvo...';
  let settingsSaved = false;
  let administratorPasswordSaved = false;
  const updatedCredentials = new Set();
  try {
    const administratorFields = [
      elements.adminAdministratorName,
      elements.adminAdministratorSignature,
      elements.adminAdministratorEmail
    ];
    if (administratorFields.some((field) => typeof field?.checkValidity !== 'function')) {
      throw new Error('Modulo del responsabile incompleto. Ricarica la pagina prima di salvare.');
    }
    const invalidField = administratorFields.find((field) => !field.checkValidity());
    if (invalidField) {
      invalidField.reportValidity();
      throw new Error('Completa i dati del responsabile');
    }
    const previousAdministratorSignature = state.centerContactSettings.administratorSignature || '';
    const administratorName = elements.adminAdministratorName?.value.trim() || '';
    const administratorSignature = elements.adminAdministratorSignature?.value.trim() || '';
    const administratorSave = await saveAdministratorAsParticipant({
      administratorName, administratorSignature, previousAdministratorSignature,
      prepareOnly: true
    });
    const newAdminPassword = elements.adminAdministratorPassword?.value || '';
    const newSharedAdminPassword = elements.adminSharedPasswordNew?.value || '';
    const currentSharedAdminPassword = elements.adminSharedPasswordCurrent?.value || '';
    const passwordRequired = requiresAdministratorPassword(getCurrentUser());
    const passwordProviderSet = getCurrentUser()?.providerData?.some(provider => provider.providerId === 'password');
    if (passwordRequired && !passwordProviderSet && !newAdminPassword) {
      throw new Error('Inserisci la password amministratore');
    }
    if (newAdminPassword) {
      if (newAdminPassword.length < 6) {
        throw new Error('La password dell\'amministratore deve contenere almeno 6 caratteri.');
      }
      await updateAdministratorPassword(newAdminPassword);
      administratorPasswordSaved = true;
      if (elements.adminAdministratorPassword) {
        elements.adminAdministratorPassword.value = '';
        if (elements.adminAdministratorPassword.type !== 'password') {
          togglePasswordVisibility(elements.adminAdministratorPassword, elements.adminAdministratorPasswordToggle);
        }
      }
    }
    const settings = await updateCenterSettings({
      name: elements.adminCenterName.value,
      ...(state.adminRole === 'OWNER'
        ? {
            appDisplayName: elements.adminAppDisplayName?.value,
            appDisplaySubtitle: elements.adminAppDisplaySubtitle?.value,
            startupPresentationEnabled: elements.adminStartupPresentationEnabled?.checked === true
          }
        : {}),
      timezone: elements.adminCenterTimezone.value,
      participantContactSharingEnabled: elements.adminContactSharingSelect
        ? elements.adminContactSharingSelect.value === 'enabled'
        : state.centerContactSettings.participantContactSharingEnabled,
      commonPassword: elements.adminCommonPasswordInput?.value || '',
      administratorSharedPassword: newSharedAdminPassword,
      currentAdministratorSharedPassword: currentSharedAdminPassword,
      administratorName,
      administratorSignature,
      administratorSave,
      adminEmail: state.adminRole === 'OWNER'
        ? getCurrentUser()?.email || ''
        : elements.adminAdministratorEmail?.value || '',
      reservationCutoffs: {
        lunch: elements.adminCutoffLunch.value,
        dinner: elements.adminCutoffDinner.value,
        nextDayBreakfast: elements.adminCutoffBreakfast.value
      },
      onProgress: ({ completedDays, totalDays, status, credential, settings }) => {
        if (status === 'AUTH_UPDATED') {
          updatedCredentials.add(credential);
          return;
        }
        if (status === 'CREDENTIALS_SAVED') {
          Object.assign(state.centerContactSettings, settings);
          // Le credenziali sono già confermate anche se il calendario si interrompe.
          for (const input of [elements.adminCommonPasswordInput, elements.adminSharedPasswordCurrent, elements.adminSharedPasswordNew]) {
            if (input) input.value = '';
          }
          updatedCredentials.clear();
          return;
        }
        if (status === 'COMPLETED') return;
        const percentage = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 100;
        elements.adminCenterSettingsStatus.textContent = `Aggiorno le scadenze future: ${percentage}%`;
      }
    });
    settingsSaved = true;
    if (elements.adminCommonPasswordInput) {
      elements.adminCommonPasswordInput.value = '';
      if (elements.adminCommonPasswordInput.type !== 'password') {
        togglePasswordVisibility(elements.adminCommonPasswordInput, elements.adminCommonPasswordToggle);
      }
    }
    [elements.adminSharedPasswordCurrent, elements.adminSharedPasswordNew].forEach((input) => {
      if (input) input.value = '';
    });
    state.centerContactSettings = {
      ...state.centerContactSettings,
      ...applyResidentPreferences(settings),
      administratorProfileComplete: true,
      // Se è stata inserita una nuova password, aggiorna il flag; altrimenti mantieni quello attuale.
      commonPasswordSet: settings.commonPasswordSet,
      adminSharedPasswordSet: settings.adminSharedPasswordSet,
      adminPasswordVersion: settings.adminPasswordVersion,
      adminPasswordRotationRequired: settings.adminPasswordRotationRequired
    };
    const administratorParticipantId = administratorSave.participantId;
    if (state.adminRole === 'OWNER') {
      await linkCurrentAdministratorParticipant(administratorParticipantId);
      state.adminParticipantId = administratorParticipantId;
    }
    state.adminParticipants = await listAdminParticipants();
    let avatarNotice = '';
    if (state.pendingCenterAvatarDataUrl && state.centerContactSettings.commonPasswordSet) {
      try {
        const avatar = await saveCenterAvatar(state.pendingCenterAvatarDataUrl);
        state.centerContactSettings = { ...state.centerContactSettings, ...avatar };
        state.pendingCenterAvatarDataUrl = '';
        elements.adminCenterAvatarInput.value = '';
      } catch (error) {
        avatarNotice = ` ${friendlyErrorMessage(error, 'Icona non salvata')}`;
      }
    }
    state.adminCenterDirty = false;
    renderMode();
    renderAdminOverview();
    syncAdminCenterSettingsForm();
    applyAdminCapabilityVisibility();
    elements.adminCenterSettingsStatus.textContent = `Configurazione e scheda Persona salvate.${avatarNotice}`;
  } catch (error) {
    const progress = settingsSaved
      ? 'Configurazione e Persona salvate. Completamento dell’accesso non riuscito: ricarica il pannello e riprova.'
      : administratorPasswordSaved
        ? 'Password personale aggiornata. Configurazione non completata.'
        : 'Configurazione non completata.';
    const passwordNotice = !settingsSaved && updatedCredentials.size > 0
      ? ' Una password condivisa è già stata aggiornata; completa nuovamente il salvataggio.' : '';
    elements.adminCenterSettingsStatus.textContent = `${progress}${passwordNotice} ${friendlyErrorMessage(error, '')}`;
  } finally {
    elements.adminCenterSettingsSave.disabled = false;
    elements.adminCenterSettingsSave.removeAttribute('aria-busy');
    elements.adminCenterSettingsSection.removeAttribute('aria-busy');
  }
}

async function saveAdministratorAsParticipant({
  administratorName,
  administratorSignature,
  previousAdministratorSignature,
  prepareOnly = false
}) {
  // La configurazione è caricata prima dell'anagrafica: rileggere le persone
  // evita duplicati e conserva dati e revisione della scheda del responsabile.
  const participants = await listAdminParticipants();
  const nextSignature = administratorSignature.toUpperCase();
  const previousSignature = previousAdministratorSignature.trim().toUpperCase();
  const participantWithNextSignature = participants.find(
    (participant) => participant.signature === nextSignature
  );
  const participantWithPreviousSignature = previousSignature
    ? participants.find((participant) => participant.signature === previousSignature)
    : null;

  if (participantWithNextSignature && participantWithPreviousSignature
      && participantWithNextSignature.participantId !== participantWithPreviousSignature.participantId) {
    throw new Error('La nuova sigla appartiene già a un\'altra persona');
  }

  const configuredParticipant = participants.find((person) =>
    person.participantId === state.centerContactSettings.administratorParticipantId);
  const participant = configuredParticipant || participantWithPreviousSignature || null;
  if (participantWithNextSignature
      && participantWithNextSignature.participantId !== participant?.participantId) {
    throw new Error('La nuova sigla appartiene già a un\'altra persona');
  }
  const sortOrder = participant?.sortOrder
    ?? Math.max(0, ...participants.map((item) => Number(item.sortOrder || 0))) + 1;

  return saveAdminParticipant(participant?.participantId || '', {
    displayName: administratorName,
    signature: nextSignature,
    groupId: participant?.groupId || 'group_residenti',
    dietTags: participant?.dietTags || ['STANDARD'],
    liturgicalRole: participant?.liturgicalRole === true,
    viceAdminRole: participant?.viceAdminRole === true,
    sortOrder,
    active: participant ? participant.status === 'ACTIVE' : true,
    phone: participant?.phone || '',
    phoneConsent: participant?.phoneConsent === true,
    whatsappEnabled: participant?.whatsappEnabled === true,
    expectedRevision: participant?.revision
  }, { prepareOnly });
}

async function performAdminSaveContact() {
  const participant = state.adminParticipants.find((item) => item.participantId === state.adminParticipantId);
  const configuredAdministratorId = getConfiguredAdministratorParticipantId();
  const selectedAdministrativeRole = elements.adminParticipantAdministrativeRole?.value || 'none';
  const administratorChecked = selectedAdministrativeRole === 'administrator';
  const assigningAdministrator = canDesignateCenterAdministrator()
    && administratorChecked
    && (!participant || participant.participantId !== configuredAdministratorId);

  try {
    if (participant?.participantId === configuredAdministratorId && !administratorChecked) {
      throw new Error(t('admin.people.assignAdministrator.chooseSuccessor'));
    }
    if (assigningAdministrator) {
      const decision = await showActionDialog({
        title: t('admin.people.assignAdministrator.title'),
        message: t('admin.people.assignAdministrator.message', {
          name: elements.adminParticipantName.value.trim()
        }),
        confirmLabel: t('common.actions.confirm'),
        destructive: true
      });
      if (!decision.confirmed) return;
    }
    const rawPhone = elements.adminPhoneInput.value.trim();
    const dietCode = readAdminDietCode();
    const dietTags = dietCode && dietCode !== 'STANDARD' ? [dietCode] : ['STANDARD'];
    const dietLegendLabel = hasCurrentCapability(CAPABILITIES.MANAGE_CENTER_SETTINGS)
      ? readAdminDietLegendLabel()
      : '';
    const sortOrder = participant?.sortOrder
      ?? Math.max(0, ...state.adminParticipants.map((item) => Number(item.sortOrder || 0))) + 1;
    const viceAdminRole = canAssignOperationalRoles()
      ? selectedAdministrativeRole === 'vice'
      : participant?.viceAdminRole === true;
    assertViceSelectionLimit(participant?.participantId || '', viceAdminRole);
    clearAdminParticipantFieldErrors();
    const profile = validateParticipantProfile({
      displayName: elements.adminParticipantName.value,
      signature: elements.adminParticipantSignature.value,
      initials: elements.adminParticipantInitials.value,
      groupId: elements.adminParticipantGroup.value,
      dietTags,
      liturgicalRole: canEditParticipantLiturgy(participant)
        ? elements.adminParticipantLiturgy.checked
        : participant?.liturgicalRole === true,
      viceAdminRole,
      sortOrder,
      active: participant ? participant.status === 'ACTIVE' : true,
      phone: rawPhone,
      phoneConsent: elements.adminPhoneConsent.checked,
      whatsappEnabled: elements.adminWhatsappEnabled.checked
    });
    elements.adminSaveButton.disabled = true;
    elements.adminCancelParticipant.disabled = true;
    elements.adminDeleteParticipant.disabled = true;
    elements.adminSaveButton.setAttribute('aria-busy', 'true');
    elements.adminPersonEditor.setAttribute('aria-busy', 'true');
    elements.adminStatus.textContent = t('status.saving');
    let nextDietLegend = null;
    if (dietCode !== 'STANDARD' && dietLegendLabel) {
      const currentLegend = state.centerContactSettings.kitchenDietLegend || [];
      const nextLegend = updateKitchenDietLegendEntry(currentLegend, dietCode, dietLegendLabel);
      if (JSON.stringify(nextLegend) !== JSON.stringify(currentLegend)) {
        nextDietLegend = nextLegend;
      }
    }
    const savedParticipantId = await saveAdminParticipant(participant?.participantId || '', {
      ...profile,
      ...(nextDietLegend ? { kitchenDietLegend: nextDietLegend } : {}),
      expectedRevision: participant?.revision
    });
    if (nextDietLegend) {
      state.centerContactSettings = {
        ...state.centerContactSettings,
        kitchenDietLegend: nextDietLegend
      };
    }
    if (assigningAdministrator) {
      const assigned = await assignCenterAdministratorParticipant(
        savedParticipantId,
        configuredAdministratorId
      );
      state.centerContactSettings.administratorParticipantId = assigned.participantId;
      state.centerContactSettings.administratorName = assigned.displayName;
      state.centerContactSettings.administratorSignature = assigned.signature;
      elements.adminStatus.textContent = t('admin.people.assignAdministrator.done', {
        name: assigned.displayName
      });
    }
    if (!viceAdminRole && participant?.viceAdminRole === true) {
      // La membership viene revocata nel database: nascondere una scheda non
      // sarebbe sufficiente e una sessione Firebase già aperta non la riattiva.
      await revokeViceAdministratorAccess(savedParticipantId);
    }
    state.adminParticipantId = savedParticipantId;
    state.adminPersonDirty = false;
    await refreshAdminParticipants();
    if (state.selectedParticipant && state.selectedParticipant.participantId === savedParticipantId) {
      state.selectedParticipant = state.participants.find((item) => item.participantId === savedParticipantId) || state.selectedParticipant;
      renderMode();
    }
    if (!assigningAdministrator) {
      elements.adminStatus.textContent = t('admin.people.saved');
    }
  } catch (error) {
    focusInvalidAdminParticipantField(error);
    elements.adminStatus.textContent = friendlyErrorMessage(error, 'Salvataggio non riuscito');
  } finally {
    elements.adminSaveButton.disabled = false;
    elements.adminCancelParticipant.disabled = false;
    elements.adminDeleteParticipant.disabled = !state.adminParticipantId;
    elements.adminSaveButton.removeAttribute('aria-busy');
    elements.adminPersonEditor.removeAttribute('aria-busy');
  }
}

async function deleteParticipantFromAdminPanel(participant, triggerButton) {
  if (!participant) {
    return;
  }
  if (!hasCurrentCapability(CAPABILITIES.DELETE_PARTICIPANTS)) {
    elements.adminStatus.textContent = t('admin.people.onlyOwnerCanDelete');
    return;
  }
  if (participant.viceAdminRole === true && !canAssignOperationalRoles()) {
    elements.adminStatus.textContent = t('admin.people.onlyAdminCanDeleteVice');
    return;
  }

  try {
    await deleteAdminParticipant(participant.participantId, participant.revision, { checkOnly: true });
  } catch (error) {
    elements.adminStatus.textContent = participantDeletionErrorMessage(error);
    return;
  }

  const decision = await showActionDialog({
    title: t('dialog.deletePerson.title'), // Eliminazione definitiva della persona.
    message: t('dialog.deletePerson.message', { name: participant.displayName }),
    confirmLabel: t('admin.people.delete'),
    destructive: true
  });
  if (!decision.confirmed) {
    elements.adminStatus.textContent = t('admin.people.deleteCancelled');
    return;
  }

  const previousAdminParticipants = state.adminParticipants;
  const previousParticipants = state.participants;
  const previousSelectedParticipantId = state.adminParticipantId;
  const previousPersonDirty = state.adminPersonDirty;
  state.pendingAdminParticipantDeleteIds.add(participant.participantId);
  state.adminParticipants = state.adminParticipants.filter((item) => (
    item.participantId !== participant.participantId
  ));
  state.participants = state.participants.filter((item) => (
    item.participantId !== participant.participantId
  ));
  if (state.adminParticipantId === participant.participantId) {
    state.adminParticipantId = '';
    state.adminPersonDirty = false;
  }
  elements.adminSaveButton.disabled = true;
  elements.adminDeleteParticipant.disabled = true;
  renderAdminPeopleList();
  syncAdminContactForm();
  elements.adminStatus.textContent = t('admin.people.deleting');
  try {
    await deleteAdminParticipant(participant.participantId, participant.revision);
    elements.adminStatus.textContent = t('admin.people.deleted', { name: participant.displayName });
  } catch (error) {
    state.adminParticipants = previousAdminParticipants;
    state.participants = previousParticipants;
    if (error.participantState?.participantId === participant.participantId) {
      for (const people of [state.adminParticipants, state.participants]) {
        const suspended = people.find(item => item.participantId === participant.participantId);
        if (suspended) Object.assign(suspended, error.participantState);
      }
    }
    state.adminParticipantId = previousSelectedParticipantId;
    state.adminPersonDirty = previousPersonDirty;
    try {
      await refreshAdminParticipants({ forceRefresh: true });
    } catch (refreshError) {
      console.warn('Aggiornamento elenco dopo eliminazione non completato', refreshError);
    }
    renderAdminPeopleList();
    syncAdminContactForm();
    elements.adminStatus.textContent = participantDeletionErrorMessage(error);
  } finally {
    state.pendingAdminParticipantDeleteIds.delete(participant.participantId);
    elements.adminSaveButton.disabled = false;
    elements.adminDeleteParticipant.disabled = !state.adminParticipantId;
    renderAdminPeopleList();
  }
}

async function handleAdminExport() {
  if (!hasCurrentCapability(CAPABILITIES.EXPORT_CENTER_DATA)) return;
  elements.adminExportButton.disabled = true;
  elements.adminExportButton.setAttribute('aria-busy', 'true');
  elements.adminExportSpinner.hidden = false;
  elements.adminExportLabel.textContent = t('admin.export.preparing');
  elements.adminStatus.textContent = t('admin.export.preparing');
  try {
    const backup = await exportCenterData();
    downloadCenterBackup(backup, 'tavola-comune-export');
    elements.adminStatus.textContent = t('admin.export.ready', { count: backup.totalDocuments });
    elements.adminBackupStatus.textContent = t('admin.export.ready', { count: backup.totalDocuments });
  } catch (error) {
    elements.adminStatus.textContent = friendlyErrorMessage(error, 'Esportazione non riuscita');
  } finally {
    elements.adminExportButton.disabled = false;
    elements.adminExportButton.setAttribute('aria-busy', 'false');
    elements.adminExportSpinner.hidden = true;
    elements.adminExportLabel.textContent = t('admin.backup.downloadAction');
  }
}

function downloadCenterBackup(backup, prefix) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = prefix + '-' + backup.exportedAt.slice(0, 10) + '.json';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function performAdminConfigurationRestore(file) {
  if (blockOfflineAction(elements.adminBackupStatus)) return;
  const maximumBytes = 20 * 1024 * 1024;
  elements.adminRestoreButton.disabled = true;
  elements.adminRestoreButton.setAttribute('aria-busy', 'true');
  elements.adminRestoreLabel.textContent = t('admin.backup.reading');
  elements.adminBackupStatus.textContent = t('admin.backup.reading');
  try {
    if (file.size > maximumBytes) {
      throw new Error(t('admin.backup.tooLarge'));
    }
    let backup;
    try {
      backup = JSON.parse(await file.text());
    } catch {
      throw new Error(t('admin.backup.invalidJson'));
    }
    const { inspectCenterBackup } = await import('./domain/center-backup.mjs?v=20261014b');
    const inspection = inspectCenterBackup(backup, { expectedCenterId: getActiveCenterId() });
    if (!inspection.valid) {
      const error = new Error(inspection.errors.join(' '));
      error.inspection = inspection;
      throw error;
    }
    const exportedAt = inspection.exportedAt
      ? inspection.exportedAt.toLocaleString(getLocale())
      : t('admin.backup.unknownDate');
    const decision = await showActionDialog({
      title: t('admin.backup.confirmTitle'),
      message: t('admin.backup.confirmMessage', {
        date: exportedAt,
        count: inspection.totalDocuments
      }),
      confirmLabel: t('admin.backup.confirmAction'),
      requiredText: t('admin.backup.requiredText'),
      destructive: true
    });
    if (!decision.confirmed) {
      elements.adminBackupStatus.textContent = t('admin.backup.cancelled');
      return;
    }

    if (blockOfflineAction(elements.adminBackupStatus)) return;
    elements.adminRestoreLabel.textContent = t('admin.backup.restoring');
    elements.adminBackupStatus.textContent = t('admin.backup.safetyCopy');
    const safetyBackup = await exportCenterData();
    downloadCenterBackup(safetyBackup, 'tavola-comune-prima-del-ripristino');
    if (blockOfflineAction(elements.adminBackupStatus)) return;
    elements.adminBackupStatus.textContent = t('admin.backup.restoring');
    await restoreCenterConfiguration(backup);
    await refreshAdminParticipants();
    elements.adminBackupStatus.textContent = t('admin.backup.restored');
    elements.adminStatus.textContent = t('admin.backup.restored');
  } catch (error) {
    const inspectionMessage = error?.inspection?.errors?.join(' ');
    elements.adminBackupStatus.textContent = inspectionMessage
      || friendlyErrorMessage(error, t('admin.backup.restoreFailed'));
  } finally {
    elements.adminRestoreButton.disabled = false;
    elements.adminRestoreButton.setAttribute('aria-busy', 'false');
    elements.adminRestoreLabel.textContent = t('admin.backup.uploadAction');
  }
}

async function prepareCenterAvatar(file) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Scegli un file immagine');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('L\'immagine supera 8 MB');
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
    if (!sourceSize) {
      throw new Error('L\'immagine non contiene dati leggibili');
    }
    const canvas = document.createElement('canvas');
    canvas.width = 192;
    canvas.height = 192;
    const context = canvas.getContext('2d');
    const sourceX = (image.naturalWidth - sourceSize) / 2;
    const sourceY = (image.naturalHeight - sourceSize) / 2;
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, 192, 192);
    const dataUrl = canvas.toDataURL('image/webp', 0.86);
    if (dataUrl.length > 300000) {
      throw new Error('L\'immagine resta troppo grande dopo la preparazione');
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Immagine non leggibile'));
    image.src = source;
  });
}

return { performAdminCenterSettingsSave, saveAdministratorAsParticipant, performAdminSaveContact, deleteParticipantFromAdminPanel, handleAdminExport, performAdminConfigurationRestore, prepareCenterAvatar };
}
