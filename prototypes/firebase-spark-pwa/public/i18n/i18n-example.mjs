/**
 * Esempio di utilizzo del sistema i18n
 * 
 * Questo file mostra come integrare le traduzioni
 * nei componenti dell'applicazione Prenotazione pasti.
 */

import {
  t,
  setLocale,
  getLocale,
  formatDate,
  formatTime,
  formatNumber,
  applyTranslations,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
} from './i18n/i18n.mjs';

// ============================================================================
// 1. INIZIALIZZAZIONE
// ============================================================================

// Durante il bootstrap dell'applicazione
async function initializeApp() {
  // La lingua viene risolta automaticamente (localStorage → browser → italiano)
  const currentLocale = getLocale();
  console.log(`Lingua corrente: ${currentLocale}`);
  
  // Traduci tutti gli elementi con data-i18n
  applyTranslations(document);
  
  // Renderizza le viste dinamiche
  renderParticipantView();
  renderAdminView();
}

// ============================================================================
// 2. HTML STATICO - Usare attributi data-i18n
// ============================================================================

/*
Esempio index.html:

<button data-i18n="common.actions.save"></button>
<label data-i18n="admin.adaptations.language.label"></label>
<input data-i18n-placeholder="placeholder.search">
<button data-i18n-aria-label="a11y.closeDialog" aria-label="Chiudi finestra"></button>
<span data-i18n-title="time.today" title="Oggi"></span>
*/

// ============================================================================
// 3. JAVASCRIPT DINAMICO - Usare t()
// ============================================================================

// Esempio: Aggiornare testo di un elemento
function updateStatusMessage(element, status) {
  const messages = {
    saving: t('common.status.saving'),
    saved: t('common.status.saved'),
    error: t('common.status.error'),
  };
  element.textContent = messages[status] || status;
}

// Esempio: Interpolazione variabili
function renderMealCutoff(element, cutoffTime) {
  element.textContent = t('meal.cutoff', { time: cutoffTime });
  // Output: "Prenotabile fino alle 10:30"
}

// Esempio: Pluralizzazione
function renderSelectedMeals(element, count) {
  element.textContent = t('participant.meal.selectedCount', { count });
  // Italiano: "1 pasto selezionato" / "3 pasti selezionati"
}

// Esempio: Formattazione date
function renderDate(element, dateValue) {
  element.textContent = formatDate(dateValue, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  // Output: "lunedì°° 15 agosto 2026"
}

// Esempio: Formattazione orari
function renderTime(element, dateValue) {
  element.textContent = formatTime(dateValue, {
    hour: '2-digit',
    minute: '2-digit',
  });
  // Output: "14:30"
}

// Esempio: Formattazione numeri
function renderCount(element, count) {
  element.textContent = formatNumber(count);
  // Output: "1.234" (italiano) / "1,234" (inglese)
}

// ============================================================================
// 4. RENDER VISTE DINAMICHE
// ============================================================================

function renderParticipantView() {
  const statusElement = document.querySelector('[data-participant-status]');
  const nameElement = document.querySelector('[data-participant-status-name]');
  
  // Testo statico tradotto
  statusElement.textContent = t('participant.status.loading');
  
  // Esempio con dati dinamici
  const participantName = 'Mario Rossi';
  nameElement.textContent = participantName;
  nameElement.hidden = false;
}

function renderAdminView() {
  const overviewSection = document.querySelector('[data-admin-overview]');
  
  // Titoli sezione
  overviewSection.querySelector('[data-admin-overview-title]').textContent = 
    t('admin.overview.title');
  
  // Statistiche con pluralizzazione
  const activeCount = 42;
  overviewSection.querySelector('[data-admin-overview-active]').textContent = 
    t('admin.overview.activePeople', { count: activeCount });
}

// ============================================================================
// 5. GESTIONE ERRORI
// ============================================================================

function handleSaveError(error) {
  let message;
  
  if (error.code === 'network-error') {
    message = t('errors.network.generic');
  } else if (error.code === 'unauthorized') {
    message = t('errors.auth.unauthorized');
  } else if (error.code === 'validation-error') {
    message = t('errors.validation.invalid');
  } else {
    message = t('errors.generic');
  }
  
  showErrorBanner(message);
}

function showErrorBanner(message) {
  const banner = document.querySelector('[data-error-banner]');
  banner.textContent = message;
  banner.hidden = false;
  
  // Annuncio per screen reader
  banner.setAttribute('aria-live', 'polite');
}

// ============================================================================
// 6. DIALOGHI DI CONFERMA
// ============================================================================

function confirmDelete(onConfirm) {
  const title = t('confirm.delete.title');
  const message = t('confirm.delete.message');
  const confirmText = t('confirm.delete.confirm');
  const cancelText = t('confirm.delete.cancel');
  
  // Creazione dialogo dinamico
  const dialog = document.createElement('dialog');
  dialog.innerHTML = `
    <h2>${escapeHtml(title)}</h2>
    <p>${escapeHtml(message)}</p>
    <button class="save-button" data-confirm>${escapeHtml(confirmText)}</button>
    <button class="tertiary-action" data-cancel>${escapeHtml(cancelText)}</button>
  `;
  
  dialog.querySelector('[data-confirm]').addEventListener('click', () => {
    dialog.close();
    onConfirm();
  });
  
  dialog.querySelector('[data-cancel]').addEventListener('click', () => {
    dialog.close();
  });
  
  dialog.showModal();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// 7. CAMBIO LINGUA A RUNTIME
// ============================================================================

async function handleLanguageChange(newLocale) {
  // Validazione
  if (!SUPPORTED_LOCALES.includes(newLocale)) {
    console.warn(`Lingua non supportata: ${newLocale}`);
    newLocale = DEFAULT_LOCALE;
  }
  
  // Imposta nuova lingua
  await setLocale(newLocale);
  
  // Aggiorna UI
  applyTranslations(document);
  renderAllViews();
  
  // Aggiorna selettore lingua
  const languageSelect = document.querySelector('[data-admin-language-select]');
  if (languageSelect) {
    languageSelect.value = newLocale;
  }
  
  console.log(`Lingua cambiata a: ${newLocale}`);
}

function renderAllViews() {
  renderParticipantView();
  renderAdminView();
  renderWeekView();
  renderSummaryView();
  renderKitchenView();
}

// ============================================================================
// 8. LOCALIZZAZIONE ENUM (DIETE, RUOLI, ECC.)
// ============================================================================

function renderDietSelect(selectElement, emptyLabel) {
  const dietOptions = [
    { value: 'STANDARD', label: t('diet.option.STANDARD') },
    { value: 'BIANCO', label: t('diet.option.BIANCO') },
    { value: 'DIAB', label: t('diet.option.DIAB') },
    { value: 'IPO', label: t('diet.option.IPO') },
    { value: 'CARDIO', label: t('diet.option.CARDIO') },
    { value: 'CUSTOM', label: t('diet.option.CUSTOM') },
  ];
  
  const fragment = document.createDocumentFragment();
  
  // Opzione vuota
  if (emptyLabel) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = emptyLabel;
    fragment.append(option);
  }
  
  // Opzioni dieta
  for (const { value, label } of dietOptions) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    fragment.append(option);
  }
  
  selectElement.replaceChildren(fragment);
}

function renderRoleBadge(roleCode) {
  const roleLabels = {
    administrator: t('role.administrator'),
    participant: t('role.participant'),
    resident: t('role.resident'),
    kitchen: t('role.kitchen'),
    guest: t('role.guest'),
  };
  
  return roleLabels[roleCode] || roleCode;
}

// ============================================================================
// 9. VALIDAZIONE FORM
// ============================================================================

function validateParticipantForm(formData) {
  const errors = [];
  
  // Campo obbligatorio
  if (!formData.name || formData.name.trim() === '') {
    errors.push({
      field: 'name',
      message: t('errors.validation.required'),
    });
  }
  
  // Lunghezza minima
  if (formData.name && formData.name.length < 2) {
    errors.push({
      field: 'name',
      message: t('errors.validation.tooShort'),
    });
  }
  
  // Lunghezza massima
  if (formData.name && formData.name.length > 120) {
    errors.push({
      field: 'name',
      message: t('errors.validation.tooLong'),
    });
  }
  
  // Valore non valido
  if (formData.dietNumber && !/^\d+$/.test(formData.dietNumber)) {
    errors.push({
      field: 'dietNumber',
      message: t('diet.validation.invalidNumber'),
    });
  }
  
  return errors;
}

function showValidationErrors(errors) {
  for (const { field, message } of errors) {
    const errorElement = document.querySelector(`[data-error-${field}]`);
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.hidden = false;
    }
  }
}

// ============================================================================
// 10. ESEMPIO COMPLETO - RENDER PASTO
// ============================================================================

function renderMealCard(mealData) {
  const card = document.createElement('article');
  card.className = 'meal-card';
  
  // Determina se prenotazione chiusa
  const isClosed = new Date() > mealData.cutoff;
  
  card.innerHTML = `
    <header class="meal-header">
      <h3 class="meal-type">${getMealTypeLabel(mealData.type)}</h3>
      <time class="meal-date" datetime="${mealData.date}">${formatDate(mealData.date)}</time>
    </header>
    
    <div class="meal-body">
      <label class="diet-select-label">
        ${t('diet.option.label')}
        <select class="diet-select" data-diet="${mealData.id}">
          ${renderDietOptions(mealData.selectedDiet)}
        </select>
      </label>
      
      <p class="meal-cutoff ${isClosed ? 'cutoff-passed' : ''}">
        ${isClosed 
          ? t('meal.cutoff.passed') 
          : t('meal.cutoff', { time: formatTime(mealData.cutoff) })
        }
      </p>
      
      <p class="meal-status" data-status="${mealData.status}">
        ${getMealStatusLabel(mealData.status)}
      </p>
    </header>
    
    <footer class="meal-footer">
      <button 
        class="save-button" 
        data-save-meal="${mealData.id}"
        ${isClosed ? 'disabled' : ''}
      >
        ${t('common.actions.save')}
      </button>
    </footer>
  `;
  
  return card;
}

function getMealTypeLabel(typeCode) {
  const labels = {
    breakfast: t('meal.type.breakfast'),
    lunch: t('meal.type.lunch'),
    dinner: t('meal.type.dinner'),
  };
  return labels[typeCode] || typeCode;
}

function getMealStatusLabel(statusCode) {
  const labels = {
    selected: t('meal.status.selected'),
    notSelected: t('meal.status.notSelected'),
    closed: t('meal.status.closed'),
  };
  return labels[statusCode] || statusCode;
}

function renderDietOptions(selectedDiet) {
  const options = [
    { value: 'STANDARD', label: t('diet.option.STANDARD') },
    { value: 'BIANCO', label: t('diet.option.BIANCO') },
    { value: 'DIAB', label: t('diet.option.DIAB') },
    { value: 'IPO', label: t('diet.option.IPO') },
    { value: 'CARDIO', label: t('diet.option.CARDIO') },
    { value: 'CUSTOM', label: t('diet.option.CUSTOM') },
  ];
  
  return options
    .map(opt => `<option value="${opt.value}" ${opt.value === selectedDiet ? 'selected' : ''}>${opt.label}</option>`)
    .join('');
}

// ============================================================================
// EXPORT
// ============================================================================

export {
  initializeApp,
  handleLanguageChange,
  renderParticipantView,
  renderAdminView,
  renderMealCard,
  handleSaveError,
  confirmDelete,
  validateParticipantForm,
};