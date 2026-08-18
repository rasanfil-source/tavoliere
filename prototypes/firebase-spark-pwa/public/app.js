import {
  initI18n,
  t,
  setLocale,
  getLocale,
  formatDate,
  formatTime,
  applyTranslations,
  readStoredLocale,
  SUPPORTED_LOCALES
} from './i18n/i18n.mjs?v=20260818y';
import {
  getRecommendedRefreshDelayMs
} from './refresh-schedule.js?v=20260816g';
import { escapeHtml } from './html-utils.js?v=20260816g';
import {
  getCurrentUser,
  authorizeResidentAdministratorSession,
  isFirebaseConfigured,
  isResidentTechnicalEmail,
  missingFirebaseConfigValues,
  createAdministratorWithEmail,
  reuseAdministratorAccountForInvitation,
  signInAdministratorWithEmail,
  signInWithGoogle,
  signOutCurrentUser,
  waitForAuthReady,
  watchAuth,
  updateAdministratorPassword,
  sendAdminPasswordResetEmail
} from './firebase-client.js?v=20260818s';
import {
  getActiveCenterId,
  getCenterScopedStorageKey,
  setActiveCenterId
} from './center-context.js?v=20260816h';
import {
  loadCachedCenterAvatar,
  loadCachedCenterContactSettings,
  loadCenterContactSettings,
  removeCenterAvatar,
  saveCenterAvatar,
  synchronizeCenterOwnerEmail,
  updateCenterSettings,
  updateParticipantContactSharing,
  loadCachedDefaultView,
  cacheDefaultView
} from './center-settings.js?v=20260818y';
import { formatDateId, getDateInTimeZone } from './date-utils.mjs?v=20260816g';
import {
  formatDietLabel,
  normalizeDietCode
} from './diet-utils.mjs?v=20260818w';
import { getMealCutoffDate } from './schedule-utils.mjs?v=20260816g';
import { CAPABILITIES, hasCapability } from './role-policy.mjs?v=20260818a';
import { createOperationGuard } from './core/operation-guard.mjs?v=20260816g';
import { createStateStore } from './core/state-store.mjs?v=20260816g';
import { toUserMessage } from './core/user-error.mjs?v=20260816i';
import {
  shouldPreserveResidentViewAfterRefreshError,
  shouldProcessAdminAuthEvent
} from './core/auth-session-policy.mjs?v=20260818a';
import {
  NETWORK_ACTION_SELECTOR,
  actionRequiresConnection,
  isConnectionAvailable
} from './core/connectivity.mjs?v=20260816g';
import {
  normalizePhoneNumber,
  validateParticipantProfile
} from './domain/participant-profile.mjs?v=20260816g';
import { buildAdminOverview } from './domain/admin-overview.mjs?v=20260818w';
import { requiresAdministratorPassword } from './domain/administrator-auth.mjs?v=20260816g';
import {
  mountSummaryMatrix,
  scrollSummaryMatrix
} from './summary-matrix-view.js?v=20260818u';

const initialMode = resolveMode();
const RESIDENT_SIGNATURE_STORAGE_KEY = 'tavolaComune.residentSignature';
const INVITATION_ID_PATTERN = /^[a-f0-9]{64}$/;
const CENTER_INVITATION_STORAGE_KEY = 'tavolaComune.pendingCenterInvitation';
const ADMIN_INVITATION_DECISION_STORAGE_PREFIX = 'tavolaComune.adminInvitationDecision.';
const ADMIN_INVITATION_DECISIONS = new Set(['ACCEPT', 'REJECT']);
const domainModulePaths = {
  accessLinks: './access-links.js?v=20260816g',
  admin: './admin-center.js?v=20260818a',
  audit: './audit-log.js?v=20260816g',
  bootstrap: './bootstrap-demo.js?v=20260816h',
  daily: './daily-operations.js?v=20260817b',
  kitchen: './kitchen-data.js?v=20260816g',
  notes: './kitchen-notes.js?v=20260816h',
  participant: './participant-data.js?v=20260818t'
};
const domainModuleLoads = new Map();
const operationGuard = createOperationGuard();
const requestCoordinator = createStateStore();

function loadDomainModule(name) {
  if (!domainModuleLoads.has(name)) {
    domainModuleLoads.set(name, import(domainModulePaths[name]));
  }
  return domainModuleLoads.get(name);
}

function callDomain(name, exportName) {
  return (...args) => loadDomainModule(name).then((module) => module[exportName](...args));
}

function preloadActiveViewModules() {
  const hasStoredResidentIdentity = Boolean(loadStoredResidentSignature());
  if (initialMode === 'summary'
      || (['participant', 'week'].includes(initialMode) && hasStoredResidentIdentity)) {
    loadDomainModule('participant');
  }
  if (initialMode === 'kitchen') {
    loadDomainModule('kitchen');
    loadDomainModule('notes');
  }
  if (['kitchen', 'summary'].includes(initialMode)
      || (initialMode === 'week' && hasStoredResidentIdentity)) {
    loadDomainModule('daily');
  }
}

const bootstrapCenterData = callDomain('bootstrap', 'bootstrapCenterData');
const createCenterInvitation = callDomain('admin', 'createCenterInvitation');
const createPlatformAdministratorInvitation = callDomain('admin', 'createPlatformAdministratorInvitation');
const deactivatePlatformCenter = callDomain('admin', 'deactivatePlatformCenter');
const createAdministratorInvitation = callDomain('admin', 'createAdministratorInvitation');
const createViceAdministratorInvitation = callDomain('admin', 'createViceAdministratorInvitation');
const revokeViceAdministratorAccess = callDomain('admin', 'revokeViceAdministratorAccess');
const acceptAdministratorInvitation = callDomain('admin', 'acceptAdministratorInvitation');
const initializeAdminCenter = callDomain('admin', 'initializeAdminCenter');
const linkCurrentAdministratorParticipant = callDomain('admin', 'linkCurrentAdministratorParticipant');
const listPlatformCenters = callDomain('admin', 'listPlatformCenters');
const listAdministratorInvitations = callDomain('admin', 'listAdministratorInvitations');
const revokeAdministratorInvitation = callDomain('admin', 'revokeAdministratorInvitation');
const revokeCenterAdministrator = callDomain('admin', 'revokeCenterAdministrator');
const rejectAdministratorInvitation = callDomain('admin', 'rejectAdministratorInvitation');
const completeAdministratorPasswordSetup = callDomain('admin', 'completeAdministratorPasswordSetup');
const listAuditEvents = callDomain('audit', 'listAuditEvents');
const transferCenterOwnership = callDomain('admin', 'transferCenterOwnership');
const loadOperationalLinks = callDomain('accessLinks', 'loadOperationalLinks');
const ensureOperationalLinks = callDomain('accessLinks', 'ensureOperationalLinks');
const rotateOperationalLink = callDomain('accessLinks', 'rotateOperationalLink');
const ensureKitchenDemoSession = callDomain('kitchen', 'ensureKitchenDemoSession');
const loadKitchenCounts = callDomain('kitchen', 'loadKitchenCounts');
const loadKitchenNote = callDomain('notes', 'loadKitchenNote');
const saveKitchenNote = callDomain('notes', 'saveKitchenNote');
const removeKitchenNoteMessage = callDomain('notes', 'removeKitchenNoteMessage');
const loadDailyOperation = callDomain('daily', 'loadDailyOperation');
const loadDailyOperations = callDomain('daily', 'loadDailyOperations');
const loadDailyHealth = callDomain('daily', 'loadDailyHealth');
const saveSickPeople = callDomain('daily', 'saveSickPeople');
const saveDietAssignments = callDomain('daily', 'saveDietAssignments');
const saveInvitedMeals = callDomain('daily', 'saveInvitedMeals');
const saveMassStatus = callDomain('daily', 'saveMassStatus');
const saveMassStatuses = callDomain('daily', 'saveMassStatuses');
const ensurePublicDemoSession = callDomain('participant', 'ensurePublicDemoSession');
const ensureStoredResidentSession = callDomain('participant', 'ensureStoredResidentSession');
const recoverStoredResidentSession = callDomain('participant', 'recoverStoredResidentSession');
const loadResidentAdministratorAuthorization = callDomain('participant', 'loadResidentAdministratorAuthorization');
const forgetResidentDevice = callDomain('participant', 'forgetResidentDevice');
const restoreFriendlyResidentSession = callDomain('participant', 'restoreFriendlyResidentSession');
const restoreResidentIdentityForAuthorizedAdministrator = callDomain(
  'participant',
  'restoreResidentIdentityForAuthorizedAdministrator'
);
const signInFriendlyResident = callDomain('participant', 'signInFriendlyResident');
const listPublicParticipants = callDomain('participant', 'listPublicParticipants');
const listAdminParticipants = callDomain('participant', 'listAdminParticipants');
const listCenterAdministrators = callDomain('participant', 'listCenterAdministrators');
const loadMealWindowCoverage = callDomain('participant', 'loadMealWindowCoverage');
const loadParticipantDaySummaries = callDomain('participant', 'loadParticipantDaySummaries');
const loadParticipantWeek = callDomain('participant', 'loadParticipantWeek');
const saveParticipantMeal = callDomain('participant', 'saveParticipantMeal');
const saveParticipantDay = callDomain('participant', 'saveParticipantDay');
const saveParticipantMonthSelection = callDomain('participant', 'saveParticipantMonthSelection');
const saveAdminParticipant = callDomain('participant', 'saveAdminParticipant');
const setAdminParticipantActiveStatus = callDomain('participant', 'setAdminParticipantActiveStatus');
const deleteAdminParticipant = callDomain('participant', 'deleteAdminParticipant');
const exportCenterData = callDomain('participant', 'exportCenterData');

preloadActiveViewModules();

function activateAdminCenter(centerId) {
  return setActiveCenterId(centerId);
}

function getAdminInvitationId() {
  return readInvitationId('invite');
}

function getAdminRoleInvitationId() {
  return readInvitationId('adminInvite');
}

function readInvitationId(parameterName) {
  const value = String(new URLSearchParams(window.location.search).get(parameterName) || '')
    .trim()
    .toLowerCase();
  if (parameterName === 'invite' && INVITATION_ID_PATTERN.test(value)) {
    try {
      window.sessionStorage.setItem(CENTER_INVITATION_STORAGE_KEY, value);
    } catch {
      // L'URL resta la fonte autorevole quando la sessione del browser non è scrivibile.
    }
    return value;
  }
  if (!value && parameterName === 'invite') {
    try {
      const stored = String(
        window.sessionStorage.getItem(CENTER_INVITATION_STORAGE_KEY)
          || window.localStorage.getItem(CENTER_INVITATION_STORAGE_KEY)
          || ''
      )
        .trim()
        .toLowerCase();
      return INVITATION_ID_PATTERN.test(stored) ? stored : '';
    } catch {
      return '';
    }
  }
  return INVITATION_ID_PATTERN.test(value) ? value : '';
}

function storeAdminInvitationDecision(decision) {
  const invitationId = getAdminRoleInvitationId();
  if (!invitationId || !ADMIN_INVITATION_DECISIONS.has(decision)) return false;
  try {
    window.localStorage.setItem(
      ADMIN_INVITATION_DECISION_STORAGE_PREFIX + invitationId,
      decision
    );
    return true;
  } catch {
    return false;
  }
}

function loadAdminInvitationDecision(invitationId = getAdminRoleInvitationId()) {
  if (!invitationId) return '';
  try {
    const decision = window.localStorage.getItem(
      ADMIN_INVITATION_DECISION_STORAGE_PREFIX + invitationId
    );
    return ADMIN_INVITATION_DECISIONS.has(decision) ? decision : '';
  } catch {
    return '';
  }
}

function clearAdminInvitationDecision(invitationId) {
  if (!invitationId) return;
  try {
    window.localStorage.removeItem(ADMIN_INVITATION_DECISION_STORAGE_PREFIX + invitationId);
  } catch {
    // Una decisione residua non concede accesso senza una identità Firebase valida.
  }
}

function loadStoredResidentSignature() {
  const value = window.localStorage.getItem(
    getCenterScopedStorageKey(RESIDENT_SIGNATURE_STORAGE_KEY)
  );
  return String(value || '').trim().replace(/\s+/g, '').toUpperCase();
}

function addCalendarDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}
const dateTimeFormatterCache = new Map();
const MONTH_AUTO_SCROLL_DELAY_MS = 1800;
const MONTH_AUTO_SCROLL_CANCEL_EVENTS = ['pointerdown', 'touchstart', 'wheel', 'keydown'];
const OPERATIONAL_AUTO_SCROLL_DELAY_MS = 1800;
const MEAL_VIEW_SWIPE_MIN_X = 72;
const MEAL_VIEW_SWIPE_MAX_Y = 96;
const BASE_ADMIN_DIET_NUMBERS = Object.freeze([1, 2, 3, 4]);
const RESIDENT_PREFERENCES_STORAGE_KEY = 'tavolaComune.residentPreferences';
const INTERFACE_STYLE_VALUES = new Set(['original', 'cool', 'urban']);
let mealViewSwipeStart = null;

function applyInterfaceStyle(value) {
  const style = INTERFACE_STYLE_VALUES.has(value) ? value : 'original';
  document.documentElement.dataset.interfaceStyle = style;
  document.documentElement.dataset.interfaceFamily = style === 'original' ? 'original' : 'cool';
  return style;
}

function loadResidentPreferences() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(
      getCenterScopedStorageKey(RESIDENT_PREFERENCES_STORAGE_KEY)
    ) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function applyResidentPreferences(settings) {
  // The center-level settings must win while the control panel is active.
  // An administrator can also have a resident session restored in the same
  // tab; applying that tab's old preferences here would silently bring back
  // a previous interface style (and make the week/Agenda rendering appear to
  // change as the mode is mounted again).
  if (!state.residentReady || state.adminRole || (state.mode === 'admin' && !state.residentSettingsMode)) {
    return settings;
  }
  const preferences = loadResidentPreferences();
  return {
    ...settings,
    ...(preferences.themePalette ? { themePalette: preferences.themePalette } : {}),
    ...(preferences.interfaceStyle ? { interfaceStyle: preferences.interfaceStyle } : {}),
    ...(preferences.defaultView ? { defaultView: preferences.defaultView } : {}),
    ...(preferences.summaryLayout ? { summaryLayout: preferences.summaryLayout } : {}),
    ...(preferences.language ? { language: preferences.language } : {})
  };
}

function storeResidentPreferences(preferences) {
  window.localStorage.setItem(
    getCenterScopedStorageKey(RESIDENT_PREFERENCES_STORAGE_KEY),
    JSON.stringify(preferences)
  );
}

function readDietCode(select, numberInput) {
  const selected = String(select?.value || 'STANDARD').trim();
  if (selected === 'STANDARD') return selected;
  if (/^\d+$/.test(selected)) return selected;
  if (selected !== 'CUSTOM') {
    throw new Error(t('diet.validation.invalidNumber'));
  }
  const minimum = Math.max(...getAdminDietNumbers()) + 1;
  const number = Number(numberInput?.value);
  if (!Number.isInteger(number) || number < minimum || number > 999) {
    throw new Error(t('diet.validation.customNumberRange', { min: minimum, max: 999 }));
  }
  return String(number);
}

function populateDietSelect(select, emptyLabel, numberInput) {
  if (!select) return;
  const previousValue = select.value || 'STANDARD';
  const fragment = document.createDocumentFragment();
  const emptyOption = document.createElement('option');
  emptyOption.value = 'STANDARD';
  emptyOption.textContent = emptyLabel;
  fragment.append(emptyOption);
  getAdminDietNumbers().forEach((number) => {
    const option = document.createElement('option');
    option.value = String(number);
    option.textContent = String(number);
    fragment.append(option);
  });
  const addOption = document.createElement('option');
  addOption.value = 'CUSTOM';
  addOption.textContent = t('diet.option.ADD_HIGHER');
  fragment.append(addOption);
  select.replaceChildren(fragment);
  select.value = Array.from(select.options).some((option) => option.value === previousValue)
    ? previousValue
    : 'STANDARD';
  if (numberInput) {
    const nextDietNumber = Math.max(...getAdminDietNumbers()) + 1;
    numberInput.min = String(nextDietNumber);
    numberInput.placeholder = `≥ ${nextDietNumber}`;
  }
}

function getAdminDietNumbers() {
  const numbers = state.adminParticipants.flatMap((participant) => (
    Array.isArray(participant.dietTags) ? participant.dietTags : []
  )).map((tag) => Number(String(tag || '').trim()))
    .filter((number) => Number.isInteger(number) && number >= 1 && number <= 999);
  return [...new Set([...BASE_ADMIN_DIET_NUMBERS, ...numbers])].sort((left, right) => left - right);
}

function populateAdminDietSelect(emptyLabel = t('diet.option.STANDARD')) {
  const select = elements.adminParticipantDiets;
  if (!select) return;
  const previousValue = select.value || 'STANDARD';
  const fragment = document.createDocumentFragment();
  const emptyOption = document.createElement('option');
  emptyOption.value = 'STANDARD';
  emptyOption.textContent = emptyLabel;
  fragment.append(emptyOption);
  getAdminDietNumbers().forEach((number) => {
    const option = document.createElement('option');
    option.value = String(number);
    option.textContent = String(number);
    fragment.append(option);
  });
  const addOption = document.createElement('option');
  addOption.value = 'CUSTOM';
  addOption.textContent = t('diet.option.ADD_HIGHER');
  fragment.append(addOption);
  select.replaceChildren(fragment);
  select.value = Array.from(select.options).some((option) => option.value === previousValue)
    ? previousValue
    : 'STANDARD';
  const nextDietNumber = Math.max(...getAdminDietNumbers()) + 1;
  elements.adminParticipantDietNumber.min = String(nextDietNumber);
  elements.adminParticipantDietNumber.placeholder = `≥ ${nextDietNumber}`;
}

function readAdminDietCode() {
  const selected = elements.adminParticipantDiets.value || 'STANDARD';
  if (selected !== 'CUSTOM') return selected;
  const nextDietNumber = Math.max(...getAdminDietNumbers()) + 1;
  const number = Number(elements.adminParticipantDietNumber.value);
  if (!Number.isInteger(number) || number < nextDietNumber || number > 999) {
    throw new Error(t('diet.validation.customNumberRange', { min: nextDietNumber, max: 999 }));
  }
  return String(number);
}

function syncCustomDietNumber(select, numberInput) {
  if (!select || !numberInput) {
    return;
  }
  const isCustom = select.value === 'CUSTOM';
  numberInput.hidden = !isCustom;
  numberInput.disabled = !isCustom;
  if (isCustom) {
    numberInput.focus();
  }
}

const cachedCenterContactSettings = loadCachedCenterContactSettings();

const state = {
  timerId: 0,
  backgroundRefreshTimerId: 0,
  monthAutoScrollTimerId: 0,
  monthAutoScrollCleanup: null,
  monthAutoScrollHandled: false,
  operationalAutoScrollTimerId: 0,
  operationalAutoScrollCleanup: null,
  operationalAutoScrollHandled: false,
  refreshInFlight: false,
  pendingRefreshSource: '',
  participantRequestVersion: 0,
  weekOperationsRequestVersion: 0,
  kitchenRequestVersion: 0,
  pendingMealKeys: new Set(),
  nextRefreshAt: 0,
  refreshCount: 0,
  meals: [],
  mode: initialMode,
  participants: [],
  selectedParticipant: null,
  friendlyAccess: ['participant', 'week'].includes(initialMode)
    || new URLSearchParams(window.location.search).get('access') === 'friendly',
  residentReady: false,
  residentAuthTransition: '',
  residentSettingsMode: false,
  residentAdministratorAuthorized: false,
  residentRestorePending: Boolean(loadStoredResidentSignature()),
  residentSettingsRestorePending: false,
  participantMeals: [],
  participantWeek: [],
  participantMonth: [],
  participantSummary: null,
  calendarAnchoredToCenter: false,
  todayOverview: [],
  summaryDays: [],
  summaryOperations: [],
  summaryDayOffset: 0,
  kitchenDayOffset: 0,
  kitchenDays: [],
  kitchenOperations: [],
  kitchenNotes: [],
  kitchenNote: null,
  kitchenDailyOperation: null,
  kitchenDailyHealth: null,
  summaryDailyOperation: null,
  summaryDailyHealth: null,
  kitchenUpdatedAt: null,
  selectedSummaryDate: formatDateId(new Date()),
  weekStartDate: startOfWeek(new Date()),
  monthDate: startOfMonth(new Date()),
  adminRole: '',
  adminAuthUid: '',
  adminAuthorizationPending: false,
  adminPanelHydrating: false,
  adminHydrationVersion: 0,
  adminAccessReconcilePromise: null,
  adminMassPermission: false,
  adminCanManageMass: false,
  adminCanManageDailyOperations: false,
  adminCenters: [],
  platformOwner: false,
  adminAuthNotice: '',
  adminInviteEmailExpanded: false,
  adminParticipants: [],
  adminAccounts: [],
  adminInvitations: [],
  adminCalendarCoverage: null,
  adminParticipantId: '',
  adminPersonDirty: false,
  pendingAdminParticipantStatusIds: new Set(),
  pendingAdminParticipantDeleteIds: new Set(),
  adminCenterDirty: false,
  adminMobileSection: '',
  adminActiveSection: '',
  lastSuccessfulRefreshAt: null,
  weekOperationalHealth: null,
  weekOperationalNote: null,
  weekOperationalDateId: '',
  weekDailyOperations: [],
  pendingCenterAvatarDataUrl: '',
  pendingThemePalette: '',
  pendingInterfaceStyle: '',
  centerContactSettings: {
    name: '',
    timezone: 'Europe/Rome',
    participantContactSharingEnabled: true,
    themePalette: 'smeraldo',
    interfaceStyle: 'original',
    defaultView: loadCachedDefaultView(),
    summaryLayout: 'international',
    kitchenLayout: 'classic',
    language: 'it',
    administratorName: '',
    administratorSignature: '',
    adminEmail: '',
    administratorProfileRequired: false,
    administratorProfileComplete: true,
    administratorPasswordRequired: false,
    adminPasswordSet: false,
    adminSharedPasswordSet: false,
    adminPasswordVersion: 0,
    adminPasswordRotationRequired: false,
    avatarVersion: '',
    avatarDataUrl: loadCachedCenterAvatar(),
    ...(cachedCenterContactSettings || {})
  },
  operationalLinks: {
    publicTokenId: '',
    kitchenTokenId: '',
    publicStatus: 'INACTIVE',
    kitchenStatus: 'INACTIVE',
    publicCreatedAt: null,
    kitchenCreatedAt: null
  }
};

function invalidateViewRequests() {
  state.participantRequestVersion += 1;
  state.weekOperationsRequestVersion += 1;
  state.kitchenRequestVersion += 1;
}

function beginParticipantRequest() {
  state.participantRequestVersion += 1;
  return {
    version: state.participantRequestVersion,
    mode: state.mode,
    monthDate: state.monthDate.getTime(),
    weekStartDate: state.weekStartDate.getTime(),
    summaryDayOffset: state.summaryDayOffset
  };
}

function isCurrentParticipantRequest(request) {
  return request.version === state.participantRequestVersion
    && request.mode === state.mode
    && request.monthDate === state.monthDate.getTime()
    && request.weekStartDate === state.weekStartDate.getTime()
    && request.summaryDayOffset === state.summaryDayOffset;
}

const elements = {
  cards: document.querySelector('[data-meal-cards]'),
  status: document.querySelector('[data-status]'),
  refreshButtons: document.querySelectorAll('[data-refresh-button]'),
  offlineBanner: document.querySelector('[data-offline-banner]'),
  accountFooter: document.querySelector('[data-account-footer]'),
  topbarContextNav: document.querySelector('[data-topbar-context-nav]'),
  controlPanelEntry: document.querySelector('[data-control-panel-entry]'),
  adminPasswordAlertDot: document.querySelector('[data-admin-password-alert-dot]'),
  mealsReturnEntry: document.querySelector('[data-meals-return-entry]'),
  adminShell: document.querySelector('[data-admin-shell]'),
  adminAuthMethods: document.querySelector('[data-admin-auth-methods]'),
  authActions: document.querySelector('[data-auth-actions]'),
  authButton: document.querySelector('[data-auth-button]'),
  adminEmailChoice: document.querySelector('[data-admin-email-choice]'),
  adminEmailAuth: document.querySelector('[data-admin-email-auth]'),
  adminEmail: document.querySelector('[data-admin-email]'),
  adminPasswordLabel: document.querySelector('[data-admin-password-label]'),
  adminPassword: document.querySelector('[data-admin-password]'),
  adminEmailSignIn: document.querySelector('[data-admin-email-signin]'),
  adminEmailCreate: document.querySelector('[data-admin-email-create]'),
  adminPasswordReset: document.querySelector('[data-admin-password-reset]'),
  adminPasswordSetupDialog: document.querySelector('[data-admin-password-setup-dialog]'),
  adminPasswordSetupForm: document.querySelector('[data-admin-password-setup-form]'),
  adminPasswordSetupInput: document.querySelector('[data-admin-password-setup-input]'),
  adminPasswordSetupSave: document.querySelector('[data-admin-password-setup-save]'),
  adminPasswordSetupStatus: document.querySelector('[data-admin-password-setup-status]'),
  adminPasswordSetupToggle: document.querySelector('[data-password-toggle="required-admin"]'),
  actionDialog: document.querySelector('[data-action-dialog]'),
  actionDialogForm: document.querySelector('[data-action-dialog-form]'),
  actionDialogTitle: document.querySelector('[data-action-dialog-title]'),
  actionDialogMessage: document.querySelector('[data-action-dialog-message]'),
  actionDialogTextWrap: document.querySelector('[data-action-dialog-text-wrap]'),
  actionDialogTextLabel: document.querySelector('[data-action-dialog-text-label]'),
  actionDialogText: document.querySelector('[data-action-dialog-text]'),
  actionDialogCheckboxWrap: document.querySelector('[data-action-dialog-checkbox-wrap]'),
  actionDialogCheckbox: document.querySelector('[data-action-dialog-checkbox]'),
  actionDialogCheckboxLabel: document.querySelector('[data-action-dialog-checkbox-label]'),
  actionDialogCancel: document.querySelector('[data-action-dialog-cancel]'),
  actionDialogConfirm: document.querySelector('[data-action-dialog-confirm]'),
  adminEmailStatus: document.querySelector('[data-admin-email-status]'),
  bootstrapButton: document.querySelector('[data-bootstrap-button]'),
  bootstrapProgress: document.querySelector('[data-bootstrap-progress]'),
  bootstrapProgressDetail: document.querySelector('[data-bootstrap-progress-detail]'),
  centerInitializer: document.querySelector('[data-center-initializer]'),
  centerInitializerName: document.querySelector('[data-center-initializer-name]'),
  centerInitializerTimezone: document.querySelector('[data-center-initializer-timezone]'),
  centerInitializerButton: document.querySelector('[data-center-initializer-button]'),
  centerInitializerStatus: document.querySelector('[data-center-initializer-status]'),
  initializerAccountInfo: document.querySelector('[data-initializer-account-info]'),
  initializerEmail: document.querySelector('[data-initializer-email]'),
  initializerSignout: document.querySelector('[data-initializer-signout]'),
  initializerPasswordRow: document.querySelector('[data-initializer-password-row]'),
  initializerPassword: document.querySelector('[data-initializer-password]'),
  initializerPasswordToggle: document.querySelector('[data-password-toggle="initializer"]'),
  authSwitchWrap: document.querySelector('[data-auth-switch-wrap]'),
  authSwitchToSignin: document.querySelector('[data-auth-switch-to-signin]'),
  authSwitchToSignup: document.querySelector('[data-auth-switch-to-signup]'),
  authSwitchTextToSignin: document.querySelector('[data-auth-switch-text-to-signin]'),
  authSwitchTextToSignup: document.querySelector('[data-auth-switch-text-to-signup]'),
  adminForgotPassword: document.querySelector('[data-admin-forgot-password]'),
  authStatus: document.querySelector('[data-auth-status]'),
  authUid: document.querySelector('[data-auth-uid]'),
  adminCenterSwitcher: document.querySelector('[data-admin-center-switcher]'),
  adminCenterSelect: document.querySelector('[data-admin-center-select]'),
  adminPanel: document.querySelector('[data-admin-panel]'),
  adminOverviewRole: document.querySelector('[data-admin-overview-role]'),
  adminOverviewActivePeople: document.querySelector('[data-admin-overview-active-people]'),
  adminOverviewSuspendedPeople: document.querySelector('[data-admin-overview-suspended-people]'),
  adminOverviewInvitations: document.querySelector('[data-admin-overview-invitations]'),
  adminOverviewCalendar: document.querySelector('[data-admin-overview-calendar]'),
  adminOverviewLinks: document.querySelector('[data-admin-overview-links]'),
  activationChecklistWrap: document.querySelector('[data-activation-checklist-wrap]'),
  activationChecklistList: document.querySelector('[data-activation-checklist-list]'),
  adminSectionNav: document.querySelector('[data-admin-section-nav]'),
  adminNavOverview: document.querySelector('[data-admin-nav-overview]'),
  adminNavPeople: document.querySelector('[data-admin-nav-people]'),
  adminNavAdaptations: document.querySelector('[data-admin-nav-adaptations]'),
  adminNavAccess: document.querySelector('[data-admin-nav-access]'),
  adminNavConfiguration: document.querySelector('[data-admin-nav-configuration]'),
  adminNavActivity: document.querySelector('[data-admin-nav-activity]'),
  adminDefaultViewSelect: document.querySelector('[data-admin-default-view-select]'),
  adminSummaryLayoutSelect: document.querySelector('[data-admin-summary-layout-select]'),
  adminKitchenLayoutSelect: document.querySelector('[data-admin-kitchen-layout-select]'),
  adminThemeSelect: document.querySelector('[data-admin-theme-select]'),
  adminInterfaceStyleSelect: document.querySelector('[data-admin-interface-style-select]'),
  adminThemeStatus: document.querySelector('[data-admin-theme-status]'),
  adminThemeSelectPreview: document.querySelector('[data-theme-select-preview]'),
  adminLanguageSelect: document.querySelector('[data-admin-language-select]'),
  adminAdaptationsSave: document.querySelector('[data-admin-adaptations-save]'),
  adminAdaptationsCancel: document.querySelector('[data-admin-adaptations-cancel]'),
  adminAdaptationsReset: document.querySelector('[data-admin-adaptations-reset]'),
  adminAdaptationsSection: document.getElementById('admin-adaptations-section'),
  ownerInvitationPanel: document.querySelector('[data-owner-invitation-panel]'),
  ownerInvitationGenerate: document.querySelector('[data-owner-invitation-generate]'),
  ownerInvitationResult: document.querySelector('[data-owner-invitation-result]'),
  ownerInvitationLink: document.querySelector('[data-owner-invitation-link]'),
  ownerInvitationCopy: document.querySelector('[data-owner-invitation-copy]'),
  ownerInvitationShare: document.querySelector('[data-owner-invitation-share]'),
  ownerInvitationStatus: document.querySelector('[data-owner-invitation-status]'),
  platformCenterList: document.querySelector('[data-platform-center-list]'),
  adminStatus: document.querySelector('[data-admin-status]'),
  adminCenterSettingsSection: document.querySelector('[data-admin-center-settings-section]'),
  adminCenterName: document.querySelector('[data-admin-center-name]'),
  adminCenterTimezone: document.querySelector('[data-admin-center-timezone]'),
  adminCutoffLunch: document.querySelector('[data-admin-cutoff-lunch]'),
  adminCutoffDinner: document.querySelector('[data-admin-cutoff-dinner]'),
  adminCutoffBreakfast: document.querySelector('[data-admin-cutoff-breakfast]'),
  adminCenterSettingsSave: document.querySelector('[data-admin-center-settings-save]'),
  adminCenterSettingsStatus: document.querySelector('[data-admin-center-settings-status]'),
  adminCenterAvatarPreview: document.querySelector('[data-admin-center-avatar-preview]'),
  adminCenterAvatarPlaceholder: document.querySelector('[data-admin-center-avatar-placeholder]'),
  adminCenterAvatarInput: document.querySelector('[data-admin-center-avatar-input]'),
  adminAvatarFilename: document.querySelector('[data-admin-avatar-filename]'),
  adminCenterAvatarSave: document.querySelector('[data-admin-center-avatar-save]'),
  adminCenterAvatarRemove: document.querySelector('[data-admin-center-avatar-remove]'),
  adminCenterAvatarStatus: document.querySelector('[data-admin-center-avatar-status]'),
  adminAccessSection: document.querySelector('#admin-access-section'),
  adminLeadership: document.querySelector('[data-admin-leadership]'),
  adminLeadershipStatus: document.querySelector('[data-admin-leadership-status]'),
  adminCandidateSelect: document.querySelector('[data-admin-candidate-select]'),
  adminCandidateNewPerson: document.querySelector('[data-admin-candidate-new-person]'),
  adminInviteAcceptPanel: document.querySelector('[data-admin-invite-accept-panel]'),
  adminInviteAcceptText: document.querySelector('[data-admin-invite-accept-text]'),
  inviteAccept: document.querySelector('[data-invite-accept]'),
  inviteReject: document.querySelector('[data-invite-reject]'),
  inviteAcceptActions: document.querySelector('[data-admin-invite-accept-actions]'),
  adminInvitationGenerate: document.querySelector('[data-admin-invitation-generate]'),
  adminInvitationStatus: document.querySelector('[data-admin-invitation-status]'),
  adminInvitationResult: document.querySelector('[data-admin-invitation-result]'),
  adminInvitationLink: document.querySelector('[data-admin-invitation-link]'),
  adminInvitationCopy: document.querySelector('[data-admin-invitation-copy]'),
  adminInvitationShare: document.querySelector('[data-admin-invitation-share]'),
  adminInvitationManagement: document.querySelector('[data-admin-invitation-management]'),
  adminInvitationManagementStatus: document.querySelector('[data-admin-invitation-management-status]'),
  adminInvitationList: document.querySelector('[data-admin-invitation-list]'),
  adminAccountManagement: document.querySelector('[data-admin-account-management]'),
  adminAccountList: document.querySelector('[data-admin-account-list]'),
  adminAccountStatus: document.querySelector('[data-admin-account-status]'),
  adminSuccessorSelect: document.querySelector('[data-admin-successor-select]'),
  adminTransferOwnership: document.querySelector('[data-admin-transfer-ownership]'),
  adminAuditSection: document.querySelector('[data-admin-audit-section]'),
  adminAuditStatus: document.querySelector('[data-admin-audit-status]'),
  adminAuditLoad: document.querySelector('[data-admin-audit-load]'),
  adminAuditList: document.querySelector('[data-admin-audit-list]'),
  adminCalendarExtension: document.querySelector('[data-admin-calendar-extension]'),
  adminCalendarExtensionStatus: document.querySelector('[data-admin-calendar-extension-status]'),
  adminPersonEditor: document.querySelector('#admin-person-editor'),
  adminParticipantSelect: document.querySelector('[data-admin-participant-select]'),
  adminNewParticipant: document.querySelector('[data-admin-new-participant]'),
  adminParticipantName: document.querySelector('[data-admin-participant-name]'),
  adminParticipantSignature: document.querySelector('[data-admin-participant-signature]'),
  adminParticipantGroup: document.querySelector('[data-admin-participant-group]'),
  adminParticipantDiets: document.querySelector('[data-admin-participant-diets]'),
  adminParticipantDietNumber: document.querySelector('[data-admin-participant-diet-number]'),
  adminParticipantLiturgy: document.querySelector('[data-admin-participant-liturgy]'),
  adminParticipantVice: document.querySelector('[data-admin-participant-vice]'),
  adminRoleOptions: document.querySelectorAll('[data-admin-role-option]'),
  adminPhoneInput: document.querySelector('[data-admin-phone-input]'),
  adminPhoneConsent: document.querySelector('[data-admin-phone-consent]'),
  adminWhatsappEnabled: document.querySelector('[data-admin-whatsapp-enabled]'),
  adminContactSharingSelect: document.querySelector('[data-admin-contact-sharing-select]'),
  adminSaveButton: document.querySelector('[data-admin-save-button]'),
  adminCancelParticipant: document.querySelector('[data-admin-cancel-participant]'),
  adminDeleteParticipant: document.querySelector('[data-admin-delete-participant]'),
  adminPeopleList: document.querySelector('[data-admin-people-list]'),
  adminGuestPreset: document.querySelector('[data-admin-guest-preset]'),
  adminGuestCustomWrap: document.querySelector('[data-admin-guest-custom-wrap]'),
  adminGuestCustom: document.querySelector('[data-admin-guest-custom]'),
  adminAddGuest: document.querySelector('[data-admin-add-guest]'),
  adminGuestStatus: document.querySelector('[data-admin-guest-status]'),
  weekOperations: document.querySelector('[data-week-operations]'),
  weekOperationsStatus: document.querySelector('[data-week-operations-status]'),
  weekOperationsDay: document.querySelector('[data-week-operations-day]'),
  weekInvitedSection: document.querySelector('[data-week-invited-section]'),
  weekInvitedInputs: document.querySelectorAll('[data-week-invited-meal]'),
  weekInvitedSave: document.querySelector('[data-week-invited-save]'),
  weekInvitedStatus: document.querySelector('[data-week-invited-status]'),
  weekHealthSection: document.querySelector('[data-week-health-section]'),
  weekHealthList: document.querySelector('[data-week-health-list]'),
  weekHealthSave: document.querySelector('[data-week-health-save]'),
  weekHealthStatus: document.querySelector('[data-week-health-status]'),
  weekDietParticipant: document.querySelector('[data-week-diet-participant]'),
  weekDietType: document.querySelector('[data-week-diet-type]'),
  weekDietNumber: document.querySelector('[data-week-diet-number]'),
  weekDietDuration: document.querySelector('[data-week-diet-duration]'),
  weekDietSave: document.querySelector('[data-week-diet-save]'),
  weekDietList: document.querySelector('[data-week-diet-list]'),
  weekDietStatus: document.querySelector('[data-week-diet-status]'),
  weekKitchenNoteStatus: document.querySelector('[data-week-kitchen-note-status]'),
  weekKitchenNoteInput: document.querySelector('[data-week-kitchen-note-input]'),
  weekKitchenNoteSave: document.querySelector('[data-week-kitchen-note-save]'),
  weekKitchenNoteList: document.querySelector('[data-week-kitchen-note-list]'),
  residentLogin: document.querySelector('[data-resident-login]'),
  residentLoginForm: document.querySelector('[data-resident-login-form]'),
  residentLoginStatus: document.querySelector('[data-resident-login-status]'),
  residentSignatureInput: document.querySelector('[data-resident-signature-input]'),
  residentPasswordInput: document.querySelector('[data-resident-password-input]'),
  residentLoginButton: document.querySelector('[data-resident-login-button]'),
  residentPasswordToggle: document.querySelector('[data-password-toggle="resident"]'),
  adminPasswordToggle: document.querySelector('[data-password-toggle="admin"]'),
  participantRefreshButton: document.querySelector('[data-participant-refresh]'),
  ownerExitButton: document.querySelector('[data-owner-exit]'),
  forgetDeviceButton: document.querySelector('[data-forget-device]'),
  adminExportButton: document.querySelector('[data-admin-export-button]'),
  adminTools: document.querySelector('[data-admin-tools]'),
  adminContactSharingRow: document.querySelector('[data-admin-contact-sharing-row]'),
  adminCommonPasswordRow: document.querySelector('[data-admin-common-password-row]'),
  adminCommonPasswordInput: document.querySelector('[data-admin-common-password-input]'),
  adminSharedPasswordRow: document.querySelector('[data-admin-shared-password-row]'),
  adminSharedPasswordCurrent: document.querySelector('[data-admin-shared-password-current]'),
  adminSharedPasswordNew: document.querySelector('[data-admin-shared-password-new]'),
  adminSharedPasswordStatus: document.querySelector('[data-admin-shared-password-status]'),
  adminSharedPasswordCurrentToggle: document.querySelector('[data-password-toggle="admin-shared-current"]'),
  adminSharedPasswordNewToggle: document.querySelector('[data-password-toggle="admin-shared-new"]'),
  adminPasswordRotationWarning: document.querySelector('[data-admin-password-rotation-warning]'),
  residentAdminUnlock: document.querySelector('[data-resident-admin-unlock]'),
  residentAdminPassword: document.querySelector('[data-resident-admin-password]'),
  residentAdminPasswordToggle: document.querySelector('[data-password-toggle="resident-admin"]'),
  residentAdminUnlockButton: document.querySelector('[data-resident-admin-unlock-button]'),
  residentAdminUnlockStatus: document.querySelector('[data-resident-admin-unlock-status]'),
  viceAuthGoogle: document.querySelector('[data-vice-auth-google]'),
  viceAuthEmailChoice: document.querySelector('[data-vice-auth-email-choice]'),
  viceAuthEmailForm: document.querySelector('[data-vice-auth-email-form]'),
  viceAuthEmail: document.querySelector('[data-vice-auth-email]'),
  viceAuthPassword: document.querySelector('[data-vice-auth-password]'),
  adminCommonPasswordStatus: document.querySelector('[data-admin-common-password-status]'),
  adminCommonPasswordToggle: document.querySelector('[data-password-toggle="common-password"]'),
  adminAdministratorName: document.querySelector('[data-admin-administrator-name]'),
  adminAdministratorSignature: document.querySelector('[data-admin-administrator-signature]'),
  adminAdministratorEmail: document.querySelector('[data-admin-administrator-email]'),
  adminAdministratorPasswordRow: document.querySelector('[data-admin-administrator-password-row]'),
  adminAdministratorPassword: document.querySelector('[data-admin-administrator-password]'),
  adminAdministratorPasswordToggle: document.querySelector('[data-password-toggle="admin-owner"]'),
  title: document.querySelector('[data-title]'),
  titleCenter: document.querySelector('[data-title-center]'),
  adminRoleChip: document.querySelector('[data-admin-role-chip]'),
  sessionRole: document.querySelector('[data-session-role]'),
  centerAvatar: document.querySelector('[data-center-avatar]'),
  kitchenPanel: document.querySelector('[data-kitchen-panel]'),
  kitchenDayTitle: document.querySelector('[data-kitchen-day-title]'),
  kitchenDate: document.querySelector('[data-kitchen-date]'),
  kitchenDayButtons: document.querySelectorAll('[data-kitchen-day]'),
  kitchenDateTabs: document.querySelector('[data-kitchen-date-tabs]'),
  kitchenNote: document.querySelector('[data-kitchen-note]'),
  kitchenNoteText: document.querySelector('[data-kitchen-note-text]'),
  kitchenSick: document.querySelector('[data-kitchen-sick]'),
  kitchenSickList: document.querySelector('[data-kitchen-sick-list]'),
  participantPanel: document.querySelector('[data-participant-panel]'),
  weekPanel: document.querySelector('[data-week-panel]'),
  summaryPanel: document.querySelector('[data-summary-panel]'),
  participantStatus: document.querySelector('[data-participant-status]'),
  participantStatusName: document.querySelector('[data-participant-status-name]'),
  weekStatus: document.querySelector('[data-week-status]'),
  weekStatusName: document.querySelector('[data-week-status-name]'),
  summaryStatus: document.querySelector('[data-summary-status]'),
  summaryDateTabs: document.querySelector('[data-summary-date-tabs]'),
  calendarStatus: document.querySelector('[data-calendar-status]'),
  calendarPanel: document.querySelector('[data-calendar-panel]'),
  monthJumpSelect: document.querySelector('[data-month-jump]'),
  monthJumpLabel: document.querySelector('[data-month-jump-label]'),
  weekJumpSelect: document.querySelector('[data-week-jump]'),
  monthPrev: document.querySelector('[data-month-prev]'),
  monthNext: document.querySelector('[data-month-next]'),
  monthLabel: document.querySelector('[data-month-label]'),
  monthGrid: document.querySelector('[data-month-grid]'),
  todayOverview: document.querySelector('[data-today-overview]'),
  participantMeals: document.querySelector('[data-participant-meals]'),
  participantSummary: document.querySelector('[data-participant-summary]'),
  weekPrev: document.querySelector('[data-week-prev]'),
  weekNext: document.querySelector('[data-week-next]'),
  operationalLinks: document.querySelector('[data-operational-links]'),
  publicLink: document.querySelector('[data-public-link]'),
  summaryLink: document.querySelector('[data-summary-link]'),
  kitchenLink: document.querySelector('[data-kitchen-link]'),
  publicLinkStatus: document.querySelector('[data-public-link-status]'),
  publicLinkMeta: document.querySelector('[data-public-link-meta]'),
  kitchenLinkStatus: document.querySelector('[data-kitchen-link-status]'),
  kitchenLinkMeta: document.querySelector('[data-kitchen-link-meta]'),
  operationalLinksStatus: document.querySelector('[data-operational-links-status]'),
  rotateLinkButtons: document.querySelectorAll('[data-rotate-operational-link]'),
  summaryNavLinks: document.querySelectorAll('[data-summary-nav-link]'),
  participantWeekNavLinks: document.querySelectorAll('[data-participant-week-nav-link]'),
  monthNavLinks: document.querySelectorAll('[data-month-nav-link]'),
  participantNavLinks: document.querySelectorAll('[data-participant-nav-link]'),
  summaryDayButtons: document.querySelectorAll('[data-summary-day]')
};

const hasAdminInterface = Boolean(elements.adminShell);
const inertElement = createInertElement();
Object.keys(elements).forEach((key) => {
  if (elements[key] == null) elements[key] = inertElement;
});

function createInertElement() {
  const noOp = () => undefined;
  const target = {
    hidden: true,
    open: false,
    disabled: true,
    checked: false,
    value: '',
    textContent: '',
    innerHTML: '',
    returnValue: '',
    dataset: {},
    style: {},
    classList: Object.freeze({
      add: noOp,
      remove: noOp,
      toggle: () => false,
      contains: () => false
    }),
    options: [],
    files: [],
    addEventListener: noOp,
    removeEventListener: noOp,
    append: noOp,
    replaceChildren: noOp,
    setAttribute: noOp,
    removeAttribute: noOp,
    getAttribute: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    closest: () => null,
    focus: noOp,
    scrollIntoView: noOp,
    showModal: noOp,
    close: noOp
  };
  return new Proxy(target, {
    get(object, property) {
      return property in object ? object[property] : undefined;
    },
    set(object, property, value) {
      object[property] = value;
      return true;
    }
  });
}

function showActionDialog({
  title,
  message,
  confirmLabel = t('common.actions.confirm'),
  requiredText = '',
  checkboxLabel = '',
  hideCancel = false,
  destructive = false
}) {
  const normalizedRequiredText = String(requiredText).trim().toUpperCase();
  elements.actionDialogTitle.textContent = title;
  elements.actionDialogMessage.textContent = message;
  elements.actionDialogConfirm.textContent = confirmLabel;
  elements.actionDialogConfirm.classList.toggle('danger-action', destructive);
  elements.actionDialogConfirm.classList.toggle('primary-action', !destructive);
  elements.actionDialogTextWrap.hidden = !normalizedRequiredText;
  elements.actionDialogTextLabel.textContent = normalizedRequiredText
    ? t('confirm.typeToConfirm', { text: normalizedRequiredText })
    : '';
  elements.actionDialogText.value = '';
  elements.actionDialogCheckboxWrap.hidden = !checkboxLabel;
  elements.actionDialogCheckboxLabel.textContent = checkboxLabel;
  elements.actionDialogCheckbox.checked = false;
  elements.actionDialogCancel.hidden = hideCancel;
  elements.actionDialog.returnValue = '';

  const updateConfirmationState = () => {
    elements.actionDialogConfirm.disabled = Boolean(normalizedRequiredText)
      && elements.actionDialogText.value.trim().toUpperCase() !== normalizedRequiredText;
  };
  updateConfirmationState();
  elements.actionDialogText.addEventListener('input', updateConfirmationState);

  return new Promise((resolve) => {
    elements.actionDialog.addEventListener('close', () => {
      elements.actionDialogText.removeEventListener('input', updateConfirmationState);
      resolve({
        confirmed: elements.actionDialog.returnValue === 'confirm',
        checked: elements.actionDialogCheckbox.checked
      });
    }, { once: true });
    elements.actionDialog.showModal();
    window.setTimeout(() => {
      if (normalizedRequiredText) {
        elements.actionDialogText.focus();
      } else {
        elements.actionDialogConfirm.focus();
      }
    }, 0);
  });
}

populateAdminDietSelect('Nessuna dieta');

// Il pannello globale vive fuori dall area del singolo centro.
elements.adminShell.append(elements.ownerInvitationPanel);
populateDietSelect(elements.weekDietType, 'Nessuna dieta occasionale', elements.weekDietNumber);

document.addEventListener('click', handleOfflineNetworkAction, true);
document.addEventListener('submit', handleOfflineNetworkAction, true);
elements.refreshButtons.forEach((button) => button.addEventListener('click', () => refreshNow('manuale')));
elements.participantRefreshButton?.addEventListener('click', () => refreshNow('manuale'));
elements.participantPanel.addEventListener('touchstart', handleMealViewSwipeStart, { passive: true });
elements.participantPanel.addEventListener('touchend', handleMealViewSwipeEnd, { passive: true });
elements.participantPanel.addEventListener('touchcancel', cancelMealViewSwipe, { passive: true });
elements.weekPanel.addEventListener('touchstart', handleMealViewSwipeStart, { passive: true });
elements.weekPanel.addEventListener('touchend', handleMealViewSwipeEnd, { passive: true });
elements.weekPanel.addEventListener('touchcancel', cancelMealViewSwipe, { passive: true });
elements.authButton.addEventListener('click', handleAuthButton);
elements.adminCenterSelect.addEventListener('change', handleAdminCenterChange);
elements.ownerExitButton.addEventListener('click', handleOwnerExit);
elements.adminEmailChoice.addEventListener('click', handleAdministratorEmailChoice);
elements.adminEmailSignIn.addEventListener('click', handleAdministratorEmailSignIn);
elements.adminEmailCreate.addEventListener('click', handleAdministratorEmailCreation);
elements.adminPasswordReset.addEventListener('click', handleAdministratorPasswordReset);
elements.ownerInvitationGenerate.addEventListener('click', handleCenterInvitationGeneration);
elements.ownerInvitationCopy.addEventListener('click', handleCenterInvitationCopy);
if (elements.ownerInvitationShare && typeof navigator.share === 'function') {
  elements.ownerInvitationShare.hidden = false;
  elements.ownerInvitationShare.addEventListener('click', handleCenterInvitationShare);
}
elements.bootstrapButton.addEventListener('click', handleBootstrapButton);
elements.centerInitializerButton.addEventListener('click', handleCenterInitialization);
elements.initializerSignout.addEventListener('click', handleOwnerExit);
elements.monthJumpSelect.addEventListener('change', handleMonthJumpChange);
elements.weekJumpSelect.addEventListener('change', handleWeekJumpChange);
elements.monthPrev.addEventListener('click', () => shiftMonth(-1));
elements.monthNext.addEventListener('click', () => shiftMonth(1));
elements.monthGrid.addEventListener('click', handleMonthGridClick);
elements.participantMeals.addEventListener('click', handleParticipantMealsClick);
elements.weekPrev.addEventListener('click', () => shiftWeek(-7));
elements.weekNext.addEventListener('click', () => shiftWeek(7));
elements.adminParticipantSelect.addEventListener('change', handleAdminParticipantChange);
elements.adminNewParticipant.addEventListener('click', handleAdminNewParticipant);
elements.adminSaveButton.addEventListener('click', handleAdminSaveContact);
elements.adminCancelParticipant.addEventListener('click', handleAdminCancelParticipant);
elements.adminDeleteParticipant.addEventListener('click', handleAdminDeleteParticipant);
elements.adminPersonEditor.addEventListener('input', markAdminPersonDirty);
elements.adminPersonEditor.addEventListener('change', markAdminPersonDirty);
elements.adminPeopleList.addEventListener('click', handleAdminPeopleListClick);
elements.adminPeopleList.addEventListener('change', handleAdminPeopleListChange);
elements.adminParticipantDiets.addEventListener('change', () => {
  syncCustomDietNumber(elements.adminParticipantDiets, elements.adminParticipantDietNumber);
});
elements.adminGuestPreset.addEventListener('change', syncAdminGuestControls);
elements.adminAddGuest.addEventListener('click', handleAdminAddGuest);
elements.adminCenterSettingsSave.addEventListener('click', handleAdminCenterSettingsSave);
elements.adminCenterSettingsSection.addEventListener('input', markAdminCenterDirty);
elements.adminCenterSettingsSection.addEventListener('change', markAdminCenterDirty);
elements.adminInvitationGenerate.addEventListener('click', handleAdministratorInvitationGeneration);
if (elements.adminCandidateNewPerson) {
  elements.adminCandidateNewPerson.addEventListener('click', handleAdminCandidateNewPersonClick);
}
if (elements.inviteAccept) {
  elements.inviteAccept.addEventListener('click', handleInviteAccept);
}
if (elements.inviteReject) {
  elements.inviteReject.addEventListener('click', handleInviteReject);
}
if (elements.adminInvitationCopy) {
  elements.adminInvitationCopy.addEventListener('click', handleAdministratorInvitationCopy);
}
if (elements.adminInvitationShare) {
  elements.adminInvitationShare.addEventListener('click', handleAdministratorInvitationShare);
}
elements.adminTransferOwnership.addEventListener('click', handleOwnershipTransfer);
if (elements.adminInvitationList) {
  elements.adminInvitationList.addEventListener('click', handleAdminInvitationListClick);
}
if (elements.adminAccountList) {
  elements.adminAccountList.addEventListener('click', handleAdminAccountListClick);
}
elements.platformCenterList.addEventListener('click', handlePlatformCenterListClick);
elements.adminSectionNav.addEventListener('click', handleAdminSectionNavigation);
elements.adminPanel?.addEventListener('touchstart', handleAdminSectionSwipeStart, { passive: true });
elements.adminPanel?.addEventListener('touchend', handleAdminSectionSwipeEnd, { passive: true });
elements.adminPanel?.addEventListener('touchcancel', cancelAdminSectionSwipe, { passive: true });
if (elements.activationChecklistList) {
  elements.activationChecklistList.addEventListener('click', handleAdminSectionNavigation);
}
elements.adminAuditLoad.addEventListener('toggle', () => {
  if (elements.adminAuditLoad.open && elements.adminAuditLoad.dataset.loaded !== 'true') {
    handleAuditLoad();
  }
});
elements.adminCenterAvatarInput.addEventListener('change', handleAdminCenterAvatarSelection);
elements.adminCenterAvatarSave.addEventListener('click', handleAdminCenterAvatarSave);
elements.adminCenterAvatarRemove.addEventListener('click', handleAdminCenterAvatarRemove);
elements.adminExportButton.addEventListener('click', handleAdminExport);
if (elements.adminAdaptationsSave) {
  elements.adminAdaptationsSave.addEventListener('click', handleAdminAdaptationsSave);
}
if (elements.adminAdaptationsCancel) {
  elements.adminAdaptationsCancel.addEventListener('click', handleAdminAdaptationsCancel);
}
if (elements.adminAdaptationsReset) {
  elements.adminAdaptationsReset.addEventListener('click', handleAdminAdaptationsReset);
}
if (elements.adminThemeSelect) {
  elements.adminThemeSelect.addEventListener('change', handleThemeSelectChange);
}
if (elements.adminInterfaceStyleSelect) {
  elements.adminInterfaceStyleSelect.addEventListener('change', handleInterfaceStyleSelectChange);
}
if (elements.adminLanguageSelect) {
  elements.adminLanguageSelect.addEventListener('change', async (event) => {
    const newLocale = event.target.value;
    if (SUPPORTED_LOCALES.includes(newLocale)) {
      await setLocale(newLocale);
      renderAllViews();
    }
  });
}
if (elements.adminContactSharingSelect) {
  elements.adminContactSharingSelect.addEventListener('change', async (event) => {
    event.target.dataset.state = event.target.value;
    if (!state.residentSettingsMode && hasCurrentCapability(CAPABILITIES.MANAGE_CENTER_SETTINGS)) {
      const enabled = event.target.value === 'enabled';
      event.target.disabled = true;
      try {
        await updateParticipantContactSharing(enabled);
        state.centerContactSettings.participantContactSharingEnabled = enabled;
      } catch (error) {
        event.target.value = state.centerContactSettings.participantContactSharingEnabled
          ? 'enabled'
          : 'disabled';
        elements.adminStatus.textContent = friendlyErrorMessage(error, 'Impostazione non salvata');
      } finally {
        event.target.disabled = false;
      }
    }
  });
}
elements.residentPasswordToggle.addEventListener('click', () => togglePasswordVisibility(elements.residentPasswordInput, elements.residentPasswordToggle));
elements.adminPasswordToggle.addEventListener('click', () => togglePasswordVisibility(elements.adminPassword, elements.adminPasswordToggle));
if (elements.adminCommonPasswordToggle) {
  elements.adminCommonPasswordToggle.addEventListener('click', () => togglePasswordVisibility(elements.adminCommonPasswordInput, elements.adminCommonPasswordToggle));
}
if (elements.adminAdministratorPasswordToggle) {
  elements.adminAdministratorPasswordToggle.addEventListener('click', () => togglePasswordVisibility(elements.adminAdministratorPassword, elements.adminAdministratorPasswordToggle));
}
if (elements.adminSharedPasswordCurrentToggle) {
  elements.adminSharedPasswordCurrentToggle.addEventListener('click', () => togglePasswordVisibility(elements.adminSharedPasswordCurrent, elements.adminSharedPasswordCurrentToggle));
}
if (elements.adminSharedPasswordNewToggle) {
  elements.adminSharedPasswordNewToggle.addEventListener('click', () => togglePasswordVisibility(elements.adminSharedPasswordNew, elements.adminSharedPasswordNewToggle));
}
if (elements.residentAdminPasswordToggle) {
  elements.residentAdminPasswordToggle.addEventListener('click', () => togglePasswordVisibility(elements.residentAdminPassword, elements.residentAdminPasswordToggle));
}
if (elements.residentAdminUnlockButton) {
  elements.residentAdminUnlockButton.addEventListener('click', handleResidentAdministratorUnlock);
}
if (elements.viceAuthGoogle) {
  elements.viceAuthGoogle.addEventListener('click', handleViceGoogleAuthentication);
}
if (elements.viceAuthEmailChoice) {
  elements.viceAuthEmailChoice.addEventListener('click', handleViceEmailChoice);
}
if (elements.viceAuthEmailForm) {
  elements.viceAuthEmailForm.addEventListener('submit', handleViceEmailAuthentication);
}
if (elements.initializerPasswordToggle) {
  elements.initializerPasswordToggle.addEventListener('click', () => togglePasswordVisibility(elements.initializerPassword, elements.initializerPasswordToggle));
}
if (elements.adminPasswordSetupToggle) {
  elements.adminPasswordSetupToggle.addEventListener('click', () => togglePasswordVisibility(elements.adminPasswordSetupInput, elements.adminPasswordSetupToggle));
}
if (elements.adminPasswordSetupForm) {
  elements.adminPasswordSetupForm.addEventListener('submit', handleRequiredAdminPasswordSetup);
}
if (elements.adminPasswordSetupDialog) {
  elements.adminPasswordSetupDialog.addEventListener('cancel', (event) => event.preventDefault());
}
elements.residentLoginForm.addEventListener('submit', handleResidentLogin);
elements.forgetDeviceButton.addEventListener('click', handleForgetDevice);
elements.summaryPanel.addEventListener('click', handleSummaryPanelClick);
document.querySelectorAll('[data-access-link]').forEach((btn) => {
  btn.addEventListener('click', handleAccessLinkCopy);
});
document.querySelectorAll('[data-share-access-link]').forEach((button) => {
  button.addEventListener('click', handleAccessLinkShare);
});
elements.kitchenPanel.addEventListener('click', handleKitchenPanelClick);
window.addEventListener('beforeunload', handleBeforeUnload);
window.addEventListener('hashchange', handleAdminHashChange);
elements.weekOperationsDay.addEventListener('change', () => refreshWeekOperations(true));
elements.weekInvitedSave.addEventListener('click', handleWeekInvitedSave);
elements.weekHealthList.addEventListener('click', handleWeekHealthListClick);
elements.weekHealthSave.addEventListener('click', handleWeekHealthSave);
elements.weekDietType.addEventListener('change', () => {
  syncCustomDietNumber(elements.weekDietType, elements.weekDietNumber);
});
elements.weekDietSave.addEventListener('click', handleWeekDietSave);
elements.weekDietList.addEventListener('click', handleWeekDietListClick);
elements.weekKitchenNoteSave.addEventListener('click', handleWeekKitchenNoteSave);
elements.weekKitchenNoteList.addEventListener('click', handleWeekKitchenNoteListClick);
elements.adminPhoneConsent.addEventListener('change', syncAdminCheckboxes);
elements.adminPhoneInput.addEventListener('input', syncAdminCheckboxes);
elements.operationalLinks.addEventListener('click', handleOperationalLinksClick);
[
  ...elements.summaryNavLinks,
  ...elements.participantWeekNavLinks,
  ...elements.monthNavLinks,
  ...elements.participantNavLinks,
  elements.controlPanelEntry,
  elements.mealsReturnEntry
].filter(Boolean).forEach((link) => link.addEventListener('click', handleInAppNavigation));
window.addEventListener('popstate', () => {
  const nextMode = resolveMode();
  prepareMonthAutoScrollEntry(state.mode, nextMode);
  state.mode = nextMode;
  invalidateViewRequests();
  state.friendlyAccess = ['participant', 'week', 'summary'].includes(state.mode)
    || new URLSearchParams(window.location.search).get('access') === 'friendly';
  renderMode();
  refreshNow('navigazione');
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && Date.now() > state.nextRefreshAt - 2 * 60 * 1000) {
    scheduleBackgroundRefresh('ripresa');
  }
});
window.addEventListener('online', handleConnectivityChange);
window.addEventListener('offline', handleConnectivityChange);
window.addEventListener('focus', refreshAdminRolesWhenVisible);
document.addEventListener('visibilitychange', refreshAdminRolesWhenVisible);

function handleSummaryPanelClick(event) {
  const button = event.target.closest('[data-summary-day]');
  if (button) {
    handleSummaryDayChange(Number(button.dataset.summaryDay));
  }
}

function handleKitchenPanelClick(event) {
  const button = event.target.closest('[data-kitchen-day]');
  if (button) {
    handleKitchenDayChange(Number(button.dataset.kitchenDay));
  }
}

async function applyCenterDefaultLanguage(centerSettings) {
  if (!readStoredLocale() && centerSettings?.language && centerSettings.language !== getLocale()) {
    await setLocale(centerSettings.language, { persist: false });
    renderAllViews();
  }
}

function renderAllViews() {
  renderMode();
  if (state.mode === 'kitchen') {
    renderMeals();
  }
  if (elements.adminLanguageSelect) {
    elements.adminLanguageSelect.value = getLocale();
  }
  if (elements.adminParticipantDiets) {
    populateAdminDietSelect(t('diet.option.STANDARD'));
  }
  if (elements.weekDietType) {
    populateDietSelect(elements.weekDietType, t('diet.option.STANDARD'), elements.weekDietNumber);
  }
  if (state.mode === 'admin') {
    renderAdminPeopleList();
    renderAdminOverview();
    renderAdminCenterAvatarEditor();
  }
  applyTranslations(document);
}

async function bootstrapApp() {
  registerServiceWorker();
  updateConnectivityState();
  initializeOperationalLinks();
  initializeResidentAccess();

  const settingsPromise = loadCenterContactSettings().catch(() => null);
  const i18nPromise = initI18n({
    development: window.location.hostname === 'localhost',
    centerLocale: state.centerContactSettings.language || null
  });
  // Translation files are local, small and required before auth status text
  // can be painted. Firestore settings continue loading in parallel and do
  // not delay the first usable frame.
  await i18nPromise;
  renderAllViews();
  if (hasAdminInterface) initializeAuthPanel();
  const keepStartupGate = state.mode === 'admin' || state.residentRestorePending;
  if (!keepStartupGate) hideStartupSplash();
  const [, centerSettings] = await Promise.all([i18nPromise, settingsPromise]);
  if (centerSettings) {
    state.centerContactSettings = applyResidentPreferences(centerSettings);
    await applyCenterDefaultLanguage(centerSettings);
  }
  renderAllViews();

  const isPlainResidentLogin = state.friendlyAccess
    && ['participant', 'week'].includes(state.mode)
    && !state.residentRestorePending
    && !loadStoredResidentSignature()
    && !(state.mode === 'week' && canUseWeekWithoutParticipant());
  if (isPlainResidentLogin) {
    setParticipantStatus(t('auth.resident.status'));
  } else {
    refreshNow('avvio');
  }

  window.setTimeout(hideStartupSplash, 8000);
}

bootstrapApp().catch(console.error);

function hideStartupSplash() {
  const splash = document.querySelector('[data-startup-splash]');
  if (splash) {
    splash.classList.add('startup-splash-hidden');
    window.setTimeout(() => splash.remove(), 180);
  }
}

function handleConnectivityChange() {
  updateConnectivityState();
  if (isConnectionAvailable()) {
    scheduleBackgroundRefresh('connessione');
  }
}

function handleOfflineNetworkAction(event) {
  if (isConnectionAvailable() || !actionRequiresConnection(event.target)) {
    return;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
  elements.offlineBanner.hidden = false;
  elements.offlineBanner.textContent = t('network.offline.guardedAction');
}

function scheduleBackgroundRefresh(source) {
  window.clearTimeout(state.backgroundRefreshTimerId);
  state.backgroundRefreshTimerId = window.setTimeout(() => refreshNow(source), 180);
}

function prepareMonthAutoScrollEntry(previousMode, nextMode) {
  if (previousMode === nextMode) return;
  if (nextMode === 'summary') {
    // Ogni nuovo ingresso nel riepilogo parte da Oggi. La scelta Domani vale
    // soltanto durante la consultazione corrente.
    state.summaryDayOffset = 0;
  }
  cancelMonthAutoScroll();
  state.monthAutoScrollHandled = false;
  cancelOperationalAutoScroll();
  state.operationalAutoScrollHandled = false;
}

function cancelMonthAutoScroll(markHandled = false) {
  if (state.monthAutoScrollTimerId) {
    window.clearTimeout(state.monthAutoScrollTimerId);
    state.monthAutoScrollTimerId = 0;
  }
  if (state.monthAutoScrollCleanup) {
    state.monthAutoScrollCleanup();
    state.monthAutoScrollCleanup = null;
  }
  if (markHandled) {
    state.monthAutoScrollHandled = true;
  }
}

function scheduleMonthAutoScroll() {
  const isMobile = window.matchMedia('(max-width: 620px)').matches;
  if (
    state.monthAutoScrollHandled
    || state.monthAutoScrollTimerId
    || state.mode !== 'participant'
    || !state.selectedParticipant
    || !elements.calendarPanel
    || !isMobile
  ) {
    return;
  }
  if (window.scrollY > 24) {
    state.monthAutoScrollHandled = true;
    return;
  }

  const cancelForUser = () => cancelMonthAutoScroll(true);
  MONTH_AUTO_SCROLL_CANCEL_EVENTS.forEach((eventName) => {
    window.addEventListener(eventName, cancelForUser, { once: true, passive: true });
  });
  state.monthAutoScrollCleanup = () => {
    MONTH_AUTO_SCROLL_CANCEL_EVENTS.forEach((eventName) => {
      window.removeEventListener(eventName, cancelForUser);
    });
  };

  state.monthAutoScrollTimerId = window.setTimeout(() => {
    state.monthAutoScrollTimerId = 0;
    state.monthAutoScrollCleanup?.();
    state.monthAutoScrollCleanup = null;
    state.monthAutoScrollHandled = true;
    if (
      state.mode !== 'participant'
      || document.hidden
      || window.scrollY > 24
      || !window.matchMedia('(max-width: 620px)').matches
    ) {
      return;
    }
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    elements.calendarPanel.scrollIntoView({ behavior, block: 'start' });
  }, MONTH_AUTO_SCROLL_DELAY_MS);
}

function cancelOperationalAutoScroll(markHandled = false) {
  if (state.operationalAutoScrollTimerId) {
    window.clearTimeout(state.operationalAutoScrollTimerId);
    state.operationalAutoScrollTimerId = 0;
  }
  if (state.operationalAutoScrollCleanup) {
    state.operationalAutoScrollCleanup();
    state.operationalAutoScrollCleanup = null;
  }
  if (markHandled) state.operationalAutoScrollHandled = true;
}

function scheduleOperationalAutoScroll({ reset = false, delayMs = OPERATIONAL_AUTO_SCROLL_DELAY_MS } = {}) {
  if (reset) {
    cancelOperationalAutoScroll();
    state.operationalAutoScrollHandled = false;
  }
  const target = state.mode === 'summary'
    ? elements.summaryDateTabs
    : state.mode === 'kitchen'
      ? elements.kitchenDateTabs
      : null;
  const panel = state.mode === 'summary' ? elements.summaryPanel : elements.kitchenPanel;
  if (
    state.operationalAutoScrollHandled
    || state.operationalAutoScrollTimerId
    || !target
    || !panel
    || !window.matchMedia('(max-width: 620px)').matches
  ) return;

  const cancelForUser = () => cancelOperationalAutoScroll(true);
  MONTH_AUTO_SCROLL_CANCEL_EVENTS.forEach((eventName) => {
    window.addEventListener(eventName, cancelForUser, { once: true, passive: true });
  });
  state.operationalAutoScrollCleanup = () => {
    MONTH_AUTO_SCROLL_CANCEL_EVENTS.forEach((eventName) => {
      window.removeEventListener(eventName, cancelForUser);
    });
  };

  state.operationalAutoScrollTimerId = window.setTimeout(() => {
    state.operationalAutoScrollTimerId = 0;
    state.operationalAutoScrollCleanup?.();
    state.operationalAutoScrollCleanup = null;
    state.operationalAutoScrollHandled = true;
    const targetRect = target.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const needsMoreRoom = panelRect.bottom > window.innerHeight && targetRect.top > 8;
    if (
      !needsMoreRoom
      || document.hidden
      || !window.matchMedia('(max-width: 620px)').matches
      || (state.mode !== 'summary' && state.mode !== 'kitchen')
    ) return;
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    target.scrollIntoView({ behavior, block: 'start' });
  }, delayMs);
}

function updateConnectivityState() {
  const isOffline = !isConnectionAvailable();
  document.body.classList.toggle('is-offline', isOffline);
  elements.offlineBanner.hidden = !isOffline;
  if (isOffline) {
    const lastUpdate = formatLastUpdateTime(state.lastSuccessfulRefreshAt);
    elements.offlineBanner.textContent = lastUpdate
      ? t('network.offline.bannerWithTime', { time: lastUpdate })
      : t('network.offline.banner');
  }
  document.querySelectorAll(NETWORK_ACTION_SELECTOR).forEach((control) => {
    control.classList.toggle('offline-disabled', isOffline);
    if (isOffline) {
      control.setAttribute('aria-disabled', 'true');
    } else {
      control.removeAttribute('aria-disabled');
    }
  });
  elements.refreshButtons.forEach((button) => {
    button.disabled = isOffline;
  });
}

function handleInAppNavigation(event) {
  const link = event.currentTarget;
  const targetUrl = new URL(link.href, window.location.href);
  const targetMode = targetUrl.searchParams.get('view');
  const isOperationalTarget = ['participant', 'week', 'summary'].includes(targetMode);
  const isControlPanelTarget = targetMode === 'admin' && link === elements.controlPanelEntry;
  if (!isOperationalTarget && !isControlPanelTarget) {
    return;
  }

  // Participant-first pages deliberately remove the large admin DOM at
  // startup. In that case keep the link's native navigation so the browser
  // loads the complete control panel automatically; intercepting it would
  // only change the URL while leaving an empty page.
  if (isControlPanelTarget && !hasAdminInterface) {
    return;
  }

  event.preventDefault();
  if (isOperationalTarget) {
    state.residentSettingsMode = false;
    targetUrl.searchParams.set('access', 'friendly');
  } else {
    targetUrl.searchParams.delete('access');
    const currentUser = getCurrentUser();
    const hasStrongAdministratorSession = currentUser
      && !currentUser.isAnonymous
      && !isResidentTechnicalEmail(currentUser.email);
    state.residentSettingsMode = state.residentReady && !hasStrongAdministratorSession;
    if (!state.residentReady) {
      targetUrl.searchParams.delete('c');
    }
  }
  window.history.pushState({}, '', targetUrl.pathname + targetUrl.search);
  prepareMonthAutoScrollEntry(state.mode, targetMode);
  state.mode = targetMode;
  invalidateViewRequests();
  state.friendlyAccess = isOperationalTarget;
  if (state.residentSettingsMode) {
    state.adminActiveSection = 'adaptations';
    state.adminMobileSection = 'adaptations';
    renderResidentSettingsPanel();
  }
  renderMode();
  if (isControlPanelTarget) {
    // The normal refresh path intentionally skips admin mode. Hydrate the
    // panel explicitly when reached through an in-app link, otherwise mobile
    // and tablet users only see it after a browser refresh.
    void hydrateAdminNavigation().catch(showAuthError);
    return;
  }
  if (state.residentReady || (state.mode === 'week' && canUseWeekWithoutParticipant())) {
    // Rebuild immediately from the in-memory model. Original and the modern
    // styles use different icons/markup, so waiting for the network refresh
    // leaves the previous visual language visible for several moments.
    renderParticipantMeals();
  }
  refreshNow('navigazione');
}

async function hydrateAdminNavigation() {
  if (state.mode !== 'admin') return;
  const user = getCurrentUser();
  if (user && !user.isAnonymous && !isResidentTechnicalEmail(user.email)) {
    state.residentSettingsMode = false;
    if (state.adminRole && state.adminAuthUid === user.uid && !state.adminAuthorizationPending) {
      renderMode();
      return;
    }
    beginAdminAuthorizationCheck();
    await applyAdminAuthState(user);
    renderMode();
    return;
  }

  // A resident technical session can replace Firebase Auth while the previous
  // strong admin role is still held in memory. Reconcile it exactly as the
  // initial auth watcher does; this also mounts either resident settings or
  // the administrator sign-in panel without requiring a page refresh.
  await reconcileAdminAccessWithoutStrongUser();
}

function handleMealViewSwipeStart(event) {
  const touch = event.touches?.[0];
  if (!touch || event.target.closest('input, select, textarea, button, a, dialog, [contenteditable="true"]')) {
    mealViewSwipeStart = null;
    return;
  }
  mealViewSwipeStart = { x: touch.clientX, y: touch.clientY, mode: state.mode };
}

function handleMealViewSwipeEnd(event) {
  const start = mealViewSwipeStart;
  mealViewSwipeStart = null;
  const touch = event.changedTouches?.[0];
  if (!start || !touch || start.mode !== state.mode) return;
  const deltaX = touch.clientX - start.x;
  const deltaY = touch.clientY - start.y;
  if (Math.abs(deltaX) < MEAL_VIEW_SWIPE_MIN_X
      || Math.abs(deltaY) > MEAL_VIEW_SWIPE_MAX_Y
      || Math.abs(deltaX) < Math.abs(deltaY) * 1.35) return;
  if (state.mode === 'participant' && deltaX < 0) {
    elements.participantWeekNavLinks[0]?.click();
  } else if (state.mode === 'week' && deltaX > 0) {
    elements.monthNavLinks[0]?.click();
  }
}

function cancelMealViewSwipe() {
  mealViewSwipeStart = null;
}

function initializeOperationalLinks() {
  const requestedToken = new URLSearchParams(window.location.search).get('t');
  const publicToken = state.adminRole
    ? state.operationalLinks.publicTokenId
    : requestedToken || state.operationalLinks.publicTokenId;
  const kitchenToken = state.adminRole
    ? state.operationalLinks.kitchenTokenId
    : state.mode === 'kitchen' && requestedToken
      ? requestedToken
      : state.operationalLinks.kitchenTokenId;
  const centerId = getActiveCenterId();
  const personalAccess = 'friendly';
  const monthHref = buildOperationalLink('participant', publicToken, centerId, personalAccess);
  elements.publicLink.href = monthHref;
  elements.summaryLink.href = buildOperationalLink('summary', publicToken, centerId);
  elements.kitchenLink.href = buildOperationalLink('kitchen', kitchenToken, centerId);
  elements.summaryNavLinks.forEach((link) => {
    link.href = buildOperationalLink('summary', publicToken, centerId, personalAccess);
  });
  const entryMode = resolveEntryView() === 'week' ? 'week' : 'participant';
  elements.participantNavLinks.forEach((link) => {
    link.href = buildOperationalLink(entryMode, publicToken, centerId, personalAccess);
  });
  const weekHref = buildOperationalLink('week', publicToken, centerId, personalAccess);
  elements.participantWeekNavLinks.forEach((link) => {
    link.href = weekHref;
  });
  elements.monthNavLinks.forEach((link) => {
    link.href = monthHref;
  });
  const adminEntryUrl = new URL(window.location.origin + window.location.pathname);
  adminEntryUrl.searchParams.set('view', 'admin');
  if (centerId) adminEntryUrl.searchParams.set('c', centerId);
  elements.controlPanelEntry.href = adminEntryUrl.pathname + adminEntryUrl.search;
  elements.mealsReturnEntry.href = buildOperationalLink(
    entryMode,
    publicToken,
    centerId,
    personalAccess
  );
  const mealsAccessButton = document.querySelector('[data-access-link="pasti"]');
  const kitchenAccessButton = document.querySelector('[data-access-link="cucina"]');
  const mealsShareButton = document.querySelector('[data-share-access-link="pasti"]');
  const kitchenShareButton = document.querySelector('[data-share-access-link="cucina"]');
  if (mealsAccessButton) mealsAccessButton.disabled = !publicToken;
  if (kitchenAccessButton) kitchenAccessButton.disabled = !kitchenToken;
  if (mealsShareButton) mealsShareButton.disabled = !publicToken;
  if (kitchenShareButton) kitchenShareButton.disabled = !kitchenToken;
  renderOperationalLinkMetadata();
}

function buildOperationalLink(view, token, centerId, access = '') {
  const params = new URLSearchParams({ view, c: centerId });
  if (token) params.set('t', token);
  if (access) params.set('access', access);
  return `${window.location.origin}/?${params.toString()}`;
}

function renderOperationalLinkMetadata() {
  const linkRows = [
    [elements.publicLinkStatus, elements.publicLinkMeta, state.operationalLinks.publicCreatedAt],
    [elements.kitchenLinkStatus, elements.kitchenLinkMeta, state.operationalLinks.kitchenCreatedAt]
  ];
  linkRows.forEach(([status, metadata, createdAt]) => {
    status.textContent = t('admin.access.active');
    const date = normalizeClientDate(createdAt);
    metadata.textContent = date
      ? t('admin.access.activatedOn', { date: new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium' }).format(date) })
      : t('admin.access.noActivationDate');
  });
}

function handleAdminSectionNavigation(event) {
  const link = event.target.closest('[data-admin-section-id], [data-admin-checklist-target]');
  if (!link) return;
  const section = link.dataset.adminSectionId
    || ADMIN_SECTION_BY_TARGET[link.dataset.adminChecklistTarget];

  if (!section) return;
  event.preventDefault();
  selectAdminSection(section, { focus: true, updateHash: true });
}

let adminSectionSwipe = null;
let adminSectionSwipeTimer = 0;

function handleAdminSectionSwipeStart(event) {
  if (!window.matchMedia('(max-width: 620px)').matches
    || state.mode !== 'admin'
    || elements.adminPanel?.hidden
    || event.touches.length !== 1) {
    adminSectionSwipe = null;
    return;
  }
  if (event.target.closest('input, select, textarea, button, a, summary, [contenteditable="true"], [data-admin-section-nav]')) {
    adminSectionSwipe = null;
    return;
  }
  const touch = event.touches[0];
  adminSectionSwipe = {
    x: touch.clientX,
    y: touch.clientY,
    startedAt: Date.now()
  };
}

function handleAdminSectionSwipeEnd(event) {
  const start = adminSectionSwipe;
  adminSectionSwipe = null;
  if (!start || event.changedTouches.length !== 1) return;

  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - start.x;
  const deltaY = touch.clientY - start.y;
  const duration = Date.now() - start.startedAt;
  const threshold = Math.max(54, window.innerWidth * 0.12);
  if (duration > 900 || Math.abs(deltaX) < threshold || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) {
    return;
  }

  const availableSections = ADMIN_SECTIONS.filter(isAdminSectionAllowed);
  const currentIndex = availableSections.indexOf(state.adminActiveSection);
  if (currentIndex < 0) return;
  const direction = deltaX < 0 ? 1 : -1;
  const nextSection = availableSections[currentIndex + direction];
  if (!nextSection) return;

  window.clearTimeout(adminSectionSwipeTimer);
  elements.adminPanel.classList.remove('admin-snap-forward', 'admin-snap-backward');
  elements.adminPanel.classList.add(direction > 0 ? 'admin-snap-forward' : 'admin-snap-backward');
  selectAdminSection(nextSection, { updateHash: true });

  const activeTab = elements.adminSectionNav.querySelector(`[data-admin-section-id="${nextSection}"]`);
  activeTab?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  elements.adminSectionNav.scrollIntoView?.({ behavior: 'smooth', block: 'start', inline: 'nearest' });
  adminSectionSwipeTimer = window.setTimeout(() => {
    elements.adminPanel?.classList.remove('admin-snap-forward', 'admin-snap-backward');
  }, 240);
}

function cancelAdminSectionSwipe() {
  adminSectionSwipe = null;
}

const ADMIN_SECTION_VISIT_KEY = 'tavolaComune.adminPanelVisited';
const ADMIN_CALENDAR_ONBOARDING_KEY = 'tavolaComune.calendarOnboardingCompleted';
const ADMIN_SECTIONS = Object.freeze(['configuration', 'people', 'overview', 'adaptations', 'access', 'activity']);
const ADMIN_SECTION_TARGETS = Object.freeze({
  configuration: 'admin-configuration-section',
  overview: 'admin-overview-section',
  people: 'admin-person-editor',
  adaptations: 'admin-adaptations-section',
  access: 'admin-access-section',
  activity: 'admin-activity-section'
});
const ADMIN_SECTION_BY_TARGET = Object.freeze(Object.fromEntries(
  Object.entries(ADMIN_SECTION_TARGETS).map(([section, target]) => [target, section])
));
const adminSectionMounts = new Map();

function initializeAdminProgressiveSections() {
  if (!hasAdminInterface || elements.adminPanel === inertElement) return;
  const sections = [...elements.adminPanel.querySelectorAll('[data-admin-mobile-section]')];
  sections.forEach((node) => {
    const section = node.dataset.adminMobileSection;
    if (!ADMIN_SECTIONS.includes(section)) return;
    const marker = document.createComment(`admin-section:${section}`);
    node.before(marker);
    const mounts = adminSectionMounts.get(section) || [];
    mounts.push({ marker, node });
    adminSectionMounts.set(section, mounts);
  });
  mountAdminSection(resolveInitialAdminSection());
}

function mountAdminSection(section) {
  if (adminSectionMounts.size === 0) return;
  adminSectionMounts.forEach((mounts, mountedSection) => {
    mounts.forEach(({ marker, node }) => {
      if (mountedSection === section) {
        if (!node.isConnected && marker.isConnected) marker.after(node);
        applyTranslations(node);
      } else if (node.isConnected) {
        node.remove();
      }
    });
  });
}

initializeAdminProgressiveSections();

function getAdminSectionVisitKey() {
  return getCenterScopedStorageKey(ADMIN_SECTION_VISIT_KEY);
}

function resolveInitialAdminSection() {
  const hashSection = ADMIN_SECTION_BY_TARGET[window.location.hash.replace('#', '')];
  if (hashSection) return hashSection;
  try {
    return window.localStorage.getItem(getAdminSectionVisitKey()) === 'true'
      ? 'overview'
      : 'configuration';
  } catch {
    return 'configuration';
  }
}

function markAdminPanelVisited() {
  try {
    window.localStorage.setItem(getAdminSectionVisitKey(), 'true');
  } catch {
    // La persistenza è facoltativa.
  }
}

function hasCompletedCalendarOnboarding() {
  try {
    return window.localStorage.getItem(
      getCenterScopedStorageKey(ADMIN_CALENDAR_ONBOARDING_KEY)
    ) === 'true';
  } catch {
    return false;
  }
}

function markCalendarOnboardingCompleted() {
  try {
    window.localStorage.setItem(
      getCenterScopedStorageKey(ADMIN_CALENDAR_ONBOARDING_KEY),
      'true'
    );
  } catch {
    // L'accompagnamento iniziale resta utilizzabile anche senza persistenza locale.
  }
}

function selectAdminSection(section, { focus = false, updateHash = false } = {}) {
  if (!ADMIN_SECTIONS.includes(section) || !isAdminSectionAllowed(section)) return;

  mountAdminSection(section);
  state.adminActiveSection = section;
  state.adminMobileSection = section;
  if (section === 'people') {
    state.adminParticipantId = '';
    state.adminPersonDirty = false;
    renderAdminParticipantOptions();
    renderAdminPeopleList();
    syncAdminContactForm();
  }
  if (section === 'access') {
    queueMicrotask(refreshAdminRolesWhenVisible);
  }
  renderAdminSectionVisibility();
  renderAdminMobileSection();
  markAdminPanelVisited();

  if (updateHash) {
    const targetId = ADMIN_SECTION_TARGETS[section];
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${window.location.search}#${targetId}`
    );
  }

  if (focus) {
    const targetId = ADMIN_SECTION_TARGETS[section];
    const target = document.getElementById(targetId);
    target?.focus?.({ preventScroll: true });
    target?.scrollIntoView?.({ behavior: 'smooth', block: 'start', inline: 'nearest' });
  }
}

function renderAdminSectionVisibility() {
  if (!elements.adminPanel) return;
  elements.adminPanel.dataset.adminSection = state.adminActiveSection;
}

function renderAdminMobileSection() {
  mountAdminSection(state.adminMobileSection);
  state.adminActiveSection = state.adminMobileSection;
  renderAdminSectionVisibility();
  const links = [
    [elements.adminNavConfiguration, 'configuration'],
    [elements.adminNavOverview, 'overview'],
    [elements.adminNavPeople, 'people'],
    [elements.adminNavAdaptations, 'adaptations'],
    [elements.adminNavAccess, 'access'],
    [elements.adminNavActivity, 'activity']
  ];
  links.forEach(([link, section]) => {
    if (!link) return;
    if (section === state.adminMobileSection) {
      link.setAttribute('aria-current', 'page');
      link.setAttribute('aria-selected', 'true');
      link.tabIndex = 0;
    } else {
      link.removeAttribute('aria-current');
      link.setAttribute('aria-selected', 'false');
      link.tabIndex = -1;
    }
  });
}

function isAdminSectionAllowed(section) {
  if (state.residentSettingsMode) return section === 'adaptations';
  if (!isAdministratorProfileComplete() && section !== 'configuration') {
    return false;
  }
  const capabilityMap = {
    configuration: [CAPABILITIES.MANAGE_CENTER_SETTINGS],
    overview: [CAPABILITIES.VIEW_CENTER_OVERVIEW],
    people: [CAPABILITIES.MANAGE_PARTICIPANTS],
    adaptations: [CAPABILITIES.MANAGE_CENTER_SETTINGS],
    access: [CAPABILITIES.MANAGE_ADMINS],
    activity: [CAPABILITIES.VIEW_AUDIT_LOG, CAPABILITIES.MANAGE_CALENDAR]
  };
  return (capabilityMap[section] || []).some((capability) => hasCurrentCapability(capability));
}

function isAdministratorProfileComplete() {
  return state.centerContactSettings.administratorProfileRequired !== true
    || state.centerContactSettings.administratorProfileComplete === true;
}

function handleAdminHashChange() {
  const section = ADMIN_SECTION_BY_TARGET[window.location.hash.replace('#', '')];
  if (section) selectAdminSection(section, { focus: true });
}

function normalizeClientDate(value) {
  if (value && typeof value.toDate === 'function') return value.toDate();
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function initializeAuthPanel() {
  let authSettled = false;
  let authRevision = 0;
  elements.authStatus.textContent = t('app.header.checkingAccess', {}, {
    fallback: 'Accesso in verifica'
  });
  if (!isFirebaseConfigured) {
    elements.authButton.disabled = true;
    elements.authStatus.textContent = 'Config mancante: ' + missingFirebaseConfigValues.join(', ');
    return;
  }

  const authFallback = window.setTimeout(() => {
    if (authSettled || state.mode !== 'admin') {
      return;
    }
    void reconcileAdminAccessWithoutStrongUser();
  }, 1800);

  elements.authButton.disabled = false;
  watchAuth((user) => {
    const strongAuthUser = user && !user.isAnonymous && !isResidentTechnicalEmail(user.email);
    if (!shouldProcessAdminAuthEvent({
      mode: state.mode,
      residentAuthTransition: state.residentAuthTransition,
      residentRestorePending: state.residentRestorePending,
      strongAuthUser: Boolean(strongAuthUser)
    })) {
      return;
    }
    const revision = ++authRevision;
    authSettled = true;
    window.clearTimeout(authFallback);
    if (!user) {
      if (state.mode === 'admin') void reconcileAdminAccessWithoutStrongUser();
      else if (state.adminRole) setSignedOutState();
      return;
    }

    if (user.isAnonymous || isResidentTechnicalEmail(user.email)) {
      if (state.mode === 'admin') void reconcileAdminAccessWithoutStrongUser();
      else if (state.adminRole) setSignedOutState();
      return;
    }

    beginAdminAuthorizationCheck();
    applyAdminAuthState(user, revision, () => authRevision).catch(showAuthError);
  });
}

function beginAdminAuthorizationCheck() {
  state.adminAuthorizationPending = true;
  elements.adminShell.setAttribute('aria-busy', 'true');
  elements.adminShell.open = state.mode === 'admin';
  elements.adminAuthMethods.hidden = true;
  elements.authActions.hidden = true;
  elements.adminEmailAuth.hidden = true;
  elements.adminPanel.hidden = true;
  elements.operationalLinks.hidden = true;
  elements.authStatus.textContent = t('app.header.verifyingAuth', {}, {
    fallback: 'Accesso al pannello in corso…'
  });
}

function finishAdminAuthorizationCheck() {
  state.adminAuthorizationPending = false;
  elements.adminShell.removeAttribute('aria-busy');
  hideStartupSplash();
}

function reconcileAdminAccessWithoutStrongUser() {
  if (state.residentAuthTransition || state.residentRestorePending) {
    return Promise.resolve();
  }
  if (state.adminAccessReconcilePromise) return state.adminAccessReconcilePromise;
  let request;
  request = (async () => {
    setSignedOutState();
    const canRestoreResident = state.mode === 'admin'
      && (state.residentReady || Boolean(loadStoredResidentSignature()));
    if (!canRestoreResident) {
      renderMode();
      return;
    }
    beginAdminAuthorizationCheck();
    await restoreResidentSettingsPanel();
    finishAdminAuthorizationCheck();
    renderMode();
  })().catch((error) => {
    finishAdminAuthorizationCheck();
    showAuthError(error);
  }).finally(() => {
    if (state.adminAccessReconcilePromise === request) {
      state.adminAccessReconcilePromise = null;
    }
  });
  state.adminAccessReconcilePromise = request;
  return request;
}

async function applyAdminAuthState(user, revision = 0, getCurrentRevision = () => revision) {
  const hydrationVersion = ++state.adminHydrationVersion;
  state.adminPanelHydrating = true;
  try {
    return await resolveAdminAuthState(user, revision, () => (
      hydrationVersion === state.adminHydrationVersion
        ? getCurrentRevision()
        : Number.NaN
    ));
  } finally {
    if (hydrationVersion === state.adminHydrationVersion) {
      state.adminPanelHydrating = false;
    }
  }
}

async function resolveAdminAuthState(user, revision = 0, getCurrentRevision = () => revision) {
  const adminModule = await loadDomainModule('admin');
  const isPlatformOwner = adminModule.isPlatformOwnerUser(user);
  let access = await adminModule.loadAdminCenterAccess(user);
  if (revision !== getCurrentRevision() || getCurrentUser()?.uid !== user.uid) {
    return;
  }

  let invitationResponse = '';
  const roleInvitationId = getAdminRoleInvitationId();
  const storedDecision = access.invitationPending
    ? loadAdminInvitationDecision(roleInvitationId)
    : '';
  const emailVerificationPending = requiresAdministratorPassword(user)
    && user.emailVerified !== true;
  if (storedDecision === 'ACCEPT' && emailVerificationPending) {
    elements.adminEmailStatus.textContent = state.adminAuthNotice
      || 'Ti abbiamo inviato un’email di verifica. Conferma il tuo indirizzo per completare l’attivazione.';
  } else if (storedDecision === 'ACCEPT') {
    try {
      elements.adminEmailStatus.textContent = 'Attivazione in corso...';
      const result = await adminModule.acceptAdministratorInvitation(roleInvitationId, user);
      clearAdminInvitationDecision(roleInvitationId);
      elements.adminEmailStatus.textContent = t('admin.invitations.accepted');
      await showRoleInvitationAccepted(result.role);
      activateAdminCenter(result.centerId);
      const acceptedUrl = new URL(window.location.href);
      acceptedUrl.searchParams.delete('adminInvite');
      window.history.replaceState({}, '', acceptedUrl.pathname + acceptedUrl.search);
      window.location.reload();
      return;
    } catch (error) {
      elements.adminEmailStatus.textContent = friendlyErrorMessage(error, 'Accettazione fallita');
    }
  } else if (storedDecision === 'REJECT') {
    try {
      await adminModule.rejectAdministratorInvitation(roleInvitationId, user);
      clearAdminInvitationDecision(roleInvitationId);
      const rejectedUrl = new URL(window.location.href);
      rejectedUrl.searchParams.delete('adminInvite');
      window.history.replaceState({}, '', rejectedUrl.pathname + rejectedUrl.search);
      access = { ...access, invitationPending: false, invitationError: false };
      invitationResponse = 'REJECTED';
    } catch (error) {
      elements.adminEmailStatus.textContent = friendlyErrorMessage(error, 'Rifiuto fallito');
    }
  }

  if (access.redirectCenterId && !isPlatformOwner) {
    activateAdminCenter(access.redirectCenterId);
    const redirectedUrl = new URL(window.location.href);
    redirectedUrl.searchParams.delete('invite');
    redirectedUrl.searchParams.delete('adminInvite');
    window.history.replaceState({}, '', redirectedUrl.pathname + redirectedUrl.search);
    window.location.reload();
    return;
  }

  const isAdmin = access.active;
  const invitationPending = access.invitationPending === true;
  state.platformOwner = isPlatformOwner;
  state.adminRole = isAdmin ? access.role : '';
  state.adminAuthUid = isAdmin || isPlatformOwner ? user.uid : '';
  state.adminMassPermission = isAdmin && access.massPermission === true;
  state.adminCanManageMass = isAdmin && hasCurrentCapability(CAPABILITIES.MANAGE_MASS);
  state.adminCanManageDailyOperations = isAdmin && hasCurrentCapability(CAPABILITIES.MANAGE_DAILY_OPERATIONS);
  renderAdminCenterSwitcher(access.availableCenters, access.centerId, isPlatformOwner);
  showRequiredAdminPasswordSetup(user, access.passwordSetupRequired === true);
  elements.adminShell.dataset.adminActive = isAdmin ? 'true' : 'false';
  elements.adminShell.dataset.adminOwner = access.role === 'OWNER' ? 'true' : 'false';
  elements.adminShell.dataset.platformOwner = isPlatformOwner ? 'true' : 'false';
  elements.adminShell.open = isAdmin || invitationPending || access.needsInitialization || state.platformOwner || state.mode === 'admin';
  elements.authActions.classList.add('auth-actions-signed-in');
  elements.authActions.hidden = true;
  elements.adminAuthMethods.hidden = true;
  elements.authButton.textContent = t('common.actions.exit');
  elements.adminEmailAuth.hidden = true;
  elements.authStatus.textContent = isPlatformOwner
    ? user.email || t('role.platformOwner')
    : isAdmin
      ? user.email || t('role.authenticatedAdmin')
      : invitationPending
        ? t('app.header.invitationPending') // Invito in attesa della tua risposta
      : access.needsInitialization
        ? t('app.header.initYourCenter')
        : access.invitationError
          ? t('app.header.invitationInvalid')
          : invitationResponse === 'REJECTED'
            ? t('app.header.invitationRejected')
            : t('app.header.unauthorizedAccount');
  const roleLabels = {
    OWNER: t('role.owner'),
    ADMIN: t('role.admin'),
    MANAGER: t('role.vice'),
    RESIDENT: t('role.resident')
  };
  const roleLabel = state.platformOwner
    ? t('role.platformOwner')
    : isAdmin
      ? roleLabels[access.role] || t('role.admin')
      : '';
  elements.adminRoleChip.hidden = true;
  elements.adminRoleChip.textContent = '';
  elements.authUid.hidden = true;
  elements.authUid.textContent = '';
  elements.centerInitializer.hidden = !access.needsInitialization;
  elements.bootstrapButton.hidden = !hasCurrentCapability(CAPABILITIES.MANAGE_CALENDAR);
  elements.operationalLinks.hidden = !hasCurrentCapability(CAPABILITIES.VIEW_OPERATIONAL_LINKS);
  if (isPlatformOwner) {
    elements.bootstrapButton.hidden = true;
    elements.operationalLinks.hidden = true;
  }
  // Keep the complete panel atomic: participants, roles and operational links
  // must be ready before any actionable control becomes visible.
  elements.adminPanel.hidden = true;
  if (elements.adminInviteAcceptPanel) {
    elements.adminInviteAcceptPanel.hidden = !invitationPending
      && !access.invitationError
      && invitationResponse !== 'REJECTED';
    elements.adminInviteAcceptText.textContent = invitationResponse === 'REJECTED'
      ? t('admin.invitations.rejectedNotice')
      : invitationPending
      ? invitationPrompt(access.invitationRole)
      : t('admin.invitations.invalidOrExpired');
    elements.inviteAccept.disabled = !invitationPending;
    elements.inviteReject.disabled = !invitationPending;
  }
  elements.centerInitializer.hidden = isPlatformOwner || !access.needsInitialization;
  if (access.needsInitialization && user && user.email) {
    elements.initializerEmail.textContent = user.email;
    elements.initializerAccountInfo.hidden = false;
    const isEmailAuth = requiresAdministratorPassword(user);
    if (elements.initializerPasswordRow) {
      elements.initializerPasswordRow.hidden = !isEmailAuth;
      if (elements.initializerPassword) {
        elements.initializerPassword.required = isEmailAuth;
        elements.initializerPassword.value = '';
      }
    }
  } else {
    elements.initializerAccountInfo.hidden = true;
    if (elements.initializerPasswordRow) elements.initializerPasswordRow.hidden = true;
  }
  if (elements.adminAdministratorEmail) {
    elements.adminAdministratorEmail.value = user.email || '';
    elements.adminAdministratorEmail.readOnly = true;
  }
  if (elements.adminAdministratorPassword) {
    elements.adminAdministratorPassword.value = '';
  }
  elements.ownerInvitationPanel.hidden = !state.platformOwner;
  applyAdminCapabilityVisibility();
  if (state.platformOwner) {
    await refreshPlatformCenterList();
    if (revision !== getCurrentRevision() || getCurrentUser()?.uid !== user.uid) return;
  }
  if (isAdmin && !state.platformOwner) {
    await refreshAdminParticipants();
    if (revision !== getCurrentRevision() || getCurrentUser()?.uid !== user.uid) return;
    if (state.mode === 'week') {
      if (!state.residentReady) {
        const restored = await restoreResidentIdentityForAuthorizedAdministrator();
        if (restored) {
          state.participants = restored.participants;
          state.selectedParticipant = restored.participant;
          state.residentReady = true;
        }
      }
      renderResidentAccess(false);
      renderMode();
      await refreshParticipant('autorizzazione');
      if (revision !== getCurrentRevision() || getCurrentUser()?.uid !== user.uid) return;
    }
  }
  finishAdminAuthorizationCheck();
  elements.adminPanel.hidden = !isAdmin || state.platformOwner;
  renderMode();
}



function setSignedOutState() {
  finishAdminAuthorizationCheck();
  clearAdminAuthorizationState();
  elements.adminShell.dataset.adminActive = 'false';
  elements.adminShell.dataset.adminOwner = 'false';
  elements.adminShell.dataset.platformOwner = 'false';
  elements.authActions.classList.remove('auth-actions-signed-in');
  const centerInvitationId = getAdminInvitationId();
  const roleInvitationId = getAdminRoleInvitationId();
  const hasCenterInvitation = Boolean(centerInvitationId);
  const hasRoleInvitation = Boolean(roleInvitationId);
  const hasAdministratorInvitation = hasCenterInvitation || hasRoleInvitation;
  const storedDecision = hasRoleInvitation ? loadAdminInvitationDecision(roleInvitationId) : '';
  const invitationNeedsDecision = hasRoleInvitation && !storedDecision;

  elements.adminAuthMethods.hidden = invitationNeedsDecision;
  elements.authActions.hidden = invitationNeedsDecision;
  elements.adminEmailChoice.hidden = invitationNeedsDecision;
  elements.adminEmailChoice.textContent = t('auth.email.enter');
  elements.adminEmailChoice.setAttribute('aria-expanded', state.adminInviteEmailExpanded ? 'true' : 'false');
  elements.authButton.textContent = hasCenterInvitation
    ? t('auth.google.createWithInvite', {}, { fallback: 'Crea account con Google' })
    : t('auth.google.signIn');
  elements.adminEmailAuth.hidden = invitationNeedsDecision || !state.adminInviteEmailExpanded;
  elements.adminEmailCreate.hidden = !hasAdministratorInvitation;
  elements.adminEmailSignIn.hidden = hasAdministratorInvitation;
  elements.adminEmailCreate.textContent = hasRoleInvitation
    ? t('auth.email.continue')
    : t('auth.email.createWithInvite');
  elements.adminPasswordReset.hidden = hasCenterInvitation;

  if (hasCenterInvitation) {
    elements.adminPasswordLabel.textContent = 'Password temporanea dell\'invito';
    elements.adminPassword.value = centerInvitationId;
    elements.adminPassword.readOnly = true;
    elements.adminPassword.autocomplete = 'new-password';
    elements.adminPassword.placeholder = 'Password derivata dall\'invito';
  } else {
    elements.adminPasswordLabel.textContent = t('auth.password.label');
    elements.adminPassword.readOnly = false;
    elements.adminPassword.autocomplete = hasRoleInvitation ? 'new-password' : 'current-password';
    elements.adminPassword.placeholder = '';
  }

  if (hasRoleInvitation) {
    if (elements.adminInviteAcceptPanel) elements.adminInviteAcceptPanel.hidden = false;
    elements.adminInviteAcceptText.textContent = storedDecision === 'ACCEPT'
      ? t('admin.invitations.acceptedIdentify')
      : storedDecision === 'REJECT'
        ? t('admin.invitations.rejectedIdentify')
        : invitationPrompt();
    elements.inviteAcceptActions.hidden = Boolean(storedDecision);
    elements.inviteAccept.disabled = invitationNeedsDecision === false;
    elements.inviteReject.disabled = invitationNeedsDecision === false;
  } else {
    if (elements.adminInviteAcceptPanel) elements.adminInviteAcceptPanel.hidden = true;
    elements.inviteAcceptActions.hidden = false;
  }

  elements.adminEmailStatus.textContent = state.adminAuthNotice || (hasRoleInvitation
    ? t('auth.email.inviteHelp')
    : hasCenterInvitation
      ? t('auth.email.centerInviteHelp', {}, {
        fallback: 'Inserisci la tua email per creare l’account collegato all’invito.'
      })
      : t('auth.email.noGoogleNeeded'));
  elements.authStatus.textContent = t('app.header.accessRequired', {}, { fallback: 'Accesso richiesto' });
  elements.ownerExitButton.hidden = state.mode !== 'admin' || Boolean(getAdminInvitationId());
  elements.adminRoleChip.hidden = true;
  elements.adminRoleChip.textContent = '';
  elements.authUid.hidden = true;
  elements.authUid.textContent = '';
  elements.adminCenterSwitcher.hidden = true;
  elements.adminCenterSelect.replaceChildren();
  elements.bootstrapButton.hidden = true;
  elements.centerInitializer.hidden = true;
  elements.operationalLinks.hidden = true;
  elements.adminPanel.hidden = true;
  elements.ownerInvitationPanel.hidden = true;
  applyAdminCapabilityVisibility();
  elements.adminShell.open = state.mode === 'admin';
}

function clearAdminAuthorizationState() {
  // Invalidate any admin hydration that started before logout. A late
  // response must not be able to restore privileges on the new resident
  // session.
  state.adminHydrationVersion += 1;
  state.adminAuthorizationPending = false;
  state.adminPanelHydrating = false;
  state.adminAccessReconcilePromise = null;
  state.adminRole = '';
  state.adminAuthUid = '';
  state.adminPersonDirty = false;
  state.adminCenterDirty = false;
  state.adminMassPermission = false;
  state.adminCanManageMass = false;
  state.adminCanManageDailyOperations = false;
  state.adminCenters = [];
  state.weekOperationalHealth = null;
  state.weekOperationalNote = null;
  state.weekOperationalDateId = '';
  state.residentAdministratorAuthorized = false;
  state.platformOwner = false;
}

function renderAdminCenterSwitcher(centers = [], activeCenterId = '', isPlatformOwner = false) {
  state.adminCenters = Array.isArray(centers) ? centers : [];
  const shouldShow = !isPlatformOwner && state.adminCenters.length > 1;
  elements.adminCenterSwitcher.hidden = !shouldShow;
  elements.adminCenterSelect.replaceChildren();
  if (!shouldShow) return;

  const nameCounts = new Map();
  state.adminCenters.forEach((center) => {
    nameCounts.set(center.name, (nameCounts.get(center.name) || 0) + 1);
  });
  const fragment = document.createDocumentFragment();
  state.adminCenters.forEach((center) => {
    const option = document.createElement('option');
    option.value = center.centerId;
    option.textContent = nameCounts.get(center.name) > 1
      ? `${center.name} (${center.centerId.slice(-6)})`
      : center.name;
    option.selected = center.centerId === activeCenterId;
    fragment.append(option);
  });
  elements.adminCenterSelect.append(fragment);
}

function handleAdminCenterChange(event) {
  const centerId = String(event.target.value || '');
  if (!centerId || centerId === getActiveCenterId()) return;
  activateAdminCenter(centerId);
  const url = new URL(window.location.href);
  url.searchParams.delete('invite');
  url.searchParams.delete('adminInvite');
  window.location.assign(url.href);
}



function showAuthenticatedAdministratorControls() {
  elements.authActions.classList.add('auth-actions-signed-in');
  elements.authActions.hidden = true;
  elements.authButton.textContent = t('common.actions.exit');
  elements.adminEmailAuth.hidden = true;
  elements.ownerExitButton.hidden = false;
  elements.accountFooter.hidden = false;
}

function handleAuthButton() {
  if (!isFirebaseConfigured) {
    return;
  }

  const currentUser = getCurrentUser();
  const hasStrongAdministratorIdentity = Boolean(
    currentUser
    && !currentUser.isAnonymous
    && !isResidentTechnicalEmail(currentUser.email)
  );
  if (elements.authActions.classList.contains('auth-actions-signed-in') || hasStrongAdministratorIdentity) {
    handleOwnerExit();
    return;
  }

  storeImplicitAdministratorInvitationAcceptance();
  signInWithGoogle().catch(showAuthError);
}

async function handleOwnerExit() {
  if (!isFirebaseConfigured || state.residentAuthTransition) return;
  state.residentAuthTransition = 'admin-signing-out';
  invalidateViewRequests();
  state.adminAuthorizationPending = true;
  elements.adminShell.setAttribute('aria-busy', 'true');
  elements.adminPanel.hidden = true;
  elements.operationalLinks.hidden = true;
  elements.authStatus.textContent = t('auth.signingOut', {}, { fallback: 'Uscita in corso…' });
  try {
    await signOutCurrentUser();
    setSignedOutState();
    renderMode();
  } catch (error) {
    showAuthError(error);
  } finally {
    state.residentAuthTransition = '';
  }
}

async function handleAdministratorEmailSignIn() {
  state.adminAuthNotice = '';
  storeImplicitAdministratorInvitationAcceptance();
  setAdministratorEmailButtonsDisabled(true);
  elements.adminEmailStatus.textContent = 'Accesso in corso...';
  try {
    await signInAdministratorWithEmail(elements.adminEmail.value, elements.adminPassword.value);
    elements.adminPassword.value = '';
  } catch (error) {
    elements.adminEmailStatus.textContent = friendlyErrorMessage(error, 'Email o password non corrette');
  } finally {
    setAdministratorEmailButtonsDisabled(false);
  }
}

function handleAdministratorEmailChoice() {
  state.adminAuthNotice = '';
  state.adminInviteEmailExpanded = !state.adminInviteEmailExpanded;
  elements.adminEmailAuth.hidden = !state.adminInviteEmailExpanded;
  elements.adminEmailChoice.setAttribute('aria-expanded', state.adminInviteEmailExpanded ? 'true' : 'false');
  if (state.adminInviteEmailExpanded) {
    elements.adminEmail.focus();
  }
}

async function handleAdministratorPasswordReset() {
  const email = elements.adminEmail.value.trim();
  if (!email) {
    elements.adminEmailStatus.textContent = 'Inserisci prima la tua email.';
    elements.adminEmail.focus();
    return;
  }
  setAdministratorEmailButtonsDisabled(true);
  elements.adminEmailStatus.textContent = 'Invio il collegamento per cambiare password...';
  try {
    await sendAdminPasswordResetEmail(email);
    elements.adminEmailStatus.textContent = 'Se questo account usa una password, riceverai il collegamento per cambiarla. Se usa Google, accedi con Google.';
  } catch (error) {
    elements.adminEmailStatus.textContent = friendlyErrorMessage(error, 'Invio non riuscito. Riprova.');
  } finally {
    setAdministratorEmailButtonsDisabled(false);
  }
}

async function handleAdministratorEmailCreation() {
  const centerInvitationId = getAdminInvitationId();
  const roleInvitationId = getAdminRoleInvitationId();
  if (!centerInvitationId && !roleInvitationId) {
    elements.adminEmailStatus.textContent = 'Per creare un account serve un invito valido.';
    return;
  }
  storeImplicitAdministratorInvitationAcceptance();
  setAdministratorEmailButtonsDisabled(true);
  const email = elements.adminEmail.value.trim();
  const password = elements.adminPassword.value;
  if (!email) {
    elements.adminEmailStatus.textContent = t('auth.email.required');
    elements.adminEmail.focus();
    setAdministratorEmailButtonsDisabled(false);
    return;
  }
  if (roleInvitationId && password.length < 6) {
    elements.adminEmailStatus.textContent = t('auth.password.minimum');
    elements.adminPassword.focus();
    setAdministratorEmailButtonsDisabled(false);
    return;
  }
  elements.adminEmailStatus.textContent = t('auth.email.verifying');

  try {
    await createAdministratorWithEmail(email, password);
    elements.adminPassword.value = '';
    state.adminAuthNotice = t('auth.email.verificationSent');
    elements.adminEmailStatus.textContent = state.adminAuthNotice;
  } catch (error) {
    if (error?.code === 'auth/email-already-in-use') {
      try {
        elements.adminEmailStatus.textContent = t('auth.email.existingSigningIn');
        await signInAdministratorWithEmail(email, password);
        elements.adminPassword.value = '';
        elements.adminEmailStatus.textContent = t('auth.email.signedIn');
      } catch (signInError) {
        if (signInError?.code === 'auth/email-not-verified') {
          elements.adminEmailStatus.textContent = t('auth.email.unverified');
        } else if (roleInvitationId || !centerInvitationId) {
          elements.adminEmailStatus.textContent = t('auth.email.existingAccountHelp');
        } else {
          try {
            elements.adminEmailStatus.textContent = 'Account già presente. Conferma la tua identità con Google...';
            await reuseAdministratorAccountForInvitation(email, password);
            elements.adminPassword.value = '';
            elements.adminEmailStatus.textContent = 'Account riconosciuto. Puoi attivare il nuovo centro.';
          } catch (reuseError) {
            elements.adminEmailStatus.textContent = reuseError?.code === 'auth/popup-closed-by-user'
              ? 'Accesso annullato. Usa Google oppure la password personale associata a questo indirizzo.'
              : friendlyErrorMessage(reuseError, 'Account già esistente. Usa Google oppure la password personale.');
          }
        }
      }
    } else {
      state.adminAuthNotice = '';
      elements.adminEmailStatus.textContent = friendlyErrorMessage(error, 'Account non creato');
    }
  } finally {
    setAdministratorEmailButtonsDisabled(false);
  }
}

function setAdministratorEmailButtonsDisabled(disabled) {
  elements.adminEmailChoice.disabled = disabled;
  elements.adminEmailSignIn.disabled = disabled;
  elements.adminEmailCreate.disabled = disabled;
  elements.adminPasswordReset.disabled = disabled;
}

function showRequiredAdminPasswordSetup(user, passwordSetupRequired) {
  if (!elements.adminPasswordSetupDialog
      || !passwordSetupRequired
      || !requiresAdministratorPassword(user)) return false;
  elements.adminPasswordSetupInput.value = '';
  elements.adminPasswordSetupStatus.textContent = 'Minimo 6 caratteri.';
  if (!elements.adminPasswordSetupDialog.open) {
    elements.adminPasswordSetupDialog.showModal();
  }
  window.setTimeout(() => elements.adminPasswordSetupInput.focus(), 0);
  return true;
}

async function handleRequiredAdminPasswordSetup(event) {
  event.preventDefault();
  const user = getCurrentUser();
  const password = elements.adminPasswordSetupInput.value;
  if (!user || !requiresAdministratorPassword(user)) return;
  if (password.length < 6) {
    elements.adminPasswordSetupStatus.textContent = 'Inserisci almeno 6 caratteri.';
    elements.adminPasswordSetupInput.focus();
    return;
  }
  elements.adminPasswordSetupSave.disabled = true;
  elements.adminPasswordSetupStatus.textContent = 'Imposto la password...';
  try {
    await updateAdministratorPassword(password);
    await completeAdministratorPasswordSetup();
    elements.adminPasswordSetupInput.value = '';
    elements.adminPasswordSetupDialog.close();
    elements.adminPasswordSetupStatus.textContent = 'Password impostata.';
  } catch (error) {
    elements.adminPasswordSetupStatus.textContent = friendlyErrorMessage(error, 'Password non aggiornata');
  } finally {
    elements.adminPasswordSetupSave.disabled = false;
  }
}

async function handleCenterInvitationGeneration() {
  elements.ownerInvitationGenerate.disabled = true;
  elements.ownerInvitationStatus.textContent = t('admin.invitations.generating');
  try {
    const invitation = await createCenterInvitation();
    const url = new URL('/', window.location.origin);
    url.searchParams.set('view', 'admin');
    url.searchParams.set('invite', invitation.invitationId);
    elements.ownerInvitationLink.value = url.toString();
    elements.ownerInvitationResult.hidden = false;
    const expiry = formatDateTime(invitation.expiresAt, { dateStyle: 'medium' }, getLocale());
    elements.ownerInvitationStatus.textContent = t('admin.invitations.validUntil', { date: expiry });
  } catch (error) {
    elements.ownerInvitationStatus.textContent = friendlyErrorMessage(error, 'Invito non generato');
  } finally {
    elements.ownerInvitationGenerate.disabled = false;
  }
}

async function handleCenterInvitationCopy() {
  if (!elements.ownerInvitationLink.value) {
    return;
  }
  try {
    await navigator.clipboard.writeText(elements.ownerInvitationLink.value);
    elements.ownerInvitationStatus.textContent = 'Collegamento copiato';
  } catch {
    elements.ownerInvitationLink.select();
    elements.ownerInvitationStatus.textContent = 'Collegamento selezionato: usa Copia';
  }
}

async function handleCenterInvitationShare() {
  if (!elements.ownerInvitationLink.value) {
    return;
  }
  try {
    await navigator.share({
      title: 'Collegamento per il responsabile del centro',
      text: 'Usa questo collegamento per configurare il centro:',
      url: elements.ownerInvitationLink.value
    });
  } catch (error) {
    if (error && error.name !== 'AbortError') {
      elements.ownerInvitationStatus.textContent = friendlyErrorMessage(error, 'Condivisione non riuscita');
    }
  }
}

async function refreshPlatformCenterList() {
  elements.platformCenterList.innerHTML = '<p class="empty-state">Centri in caricamento...</p>';
  try {
    const centers = await listPlatformCenters();
    elements.platformCenterList.innerHTML = centers.map((center) => `
      <article class="platform-center-row" data-platform-center-row="${escapeHtml(center.centerId)}">
        <div class="platform-center-info">
          <strong>${escapeHtml(center.name)}</strong>
          <span>Responsabile: ${escapeHtml(center.administratorName || 'da completare')}</span>
          <span>Email: ${escapeHtml(center.adminEmail || 'non disponibile')}</span>
          <span>Accesso: ${center.administratorPasswordRequired ? 'email e password' : 'Google'}</span>
          <span data-platform-center-account-status>Account: ${center.adminEmail ? 'configurato' : 'da completare'}</span>
        </div>
        <span class="platform-center-status">${center.status === 'ACTIVE' ? 'Attivo' : escapeHtml(center.status)}</span>
        <div class="platform-center-actions">
          <button type="button" class="secondary-action" data-platform-invite-center="${escapeHtml(center.centerId)}">Nomina / cambia amministratore</button>
          ${center.administratorPasswordRequired && center.adminEmail
            ? `<button type="button" class="secondary-action" data-platform-reset-password="${escapeHtml(center.adminEmail)}">Invia recupero password</button>`
            : ''}
          <button type="button" class="danger-action" data-platform-deactivate-center="${escapeHtml(center.centerId)}" aria-label="Disattiva ${escapeHtml(center.name)}">Disattiva</button>
        </div>
        <div class="platform-center-invitation" data-platform-center-invitation hidden>
          <label class="field-label">
            Invito amministratore
            <input type="url" data-platform-center-invitation-link readonly>
          </label>
          <button type="button" class="tertiary-action" data-platform-copy-center-invitation>Copia collegamento</button>
        </div>
      </article>
    `).join('') || '<p class="empty-state">Nessun centro attivo.</p>';
  } catch (error) {
    elements.platformCenterList.innerHTML = `<p class="empty-state">${escapeHtml(friendlyErrorMessage(error, 'Centri non disponibili'))}</p>`;
  }
}

async function handlePlatformCenterListClick(event) {
  const inviteButton = event.target.closest('[data-platform-invite-center]');
  const copyButton = event.target.closest('[data-platform-copy-center-invitation]');
  const deactivateButton = event.target.closest('[data-platform-deactivate-center]');
  const resetPasswordButton = event.target.closest('[data-platform-reset-password]');
  const row = event.target.closest('[data-platform-center-row]');
  if (!row) return;

  if (resetPasswordButton) {
    const status = row.querySelector('[data-platform-center-account-status]');
    resetPasswordButton.disabled = true;
    if (status) status.textContent = 'Account: invio recupero password...';
    try {
      await sendAdminPasswordResetEmail(resetPasswordButton.dataset.platformResetPassword);
      if (status) status.textContent = 'Account: email di recupero inviata';
    } catch (error) {
      if (status) status.textContent = friendlyErrorMessage(error, 'Recupero password non inviato');
    } finally {
      resetPasswordButton.disabled = false;
    }
    return;
  }

  if (copyButton) {
    const input = row.querySelector('[data-platform-center-invitation-link]');
    try {
      await navigator.clipboard.writeText(input.value);
      copyButton.textContent = t('status.copied');
    } catch {
      input.select();
      copyButton.textContent = 'Collegamento selezionato';
    }
    return;
  }

  if (inviteButton) {
    inviteButton.disabled = true;
    try {
      const invitation = await createPlatformAdministratorInvitation(row.dataset.platformCenterRow);
      const url = new URL('/', window.location.origin);
      url.searchParams.set('view', 'admin');
      url.searchParams.set('adminInvite', invitation.invitationId);
      url.searchParams.set('c', row.dataset.platformCenterRow);
      const input = row.querySelector('[data-platform-center-invitation-link]');
      input.value = url.toString();
      row.querySelector('[data-platform-center-invitation]').hidden = false;
    } catch (error) {
      elements.ownerInvitationStatus.textContent = friendlyErrorMessage(error, 'Invito non generato');
    } finally {
      inviteButton.disabled = false;
    }
    return;
  }

  if (deactivateButton) {
    const name = row.querySelector('strong')?.textContent || 'questo centro';
    const decision = await showActionDialog({
      title: t('dialog.deactivateCenter.title'),
      message: t('dialog.deactivateCenter.message', { name }), // I dati resteranno conservati
      confirmLabel: t('dialog.deactivateCenter.title'),
      destructive: true
    });
    if (!decision.confirmed) return;
    deactivateButton.disabled = true;
    try {
      await deactivatePlatformCenter(row.dataset.platformCenterRow);
      await refreshPlatformCenterList();
      elements.ownerInvitationStatus.textContent = 'Centro disattivato';
    } catch (error) {
      elements.ownerInvitationStatus.textContent = friendlyErrorMessage(error, 'Centro non disattivato');
      deactivateButton.disabled = false;
    }
  }
}

function showAuthError(error) {
  finishAdminAuthorizationCheck();
  elements.adminPanel.hidden = true;
  showAuthenticatedAdministratorControls();
  elements.authStatus.textContent = friendlyErrorMessage(error, 'Accesso non riuscito');
}

function setBootstrapProgress(active, detail = 'Estensione calendario prenotazioni...') {
  elements.bootstrapProgress.hidden = !active;
  elements.bootstrapProgressDetail.textContent = detail;
  elements.adminShell.setAttribute('aria-busy', active ? 'true' : 'false');
  elements.bootstrapButton.disabled = active;
  elements.authButton.disabled = active;
  elements.bootstrapButton.textContent = active ? 'Estensione in corso...' : 'Estendi calendario prenotazioni';
}

function handleBootstrapButton() {
  return operationGuard.run('admin:calendar-bootstrap', () => performBootstrap());
}

async function performBootstrap() {
  if (!hasCurrentCapability(CAPABILITIES.MANAGE_CALENDAR)) {
    elements.authStatus.textContent = 'Non hai l\'autorizzazione per estendere il calendario';
    return;
  }
  const isFirstCalendarCreation = !state.adminCalendarCoverage?.through
    && !hasCompletedCalendarOnboarding();
  if (!elements.adminPanel.hidden) {
    const decision = await showActionDialog({
      title: t('dialog.extendCalendar.title'),
      message: t('dialog.extendCalendar.message'),
      confirmLabel: t('dialog.extendCalendar.title')
    });
    if (!decision.confirmed) return;
  }
  setBootstrapProgress(true, 'Estensione calendario prenotazioni...');
  elements.authStatus.textContent = 'Estendo il calendario prenotazioni...';

  try {
    const result = await bootstrapCenterData(getCurrentUser(), {
      onProgress: ({ completedDays, totalDays }) => {
        if (totalDays === 0) {
          elements.authStatus.textContent = 'Calendario prenotazioni già aggiornato.';
          elements.bootstrapProgressDetail.textContent = 'Il calendario copre già i prossimi 365 giorni.';
          return;
        }
        const percentage = Math.round((completedDays / totalDays) * 100);
        elements.authStatus.textContent = `Estensione calendario prenotazioni... ${percentage}%`;
        elements.bootstrapProgressDetail.textContent = `Estensione calendario prenotazioni: ${percentage}%.`;
      }
    });
    elements.authStatus.textContent = result.mealWindows > 0
      ? 'Calendario prenotazioni esteso correttamente.'
      : 'Calendario prenotazioni già aggiornato.';
    await refreshAdminParticipants();
    if (isFirstCalendarCreation) {
      markCalendarOnboardingCompleted();
      elements.authStatus.textContent = 'Calendario creato. Ora inserisci le persone che potranno prenotarsi ai pasti.';
      if (isAdminSectionAllowed('people')) {
        selectAdminSection('people', { focus: true, updateHash: true });
      }
    }
  } catch (error) {
    showAuthError(error);
  } finally {
    setBootstrapProgress(false);
  }
}

function renderCalendarExtensionStatus() {
  if (!elements.adminCalendarExtensionStatus) return;
  const coverage = state.adminCalendarCoverage;
  if (!coverage?.through) {
    elements.adminCalendarExtensionStatus.textContent = t('admin.calendar.toComplete');
    return;
  }
  const date = new Date(`${coverage.through}T12:00:00`);
  const formatted = Number.isNaN(date.getTime())
    ? coverage.through
    : formatDateTime(date, { day: '2-digit', month: '2-digit', year: 'numeric' }, getLocale());
  elements.adminCalendarExtensionStatus.textContent = t('admin.calendar.availableUntil', { date: formatted });
}

async function handleCenterInitialization() {
  const user = getCurrentUser();
  const isEmailAuth = requiresAdministratorPassword(user);
  if (isEmailAuth) {
    const newPassword = elements.initializerPassword?.value || '';
    if (!newPassword || newPassword.length < 6) {
      elements.centerInitializerStatus.textContent = 'Inserisci una password valida di almeno 6 caratteri.';
      return;
    }
    setBootstrapProgress(true, 'Configuro le tue credenziali...');
    try {
      await updateAdministratorPassword(newPassword);
    } catch (error) {
      elements.centerInitializerStatus.textContent = friendlyErrorMessage(error, 'Impossibile aggiornare la password');
      setBootstrapProgress(false);
      return;
    }
  }

  setBootstrapProgress(true, 'Creo il centro e il calendario pasti.');
  elements.centerInitializerButton.disabled = true;
  elements.centerInitializerStatus.textContent = 'Creazione centro...';
  let createdCenter = null;
  try {
    createdCenter = await initializeAdminCenter({
      name: elements.centerInitializerName.value,
      timezone: elements.centerInitializerTimezone.value,
      invitationId: getAdminInvitationId(),
      adminEmail: getCurrentUser()?.email || ''
    });
    // L'URL definitivo identifica il centro appena creato durante la preparazione del calendario.
    const activationUrl = new URL(window.location.href);
    activationUrl.searchParams.set('view', 'admin');
    activationUrl.searchParams.set('c', createdCenter.centerId);
    activationUrl.searchParams.delete('invite');
    activationUrl.searchParams.delete('adminInvite');
    window.history.replaceState({}, '', activationUrl.pathname + activationUrl.search);
    elements.centerInitializerStatus.textContent = 'Centro creato. Creazione calendario pasti centro...';
    await bootstrapCenterData(getCurrentUser(), {
      centerId: createdCenter.centerId,
      onProgress: ({ completedDays, totalDays }) => {
        const percentage = totalDays === 0 ? 100 : Math.round((completedDays / totalDays) * 100);
        elements.bootstrapProgressDetail.textContent = `Creazione calendario pasti centro: ${percentage}%.`;
      }
    });
    window.location.replace(activationUrl.toString());
  } catch (error) {
    const operationStage = error?.operationStage ? ` (${error.operationStage})` : '';
    const message = createdCenter
      ? `Centro creato, ma calendario pasti non completato${operationStage}: ${friendlyErrorMessage(error, 'riprova dal pannello amministratore')}`
      : `${friendlyErrorMessage(error, 'Centro non creato')}${operationStage}`;
    elements.centerInitializerStatus.textContent = message;
    elements.authStatus.textContent = message;
    elements.adminShell.open = true;
    elements.centerInitializer.hidden = false;
  } finally {
    setBootstrapProgress(false);
    elements.centerInitializerButton.disabled = false;
  }
}

async function handleCopyLink(event) {
  const target = document.querySelector(event.currentTarget.dataset.copyLink || '');
  if (!target?.href) return;
  try {
    await navigator.clipboard.writeText(target.href);
    event.currentTarget.textContent = t('status.copied');
    window.setTimeout(() => { event.currentTarget.textContent = t('common.actions.copy'); }, 1400);
  } catch {
    openAccessShareDialog('Collegamento', target.href);
  }
}

function handleOperationalLinksClick(event) {
  const copyButton = event.target.closest('[data-copy-link]');
  if (copyButton) {
    handleCopyLink({ currentTarget: copyButton });
    return;
  }
  const rotateButton = event.target.closest('[data-rotate-operational-link]');
  if (rotateButton) {
    handleOperationalLinkRotation(rotateButton);
  }
}

function handleOperationalLinkRotation(button) {
  const scope = button.dataset.rotateOperationalLink;
  return operationGuard.run(`admin:rotate-link:${scope}`, async () => {
    if (!hasCurrentCapability(CAPABILITIES.MANAGE_OPERATIONAL_LINKS)) return;
    const label = scope === 'KITCHEN' ? 'della cucina' : 'dei residenti e del riepilogo';
    const decision = await showActionDialog({
      title: t('dialog.rotateLink.title'),
      message: t('dialog.rotateLink.message', { label }),
      confirmLabel: t('common.actions.reset')
    });
    if (!decision.confirmed) return;

    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    elements.operationalLinksStatus.textContent = 'Rigenero il collegamento...';
    try {
      state.operationalLinks = await rotateOperationalLink(scope);
      initializeOperationalLinks();
      renderAdminOverview();
      elements.operationalLinksStatus.textContent = 'Nuovo collegamento attivo. Ora puoi copiarlo e inviarlo.';
    } catch (error) {
      elements.operationalLinksStatus.textContent = friendlyErrorMessage(error, 'Collegamento non rigenerato');
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  });
}

async function refreshNow(source) {
  if (state.refreshInFlight) {
    state.pendingRefreshSource = source === 'manuale'
      ? 'manuale'
      : state.pendingRefreshSource || source;
    return;
  }

  state.refreshInFlight = true;
  try {
    await performRefresh(source);
  } finally {
    state.refreshInFlight = false;
    const pendingSource = state.pendingRefreshSource;
    state.pendingRefreshSource = '';
    if (pendingSource) {
      refreshNow(pendingSource);
    }
  }
}

async function performRefresh(source) {
  state.refreshCount += 1;
  const now = new Date();
  const delayMs = getRecommendedRefreshDelayMs(
    now,
    state.centerContactSettings.timezone || 'Europe/Rome'
  );

  state.nextRefreshAt = Date.now() + delayMs;
  window.clearTimeout(state.timerId);
  state.timerId = window.setTimeout(() => refreshNow('timer'), delayMs);

  if (state.mode === 'admin') {
    hideStartupSplash();
    return;
  }

  if (state.mode === 'participant' || state.mode === 'week' || state.mode === 'summary') {
    await refreshParticipant(source);
    hideStartupSplash();
    return;
  }

  elements.status.textContent = 'Aggiorno...';
  const kitchenRequestVersion = ++state.kitchenRequestVersion;
  const kitchenDayOffset = state.kitchenDayOffset;

  try {
    const sessionPromise = ensureKitchenDemoSession().catch((error) => {
      error.refreshStage = 'sessione';
      throw error;
    });
    const settingsPromise = loadCenterContactSettings({
      forceRefresh: source === 'manuale'
    }).catch((error) => {
      error.refreshStage = 'impostazioni';
      throw error;
    });
    const [, centerSettings] = await Promise.all([sessionPromise, settingsPromise]);
    state.centerContactSettings = centerSettings;
    await applyCenterDefaultLanguage(centerSettings);
    renderMode();
    const kitchenDates = Array.from({ length: 3 }, (_, index) => addCalendarDays(getCenterToday(), index));
    const kitchenPayloads = await Promise.all(kitchenDates.map(async (date) => {
      const [meals, kitchenNote, dailyOperation, dailyHealth] = await Promise.all([
        loadKitchenCounts(date, {
          forceStaticRefresh: source === 'manuale',
          sessionReady: true,
          staticVersion: state.centerContactSettings.participantDataVersion || '0'
        }),
        loadKitchenNote(date, { forceRefresh: source === 'manuale' }),
        loadDailyOperation(date, { forceRefresh: source === 'manuale' }),
        loadDailyHealth(date, { forceRefresh: source === 'manuale' })
      ]);
      return {
        dateId: formatDateId(date),
        meals: applyDailyDietsToKitchenMeals(meals, dailyHealth.dietAssignments)
          .map((meal) => ({
            ...meal,
            mealTypeId: meal.mealTypeId || meal.key,
            present: meal.present || meal.dietParticipants || []
          })),
        kitchenNote,
        dailyOperation,
        dailyHealth
      };
    })).catch((error) => {
      error.refreshStage = 'dati';
      throw error;
    });
    if (kitchenRequestVersion !== state.kitchenRequestVersion
      || state.mode !== 'kitchen'
      || kitchenDayOffset !== state.kitchenDayOffset) {
      return;
    }
    state.kitchenDays = kitchenPayloads.map(({ dateId, meals }) => ({ dateId, meals }));
    state.kitchenOperations = kitchenPayloads.map(({ dateId, kitchenNote, dailyOperation, dailyHealth }) => ({
      dateId,
      notes: Array.isArray(kitchenNote?.messages) && kitchenNote.messages.length > 0
        ? kitchenNote.messages
        : kitchenNote?.text
          ? [kitchenNote]
          : [],
      dailyOperation,
      dailyHealth
    }));
    state.kitchenNotes = kitchenPayloads.map(({ dateId, kitchenNote }) => ({ dateId, note: kitchenNote }));
    state.meals = state.kitchenDays[state.kitchenDayOffset]?.meals || [];
    state.kitchenNote = state.kitchenNotes[state.kitchenDayOffset]?.note || null;
    state.kitchenDailyOperation = state.kitchenOperations[state.kitchenDayOffset]?.dailyOperation || null;
    state.kitchenDailyHealth = state.kitchenOperations[state.kitchenDayOffset]?.dailyHealth || null;
    selectKitchenMatrixDay(state.kitchenDayOffset);
    state.kitchenUpdatedAt = new Date();
    state.lastSuccessfulRefreshAt = state.kitchenUpdatedAt;
    renderMeals();
    setFreshnessStatus(elements.status, formatKitchenRefreshLabel(state.kitchenUpdatedAt), 'current');
  } catch (error) {
    if (kitchenRequestVersion !== state.kitchenRequestVersion
      || state.mode !== 'kitchen'
      || kitchenDayOffset !== state.kitchenDayOffset) {
      return;
    }
    console.warn('Aggiornamento cucina non riuscito', error?.refreshStage || '', error?.code || '', error?.message || '');
    if (isCenterAccessRevokedError(error)) {
      clearKitchenDataAfterAccessRevocation();
      renderMeals(getKitchenErrorMessage(error));
      elements.status.textContent = 'Centro non disponibile';
      return;
    }
    if (state.meals.length > 0) {
      renderMeals();
      setFreshnessStatus(
        elements.status,
        formatPreviousDataMessage(friendlyErrorMessage(error, 'Aggiornamento non riuscito')),
        'previous'
      );
    } else {
      state.kitchenDays = [];
      state.kitchenOperations = [];
      state.kitchenNotes = [];
      state.kitchenNote = null;
      state.kitchenDailyOperation = null;
      state.kitchenDailyHealth = null;
      renderMeals(getKitchenErrorMessage(error));
      elements.status.textContent = friendlyErrorMessage(error, 'Dati non disponibili');
    }
  }

  hideStartupSplash();
}

async function refreshParticipant(source) {
  const retryPermission = !String(source || '').endsWith(':auth-retry');
  if (state.residentAuthTransition) return;
  let request = beginParticipantRequest();
  const hadVisibleData = state.mode === 'summary'
    ? state.todayOverview.length > 0
    : state.mode === 'week'
      ? state.participantWeek.length > 0
      : state.participantMonth.length > 0;
  setParticipantStatus('Aggiorno...');

  try {
    if (state.friendlyAccess && !state.residentReady) {
      state.residentRestorePending = Boolean(loadStoredResidentSignature());
      const restored = canUseWeekWithoutParticipant() && state.mode === 'week'
        ? await restoreResidentIdentityForAuthorizedAdministrator()
        : await restoreFriendlyResidentSession();
      // A login/logout may have superseded this refresh while session restore
      // was awaiting Firebase. A stale request must never remount the login.
      if (!isCurrentParticipantRequest(request) || state.residentAuthTransition) return;
      if (restored) {
        state.participants = restored.participants;
        state.selectedParticipant = restored.participant;
        state.residentReady = true;
        state.residentRestorePending = false;
        if (applyResidentEntryView()) {
          request = beginParticipantRequest();
        }
      } else if (!(canUseWeekWithoutParticipant() && state.mode === 'week')) {
        state.residentRestorePending = false;
        renderResidentAccess(true);
        hideStartupSplash();
        setParticipantStatus('Accedi per vedere e modificare i tuoi pasti');
        return;
      }
      renderResidentAccess(false);
      renderMode();
    }
    if (!isCurrentParticipantRequest(request)) return;
    let sessionPromise = Promise.resolve();
    if (state.friendlyAccess && state.residentReady) {
      sessionPromise = ensureStoredResidentSession();
    } else if (!(canUseWeekWithoutParticipant() && state.mode === 'week')) {
      sessionPromise = ensurePublicDemoSession();
    }
    sessionPromise = sessionPromise.catch((error) => {
      error.refreshStage = 'sessione';
      throw error;
    });
    await sessionPromise;
    const centerSettings = await loadCenterContactSettings({
      forceRefresh: source === 'manuale'
    }).catch((error) => {
      error.refreshStage = 'impostazioni';
      throw error;
    });
    state.centerContactSettings = applyResidentPreferences(centerSettings);
    await applyCenterDefaultLanguage(state.centerContactSettings);
    await refreshResidentAdministratorAuthorization();
    if (state.mode === 'week' && canManageDailyOperations() && !state.adminRole) {
      state.adminParticipants = await listPublicParticipants({
        forceRefresh: source === 'manuale',
        staticVersion: centerSettings.participantDataVersion || '0'
      });
    }
    if (!isCurrentParticipantRequest(request)) return;
    // The request snapshot is created before the centre timezone is known.
    // On the first resident load, anchoring the calendar can therefore change
    // the active month/week and make that snapshot stale.  Renew it here so
    // the data loaded for the current period is also rendered immediately.
    if (anchorCalendarToCenterToday()) {
      request = beginParticipantRequest();
    }
    if (state.mode === 'summary') {
      const summaryDates = Array.from({ length: 3 }, (_, index) => addCalendarDays(getCenterToday(), index));
      const summaryPayloads = await Promise.all(summaryDates.map(async (date) => {
        const [meals, dailyOperation, dailyHealth] = await Promise.all([
          loadParticipantDaySummaries(date, {
            forceStaticRefresh: source === 'manuale',
            staticVersion: state.centerContactSettings.participantDataVersion || '0',
            includeContacts: state.centerContactSettings.participantContactSharingEnabled
          }),
          loadDailyOperation(date, { forceRefresh: source === 'manuale' }),
          loadDailyHealth(date, { forceRefresh: source === 'manuale' })
        ]);
        return {
          dateId: formatDateId(date),
          meals: applyDailyDietsToSummary(meals, dailyHealth.dietAssignments),
          dailyOperation,
          dailyHealth
        };
      }));
      if (!isCurrentParticipantRequest(request)) return;
      state.summaryDays = summaryPayloads.map(({ dateId, meals }) => ({ dateId, meals }));
      state.summaryOperations = summaryPayloads.map(({ dateId, dailyOperation, dailyHealth }) => ({
        dateId,
        dailyOperation,
        dailyHealth
      }));
      state.todayOverview = state.summaryDays[state.summaryDayOffset]?.meals || [];
      state.summaryDailyOperation = state.summaryOperations[state.summaryDayOffset]?.dailyOperation || null;
      state.summaryDailyHealth = state.summaryOperations[state.summaryDayOffset]?.dailyHealth || null;
      selectSummaryMatrixDay(state.summaryDayOffset);
    } else {
      state.todayOverview = [];
      state.summaryDays = [];
      state.summaryOperations = [];
      state.summaryDailyOperation = null;
      state.summaryDailyHealth = null;
    }
    state.participants = state.selectedParticipant ? [state.selectedParticipant] : [];
    if (state.selectedParticipant && state.mode !== 'summary') {
      await loadCurrentParticipantCalendar({
        forceStaticRefresh: source === 'manuale',
        isCurrentRequest: () => isCurrentParticipantRequest(request)
      });
    } else if (state.mode === 'week' && canUseWeekWithoutParticipant()) {
      await loadCurrentParticipantWeek({
        forceStaticRefresh: source === 'manuale',
        isCurrentRequest: () => isCurrentParticipantRequest(request)
      });
    }
    if (!isCurrentParticipantRequest(request)) return;
    renderMode();
    renderParticipantMeals();
    state.lastSuccessfulRefreshAt = new Date();
    setParticipantStatus(formatRefreshLabel(source, state.lastSuccessfulRefreshAt), 'current');
  } catch (error) {
    if (!isCurrentParticipantRequest(request)) return;
    if (retryPermission
      && isCenterAccessRevokedError(error)
      && isConnectionAvailable()
      && !state.residentAuthTransition) {
      try {
        await waitForAuthReady();
        if (state.friendlyAccess && state.residentReady) {
          await recoverStoredResidentSession();
        }
        if (!isCurrentParticipantRequest(request)) return;
        await refreshParticipant(`${source}:auth-retry`);
        return;
      } catch (retryError) {
        error = retryError;
      }
    }
    const preserveResidentView = error?.preserveResidentIdentity === true
      || shouldPreserveResidentViewAfterRefreshError({
        friendlyAccess: state.friendlyAccess,
        residentReady: state.residentReady,
        hasParticipant: Boolean(state.selectedParticipant),
        permissionDenied: isCenterAccessRevokedError(error)
      });
    if (preserveResidentView) {
      state.residentRestorePending = !state.residentReady;
      renderResidentAccess(false);
      renderMode();
    }
    const message = friendlyErrorMessage(error, 'Prenotazione non disponibile');
    if (!preserveResidentView && isCenterAccessRevokedError(error)) {
      clearParticipantDataAfterAccessRevocation();
      renderResidentAccess(true);
      setParticipantStatus('Centro non disponibile');
      return;
    }
    if (hadVisibleData) {
      renderMode();
      renderParticipantMeals();
      setParticipantStatus(formatPreviousDataMessage(message), 'previous');
    } else {
      setParticipantStatus(message);
    }
  } finally {
    hideStartupSplash();
  }
}

function isCenterAccessRevokedError(error) {
  const code = String(error?.code || '').toLowerCase();
  return code === 'permission-denied' || code === 'firestore/permission-denied';
}

function clearParticipantDataAfterAccessRevocation() {
  state.residentReady = false;
  state.residentRestorePending = false;
  state.selectedParticipant = null;
  state.participants = [];
  state.participantMeals = [];
  state.participantWeek = [];
  state.participantMonth = [];
  state.todayOverview = [];
  state.summaryDays = [];
  state.summaryOperations = [];
  state.participantSummary = null;
  renderParticipantMeals();
}

function clearKitchenDataAfterAccessRevocation() {
  state.meals = [];
  state.kitchenDays = [];
  state.kitchenOperations = [];
  state.kitchenNotes = [];
  state.kitchenNote = null;
  state.kitchenDailyOperation = null;
  state.kitchenDailyHealth = null;
  state.kitchenUpdatedAt = null;
}

function initializeResidentAccess() {
  renderResidentAccess(state.friendlyAccess && !state.residentReady);
  if (state.friendlyAccess) {
    elements.residentSignatureInput.value = loadStoredResidentSignature();
  }
}

function renderResidentAccess(showLogin) {
  const shouldShowLogin = showLogin
    && !state.residentRestorePending
    && state.mode !== 'admin';
  elements.residentLogin.hidden = !shouldShowLogin;
  elements.participantPanel.hidden = shouldShowLogin || state.mode !== 'participant';
  elements.weekPanel.hidden = shouldShowLogin || state.mode !== 'week';
  elements.summaryPanel.hidden = shouldShowLogin || state.mode !== 'summary';
}

async function handleResidentLogin(event) {
  event.preventDefault();
  if (state.residentAuthTransition) return;
  state.residentAuthTransition = 'signing-in';
  invalidateViewRequests();
  elements.residentLoginButton.disabled = true;
  elements.residentLoginStatus.textContent = 'Accesso in corso...';
  try {
    const result = await signInFriendlyResident(
      elements.residentSignatureInput.value,
      elements.residentPasswordInput.value
    );
    const residentUser = getCurrentUser();
    if (!residentUser || residentUser.isAnonymous || isResidentTechnicalEmail(residentUser.email)) {
      clearAdminAuthorizationState();
    }
    state.participants = result.participants;
    state.selectedParticipant = result.participant;
    state.residentReady = true;
    state.residentRestorePending = false;
    state.residentAuthTransition = '';
    applyResidentEntryView();
    elements.residentPasswordInput.value = '';
    renderResidentAccess(false);
    renderMode();
    await refreshParticipant('avvio');
  } catch (error) {
    state.residentAuthTransition = '';
    elements.residentLoginStatus.textContent = friendlyErrorMessage(error, 'Accesso non riuscito');
    elements.residentPasswordInput.focus();
    elements.residentPasswordInput.select();
  } finally {
    state.residentAuthTransition = '';
    elements.residentLoginButton.disabled = false;
  }
}

function togglePasswordVisibility(input, toggle) {
  if (!input || !toggle) return;
  const visible = input.type === 'text';
  input.type = visible ? 'password' : 'text';
  toggle.textContent = visible ? 'Mostra' : 'Nascondi';
  toggle.setAttribute('aria-pressed', String(!visible));
  toggle.setAttribute('aria-label', visible ? 'Mostra password' : 'Nascondi password');
}

async function handleForgetDevice() {
  if (state.residentAuthTransition) return;
  state.residentAuthTransition = 'signing-out';
  invalidateViewRequests();
  const leavingAdminPanel = state.mode === 'admin';
  try {
    await forgetResidentDevice();
    // The Auth watcher is deliberately muted while logout is in progress.
    // Clear strong-role capabilities synchronously so the next anonymous
    // resident session cannot inherit administrator-only reads.
    clearAdminAuthorizationState();
  } catch (error) {
    state.residentAuthTransition = '';
    throw error;
  }
  state.residentReady = false;
  state.residentRestorePending = false;
  state.selectedParticipant = null;
  state.residentAuthTransition = '';
  invalidateViewRequests();
  if (!state.adminRole) state.adminParticipants = [];
  if (leavingAdminPanel) {
    // Logout from the control panel must return to a real resident entry
    // route. Keeping view=admin leaves the resident form hidden and produces
    // the apparently empty panel that previously required a manual refresh.
    const residentUrl = new URL(window.location.href);
    residentUrl.searchParams.set('view', 'participant');
    residentUrl.searchParams.set('access', 'friendly');
    residentUrl.searchParams.delete('invite');
    residentUrl.searchParams.delete('adminInvite');
    window.location.assign(residentUrl.pathname + residentUrl.search);
    return;
  }
  // Leaving a resident view must also reset the operational route. Keeping
  // view=week (or view=summary) while the resident identity is cleared lets
  // the first refresh mount the old screen before its session check rejects
  // it again, producing the apparent login loop. Start the next sign-in from
  // the single, stable resident entry route instead.
  const residentUrl = new URL(window.location.href);
  residentUrl.searchParams.set('view', 'participant');
  residentUrl.searchParams.set('access', 'friendly');
  window.history.replaceState({}, '', residentUrl.pathname + residentUrl.search);
  state.mode = 'participant';
  invalidateViewRequests();
  state.participants = [];
  state.participantWeek = [];
  state.participantMonth = [];
  state.todayOverview = [];
  state.summaryDays = [];
  state.summaryOperations = [];
  renderResidentAccess(true);
  renderMode();
  elements.residentLoginStatus.textContent = 'Sei uscito.';
}

async function refreshAdminParticipants() {
  const request = requestCoordinator.beginRequest('admin-participants');
  try {
    const canViewOperationalLinks = hasCurrentCapability(CAPABILITIES.VIEW_OPERATIONAL_LINKS);
    const canManageRoles = hasCurrentCapability(CAPABILITIES.MANAGE_ADMINS);
    const canManageOperationalLinks = hasCurrentCapability(CAPABILITIES.MANAGE_OPERATIONAL_LINKS);
    const [adminParticipants, adminAccounts, centerSettings, coverage, operationalLinks, adminInvitations] = await Promise.all([
      listAdminParticipants(),
      listCenterAdministrators(),
      loadCenterContactSettings({ forceRefresh: true }),
      loadMealWindowCoverage(),
      canViewOperationalLinks
        ? canManageOperationalLinks
          ? ensureOperationalLinks()
          : loadOperationalLinks({ forceRefresh: true })
        : Promise.resolve(state.operationalLinks),
      canManageRoles ? listAdministratorInvitations() : Promise.resolve([])
    ]);
    if (!requestCoordinator.isCurrentRequest(request)) return;
    const authenticatedOwnerEmail = state.adminRole === 'OWNER'
      ? String(getCurrentUser()?.email || '').trim().toLowerCase()
      : '';
    if (authenticatedOwnerEmail
        && centerSettings.adminEmail.toLowerCase() !== authenticatedOwnerEmail) {
      try {
        centerSettings.adminEmail = await synchronizeCenterOwnerEmail(authenticatedOwnerEmail);
      } catch {
        // Il modulo resta utilizzabile: il salvataggio esplicito riproverà con
        // l'identità autenticata del responsabile effettivo.
        centerSettings.adminEmail = authenticatedOwnerEmail;
      }
    }
    state.adminParticipants = adminParticipants;
    state.adminAccounts = adminAccounts;
    populateAdminDietSelect(t('diet.option.STANDARD'));
    state.centerContactSettings = centerSettings;
    await applyCenterDefaultLanguage(centerSettings);
    state.operationalLinks = operationalLinks;
    state.adminInvitations = adminInvitations;
    state.adminCalendarCoverage = coverage;
    renderCalendarExtensionStatus();
    if (!state.adminCenterDirty) {
      syncAdminCenterSettingsForm();
    }
    if (!state.pendingCenterAvatarDataUrl) {
      elements.adminCenterAvatarInput.value = '';
    }
    renderAdminCenterAvatarEditor();
    renderAdminParticipantOptions();
    renderAdminPeopleList();
    const profileComplete = isAdministratorProfileComplete();
    state.adminActiveSection = profileComplete
      ? (state.adminActiveSection || resolveInitialAdminSection())
      : 'configuration';
    state.adminMobileSection = state.adminActiveSection;
    applyAdminCapabilityVisibility();
    renderAdminLeadershipForm();
    renderAdminInvitationList();
    renderAdminAccountList();
    renderAdminOverview();
    if (!state.adminPersonDirty) {
      syncAdminContactForm();
    }
    initializeOperationalLinks();
    elements.adminStatus.textContent = !profileComplete
      ? t('admin.people.completeProfile')
      : state.adminPersonDirty ? t('admin.people.unsavedChanges') : t('admin.people.ready');
  } catch (error) {
    if (!requestCoordinator.isCurrentRequest(request)) return;
    elements.adminStatus.textContent = friendlyErrorMessage(error, 'Contatti non disponibili');
  }
}



function renderAdminLeadershipForm() {
  const canManageAdministrators = hasCurrentCapability(CAPABILITIES.MANAGE_ADMINS);
  const canTransferOwnership = hasCurrentCapability(CAPABILITIES.TRANSFER_OWNERSHIP);
  const activeParticipantIds = new Set(
    state.adminParticipants
      .filter((participant) => participant.status === 'ACTIVE')
      .map((participant) => participant.participantId)
  );
  const successors = state.adminAccounts.filter((admin) => (
    admin.role === 'ADMIN'
    && admin.status === 'ACTIVE'
    && admin.participantId
    && admin.passwordSetupRequired !== true
    && activeParticipantIds.has(admin.participantId)
  ));

  elements.adminLeadership.hidden = !canManageAdministrators;
  elements.adminInvitationGenerate.disabled = !canManageAdministrators;

  elements.adminSuccessorSelect.innerHTML = successors.map((admin) => (
    `<option value="${escapeHtml(admin.adminUid)}">${escapeHtml(admin.email || admin.adminUid)}</option>`
  )).join('');
  elements.adminSuccessorSelect.disabled = !canTransferOwnership || successors.length === 0;
  elements.adminTransferOwnership.disabled = !canTransferOwnership || successors.length === 0;

  const currentUid = getCurrentUser()?.uid || '';
  const acceptedInvitation = state.adminRole === 'OWNER'
    ? state.adminInvitations.find((invitation) => (
      invitation.status === 'USED'
      && invitation.createdBy === currentUid
      && invitation.consumedBy
      && invitation.consumedBy !== currentUid
      && successors.some((admin) => admin.adminUid === invitation.consumedBy)
    ))
    : null;
  const acceptedSuccessor = acceptedInvitation
    ? successors.find((admin) => admin.adminUid === acceptedInvitation.consumedBy)
    : null;
  const acceptedParticipant = acceptedInvitation
    ? state.adminParticipants.find((participant) => participant.participantId === acceptedInvitation.participantId)
    : null;
  const acceptedName = acceptedParticipant?.displayName
    || acceptedSuccessor?.email
    || t('role.admin');
  const acceptanceMessage = acceptedInvitation
    ? t('admin.succession.acceptanceReady', { name: acceptedName })
    : '';

  elements.adminNavAccess.classList.toggle('admin-nav-attention', Boolean(acceptedInvitation));
  if (acceptedInvitation) {
    elements.adminNavAccess.setAttribute('title', acceptanceMessage);
    elements.adminNavAccess.setAttribute('aria-label', `${t('admin.access.title')}. ${acceptanceMessage}`);
    elements.adminLeadershipStatus.textContent = acceptanceMessage;
  } else {
    elements.adminNavAccess.removeAttribute('title');
    elements.adminNavAccess.removeAttribute('aria-label');
  }

  if (canManageAdministrators && !acceptedInvitation && successors.length === 0) {
    elements.adminLeadershipStatus.textContent = t('admin.succession.inviteAnother');
  }

  // Selettore candidato amministratore
  const candidates = (state.adminParticipants || []).filter((p) => p.status === 'ACTIVE');
  if (elements.adminCandidateSelect) {
    elements.adminCandidateSelect.innerHTML = candidates.map((participant) => {
      const id = escapeHtml(participant.participantId);
      const name = escapeHtml(participant.displayName || participant.signature || 'Senza nome');
      return `<option value="${id}">${name}</option>`;
    }).join('');
    elements.adminCandidateSelect.disabled = !canManageAdministrators || candidates.length === 0;
  }
}

function handleAdministratorInvitationGeneration() {
  return operationGuard.run('admin:administrator-invitation', performAdministratorInvitationGeneration);
}

function handleAdminCandidateNewPersonClick() {
  selectAdminSection('people', { focus: true });
  handleAdminNewParticipant();
}

function handleInviteAccept() {
  return operationGuard.run('admin:invite-accept', async () => {
    try {
      const user = getCurrentUser();
      if (!user || user.isAnonymous) {
        if (!storeAdminInvitationDecision('ACCEPT')) {
          elements.adminEmailStatus.textContent = 'Non riesco a conservare la risposta in questo browser.';
          return;
        }
        state.adminInviteEmailExpanded = false;
        setSignedOutState();
        return;
      }
      elements.inviteAccept.disabled = true;
      elements.inviteReject.disabled = true;
      elements.adminEmailStatus.textContent = 'Accettazione in corso...';
      const result = await acceptAdministratorInvitation();
      clearAdminInvitationDecision(getAdminRoleInvitationId());
      elements.adminEmailStatus.textContent = t('admin.invitations.accepted');
      await showRoleInvitationAccepted(result.role);
      activateAdminCenter(result.centerId);
      const acceptedUrl = new URL(window.location.href);
      acceptedUrl.searchParams.delete('adminInvite');
      window.history.replaceState({}, '', acceptedUrl.pathname + acceptedUrl.search);
      window.location.reload();
    } catch (error) {
      elements.adminEmailStatus.textContent = friendlyErrorMessage(error, 'Accettazione fallita');
      elements.inviteAccept.disabled = false;
      elements.inviteReject.disabled = false;
    }
  });
}

function handleInviteReject() {
  return operationGuard.run('admin:invite-reject', async () => {
    try {
      elements.adminEmailStatus.textContent = 'Rifiuto invito...';
      const invitationId = getAdminRoleInvitationId();
      if (!invitationId) {
        elements.adminEmailStatus.textContent = 'Nessun invito attivo trovato.';
        return;
      }
      const user = getCurrentUser();
      if (!user || user.isAnonymous) {
        if (!storeAdminInvitationDecision('REJECT')) {
          elements.adminEmailStatus.textContent = 'Non riesco a conservare la risposta in questo browser.';
          return;
        }
        state.adminInviteEmailExpanded = false;
        setSignedOutState();
        return;
      }
      elements.inviteAccept.disabled = true;
      elements.inviteReject.disabled = true;
      await rejectAdministratorInvitation(invitationId);
      clearAdminInvitationDecision(invitationId);
      const rejectedUrl = new URL(window.location.href);
      rejectedUrl.searchParams.delete('adminInvite');
      window.history.replaceState({}, '', rejectedUrl.pathname + rejectedUrl.search);
      elements.adminEmailStatus.textContent = 'Invito rifiutato. Il responsabile vedrà la tua risposta.';
      if (elements.adminInviteAcceptPanel) {
        elements.adminInviteAcceptText.textContent = 'Hai rifiutato questo invito.';
      }
    } catch (error) {
      elements.adminEmailStatus.textContent = friendlyErrorMessage(error, 'Rifiuto fallito');
      elements.inviteAccept.disabled = false;
      elements.inviteReject.disabled = false;
    }
  });
}

async function performAdministratorInvitationGeneration() {
  if (!hasCurrentCapability(CAPABILITIES.MANAGE_ADMINS)) return;
  elements.adminInvitationGenerate.disabled = true;
  elements.adminLeadershipStatus.textContent = 'Genero l\u2019invito...';
  try {
    const participantId = elements.adminCandidateSelect
      ? elements.adminCandidateSelect.value
      : '';
    const invitation = await createAdministratorInvitation(participantId);
    const invitationUrl = new URL('/', window.location.origin);
    invitationUrl.searchParams.set('view', 'admin');
    invitationUrl.searchParams.set('adminInvite', invitation.invitationId);
    invitationUrl.searchParams.set('adminRole', 'ADMIN');
    invitationUrl.searchParams.set('c', getActiveCenterId());

    // Recupera il nome del partecipante invitato
    const participant = (state.adminParticipants || []).find(
      p => p.participantId === participantId
    );
    const displayName = participant?.displayName || participant?.signature || 'La persona';

    if (elements.adminInvitationStatus) {
      elements.adminInvitationStatus.hidden = false;
      elements.adminInvitationStatus.textContent =
        `Invito preparato per ${displayName}. Invia il collegamento e attendi la conferma.`;
    }
    elements.adminInvitationLink.value = invitationUrl.toString();
    elements.adminInvitationResult.hidden = false;

    elements.adminLeadershipStatus.textContent = 'Invito amministratore generato.';
  } catch (error) {
    elements.adminLeadershipStatus.textContent = friendlyErrorMessage(error, 'Invito non generato');
    if (elements.adminInvitationStatus) {
      elements.adminInvitationStatus.hidden = true;
      elements.adminInvitationStatus.textContent = '';
    }
    elements.adminInvitationResult.hidden = true;
    elements.adminInvitationLink.value = '';
  } finally {
    elements.adminInvitationGenerate.disabled = false;
  }
}

async function handleAdministratorInvitationCopy() {
  const value = elements.adminInvitationLink.value;
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    elements.adminLeadershipStatus.textContent = 'Collegamento copiato: ora puoi inviarlo al nuovo amministratore.';
  } catch {
    elements.adminInvitationLink.select();
    elements.adminLeadershipStatus.textContent = 'Collegamento selezionato: usa Copia';
  }
}

function storeImplicitAdministratorInvitationAcceptance() {
  const roleInvitationId = getAdminRoleInvitationId();
  if (roleInvitationId && !loadAdminInvitationDecision(roleInvitationId)) {
    storeAdminInvitationDecision('ACCEPT');
  }
}

async function handleAdministratorInvitationShare() {
  const value = elements.adminInvitationLink.value;
  if (!value) return;
  if (typeof navigator.share !== 'function') {
    openAccessShareDialog(t('admin.access.title'), value);
    return;
  }
  try {
    await navigator.share({
      title: t('admin.access.title'),
      text: t('admin.invitations.linkToSend'),
      url: value
    });
  } catch (error) {
    if (error?.name !== 'AbortError') {
      openAccessShareDialog(t('admin.access.title'), value);
    }
  }
}

function handleOwnershipTransfer() {
  return operationGuard.run('admin:ownership-transfer', performOwnershipTransfer);
}

async function performOwnershipTransfer() {
  if (!hasCurrentCapability(CAPABILITIES.TRANSFER_OWNERSHIP)) return;
  const successorUid = elements.adminSuccessorSelect.value;
  const successor = state.adminAccounts.find((admin) => admin.adminUid === successorUid);
  if (!successor) return;
  const decision = await showActionDialog({
    title: t('dialog.transferOwnership.title'),
    message: t('dialog.transferOwnership.finalMessage', { email: successor.email || successor.adminUid }),
    confirmLabel: t('dialog.transferOwnership.title'),
    requiredText: 'TRASFERISCI',
    destructive: true
  });
  if (!decision.confirmed) {
    elements.adminLeadershipStatus.textContent = 'Trasferimento annullato';
    return;
  }
  const revokePrevious = true;

  elements.adminTransferOwnership.disabled = true;
  elements.adminLeadershipStatus.textContent = 'Trasferisco la responsabilità...';
  try {
    await transferCenterOwnership(successorUid, { revokePrevious });
    elements.adminLeadershipStatus.textContent = revokePrevious
      ? 'Responsabilità trasferita e precedente accesso revocato'
      : 'Responsabilità trasferita; resti amministratore del centro';
    if (revokePrevious) {
      await signOutCurrentUser();
    } else {
      await applyAdminAuthState(getCurrentUser());
    }
  } catch (error) {
    elements.adminLeadershipStatus.textContent = friendlyErrorMessage(error, 'Trasferimento non riuscito');
  } finally {
    elements.adminTransferOwnership.disabled = false;
  }
}

function handleAuditLoad() {
  return operationGuard.run('admin:audit-load', performAuditLoad);
}

async function performAuditLoad() {
  if (!hasCurrentCapability(CAPABILITIES.VIEW_AUDIT_LOG)) return;
  elements.adminAuditLoad.setAttribute('aria-busy', 'true');
  elements.adminAuditStatus.textContent = 'Carico le attività...';
  try {
    const events = await listAuditEvents(20);
    renderAuditEvents(events);
    elements.adminAuditLoad.dataset.loaded = 'true';
    elements.adminAuditStatus.textContent = events.length === 0
      ? 'Nessuna modifica registrata'
      : `Ultime ${events.length} modifiche`;
  } catch (error) {
    elements.adminAuditStatus.textContent = friendlyErrorMessage(error, 'Attività non disponibili');
  } finally {
    elements.adminAuditLoad.setAttribute('aria-busy', 'false');
  }
}

function renderAuditEvents(events) {
  const actionLabels = {
    DELETE_PARTICIPANT: 'Persona eliminata',
    REVOKE_ADMIN: 'Amministratore revocato',
    REVOKE_ADMIN_INVITATION: 'Invito revocato',
    ROTATE_OPERATIONAL_LINK: 'Collegamento rigenerato',
    TRANSFER_OWNERSHIP: 'Responsabilità trasferita',
    UPDATE_ADMIN_PERMISSIONS: 'Autorizzazioni aggiornate',
    UPDATE_CENTER_SETTINGS: 'Impostazioni centro aggiornate',
    UPSERT_PARTICIPANT: 'Anagrafica aggiornata'
  };
  elements.adminAuditList.innerHTML = events.map((event) => {
    const date = event.createdAt?.toDate?.();
    const dateLabel = date instanceof Date
      ? formatDateTime(date, { dateStyle: 'short', timeStyle: 'short' }, getLocale())
      : '';
    return `
      <article class="admin-audit-row">
        <strong>${escapeHtml(actionLabels[event.action] || event.action)}</strong>
        <span>${escapeHtml(event.summary || event.targetId)}</span>
        <time>${escapeHtml(dateLabel)}</time>
      </article>
    `;
  }).join('');
}

async function refreshAdminInvitationList() {
  if (!hasCurrentCapability(CAPABILITIES.MANAGE_ADMINS)) return;
  const [invitations, accounts] = await Promise.all([
    listAdministratorInvitations(),
    listCenterAdministrators()
  ]);
  state.adminInvitations = invitations;
  state.adminAccounts = accounts;
  renderAdminLeadershipForm();
  renderAdminInvitationList();
  renderAdminAccountList();
  renderAdminOverview();
}

function refreshAdminRolesWhenVisible() {
  if (document.visibilityState === 'hidden'
      || state.mode !== 'admin'
      || !state.adminRole
      || !hasCurrentCapability(CAPABILITIES.MANAGE_ADMINS)) {
    return;
  }
  operationGuard.run('admin:role-state-refresh', refreshAdminInvitationList).catch((error) => {
    if (elements.adminInvitationManagementStatus) {
      elements.adminInvitationManagementStatus.textContent = friendlyErrorMessage(
        error,
        t('admin.invitations.refreshFailed')
      );
    }
  });
}

function renderAdminOverview() {
  const hasCollaborator = state.adminAccounts.some((admin) => (
    admin.status === 'ACTIVE' && ['ADMIN', 'MANAGER'].includes(admin.role)
  ))
    || state.adminInvitations.some((invitation) => invitation.status === 'ACTIVE');

  const overview = buildAdminOverview({
    role: state.adminRole,
    participants: state.adminParticipants,
    invitations: state.adminInvitations,
    coverage: state.adminCalendarCoverage,
    canViewOperationalLinks: hasCurrentCapability(CAPABILITIES.VIEW_OPERATIONAL_LINKS),
    canManageCalendar: hasCurrentCapability(CAPABILITIES.MANAGE_CALENDAR),
    operationalLinks: state.operationalLinks,
    hasCollaborator
  });
  if (elements.adminOverviewRole) {
    const roleKey = state.adminRole === 'OWNER'
      ? 'role.owner'
      : state.adminRole === 'ADMIN'
      ? 'role.admin'
      : state.adminRole === 'MANAGER'
      ? 'role.vice'
      : state.adminRole === 'RESIDENT'
      ? 'role.resident'
      : '';
    elements.adminOverviewRole.textContent = (roleKey ? t(roleKey) : '') || overview.roleLabel;
  }
  if (elements.adminOverviewActivePeople) {
    elements.adminOverviewActivePeople.textContent = String(overview.activePeople);
  }
  if (elements.adminOverviewSuspendedPeople) {
    elements.adminOverviewSuspendedPeople.textContent = String(overview.suspendedPeople);
  }
  if (elements.adminOverviewInvitations) {
    elements.adminOverviewInvitations.textContent = String(overview.activeInvitations);
  }
  if (elements.adminOverviewCalendar) {
    elements.adminOverviewCalendar.textContent = overview.calendar.label;
    elements.adminOverviewCalendar.classList.toggle('admin-overview-warning', overview.calendar.needsAttention);
  }
  if (elements.adminOverviewLinks) {
    elements.adminOverviewLinks.textContent = overview.links;
  }

  if (elements.activationChecklistWrap && elements.activationChecklistList) {
    const checklistItems = overview.checklist?.items || [];
    elements.activationChecklistWrap.hidden = checklistItems.length === 0 || overview.checklist.complete;

    elements.activationChecklistList.innerHTML = checklistItems.map((item) => `
      <li class="activation-checklist-item${item.done ? ' is-done' : ''}${item.required ? '' : ' is-recommended'}">
        <a href="#${escapeHtml(item.target)}"
           data-admin-checklist-target="${escapeHtml(item.target)}"
           aria-label="${escapeHtml(`${item.label}: ${item.done ? 'completato' : 'da completare'}`)}">
          <span class="activation-checklist-mark" aria-hidden="true">${item.done ? '✓' : '○'}</span>
          <span>${escapeHtml(item.label)}${item.required ? '' : ' (consigliato)'}</span>
        </a>
      </li>
    `).join('');
  }
}

function renderAdminInvitationList() {
  if (!elements.adminInvitationManagement || !elements.adminInvitationList) return;
  const canManageRoles = hasCurrentCapability(CAPABILITIES.MANAGE_ADMINS);
  elements.adminInvitationManagement.hidden = !canManageRoles;
  if (!canManageRoles) return;

  const now = Date.now();
  elements.adminInvitationList.innerHTML = state.adminInvitations.map((invitation) => {
    const expiresAt = invitation.expiresAt?.toDate?.() || new Date(invitation.expiresAt || 0);
    const expired = Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now;
    const active = invitation.status === 'ACTIVE' && !expired;
    const statusLabel = active
      ? t('admin.invitations.pending')
      : invitation.status === 'USED'
        ? t('admin.invitations.accepted')
        : invitation.status === 'REJECTED'
          ? t('admin.invitations.rejected')
          : expired && invitation.status === 'ACTIVE'
            ? t('admin.invitations.expired')
            : t('admin.invitations.revoked');
    const roleLabel = invitation.role === 'ADMIN' ? t('role.admin') : t('role.vice');
    const participant = state.adminParticipants.find((item) => item.participantId === invitation.participantId);
    const targetLabel = participant?.displayName || (invitation.role === 'ADMIN' ? 'Nuovo amministratore' : invitation.participantId);
    const createdAt = invitation.createdAt?.toDate?.() || new Date(invitation.createdAt || 0);
    const createdLabel = !Number.isNaN(createdAt.getTime())
      ? formatDateTime(createdAt, { dateStyle: 'medium' }, getLocale())
      : '';
    const expiryLabel = !Number.isNaN(expiresAt.getTime())
      ? formatDateTime(expiresAt, { dateStyle: 'medium' }, getLocale())
      : '';
    const canRevoke = active && (state.adminRole === 'OWNER' || invitation.role === 'MANAGER');
    return `
      <article class="admin-invitation-row">
        <span><strong>${escapeHtml(roleLabel)}</strong><small>${escapeHtml(targetLabel)}</small></span>
        <span class="admin-invitation-state ${active ? 'admin-invitation-active' : invitation.status === 'USED' ? 'admin-invitation-accepted' : ''}">${escapeHtml(statusLabel)}</span>
        <span class="admin-invitation-dates">
          ${createdLabel ? `<time datetime="${escapeHtml(createdAt.toISOString())}">${escapeHtml(t('admin.invitations.sentOn', { date: createdLabel }))}</time>` : ''}
          ${active && expiryLabel ? `<small>${escapeHtml(t('admin.invitations.expiresOn', { date: expiryLabel }))}</small>` : ''}
        </span>
        ${canRevoke ? `<button type="button" class="tertiary-action" data-revoke-admin-invitation="${escapeHtml(invitation.invitationId)}">${escapeHtml(t('admin.invitations.revoke'))}</button>` : ''}
      </article>`;
  }).join('');
  elements.adminInvitationManagementStatus.textContent = state.adminInvitations.length === 0
    ? t('admin.invitations.none')
    : t('admin.invitations.recentCount', { count: state.adminInvitations.length });
}

async function handleAdminInvitationListClick(event) {
  const button = event.target.closest('[data-revoke-admin-invitation]');
  if (!button) return;
  const invitationId = button.dataset.revokeAdminInvitation;
  const decision = await showActionDialog({
    title: t('dialog.revokeInvitation.title'),
    message: t('dialog.revokeInvitation.message'),
    confirmLabel: t('dialog.revokeInvitation.title'),
    destructive: true
  });
  if (!decision.confirmed) return;
  button.disabled = true;
  elements.adminInvitationManagementStatus.textContent = t('admin.invitations.revoking');
  try {
    await operationGuard.run(`admin:revoke-invitation:${invitationId}`, () => (
      revokeAdministratorInvitation(invitationId)
    ));
    await refreshAdminInvitationList();
    elements.adminInvitationManagementStatus.textContent = t('admin.invitations.revoked');
  } catch (error) {
    elements.adminInvitationManagementStatus.textContent = friendlyErrorMessage(error, t('admin.invitations.revokeFailed'));
    button.disabled = false;
  }
}

function renderAdminAccountList() {
  if (!elements.adminAccountManagement || !elements.adminAccountList) return;
  const canManageAdministrators = hasCurrentCapability(CAPABILITIES.MANAGE_ADMINS);
  elements.adminAccountManagement.hidden = !canManageAdministrators;
  if (!canManageAdministrators) return;

  const currentUid = getCurrentUser()?.uid || '';
  const accounts = state.adminAccounts.filter((account) => account.adminUid !== currentUid);
  const activeAccounts = accounts.filter((account) => account.status === 'ACTIVE');
  elements.adminAccountList.innerHTML = accounts.map((account) => {
    const participant = state.adminParticipants.find((item) => (
      item.participantId === account.participantId
    ));
    const name = participant?.displayName || account.email || t('role.admin');
    const active = account.status === 'ACTIVE';
    const statusLabel = active ? t('status.active') : t('admin.accounts.revoked');
    const roleLabel = account.role === 'OWNER'
      ? t('admin.accounts.previousOwner')
      : account.role === 'ADMIN' ? t('role.admin') : t('role.vice');
    return `
      <article class="admin-invitation-row">
        <span><strong>${escapeHtml(name)}</strong><small>${escapeHtml(account.email || '')}</small></span>
        <span class="admin-invitation-state ${active ? 'admin-invitation-active' : 'admin-invitation-accepted'}">${escapeHtml(statusLabel)}</span>
        <span>${escapeHtml(roleLabel)}</span>
        ${active
          ? `<button type="button" class="danger-action" data-revoke-center-admin="${escapeHtml(account.adminUid)}">${escapeHtml(t('admin.accounts.revokeAccess'))}</button>`
          : ''}
      </article>`;
  }).join('');
  if (elements.adminAccountStatus) {
    elements.adminAccountStatus.textContent = activeAccounts.length === 0
      ? t('admin.accounts.noOtherAdmins')
      : t('admin.accounts.activeCount', { count: activeAccounts.length });
  }
}

async function handleAdminAccountListClick(event) {
  const button = event.target.closest('[data-revoke-center-admin]');
  if (!button) return;
  const targetUid = button.dataset.revokeCenterAdmin;
  const account = state.adminAccounts.find((item) => item.adminUid === targetUid);
  const decision = await showActionDialog({
    title: t('dialog.revokeAdmin.title'),
    message: t('dialog.revokeAdmin.message', { email: account?.email || t('role.admin') }),
    confirmLabel: t('dialog.revokeAdmin.title'),
    destructive: true
  });
  if (!decision.confirmed) return;

  button.disabled = true;
  elements.adminAccountStatus.textContent = 'Revoco l’accesso...';
  try {
    await operationGuard.run(`admin:revoke:${targetUid}`, () => (
      revokeCenterAdministrator(targetUid)
    ));
    await refreshAdminParticipants();
    elements.adminAccountStatus.textContent = 'Accesso amministratore revocato';
  } catch (error) {
    elements.adminAccountStatus.textContent = friendlyErrorMessage(error, 'Accesso non revocato');
    button.disabled = false;
  }
}



function handleAdminCenterSettingsSave() {
  return operationGuard.run('admin:center-settings', performAdminCenterSettingsSave);
}

async function performAdminCenterSettingsSave() {
  if (!hasCurrentCapability(CAPABILITIES.MANAGE_CENTER_SETTINGS)) return;
  elements.adminCenterSettingsSave.disabled = true;
  elements.adminCenterSettingsSave.setAttribute('aria-busy', 'true');
  elements.adminCenterSettingsSection.setAttribute('aria-busy', 'true');
  elements.adminCenterSettingsStatus.textContent = 'Salvo...';
  try {
    const administratorFields = [
      elements.adminAdministratorName,
      elements.adminAdministratorSignature,
      elements.adminAdministratorEmail
    ];
    const invalidField = administratorFields.find((field) => field && !field.checkValidity());
    if (invalidField) {
      invalidField.reportValidity();
      throw new Error('Completa i dati del responsabile');
    }
    const previousAdministratorSignature = state.centerContactSettings.administratorSignature || '';
    const administratorName = elements.adminAdministratorName?.value.trim() || '';
    const administratorSignature = elements.adminAdministratorSignature?.value.trim() || '';
    const newAdminPassword = elements.adminAdministratorPassword?.value || '';
    const newSharedAdminPassword = elements.adminSharedPasswordNew?.value || '';
    const currentSharedAdminPassword = elements.adminSharedPasswordCurrent?.value || '';
    if (newSharedAdminPassword && state.centerContactSettings.adminSharedPasswordSet
        && !currentSharedAdminPassword) {
      throw new Error(t('admin.sharedPassword.currentRequired'));
    }
    const passwordRequired = requiresAdministratorPassword(getCurrentUser());
    if (passwordRequired && !state.centerContactSettings.adminPasswordSet && !newAdminPassword) {
      throw new Error('Inserisci la password amministratore');
    }
    if (newAdminPassword) {
      if (newAdminPassword.length < 6) {
        throw new Error('La password dell\'amministratore deve contenere almeno 6 caratteri.');
      }
      await updateAdministratorPassword(newAdminPassword);
      if (elements.adminAdministratorPassword) {
        elements.adminAdministratorPassword.value = '';
        if (elements.adminAdministratorPassword.type !== 'password') {
          togglePasswordVisibility(elements.adminAdministratorPassword, elements.adminAdministratorPasswordToggle);
        }
      }
    }
    const settings = await updateCenterSettings({
      name: elements.adminCenterName.value,
      timezone: elements.adminCenterTimezone.value,
      participantContactSharingEnabled: elements.adminContactSharingSelect
        ? elements.adminContactSharingSelect.value === 'enabled'
        : state.centerContactSettings.participantContactSharingEnabled,
      themePalette: state.centerContactSettings.themePalette || 'smeraldo',
      interfaceStyle: state.centerContactSettings.interfaceStyle || 'original',
      defaultView: state.centerContactSettings.defaultView || 'month',
      summaryLayout: state.centerContactSettings.summaryLayout || 'international',
      kitchenLayout: state.centerContactSettings.kitchenLayout || 'classic',
      language: state.centerContactSettings.language || 'it',
      commonPassword: elements.adminCommonPasswordInput?.value || '',
      administratorSharedPassword: newSharedAdminPassword,
      currentAdministratorSharedPassword: currentSharedAdminPassword,
      administratorName,
      administratorSignature,
      adminEmail: state.adminRole === 'OWNER'
        ? getCurrentUser()?.email || ''
        : elements.adminAdministratorEmail?.value || '',
      reservationCutoffs: {
        lunch: elements.adminCutoffLunch.value,
        dinner: elements.adminCutoffDinner.value,
        nextDayBreakfast: elements.adminCutoffBreakfast.value
      },
      onProgress: ({ completedDays, totalDays, status }) => {
        if (status === 'COMPLETED') return;
        const percentage = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 100;
        elements.adminCenterSettingsStatus.textContent = `Aggiorno le scadenze future: ${percentage}%`;
      }
    });
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
      ...settings,
      administratorProfileComplete: true,
      adminPasswordSet: state.centerContactSettings.adminPasswordSet || Boolean(newAdminPassword),
      // Se è stata inserita una nuova password, aggiorna il flag; altrimenti mantieni quello attuale.
      commonPasswordSet: settings.commonPassword !== null
        ? true
        : state.centerContactSettings.commonPasswordSet,
      adminSharedPasswordSet: state.centerContactSettings.adminSharedPasswordSet
        || Boolean(newSharedAdminPassword),
      adminPasswordVersion: newSharedAdminPassword
        ? Number(state.centerContactSettings.adminPasswordVersion || 0) + 1
        : Number(state.centerContactSettings.adminPasswordVersion || 0),
      adminPasswordRotationRequired: newSharedAdminPassword
        ? false
        : state.centerContactSettings.adminPasswordRotationRequired
    };
    const administratorParticipantId = await saveAdministratorAsParticipant({
      administratorName,
      administratorSignature,
      previousAdministratorSignature
    });
    await linkCurrentAdministratorParticipant(administratorParticipantId);
    state.adminParticipants = await listAdminParticipants();
    state.adminParticipantId = administratorParticipantId;
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
    elements.adminCenterSettingsStatus.textContent = friendlyErrorMessage(error, 'Centro non salvato');
  } finally {
    elements.adminCenterSettingsSave.disabled = false;
    elements.adminCenterSettingsSave.removeAttribute('aria-busy');
    elements.adminCenterSettingsSection.removeAttribute('aria-busy');
  }
}

async function saveAdministratorAsParticipant({
  administratorName,
  administratorSignature,
  previousAdministratorSignature
}) {
  const nextSignature = administratorSignature.toUpperCase();
  const previousSignature = previousAdministratorSignature.trim().toUpperCase();
  const participantWithNextSignature = state.adminParticipants.find(
    (participant) => participant.signature === nextSignature
  );
  const participantWithPreviousSignature = previousSignature
    ? state.adminParticipants.find((participant) => participant.signature === previousSignature)
    : null;

  if (participantWithNextSignature && participantWithPreviousSignature
      && participantWithNextSignature.participantId !== participantWithPreviousSignature.participantId) {
    throw new Error('La nuova sigla appartiene già a un\'altra persona');
  }

  const participant = participantWithPreviousSignature || participantWithNextSignature || null;
  const sortOrder = participant?.sortOrder
    || Math.max(0, ...state.adminParticipants.map((item) => Number(item.sortOrder || 0))) + 1;

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
  });
}

function markAdminCenterDirty(event) {
  if (!event.isTrusted || event.target === elements.adminCenterAvatarInput) return;
  state.adminCenterDirty = true;
  elements.adminCenterSettingsStatus.textContent = 'Modifiche non salvate';
}

function syncAdminCenterSettingsForm() {
  elements.adminCenterName.value = state.centerContactSettings.name || '';
  elements.adminCenterTimezone.value = state.centerContactSettings.timezone || 'Europe/Rome';
  elements.adminCutoffLunch.value = state.centerContactSettings.reservationCutoffs?.lunch || '09:30';
  elements.adminCutoffDinner.value = state.centerContactSettings.reservationCutoffs?.dinner || '15:00';
  elements.adminCutoffBreakfast.value = state.centerContactSettings.reservationCutoffs?.nextDayBreakfast || '15:00';
  if (elements.adminAdministratorName) {
    elements.adminAdministratorName.value = state.centerContactSettings.administratorName
      || getCurrentUser()?.displayName
      || '';
  }
  if (elements.adminAdministratorSignature) {
    elements.adminAdministratorSignature.value = state.centerContactSettings.administratorSignature || '';
  }
  if (elements.adminAdministratorEmail) {
    const currentUser = getCurrentUser();
    elements.adminAdministratorEmail.value = state.adminRole === 'OWNER'
      ? currentUser?.email || state.centerContactSettings.adminEmail || ''
      : state.centerContactSettings.adminEmail || currentUser?.email || '';
    elements.adminAdministratorEmail.readOnly = true;
  }
  if (elements.adminAdministratorPassword) {
    elements.adminAdministratorPassword.value = '';
    elements.adminAdministratorPassword.placeholder = state.centerContactSettings.adminPasswordSet
      ? 'Password già impostata'
      : 'Minimo 6 caratteri';
    if (elements.adminAdministratorPassword.type !== 'password') {
      togglePasswordVisibility(elements.adminAdministratorPassword, elements.adminAdministratorPasswordToggle);
    }
  }
  if (elements.adminCommonPasswordInput) {
    // Non precompilare: la password non deve mai apparire in chiaro nel campo.
    elements.adminCommonPasswordInput.value = '';
    if (elements.adminCommonPasswordInput.type !== 'password') {
      togglePasswordVisibility(elements.adminCommonPasswordInput, elements.adminCommonPasswordToggle);
    }
  }
  if (elements.adminCommonPasswordStatus) {
    const isSet = Boolean(state.centerContactSettings.commonPasswordSet);
    elements.adminCommonPasswordStatus.textContent = isSet ? '✓ Impostata' : 'Non impostata';
    elements.adminCommonPasswordStatus.className = isSet ? 'password-status-set' : 'password-status-unset';
  }
  syncAdminAdaptationsForm();
}

function syncAdminAdaptationsForm() {
  const currentPalette = state.pendingThemePalette || state.centerContactSettings.themePalette || 'smeraldo';
  const currentInterfaceStyle = state.pendingInterfaceStyle || state.centerContactSettings.interfaceStyle || 'original';
  document.documentElement.dataset.theme = currentPalette;
  applyInterfaceStyle(currentInterfaceStyle);
  if (elements.adminThemeSelect) elements.adminThemeSelect.value = currentPalette;
  if (elements.adminInterfaceStyleSelect) elements.adminInterfaceStyleSelect.value = currentInterfaceStyle;
  if (elements.adminDefaultViewSelect) {
    elements.adminDefaultViewSelect.value = state.centerContactSettings.defaultView || 'month';
  }
  if (elements.adminSummaryLayoutSelect) {
    elements.adminSummaryLayoutSelect.value = state.centerContactSettings.summaryLayout || 'international';
  }
  if (elements.adminKitchenLayoutSelect) {
    elements.adminKitchenLayoutSelect.value = state.centerContactSettings.kitchenLayout || 'classic';
    elements.adminKitchenLayoutSelect.disabled = state.residentSettingsMode;
  }
  if (elements.adminSharedPasswordStatus) {
    const isSet = Boolean(state.centerContactSettings.adminSharedPasswordSet);
    elements.adminSharedPasswordStatus.textContent = isSet
      ? t('admin.sharedPassword.set')
      : t('admin.sharedPassword.notSet');
    elements.adminSharedPasswordStatus.className = isSet ? 'password-status-set' : 'password-status-unset';
  }
  if (elements.adminSharedPasswordCurrent) {
    elements.adminSharedPasswordCurrent.hidden = !state.centerContactSettings.adminSharedPasswordSet;
    elements.adminSharedPasswordCurrent.closest('label').hidden = !state.centerContactSettings.adminSharedPasswordSet;
  }
  if (elements.adminContactSharingSelect) {
    const isEnabled = state.centerContactSettings.participantContactSharingEnabled;
    elements.adminContactSharingSelect.value = isEnabled ? 'enabled' : 'disabled';
    elements.adminContactSharingSelect.dataset.state = isEnabled ? 'enabled' : 'disabled';
  }
  updateThemeSelectControl(currentPalette);
  if (elements.adminLanguageSelect) {
    elements.adminLanguageSelect.value = state.centerContactSettings.language || 'it';
  }
  const participantCanAdminister = Boolean(state.selectedParticipant) && (
    state.selectedParticipant.viceAdminRole === true
    || selectedParticipantIsCenterAdministrator()
  );
  if (elements.residentAdminUnlock) {
    elements.residentAdminUnlock.hidden = !state.residentSettingsMode
      || !participantCanAdminister
      || state.residentAdministratorAuthorized;
  }
  if (elements.adminPasswordRotationWarning) {
    elements.adminPasswordRotationWarning.hidden = true;
  }
  if (elements.adminPasswordAlertDot) {
    elements.adminPasswordAlertDot.hidden = !state.centerContactSettings.adminPasswordRotationRequired;
  }
}

function invitationPrompt(role = '') {
  const hintedRole = role || new URLSearchParams(window.location.search).get('adminRole');
  return hintedRole === 'MANAGER'
    ? t('admin.invitations.viceAcceptPrompt')
    : t('admin.invitations.acceptPrompt');
}

function showRoleInvitationAccepted(role) {
  return showActionDialog({
    title: role === 'MANAGER'
      ? t('admin.invitations.viceActivatedTitle')
      : t('admin.invitations.acceptedWaitTitle'),
    message: role === 'MANAGER'
      ? t('admin.invitations.viceActivatedMessage')
      : t('admin.invitations.acceptedWaitMessage'),
    confirmLabel: t('common.actions.confirm'),
    hideCancel: true
  });
}

function updateThemeSelectControl(palette) {
  if (elements.adminThemeSelectPreview) {
    elements.adminThemeSelectPreview.className = `theme-swatch-preview theme-swatch-${palette}`;
  }
  if (elements.adminThemeSelect) elements.adminThemeSelect.value = palette;
}

function handleThemeSelectChange(event) {
  const selectedPalette = event.target.value;
  state.pendingThemePalette = selectedPalette;
  document.documentElement.dataset.theme = selectedPalette;
  updateThemeSelectControl(selectedPalette);
  if (elements.adminThemeStatus) {
    elements.adminThemeStatus.textContent = t('admin.adaptations.theme.preview');
  }
}

function handleInterfaceStyleSelectChange(event) {
  const selectedStyle = INTERFACE_STYLE_VALUES.has(event.target.value)
    ? event.target.value
    : 'original';
  state.pendingInterfaceStyle = selectedStyle;
  applyInterfaceStyle(selectedStyle);
  if (elements.adminThemeStatus) {
    elements.adminThemeStatus.textContent = t('admin.adaptations.interfaceStyle.preview');
  }
  renderMode();
}

async function handleAdminAdaptationsSave() {
  try {
    if (elements.adminAdaptationsSave) elements.adminAdaptationsSave.disabled = true;
    if (elements.adminAdaptationsCancel) elements.adminAdaptationsCancel.disabled = true;
    if (elements.adminThemeStatus) elements.adminThemeStatus.textContent = t('common.status.saving');
    const paletteToSave = state.pendingThemePalette || state.centerContactSettings.themePalette || 'smeraldo';
    const interfaceStyleToSave = state.pendingInterfaceStyle
      || state.centerContactSettings.interfaceStyle
      || 'original';
    const sharingEnabled = elements.adminContactSharingSelect
      ? elements.adminContactSharingSelect.value === 'enabled'
      : state.centerContactSettings.participantContactSharingEnabled;
    const languageToSave = elements.adminLanguageSelect ? elements.adminLanguageSelect.value : (state.centerContactSettings.language || 'it');
    if (state.residentSettingsMode && !state.adminRole) {
      const preferences = {
        themePalette: paletteToSave,
        interfaceStyle: interfaceStyleToSave,
        defaultView: elements.adminDefaultViewSelect?.value || state.centerContactSettings.defaultView,
        summaryLayout: elements.adminSummaryLayoutSelect?.value || state.centerContactSettings.summaryLayout,
        language: languageToSave
      };
      storeResidentPreferences(preferences);
      state.centerContactSettings = { ...state.centerContactSettings, ...preferences };
      state.pendingThemePalette = '';
      state.pendingInterfaceStyle = '';
      await setLocale(languageToSave);
      applyTranslations(document);
      renderMode();
      await clearApplicationCache();
      if (elements.adminThemeStatus) elements.adminThemeStatus.textContent = t('status.success.saved');
      return;
    }
    const settings = await updateCenterSettings({
      name: state.centerContactSettings.name,
      timezone: state.centerContactSettings.timezone,
      participantContactSharingEnabled: sharingEnabled,
      themePalette: paletteToSave,
      interfaceStyle: interfaceStyleToSave,
      defaultView: elements.adminDefaultViewSelect ? elements.adminDefaultViewSelect.value : state.centerContactSettings.defaultView,
      summaryLayout: elements.adminSummaryLayoutSelect ? elements.adminSummaryLayoutSelect.value : state.centerContactSettings.summaryLayout,
      kitchenLayout: elements.adminKitchenLayoutSelect ? elements.adminKitchenLayoutSelect.value : state.centerContactSettings.kitchenLayout,
      language: languageToSave,
      commonPassword: '',
      administratorName: state.centerContactSettings.administratorName || getCurrentUser()?.displayName || '',
      administratorSignature: state.centerContactSettings.administratorSignature || '',
      adminEmail: state.centerContactSettings.adminEmail || getCurrentUser()?.email || '',
      reservationCutoffs: state.centerContactSettings.reservationCutoffs
    });
    state.centerContactSettings = {
      ...state.centerContactSettings,
      ...settings,
      language: languageToSave
    };
    if (state.residentReady || state.adminRole) {
      const residentPreferences = loadResidentPreferences();
      storeResidentPreferences({
        ...residentPreferences,
        themePalette: settings.themePalette || paletteToSave,
        interfaceStyle: settings.interfaceStyle || interfaceStyleToSave,
        defaultView: settings.defaultView || elements.adminDefaultViewSelect?.value || state.centerContactSettings.defaultView,
        summaryLayout: settings.summaryLayout || elements.adminSummaryLayoutSelect?.value || state.centerContactSettings.summaryLayout,
        language: languageToSave
      });
    }
    state.pendingThemePalette = '';
    state.pendingInterfaceStyle = '';
    document.documentElement.dataset.theme = state.centerContactSettings.themePalette;
    applyInterfaceStyle(state.centerContactSettings.interfaceStyle || 'original');
    updateThemeSelectControl(state.centerContactSettings.themePalette);
    await setLocale(languageToSave);
    applyTranslations(document);
    renderMode();
    await clearApplicationCache();
    if (elements.adminThemeStatus) elements.adminThemeStatus.textContent = t('status.success.saved');
  } catch (error) {
    if (elements.adminThemeStatus) elements.adminThemeStatus.textContent = friendlyErrorMessage(error, 'Errore durante il salvataggio');
  } finally {
    if (elements.adminAdaptationsSave) elements.adminAdaptationsSave.disabled = false;
    if (elements.adminAdaptationsCancel) elements.adminAdaptationsCancel.disabled = false;
  }
}

function handleAdminAdaptationsCancel() {
  state.pendingThemePalette = '';
  state.pendingInterfaceStyle = '';
  document.documentElement.dataset.theme = state.centerContactSettings.themePalette || 'smeraldo';
  applyInterfaceStyle(state.centerContactSettings.interfaceStyle || 'original');
  syncAdminAdaptationsForm();
  if (elements.adminThemeStatus) elements.adminThemeStatus.textContent = t('admin.adaptations.changesCancelled');
}

function handleAdminAdaptationsReset() {
  state.pendingThemePalette = 'smeraldo';
  state.pendingInterfaceStyle = 'original';
  document.documentElement.dataset.theme = 'smeraldo';
  applyInterfaceStyle('original');
  updateThemeSelectControl('smeraldo');
  if (elements.adminInterfaceStyleSelect) elements.adminInterfaceStyleSelect.value = 'original';
  if (elements.adminThemeStatus) elements.adminThemeStatus.textContent = t('admin.adaptations.theme.previewDefault');
}

function handleBeforeUnload(event) {
  if (!state.adminPersonDirty && !state.adminCenterDirty && !state.pendingCenterAvatarDataUrl) return;
  event.preventDefault();
  event.returnValue = '';
}

async function handleAdminCenterAvatarSelection(event) {
  if (!hasCurrentCapability(CAPABILITIES.MANAGE_CENTER_AVATAR)) return;
  const [file] = event.currentTarget.files || [];
  state.pendingCenterAvatarDataUrl = '';
  if (elements.adminAvatarFilename) {
    elements.adminAvatarFilename.textContent = file ? file.name : t('admin.avatar.noFileSelected');
  }
  renderAdminCenterAvatarEditor();
  if (!file) {
    return;
  }
  elements.adminCenterAvatarStatus.textContent = t('common.status.loading');
  try {
    state.pendingCenterAvatarDataUrl = await prepareCenterAvatar(file);
    renderAdminCenterAvatarEditor();
  } catch (error) {
    event.currentTarget.value = '';
    if (elements.adminAvatarFilename) {
      elements.adminAvatarFilename.textContent = t('admin.avatar.noFileSelected');
    }
    elements.adminCenterAvatarStatus.textContent = friendlyErrorMessage(error, t('admin.avatar.notUsable'));
  }
}

async function handleAdminCenterAvatarSave() {
  if (!hasCurrentCapability(CAPABILITIES.MANAGE_CENTER_AVATAR)) return;
  if (!state.pendingCenterAvatarDataUrl) {
    return;
  }
  if (!state.centerContactSettings.commonPasswordSet) {
    elements.adminCenterAvatarStatus.textContent = t('admin.avatar.needsCommonPassword');
    return;
  }
  elements.adminCenterAvatarSave.disabled = true;
  elements.adminCenterAvatarStatus.textContent = t('admin.avatar.saving');
  try {
    const avatar = await saveCenterAvatar(state.pendingCenterAvatarDataUrl);
    state.centerContactSettings = { ...state.centerContactSettings, ...avatar };
    state.pendingCenterAvatarDataUrl = '';
    elements.adminCenterAvatarInput.value = '';
    if (elements.adminAvatarFilename) {
      elements.adminAvatarFilename.textContent = t('admin.avatar.noFileSelected');
    }
    renderAdminCenterAvatarEditor();
    renderMode();
    elements.adminCenterAvatarStatus.textContent = t('admin.avatar.saved');
  } catch (error) {
    elements.adminCenterAvatarStatus.textContent = friendlyErrorMessage(error, 'Icona non salvata');
  } finally {
    elements.adminCenterAvatarSave.disabled = !state.pendingCenterAvatarDataUrl;
  }
}

async function handleAdminCenterAvatarRemove() {
  if (!hasCurrentCapability(CAPABILITIES.MANAGE_CENTER_AVATAR)) return;
  if (!state.centerContactSettings.avatarDataUrl) return;
  const decision = await showActionDialog({
    title: t('dialog.removeAvatar.title'),
    message: t('dialog.removeAvatar.message'),
    confirmLabel: t('dialog.removeAvatar.title'),
    destructive: true
  });
  if (!decision.confirmed) return;
  elements.adminCenterAvatarRemove.disabled = true;
  elements.adminCenterAvatarStatus.textContent = t('admin.avatar.removing');
  try {
    const avatar = await removeCenterAvatar();
    state.centerContactSettings = { ...state.centerContactSettings, ...avatar };
    state.pendingCenterAvatarDataUrl = '';
    elements.adminCenterAvatarInput.value = '';
    if (elements.adminAvatarFilename) {
      elements.adminAvatarFilename.textContent = t('admin.avatar.noFileSelected');
    }
    renderAdminCenterAvatarEditor();
    renderMode();
    elements.adminCenterAvatarStatus.textContent = t('admin.avatar.removed');
  } catch (error) {
    elements.adminCenterAvatarStatus.textContent = friendlyErrorMessage(error, 'Icona non rimossa');
  } finally {
    elements.adminCenterAvatarRemove.disabled = false;
  }
}

function renderAdminCenterAvatarEditor() {
  const activeAvatar = state.centerContactSettings.avatarDataUrl || '';
  const previewAvatar = state.pendingCenterAvatarDataUrl || activeAvatar;
  const commonPasswordSet = Boolean(state.centerContactSettings.commonPasswordSet);
  elements.adminCenterAvatarPreview.hidden = !previewAvatar;
  elements.adminCenterAvatarPlaceholder.hidden = Boolean(previewAvatar);
  if (previewAvatar) {
    elements.adminCenterAvatarPreview.src = previewAvatar;
  } else {
    elements.adminCenterAvatarPreview.removeAttribute('src');
  }
  elements.adminCenterAvatarSave.disabled = !state.pendingCenterAvatarDataUrl || !commonPasswordSet;
  elements.adminCenterAvatarRemove.hidden = !activeAvatar;
  elements.adminCenterAvatarStatus.textContent = state.pendingCenterAvatarDataUrl
    ? commonPasswordSet
      ? t('admin.avatar.readyUnsaved')
      : t('admin.avatar.readyNeedsPassword')
    : activeAvatar
      ? t('admin.avatar.active')
      : commonPasswordSet
        ? t('admin.avatar.none')
        : t('admin.avatar.needsCommonPassword');
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

function renderMode() {
  const activePalette = state.pendingThemePalette
    || state.centerContactSettings.themePalette
    || 'smeraldo';
  document.documentElement.dataset.theme = activePalette;
  const activeInterfaceStyle = state.pendingInterfaceStyle
    || state.centerContactSettings.interfaceStyle
    || 'original';
  applyInterfaceStyle(activeInterfaceStyle);
  const isParticipant = state.mode === 'participant';
  const isWeek = state.mode === 'week';
  const isSummary = state.mode === 'summary';
  const isKitchen = state.mode === 'kitchen';
  const isAdminView = state.mode === 'admin';
  const isCenterActivation = isAdminView && Boolean(getAdminInvitationId());
  document.body.dataset.mode = state.mode;
  document.body.dataset.centerActivation = isCenterActivation ? 'true' : 'false';
  const needsResidentLogin = state.friendlyAccess
    && !state.residentReady
    && !state.residentRestorePending
    && !(isWeek && canUseWeekWithoutParticipant());
  // The compact verb belongs to the dense Cool/Urban mobile header only.
  // Keep the full product title on tablets and desktop where there is room
  // for the established application identity.
  const useCompactMobileTitle = activeInterfaceStyle !== 'original'
    && window.matchMedia?.('(max-width: 620px)').matches;
  const mealTitle = useCompactMobileTitle
    ? t('app.title.compact')
    : t('app.title');
  const participantName = state.selectedParticipant?.displayName || '';
  const centerName = state.centerContactSettings.name || '';
  const currentUser = getCurrentUser();
  const authenticatedAdministrator = currentUser
    && !currentUser.isAnonymous
    && !isResidentTechnicalEmail(currentUser.email);
  const showResidentLogin = needsResidentLogin
    && !isAdminView;
  document.body.dataset.residentLoginVisible = showResidentLogin ? 'true' : 'false';
  const sessionRole = state.platformOwner
    ? t('role.platformOwner')
    : state.adminRole === 'OWNER'
      ? t('role.owner')
      : state.adminRole === 'ADMIN'
      ? t('role.admin')
      : state.adminRole === 'MANAGER'
        ? t('role.vice')
        : state.residentReady
          ? t('role.resident')
          : '';
  [elements.participantStatusName, elements.weekStatusName].forEach((element) => {
    element.textContent = participantName;
    element.hidden = !participantName;
  });
  elements.title.textContent = isCenterActivation
    ? 'Attivazione centro'
    : isParticipant
    ? mealTitle
    : isWeek
      ? mealTitle
    : isSummary
      ? getSummaryTitle()
      : isAdminView
        ? mealTitle
        : `Cucina${centerName ? ' - ' + centerName : ''}`;
  elements.titleCenter.textContent = isAdminView
    ? t('app.header.controlPanel', {}, { fallback: 'Pannello di controllo' })
    : centerName;
  elements.titleCenter.hidden = (!isSummary && !isAdminView) || (!centerName && !isAdminView);
  elements.sessionRole.textContent = isAdminView && authenticatedAdministrator
    ? currentUser.email || ''
    : '';
  elements.sessionRole.hidden = !elements.sessionRole.textContent;
  renderCenterAvatar(isParticipant || isWeek || isSummary || isKitchen, centerName);
  const browserTitle = isSummary && centerName
    ? `${elements.title.textContent} - ${centerName}`
    : elements.title.textContent;
  document.title = `${browserTitle} · Prenotazione pasti`;
  elements.residentLogin.hidden = !showResidentLogin;
  elements.participantPanel.hidden = !isParticipant || needsResidentLogin || state.platformOwner;
  elements.weekPanel.hidden = !isWeek || needsResidentLogin || state.platformOwner;
  elements.summaryPanel.hidden = !isSummary || needsResidentLogin || state.platformOwner;
  elements.kitchenPanel.hidden = !isKitchen;
  elements.topbarContextNav.hidden = isKitchen;
  if (isCenterActivation) {
    elements.residentLogin.hidden = true;
    elements.participantPanel.hidden = true;
    elements.weekPanel.hidden = true;
    elements.summaryPanel.hidden = true;
    elements.kitchenPanel.hidden = true;
  }
  const isOrdinaryView = isParticipant || isWeek || isSummary;
  const showResidentExit = isOrdinaryView;
  const showAdministratorAccess = isAdminView;
  elements.adminShell.hidden = isKitchen || !showAdministratorAccess;
  const canOpenControlPanel = hasCurrentCapability(CAPABILITIES.OPEN_ADMIN_AREA)
    || selectedResidentCanOpenControlPanel();
  elements.controlPanelEntry.hidden = !isOrdinaryView
    || (!needsResidentLogin && !canOpenControlPanel);
  if (elements.adminPasswordAlertDot) {
    elements.adminPasswordAlertDot.hidden = !state.centerContactSettings.adminPasswordRotationRequired;
  }
  elements.mealsReturnEntry.hidden = !isAdminView
    || isCenterActivation
    || state.platformOwner;
  elements.forgetDeviceButton.hidden = !showResidentExit;
  elements.ownerExitButton.hidden = !isAdminView || isCenterActivation;
  if (authenticatedAdministrator) {
    elements.authActions.classList.add('auth-actions-signed-in');
    elements.authActions.hidden = true;
    elements.authButton.textContent = t('common.actions.exit');
    elements.adminEmailAuth.hidden = true;
  }
  const hasVisibleAdminFooter = hasAdminInterface
    && (!elements.adminShell.hidden || !elements.ownerExitButton.hidden);
  elements.accountFooter.hidden = !hasVisibleAdminFooter
    && elements.forgetDeviceButton.hidden
    && (!hasAdminInterface || elements.ownerExitButton.hidden);
  if (isAdminView) {
    elements.adminShell.open = true;
    if (state.residentSettingsMode) renderResidentSettingsPanel();
  }
  if (elements.participantRefreshButton) {
    elements.participantRefreshButton.hidden = true;
  }
  if (isKitchen) {
    renderKitchenHeading();
  }

  // Changing the interface style does not reload the week data.  Reconcile the
  // operational section here as well, otherwise a previous render made while
  // resident authorisation was still pending can leave Agenda Centro hidden
  // when returning to the Original style.
  if (isWeek && !needsResidentLogin && canManageDailyOperations()) {
    renderWeekOperations();
  }
}

function renderCenterAvatar(showInCurrentMode, centerName) {
  const dataUrl = state.centerContactSettings.avatarDataUrl || '';
  const show = showInCurrentMode && Boolean(dataUrl);
  elements.centerAvatar.hidden = !show;
  if (!show) {
    elements.centerAvatar.removeAttribute('src');
    elements.centerAvatar.alt = '';
    return;
  }
  if (elements.centerAvatar.src !== dataUrl) {
    elements.centerAvatar.src = dataUrl;
  }
  elements.centerAvatar.alt = centerName ? t('admin.avatar.altOf', { name: centerName }) : t('admin.avatar.altCenter');
}

function handleSummaryDayChange(offset) {
  selectSummaryMatrixDay(offset, { smooth: true });
  renderMode();
  if (state.summaryDays.length === 0) {
    refreshNow('riepilogo');
  }
}

function handleKitchenDayChange(offset) {
  selectKitchenMatrixDay(offset, { smooth: true });
  renderKitchenHeading();
  if (state.kitchenDays.length === 0) {
    refreshNow('giorno');
  }
}

function selectSummaryMatrixDay(offset, { smooth = false, scroll = true } = {}) {
  const previousOffset = state.summaryDayOffset;
  state.summaryDayOffset = offset === 1 ? 1 : 0;
  state.todayOverview = state.summaryDays[state.summaryDayOffset]?.meals || state.todayOverview;
  state.summaryDailyOperation = state.summaryOperations[state.summaryDayOffset]?.dailyOperation || state.summaryDailyOperation;
  state.summaryDailyHealth = state.summaryOperations[state.summaryDayOffset]?.dailyHealth || state.summaryDailyHealth;
  elements.summaryDayButtons.forEach((button) => {
    const isSelected = Number(button.dataset.summaryDay) === state.summaryDayOffset;
    button.classList.toggle('week-pill-active', isSelected);
    button.setAttribute('aria-selected', String(isSelected));
  });
  if (scroll) {
    scrollSummaryMatrix(elements.todayOverview, state.summaryDayOffset, { smooth });
  }
  if (previousOffset !== state.summaryDayOffset) {
    scheduleOperationalAutoScroll({ reset: true, delayMs: 220 });
  }
}

function selectKitchenMatrixDay(offset, { smooth = false, scroll = true } = {}) {
  const previousOffset = state.kitchenDayOffset;
  state.kitchenDayOffset = offset === 1 ? 1 : 0;
  state.meals = state.kitchenDays[state.kitchenDayOffset]?.meals || state.meals;
  state.kitchenNote = state.kitchenNotes[state.kitchenDayOffset]?.note || state.kitchenNote;
  state.kitchenDailyOperation = state.kitchenOperations[state.kitchenDayOffset]?.dailyOperation || state.kitchenDailyOperation;
  state.kitchenDailyHealth = state.kitchenOperations[state.kitchenDayOffset]?.dailyHealth || state.kitchenDailyHealth;
  elements.kitchenDayButtons.forEach((button) => {
    const isSelected = Number(button.dataset.kitchenDay) === state.kitchenDayOffset;
    button.classList.toggle('week-pill-active', isSelected);
    button.setAttribute('aria-selected', String(isSelected));
  });
  if (scroll) {
    scrollSummaryMatrix(elements.cards, state.kitchenDayOffset, { kitchen: true, smooth });
  }
  if (previousOffset !== state.kitchenDayOffset) {
    scheduleOperationalAutoScroll({ reset: true, delayMs: 220 });
  }
}

function getKitchenDate() {
  return addCalendarDays(getCenterToday(), state.kitchenDayOffset);
}

function renderKitchenHeading() {
  const date = getKitchenDate();
  elements.kitchenDayTitle.textContent = state.kitchenDayOffset === 1 ? t('time.tomorrow') : t('time.today');
  elements.kitchenDate.textContent = formatCalendarDate(date);
}

function getSummaryDate() {
  return addCalendarDays(getCenterToday(), state.summaryDayOffset);
}

function getCenterToday() {
  return getDateInTimeZone(state.centerContactSettings.timezone || 'Europe/Rome');
}

function anchorCalendarToCenterToday() {
  if (state.calendarAnchoredToCenter) {
    return false;
  }
  const today = getCenterToday();
  state.selectedSummaryDate = formatDateId(today);
  state.weekStartDate = startOfWeek(today);
  state.monthDate = startOfMonth(today);
  state.calendarAnchoredToCenter = true;
  return true;
}

function getSummaryTitle() {
  return t(state.summaryDayOffset === 1 ? 'summary.view.tomorrowTitle' : 'summary.view.todayTitle');
}

function renderAdminParticipantOptions() {
  elements.adminParticipantSelect.innerHTML = `<option value="">${escapeHtml(t('admin.people.selectPerson'))}</option>`
    + getAdminParticipantsSortedBySignature().map((participant) => {
    const selected = participant.participantId === state.adminParticipantId ? ' selected' : '';
    const statusLabel = participant.status === 'ACTIVE' ? '' : ' (disattivato)';
    return '<option value="' + escapeHtml(participant.participantId) + '"' + selected + '>'
      + escapeHtml(participant.displayName + statusLabel) + '</option>';
  }).join('');
}

async function clearApplicationCache() {
  // Purge only the PWA Cache Storage. Firebase Auth persistence, local
  // preferences, tokens and IndexedDB are deliberately left untouched.
  try {
    const cacheNames = await window.caches?.keys?.() || [];
    await Promise.all(cacheNames
      .filter((name) => name.startsWith('tavola-comune-app-'))
      .map((name) => window.caches.delete(name)));
    const controller = navigator.serviceWorker?.controller;
    if (controller) {
      await new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = resolve;
        controller.postMessage({ type: 'CLEAR_APPLICATION_CACHE' }, [channel.port2]);
        window.setTimeout(resolve, 1200);
      });
    }
  } catch {
    // Cache cleanup is an optimization; a settings save must remain valid if
    // a browser does not expose Cache Storage or MessageChannel.
  }
}

function captureFocusWithin(container) {
  const activeElement = document.activeElement;
  if (!(activeElement instanceof HTMLElement) || !container?.contains(activeElement)) {
    return null;
  }

  const focusableSelector = 'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])';
  const focusableElements = [...container.querySelectorAll(focusableSelector)];
  const attributes = [...activeElement.attributes]
    .filter(({ name }) => name === 'name' || name.startsWith('data-'))
    .map(({ name, value }) => `[${name}="${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`)
    .join('');
  const selector = activeElement.id
    ? `#${CSS.escape(activeElement.id)}`
    : `${activeElement.localName}${attributes}`;

  return {
    selector,
    matchIndex: [...container.querySelectorAll(selector)].indexOf(activeElement),
    focusIndex: focusableElements.indexOf(activeElement),
    selectionStart: typeof activeElement.selectionStart === 'number' ? activeElement.selectionStart : null,
    selectionEnd: typeof activeElement.selectionEnd === 'number' ? activeElement.selectionEnd : null
  };
}

function restoreFocusWithin(container, snapshot) {
  if (!snapshot || !container) return;
  const exactMatches = [...container.querySelectorAll(snapshot.selector)];
  const focusableElements = [...container.querySelectorAll(
    'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
  )];
  const target = exactMatches[Math.max(0, snapshot.matchIndex)]
    || focusableElements[Math.min(Math.max(0, snapshot.focusIndex), focusableElements.length - 1)];
  if (!target) return;
  target.focus({ preventScroll: true });
  if (snapshot.selectionStart !== null && typeof target.setSelectionRange === 'function') {
    target.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
  }
}

function renderAdminPeopleList() {
  const canDeleteParticipants = hasCurrentCapability(CAPABILITIES.DELETE_PARTICIPANTS);
  const renderKey = JSON.stringify({
    locale: getLocale(),
    selectedParticipantId: state.adminParticipantId,
    participants: state.adminParticipants.map((participant) => ({
      participantId: participant.participantId,
      displayName: participant.displayName,
      signature: participant.signature,
      groupId: participant.groupId,
      status: participant.status,
      dietTags: participant.dietTags,
      phone: participant.phone,
      viceAdminRole: participant.viceAdminRole === true,
      liturgicalRole: participant.liturgicalRole === true,
      administratorRole: participantHasAdministratorRole(participant)
    })),
    adminAccounts: state.adminAccounts.map((account) => ({
      participantId: account.participantId,
      role: account.role,
      status: account.status
    })),
    administratorSignature: state.centerContactSettings.administratorSignature,
    canDeleteParticipants,
    pendingStatusIds: [...state.pendingAdminParticipantStatusIds].sort(),
    pendingDeleteIds: [...state.pendingAdminParticipantDeleteIds].sort()
  });
  if (elements.adminPeopleList.dataset.renderKey === renderKey
      && elements.adminPeopleList.childElementCount > 0) {
    return;
  }

  const focusSnapshot = captureFocusWithin(elements.adminPeopleList);
  elements.adminPeopleList.innerHTML = getAdminParticipantsSortedBySignature().map((participant) => {
    const dietCode = normalizeDietCode(
      (participant.dietTags || []).find((tag) => tag !== 'STANDARD') || 'STANDARD'
    );
    const participantId = escapeHtml(participant.participantId);
    const displayName = escapeHtml(participant.displayName || t('admin.people.unnamed'));
    const signature = escapeHtml(participant.signature || t('admin.people.noSignature'));
    const groupLabel = participant.groupId === 'group_ospiti' ? t('role.guest') : t('role.resident');
    const statusLabel = participant.status === 'ACTIVE' ? t('admin.people.statusActive') : t('admin.people.statusSuspended');
    const roleLabels = [
      participantHasAdministratorRole(participant) ? t('role.admin') : '',
      participant.viceAdminRole === true ? t('admin.people.viceShort') : '',
      participant.liturgicalRole === true ? t('admin.people.liturgyShort') : ''
    ].filter(Boolean);
    const details = [
      groupLabel,
      dietCode === 'STANDARD'
        ? ''
        : (/^\d+$/.test(dietCode)
          ? t('diet.numbered', { number: dietCode })
          : formatDietLabel(dietCode)),
      ...roleLabels
    ].filter(Boolean).map(escapeHtml).join(' · ');
    const phoneIcon = participant.phone
      ? `<span class="admin-person-phone" role="img" aria-label="${escapeHtml(t('admin.people.phonePresent'))}" title="${escapeHtml(t('admin.people.phonePresent'))}">☎</span>`
      : '';
    const selected = participant.participantId === state.adminParticipantId;
    const isActive = participant.status === 'ACTIVE';
    const statusPending = state.pendingAdminParticipantStatusIds.has(participant.participantId);
    const deletePending = state.pendingAdminParticipantDeleteIds.has(participant.participantId);
    const deleteLabel = `${t('admin.people.delete')}: ${participant.displayName || t('admin.people.unnamed')}`;
    return `
      <div class="admin-person-row${selected ? ' admin-person-row-selected' : ''}${deletePending ? ' admin-person-row-deleting' : ''}" data-admin-person-row="${participantId}"${deletePending ? ' aria-busy="true"' : ''}>
        <button type="button" class="admin-person-name" data-admin-person-open="${participantId}"${selected ? ' aria-current="true"' : ''}${deletePending ? ' disabled' : ''}>
          <strong>
            <span class="admin-person-signature" title="${escapeHtml(t('admin.people.signatureTitle'))}">${signature}</span>
            <span class="admin-person-display">${displayName}</span>
          </strong>
          <span class="admin-person-details">${details}${phoneIcon}</span>
        </button>
        <label class="checkbox-row admin-person-toggle-active">
          <input type="checkbox"
            data-admin-person-toggle-active="${participantId}"
            ${statusPending || deletePending ? 'disabled aria-busy="true"' : ''}
            ${isActive ? 'checked' : ''}>
          <span style="${isActive ? '' : 'color: #8f342d;'}">${statusLabel}</span>
        </label>
        ${canDeleteParticipants ? `
          <button type="button" class="admin-person-delete" data-admin-person-delete="${participantId}"${deletePending ? ' disabled aria-busy="true"' : ''}
            aria-label="${escapeHtml(deleteLabel)}" title="${escapeHtml(deleteLabel)}">
            <span aria-hidden="true">🗑</span>
          </button>` : ''}
      </div>`;
  }).join('') || `<p class="empty-state">${escapeHtml(t('admin.people.noParticipants'))}</p>`;
  elements.adminPeopleList.dataset.renderKey = renderKey;
  restoreFocusWithin(elements.adminPeopleList, focusSnapshot);
}

function getAdminParticipantsSortedBySignature() {
  return [...state.adminParticipants].sort((left, right) => {
    const signatureOrder = String(left.signature || '').localeCompare(
      String(right.signature || ''),
      getLocale(),
      { numeric: true, sensitivity: 'base' }
    );
    return signatureOrder || String(left.displayName || '').localeCompare(
      String(right.displayName || ''),
      getLocale(),
      { sensitivity: 'base' }
    );
  });
}

function participantHasAdministratorRole(participant) {
  const participantId = String(participant?.participantId || '');
  const linkedAccount = state.adminAccounts.some((account) => (
    account.status === 'ACTIVE'
    && ['OWNER', 'ADMIN'].includes(account.role)
    && String(account.participantId || '') === participantId
  ));
  const participantSignature = String(participant?.signature || '').trim().toUpperCase();
  const configuredSignature = String(
    state.centerContactSettings.administratorSignature || ''
  ).trim().toUpperCase();
  return linkedAccount || Boolean(participantSignature && participantSignature === configuredSignature);
}

async function handleAdminPeopleListChange(event) {
  const toggle = event.target.closest('[data-admin-person-toggle-active]');
  if (!toggle) return;
  const participantId = toggle.dataset.adminPersonToggleActive;
  const participant = state.adminParticipants.find((item) => item.participantId === participantId);
  if (!participant) return;

  const nextActive = toggle.checked;
  const previousStatus = participant.status;
  const previousRevision = participant.revision;
  if (state.pendingAdminParticipantStatusIds.has(participantId)
      || state.pendingAdminParticipantDeleteIds.has(participantId)) return;

  state.pendingAdminParticipantStatusIds.add(participantId);
  participant.status = nextActive ? 'ACTIVE' : 'DISABLED';
  elements.adminStatus.textContent = t(
    nextActive ? 'admin.people.reactivating' : 'admin.people.suspending',
    { name: participant.displayName }
  );
  renderAdminParticipantOptions();
  renderAdminPeopleList();

  try {
    const result = await setAdminParticipantActiveStatus(
      participantId,
      nextActive,
      previousRevision
    );
    participant.status = result.status;
    participant.revision = result.revision;
    elements.adminStatus.textContent = t(
      nextActive ? 'admin.people.reactivated' : 'admin.people.suspended',
      { name: participant.displayName }
    );
  } catch (error) {
    participant.status = previousStatus;
    participant.revision = previousRevision;
    elements.adminStatus.textContent = friendlyErrorMessage(error, t('errors.statusUpdateFailed'));
  } finally {
    state.pendingAdminParticipantStatusIds.delete(participantId);
    renderAdminParticipantOptions();
    renderAdminPeopleList();
  }
}

async function handleAdminPeopleListClick(event) {
  const deleteButton = event.target.closest('[data-admin-person-delete]');
  if (deleteButton) {
    event.preventDefault();
    const participant = state.adminParticipants.find((item) => (
      item.participantId === deleteButton.dataset.adminPersonDelete
    ));
    await deleteParticipantFromAdminPanel(participant, deleteButton);
    return;
  }
  const openButton = event.target.closest('[data-admin-person-open]');
  if (!openButton) return;
  if (!await confirmAdminPersonTransition()) return;
  state.adminParticipantId = openButton.dataset.adminPersonOpen;
  state.adminPersonDirty = false;
  renderAdminParticipantOptions();
  renderAdminPeopleList();
  syncAdminContactForm();
  elements.adminParticipantName.focus();
}

function syncAdminGuestControls() {
  const customGuest = elements.adminGuestPreset.value === 'other';
  elements.adminGuestCustomWrap.hidden = !customGuest;
  if (customGuest) {
    elements.adminGuestCustom.focus();
  }
}

async function handleAdminAddGuest() {
  const rawNumber = elements.adminGuestPreset.value === 'other'
    ? elements.adminGuestCustom.value
    : elements.adminGuestPreset.value;
  const guestNumber = Number.parseInt(rawNumber, 10);
  if (!Number.isInteger(guestNumber) || guestNumber < 1 || guestNumber > 999) {
    elements.adminGuestStatus.textContent = t('admin.people.guestInvalidNumber');
    return;
  }

  const signature = `OSP${guestNumber}`;
  const existing = state.adminParticipants.find((participant) => (
    participant.signature === signature
    || (participant.groupId === 'group_ospiti'
      && participant.displayName?.trim().toLowerCase() === `ospite ${guestNumber}`)
  ));
  if (existing) {
    state.adminParticipantId = existing.participantId;
    renderAdminParticipantOptions();
    syncAdminContactForm();
    elements.adminGuestStatus.textContent = t('admin.people.guestExists', { name: existing.displayName });
    return;
  }

  elements.adminAddGuest.disabled = true;
  elements.adminGuestStatus.textContent = t('admin.people.guestAdding');
  try {
    const sortOrder = Math.max(0, ...state.adminParticipants.map((item) => Number(item.sortOrder || 0))) + 1;
    const participantId = await saveAdminParticipant('', {
      displayName: `Ospite ${guestNumber}`,
      signature,
      groupId: 'group_ospiti',
      dietTags: ['STANDARD'],
      liturgicalRole: false,
      viceAdminRole: false,
      sortOrder,
      active: true,
      phone: '',
      phoneConsent: false,
      whatsappEnabled: false
    });
    state.adminParticipantId = participantId;
    elements.adminGuestCustom.value = '';
    await refreshAdminParticipants();
    elements.adminGuestStatus.textContent = t('admin.people.guestAdded', { number: guestNumber });
  } catch (error) {
    elements.adminGuestStatus.textContent = friendlyErrorMessage(error, 'Ospite non aggiunto');
  } finally {
    elements.adminAddGuest.disabled = false;
  }
}

async function handleAdminParticipantChange() {
  const nextParticipantId = elements.adminParticipantSelect.value;
  if (!await confirmAdminPersonTransition()) {
    renderAdminParticipantOptions();
    return;
  }
  state.adminParticipantId = nextParticipantId;
  state.adminPersonDirty = false;
  syncAdminContactForm();
}

async function handleAdminNewParticipant() {
  if (!await confirmAdminPersonTransition()) return;
  state.adminParticipantId = '';
  state.adminPersonDirty = false;
  elements.adminParticipantSelect.selectedIndex = -1;
  syncAdminContactForm();
  elements.adminParticipantName.focus();
  elements.adminStatus.textContent = t('admin.people.newPerson');
}

function markAdminPersonDirty(event) {
  if (!event.isTrusted) return;
  state.adminPersonDirty = true;
  elements.adminStatus.textContent = t('admin.people.unsavedChanges');
}

async function confirmAdminPersonTransition() {
  if (!state.adminPersonDirty) return true;
  const decision = await showActionDialog({
    title: t('dialog.discardChanges.title'),
    message: t('dialog.discardChanges.message'),
    confirmLabel: t('dialog.discardChanges.title'),
    destructive: true
  });
  return decision.confirmed;
}

function handleAdminCancelParticipant() {
  state.adminPersonDirty = false;
  if (!state.adminParticipantId && state.adminParticipants[0]) {
    state.adminParticipantId = state.adminParticipants[0].participantId;
  }
  renderAdminParticipantOptions();
  renderAdminPeopleList();
  syncAdminContactForm();
  elements.adminStatus.textContent = t('admin.people.changesCancelled');
}

function syncAdminContactForm() {
  const participant = state.adminParticipants.find((item) => item.participantId === state.adminParticipantId) || null;
  populateAdminDietSelect(t('diet.option.STANDARD'));
  const canDeleteParticipant = Boolean(participant)
    && hasCurrentCapability(CAPABILITIES.DELETE_PARTICIPANTS);
  elements.adminDeleteParticipant.hidden = !canDeleteParticipant;
  elements.adminDeleteParticipant.disabled = !canDeleteParticipant;
  if (!participant) {
    elements.adminParticipantName.value = '';
    elements.adminParticipantSignature.value = '';
    elements.adminParticipantGroup.value = 'group_residenti';
    elements.adminParticipantDiets.value = 'STANDARD';
    elements.adminParticipantDietNumber.value = '';
    syncCustomDietNumber(elements.adminParticipantDiets, elements.adminParticipantDietNumber);
    elements.adminPhoneInput.value = '';
    elements.adminParticipantLiturgy.checked = false;
    elements.adminParticipantLiturgy.disabled = !canAssignOperationalRoles();
    elements.adminParticipantVice.checked = false;
    elements.adminParticipantVice.disabled = !canAssignOperationalRoles();
    elements.adminPhoneConsent.checked = false;
    elements.adminWhatsappEnabled.checked = false;
    syncAdminCheckboxes();
    return;
  }

  elements.adminParticipantName.value = participant.displayName || '';
  elements.adminParticipantSignature.value = participant.signature || '';
  elements.adminParticipantGroup.value = participant.groupId === 'group_ospiti' ? 'group_ospiti' : 'group_residenti';
  const dietValue = (participant.dietTags || [])
    .map(normalizeDietCode)
    .find((tag) => /^\d+$/.test(tag)) || 'STANDARD';
  elements.adminParticipantDiets.value = Array.from(elements.adminParticipantDiets.options)
    .some((option) => option.value === dietValue) ? dietValue : 'STANDARD';
  elements.adminParticipantDietNumber.value = '';
  syncCustomDietNumber(elements.adminParticipantDiets, elements.adminParticipantDietNumber);
  elements.adminPhoneInput.value = participant.phone || '';
  elements.adminParticipantLiturgy.checked = participant.liturgicalRole === true;
  elements.adminParticipantLiturgy.disabled = !canAssignOperationalRoles();
  elements.adminParticipantVice.checked = participant.viceAdminRole === true;
  elements.adminParticipantVice.disabled = !canAssignOperationalRoles();
  elements.adminPhoneConsent.checked = Boolean(participant.phoneConsent);
  elements.adminWhatsappEnabled.checked = Boolean(participant.whatsappEnabled);
  syncAdminCheckboxes();
}

function canAssignOperationalRoles() {
  return hasCurrentCapability(CAPABILITIES.ASSIGN_VICE)
    && hasCurrentCapability(CAPABILITIES.ASSIGN_LITURGY);
}

function hasCurrentCapability(capability, options = {}) {
  if (!isAdministratorProfileComplete()
      && capability !== CAPABILITIES.MANAGE_CENTER_SETTINGS) {
    return false;
  }
  return hasCapability(state.adminRole, capability, {
    massPermission: state.adminMassPermission,
    liturgicalRole: options.liturgicalRole === true,
    viceAdminRole: options.viceAdminRole === true,
    platformOwner: state.platformOwner
  });
}

function applyAdminCapabilityVisibility() {
  if (!state.adminActiveSection) {
    state.adminActiveSection = resolveInitialAdminSection();
    state.adminMobileSection = state.adminActiveSection;
    if (state.adminActiveSection === 'configuration') {
      markAdminPanelVisited();
    }
  }
  const canConfigureCenter = hasCurrentCapability(CAPABILITIES.MANAGE_CENTER_SETTINGS);
  const canManageAdaptations = state.residentSettingsMode
    || hasCurrentCapability(CAPABILITIES.MANAGE_CENTER_SETTINGS);
  const canManageOperationalLinks = hasCurrentCapability(CAPABILITIES.MANAGE_OPERATIONAL_LINKS);
  const canManagePeople = hasCurrentCapability(CAPABILITIES.MANAGE_PARTICIPANTS);
  const canManageAccess = hasCurrentCapability(CAPABILITIES.MANAGE_ADMINS);
  const canViewActivity = hasCurrentCapability(CAPABILITIES.VIEW_AUDIT_LOG);
  const canManageCalendar = hasCurrentCapability(CAPABILITIES.MANAGE_CALENDAR);
  const profileComplete = isAdministratorProfileComplete();
  if (!isAdminSectionAllowed(state.adminActiveSection)) {
    state.adminActiveSection = ADMIN_SECTIONS.find((section) => isAdminSectionAllowed(section)) || 'overview';
    state.adminMobileSection = state.adminActiveSection;
  }
  elements.adminNavOverview.hidden = state.residentSettingsMode || !profileComplete;
  elements.adminNavPeople.hidden = !canManagePeople;
  if (elements.adminNavAdaptations) {
    elements.adminNavAdaptations.hidden = !canManageAdaptations;
  }
  elements.adminNavAccess.hidden = !canManageAccess;
  elements.adminNavConfiguration.hidden = !canConfigureCenter;
  elements.adminNavActivity.hidden = !canViewActivity && !canManageCalendar;
  elements.adminAccessSection.hidden = !canManageAccess;
  if (elements.adminAdaptationsSection) {
    elements.adminAdaptationsSection.hidden = !canManageAdaptations;
  }
  elements.adminRoleOptions.forEach((option) => {
    option.hidden = !canManageAccess;
  });
  if (elements.adminAuditSection) {
    elements.adminAuditSection.hidden = !canViewActivity;
  }
  if (elements.adminCalendarExtension) {
    elements.adminCalendarExtension.hidden = !canManageCalendar;
  }
  if (elements.adminCenterSettingsSection) {
    elements.adminCenterSettingsSection.hidden = !canConfigureCenter;
  }
  if (elements.adminTools) {
    elements.adminTools.hidden = !hasCurrentCapability(CAPABILITIES.EXPORT_CENTER_DATA);
  }
  if (elements.adminContactSharingRow) {
    elements.adminContactSharingRow.hidden = !canConfigureCenter || state.residentSettingsMode;
    if (elements.adminContactSharingSelect) {
      elements.adminContactSharingSelect.disabled = !canConfigureCenter;
    }
  }
  if (elements.adminCommonPasswordRow) {
    elements.adminCommonPasswordRow.hidden = !canConfigureCenter;
    if (elements.adminCommonPasswordInput) {
      elements.adminCommonPasswordInput.disabled = !canConfigureCenter;
    }
  }
  if (elements.adminAdministratorPasswordRow) {
    elements.adminAdministratorPasswordRow.hidden = state.adminRole !== 'OWNER'
      || !requiresAdministratorPassword(getCurrentUser());
    if (elements.adminAdministratorPassword) {
      elements.adminAdministratorPassword.required = !elements.adminAdministratorPasswordRow.hidden
        && !state.centerContactSettings.adminPasswordSet;
    }
  }
  if (elements.bootstrapButton) {
    elements.bootstrapButton.hidden = !profileComplete || !canManageCalendar;
  }
  elements.rotateLinkButtons.forEach((button) => {
    button.hidden = !canManageOperationalLinks;
  });
  renderAdminMobileSection();
}

function assertViceSelectionLimit(participantId, selectedAsVice) {
  if (!selectedAsVice) return;
  const otherViceCount = state.adminParticipants.filter((participant) => (
    participant.participantId !== participantId
    && participant.status === 'ACTIVE'
    && participant.viceAdminRole === true
  )).length;
  if (otherViceCount >= 4) {
    throw new Error(t('admin.people.viceLimit', { count: 4 }));
  }
}

function syncAdminCheckboxes() {
  const hasPhone = Boolean(normalizePhone(elements.adminPhoneInput.value));
  if (!hasPhone || !elements.adminPhoneConsent.checked) {
    elements.adminWhatsappEnabled.checked = false;
  }

  elements.adminPhoneConsent.disabled = !hasPhone;
  elements.adminWhatsappEnabled.disabled = !hasPhone || !elements.adminPhoneConsent.checked;
}

function renderParticipantMeals() {
  if (!state.selectedParticipant && !(state.mode === 'week' && canUseWeekWithoutParticipant())) {
    elements.weekOperations.hidden = true;
    if (state.mode === 'summary') {
      renderTodayOverview();
    } else {
      elements.todayOverview.innerHTML = '';
    }
    // During friendly login/restore there is intentionally no selected
    // participant yet. Do not expose the administrative empty-list message:
    // it looks like a failed login and can survive a stale render.
    elements.participantMeals.innerHTML = (state.friendlyAccess && !state.residentReady)
      || state.residentAuthTransition
      || state.residentRestorePending
      ? ''
      : `<p class="empty-state">${escapeHtml(t('admin.people.noParticipants'))}</p>`;
    elements.participantSummary.innerHTML = '';
    elements.participantSummary.hidden = true;
    return;
  }

  if (state.mode === 'summary') {
    elements.weekOperations.hidden = true;
    renderTodayOverview();
    elements.participantSummary.hidden = true;
    return;
  }

  if (state.mode === 'participant') {
    elements.weekOperations.hidden = true;
    renderCalendarControls();
    renderMonthGrid();
    elements.participantMeals.innerHTML = '';
    elements.participantSummary.innerHTML = '';
    elements.participantSummary.hidden = true;
    return;
  }

  renderWeekControls();
  const mealHeadings = (state.participantWeek[0]?.meals || [
    { mealTypeId: 'breakfast' },
    { mealTypeId: 'lunch' },
    { mealTypeId: 'dinner' }
  ]).map((meal) => ({
    ...meal,
    label: getLocalizedMealLabel(meal.mealTypeId, meal.label)
  }));
  const weekMeals = state.participantWeek.flatMap((day) => day.meals || []);
  const weekEffect = getBulkSelectionEffect(weekMeals);
  const weekHasOpenMeals = weekMeals.some((meal) => meal.isOpen);
  const showMassColumn = canManageMass();
  const massByDate = new Map(state.weekDailyOperations.map((operation) => [operation.dateId, operation]));
  const openMassDays = showMassColumn
    ? state.participantWeek.filter((day) => getMassWindowState(day).isOpen)
    : [];
  const allOpenMassesScheduled = openMassDays.length > 0
    && openMassDays.every((day) => massByDate.get(day.date)?.massScheduled === true);
  const massBulkScheduled = !allOpenMassesScheduled;
  const massBulkLabel = massBulkScheduled
    ? 'Segna Messa sì per i giorni modificabili'
    : 'Segna Messa no per i giorni modificabili';
  const weekRenderKey = JSON.stringify({
    participantId: state.selectedParticipant?.participantId || '',
    interfaceStyle: document.documentElement.dataset.interfaceStyle || 'original',
    weekStart: formatDateId(state.weekStartDate),
    today: formatDateId(getCenterToday()),
    showMassColumn,
    headings: mealHeadings.map((meal) => [meal.mealTypeId, meal.label]),
    days: state.participantWeek.map((day) => day.date)
  });
  if (elements.participantMeals.dataset.renderKey === weekRenderKey
      && elements.participantMeals.querySelector('.week-matrix')) {
    syncWeekGridFromState();
    elements.participantSummary.innerHTML = '';
    elements.participantSummary.hidden = true;
    renderWeekOperations();
    return;
  }

  elements.participantMeals.innerHTML = `
    <div class="week-matrix${showMassColumn ? ' week-matrix-with-mass' : ''}" aria-label="Prenotazioni della settimana">
      <div class="week-matrix-header">
        <button type="button" class="week-scope-button${weekEffect === 'ABSENT' ? ' week-scope-button-complete' : ''}" data-week-effect="${weekEffect}" aria-pressed="${weekEffect === 'ABSENT'}" aria-label="${weekEffect === 'PRESENT' ? 'Prenota tutta la settimana' : 'Svuota tutta la settimana'}" title="${weekEffect === 'PRESENT' ? 'Prenota settimana' : 'Svuota settimana'}"${weekHasOpenMeals ? '' : ' disabled'}>
          <span class="week-heading-icon" aria-hidden="true">${getInterfaceIcon('calendar', '▦')}</span>
          <span class="week-heading-label">${escapeHtml(t('week.view.short'))}</span>
        </button>
        ${showMassColumn ? `
          <button type="button" class="week-mass-heading${allOpenMassesScheduled ? ' week-mass-heading-complete' : ''}" data-week-mass-bulk data-week-mass-scheduled="${massBulkScheduled}" aria-pressed="${allOpenMassesScheduled}" aria-label="${massBulkLabel}" title="${massBulkLabel}"${openMassDays.length > 0 ? '' : ' disabled'}>
            <span class="week-heading-icon week-mass-mobile-icon" aria-hidden="true">${getInterfaceIcon('church', '⛪')}</span>
            <span class="week-heading-label">${escapeHtml(t('summary.mass'))}</span>
          </button>
        ` : ''}
        ${mealHeadings.map((meal) => {
          const columnMeals = weekMeals.filter((item) => item.mealTypeId === meal.mealTypeId);
          const mealEffect = getBulkSelectionEffect(columnMeals);
          const mealHasOpenMeals = columnMeals.some((item) => item.isOpen);
          const mealAction = mealEffect === 'PRESENT'
            ? `Prenota ${meal.label.toLowerCase()} per tutta la settimana`
            : `Svuota ${meal.label.toLowerCase()} per tutta la settimana`;
          return `
            <button type="button" class="week-meal-heading${mealEffect === 'ABSENT' ? ' week-meal-heading-complete' : ''}" data-week-meal-type="${meal.mealTypeId}" data-week-meal-effect="${mealEffect}" data-week-meal-label="${escapeHtml(meal.label)}" aria-pressed="${mealEffect === 'ABSENT'}" aria-label="${escapeHtml(mealAction)}" title="${escapeHtml(mealAction)}"${mealHasOpenMeals ? '' : ' disabled'}>
              <span class="week-heading-icon" aria-hidden="true">${getMealIcon(meal.mealTypeId)}</span>
              <span class="week-heading-label">${escapeHtml(meal.label)}</span>
            </button>
          `;
        }).join('')}
      </div>
      ${state.participantWeek.map((day) => {
        const dayEffect = getBulkSelectionEffect(day.meals);
        const dayHasOpenMeals = day.meals.some((meal) => meal.isOpen);
        const todayClass = day.isToday ? ' week-matrix-row-today' : '';
        const subduedClass = !day.isToday
          && (day.date < formatDateId(getCenterToday()) || !dayHasOpenMeals)
          ? ' week-matrix-row-subdued'
          : '';
        const dayAction = dayEffect === 'PRESENT' ? 'Prenota tutta la giornata' : 'Svuota tutta la giornata';
        return `
          <article class="week-matrix-row${todayClass}${subduedClass}" data-day-date="${day.date}">
            <button type="button" class="week-day-button${dayEffect === 'ABSENT' ? ' week-day-button-complete' : ''}" data-day-date="${day.date}" data-day-effect="${dayEffect}" aria-pressed="${dayEffect === 'ABSENT'}" aria-label="${escapeHtml(`${day.label}. ${dayAction}`)}" title="${escapeHtml(dayAction)}"${dayHasOpenMeals ? '' : ' disabled'}>
              <strong>${escapeHtml(formatWeekDayCode(day.date))}</strong>
              ${day.isToday ? `<span>${escapeHtml(t('time.today'))}</span>` : ''}
            </button>
            ${showMassColumn ? renderWeekMassButton(day, massByDate.get(day.date)) : ''}
            ${day.meals.map((meal) => renderMealCell(day.date, meal)).join('')}
          </article>
        `;
      }).join('')}
    </div>
  `;
  elements.participantMeals.dataset.renderKey = weekRenderKey;

  elements.participantSummary.innerHTML = '';
  elements.participantSummary.hidden = true;
  renderWeekOperations();
}

function handleParticipantMealsClick(event) {
  const massBulkButton = event.target.closest('[data-week-mass-bulk]');
  if (massBulkButton && !massBulkButton.disabled) {
    handleWeekMassBulkButton(massBulkButton);
    return;
  }
  const massButton = event.target.closest('[data-week-mass-date]');
  if (massButton && !massButton.disabled) {
    handleWeekMassButton(massButton);
    return;
  }
  const mealButton = event.target.closest('[data-meal-date]');
  if (mealButton && !mealButton.disabled) {
    handleMealButton(mealButton);
    return;
  }
  const weekButton = event.target.closest('[data-week-effect]');
  if (weekButton && !weekButton.disabled) {
    handleWeekBulkButton(weekButton);
    return;
  }
  const weekMealButton = event.target.closest('[data-week-meal-effect]');
  if (weekMealButton && !weekMealButton.disabled) {
    handleWeekMealBulkButton(weekMealButton);
    return;
  }
  const dayButton = event.target.closest('[data-day-effect]');
  if (dayButton && !dayButton.disabled) {
    handleDayBulkButton(dayButton);
    return;
  }
  const summaryButton = event.target.closest('[data-summary-date]');
  if (summaryButton) {
    handleSummaryDateChange(summaryButton.dataset.summaryDate);
  }
}

function canManageMass() {
  return state.adminCanManageMass
    || selectedParticipantIsCenterAdministrator()
    || hasCurrentCapability(CAPABILITIES.MANAGE_MASS, {
      liturgicalRole: state.selectedParticipant?.liturgicalRole === true
    });
}

function canManageDailyOperations() {
  return state.adminCanManageDailyOperations
    || state.residentAdministratorAuthorized;
}

function selectedParticipantIsCenterAdministrator() {
  const participantSignature = String(state.selectedParticipant?.signature || '').trim().toUpperCase();
  const administratorSignature = String(
    state.centerContactSettings.administratorSignature || ''
  ).trim().toUpperCase();
  return Boolean(participantSignature && participantSignature === administratorSignature);
}

function selectedResidentCanOpenControlPanel() {
  return state.residentReady;
}

function canUseWeekWithoutParticipant() {
  return canManageMass() || canManageDailyOperations();
}

function renderWeekMassButton(day, operation) {
  const massScheduled = operation?.massScheduled === true;
  const label = t(massScheduled ? 'summary.yes' : 'summary.no');
  const windowState = getMassWindowState(day);
  const cutoffLabel = formatCutoffLabel(windowState);
  const stateLabel = windowState.isOpen ? `Messa: ${label}` : `Messa: ${label}. ${cutoffLabel}`;
  return `
    <button type="button" class="week-mass-button ${massScheduled ? 'week-mass-button-yes' : 'week-mass-button-no'}${windowState.isOpen ? '' : ' week-mass-button-locked'}" data-week-mass-date="${escapeHtml(day.date)}" data-week-mass-scheduled="${massScheduled}" aria-pressed="${massScheduled}" aria-label="${escapeHtml(`${day.label}. ${stateLabel}`)}" title="${escapeHtml(windowState.isOpen ? `Messa: ${label}` : cutoffLabel)}"${windowState.isOpen ? '' : ' disabled'}>
      <strong>${label}</strong>
    </button>
  `;
}

function getMassWindowState(day) {
  const dinner = day?.meals?.find((meal) => meal.mealTypeId === 'dinner');
  if (dinner?.closesAt) {
    return { isOpen: dinner.isOpen === true, closesAt: dinner.closesAt };
  }
  const closesAt = getMealCutoffDate(
    day.date,
    'dinner',
    state.centerContactSettings.reservationCutoffs,
    state.centerContactSettings.timezone || 'Europe/Rome'
  );
  return { isOpen: closesAt.getTime() > Date.now(), closesAt: closesAt.toISOString() };
}

function getBulkSelectionEffect(meals) {
  const openMeals = (meals || []).filter((meal) => meal.isOpen);
  return openMeals.length > 0 && openMeals.every((meal) => meal.effect === 'PRESENT')
    ? 'ABSENT'
    : 'PRESENT';
}

function getMealIcon(mealTypeId) {
  const originalIcons = {
    breakfast: '☕',
    lunch: '🍝',
    dinner: '🍲'
  };
  const coolIcons = {
    breakfast: 'coffee',
    lunch: 'sun',
    dinner: 'moon'
  };
  return getInterfaceIcon(coolIcons[mealTypeId], originalIcons[mealTypeId] || '•');
}

function getInterfaceIcon(kind, fallback = '•') {
  const usesCoolIcons = document.documentElement.dataset.interfaceFamily === 'cool'
    || document.documentElement.dataset.interfaceStyle === 'urban';
  if (!usesCoolIcons || !kind) {
    return fallback;
  }
  const paths = {
    coffee: '<path d="M4 10h11v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path><path d="M15 11h2a3 3 0 0 1 0 6h-2"></path><path d="M6 5c0 1 .8 1.4.8 2.4S6 8.8 6 9.5M10 5c0 1 .8 1.4.8 2.4S10 8.8 10 9.5"></path>',
    sun: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>',
    moon: '<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"></path>',
    church: '<path d="M4 20h16M6 20v-8l6-5 6 5v8M12 3v4M10 5h4M9 20v-4h6v4M3 12h3M18 12h3"></path>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M7 3v4M17 3v4M3 10h18M7 14h.01M12 14h.01M17 14h.01M7 18h.01M12 18h.01M17 18h.01"></path>'
  };
  const path = paths[kind];
  if (!path) return fallback;
  return `<svg class="meal-line-icon meal-line-icon-${kind}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${path}</svg>`;
}

function getLocalizedMealLabel(mealTypeId, fallback = '') {
  const key = `meal.type.${String(mealTypeId || '').trim().toLowerCase()}`;
  const translated = t(key, {}, { fallback: String(fallback || '') });
  return translated && translated !== key ? translated : String(fallback || '');
}

function getMealStateLabel(isPresent) {
  return t(isPresent ? 'meal.status.booked' : 'meal.status.notBooked');
}

function renderTodayOverview() {
  if (state.summaryDays.length > 0) {
    mountSummaryMatrix(elements.todayOverview, {
      days: state.summaryDays,
      operationDays: state.summaryOperations,
      layout: state.centerContactSettings.summaryLayout || 'international',
      activeIndex: state.summaryDayOffset,
      onActiveIndexChange: (index) => {
        selectSummaryMatrixDay(index, { scroll: false });
        renderMode();
      }
    });
    scheduleOperationalAutoScroll();
    return;
  }

  elements.todayOverview.innerHTML = `
    <section class="today-panel">
      <p class="today-date">${formatSummaryDate(getSummaryDate())}</p>
      <div class="today-grid">
        ${state.todayOverview.map((meal) => `
          <article class="today-card">
            <div class="today-card-head">
              <strong><span class="meal-icon" aria-hidden="true">${getMealIcon(meal.mealTypeId)}</span><span class="meal-label">${escapeHtml(getLocalizedMealLabel(meal.mealTypeId, meal.label))}</span></strong>
            </div>
            ${renderGroupedSummary(meal.present)}
          </article>
        `).join('')}
        ${renderMassCard(state.summaryDailyOperation)}
        ${renderSickCard(state.summaryDailyHealth)}
      </div>
    </section>
  `;
}

function renderMassCard(dailyOperation) {
  const massScheduled = dailyOperation?.massScheduled === true;
  const statusLabel = t(massScheduled ? 'summary.yes' : 'summary.no');
  return `
    <article class="today-card mass-card ${massScheduled ? 'mass-card-yes' : 'mass-card-no'}" aria-label="Messa: ${statusLabel}">
      <div class="mass-card-content">
        <strong>${escapeHtml(t('summary.mass'))}</strong>
        <span>${statusLabel}</span>
      </div>
    </article>
  `;
}

function renderSickCard(dailyHealth) {
  const sickPeople = Array.isArray(dailyHealth?.sickPeople) ? dailyHealth.sickPeople : [];
  if (sickPeople.length === 0) return '';
  return `
    <article class="today-card sick-card">
      <div class="today-card-head">
        <strong>Ammalati</strong>
        <span>${sickPeople.length}</span>
      </div>
      <ul class="sick-list">
        ${sickPeople.map((person) => `<li>${escapeHtml(person.displayName)}${person.groupId === 'group_ospiti' ? ' · ospite' : ''}</li>`).join('')}
      </ul>
    </article>
  `;
}

function setParticipantStatus(message, freshness = '') {
  elements.participantStatus.textContent = message;
  elements.weekStatus.textContent = message;
  elements.summaryStatus.textContent = message;
  [elements.participantStatus, elements.weekStatus, elements.summaryStatus].forEach((element) => {
    if (freshness) element.dataset.freshness = freshness;
    else delete element.dataset.freshness;
  });
}

function formatRefreshLabel(source, updatedAt = new Date()) {
  const time = formatLastUpdateTime(updatedAt);
  const labels = {
    avvio: t('status.dataUpdatedAt', { time }),
    manuale: t('status.updatedAt', { time }),
    prenotazione: t('participant.meal.save.success'),
    settimana: t('status.weekUpdated'),
    ripresa: t('status.updatedAt', { time }),
    timer: t('status.updatedAt', { time })
  };

  return labels[source] || t('status.updatedAt', { time });
}

function setFreshnessStatus(element, message, freshness = '') {
  element.textContent = message;
  if (freshness) element.dataset.freshness = freshness;
  else delete element.dataset.freshness;
}

function formatPreviousDataMessage(message) {
  const time = formatLastUpdateTime(state.lastSuccessfulRefreshAt);
  return time
    ? t('calendar.status.previousDataAt', { message, time })
    : t('calendar.status.dataRetained', { message });
}

function formatLastUpdateTime(value) {
  const date = normalizeClientDate(value);
  return date ? formatDateTime(date, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }, getLocale()) : '';
}

function renderCalendarControls() {
  const currentWeekStart = startOfWeek(new Date());
  const currentWeekId = formatDateId(currentWeekStart);
  const selectedWeekId = formatDateId(state.weekStartDate);
  elements.calendarStatus.textContent = selectedWeekId === currentWeekId
    ? 'Settimana corrente'
    : formatCalendarWeekLabel(state.weekStartDate);

  const currentMonth = startOfMonth(new Date());
  const selectedMonth = formatMonthId(state.monthDate);
  elements.monthJumpSelect.innerHTML = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(currentMonth);
    date.setMonth(date.getMonth() + index, 1);
    const value = formatMonthId(date);
    const label = formatMonthLabel(date);
    return `<option value="${value}"${value === selectedMonth ? ' selected' : ''}>${label}</option>`;
  }).join('');
  if (elements.monthJumpLabel) {
    elements.monthJumpLabel.textContent = elements.monthJumpSelect.options[elements.monthJumpSelect.selectedIndex]?.textContent || '';
  }

}

function renderWeekControls() {
  const currentWeekStart = startOfWeek(new Date());
  const selectedWeekId = formatDateId(state.weekStartDate);
  const firstWeek = new Date(currentWeekStart);
  firstWeek.setDate(firstWeek.getDate() - (8 * 7));

  elements.weekJumpSelect.innerHTML = Array.from({ length: 33 }, (_, index) => {
    const weekStart = new Date(firstWeek);
    weekStart.setDate(weekStart.getDate() + (index * 7));
    const weekId = formatDateId(weekStart);
    return `<option value="${weekId}"${weekId === selectedWeekId ? ' selected' : ''}>${formatWeekRangeFrom(weekStart)}</option>`;
  }).join('');
}

function renderMonthGrid() {
  const monthCells = buildMonthCells(state.monthDate, state.participantMonth);
  const monthWeeks = Array.from({ length: 6 }, (_, index) => monthCells.slice(index * 7, index * 7 + 7));
  const weekdayLabels = ['D', 'L', 'M', 'X', 'G', 'V', 'S'];
  const monthEffect = getMonthSelectionEffect();
  const monthHasOpenMeals = state.participantMonth
    .flatMap((day) => day.meals || [])
    .some((meal) => meal.isOpen);
  const monthRenderKey = JSON.stringify({
    participantId: state.selectedParticipant?.participantId || '',
    interfaceStyle: document.documentElement.dataset.interfaceStyle || 'original',
    language: document.documentElement.lang || 'it',
    month: formatMonthId(state.monthDate),
    today: formatDateId(getCenterToday()),
    // The first paint can legitimately happen before the reservation payload
    // arrives. Include only the meal structure (not mutable effects) so that
    // empty date cells are rebuilt once their controls become available,
    // while ordinary reservation changes still use the lightweight DOM sync.
    days: monthCells.map((day) => [
      day.date,
      (day.meals || []).map((meal) => meal.mealTypeId)
    ])
  });
  if (elements.monthGrid.dataset.renderKey === monthRenderKey
      && elements.monthGrid.querySelector('.month-sheet-body')) {
    syncMonthGridFromState();
    scheduleMonthAutoScroll();
    return;
  }

  const focusSnapshot = captureFocusWithin(elements.monthGrid);
  elements.monthGrid.innerHTML = `
    <div class="month-sheet-body">
      ${monthWeeks.map((week, index) => {
        const currentWeek = week.filter((day) => day.inCurrentMonth);
        if (currentWeek.length === 0) return '';
        const weekStart = week[0].date;
        const weekEnd = week[6].date;
        const weekComplete = getMonthScopeEffect(weekStart, null) === 'ABSENT';
        return `
          <div class="month-week-cluster">
            ${index === 0 ? `
              <div class="month-weekday-row" aria-label="Giorni della settimana">
                ${weekdayLabels.map((label) => `<span class="month-weekday-cell">${label}</span>`).join('')}
                <span class="month-weekday-month-control">
                  <button type="button" class="month-toggle-button${monthEffect === 'ABSENT' ? ' month-toggle-button-selected' : ''}" data-month-scope="month" data-month-effect="${monthEffect}" aria-pressed="${monthEffect === 'ABSENT'}" aria-label="${monthEffect === 'PRESENT' ? 'Prenota tutto il mese' : 'Svuota tutto il mese'}" title="${monthEffect === 'PRESENT' ? 'Prenota mese' : 'Svuota mese'}"${monthHasOpenMeals ? '' : ' disabled'}>
                    <span class="month-toggle-glyph" aria-hidden="true">M</span>
                  </button>
                </span>
              </div>
            ` : ''}
            <div class="month-week-row">
              <div class="month-week-mobile-header">
                ${week.map(renderMonthDayNumber).join('')}
                ${renderMonthScopeButtons('Settimana', weekStart, null)}
              </div>
              ${week.map((day) => {
                const classes = [
                  'month-day',
                  day.inCurrentMonth ? 'month-day-current' : 'month-day-outside',
                  day.isToday ? 'month-day-today' : '',
                  day.isPast ? 'month-day-past' : '',
                  day.isClosed ? 'month-day-closed' : ''
                ].filter(Boolean).join(' ');
                return `
                  <article class="${classes}">
                    ${renderMonthDayNumber(day, 'month-day-number-inline')}
                    <span class="month-day-flags">${renderMonthFlags(day)}</span>
                  </article>
                `;
              }).join('')}
              <aside class="month-week-action-row${weekComplete ? ' month-week-complete' : ''}" data-week-start="${weekStart}" aria-label="Azioni settimana${weekComplete ? ', completata' : ''}">
                <strong>${weekStart.slice(8)}-${weekEnd.slice(8)}</strong>
                ${renderMonthScopeButtons('Settimana', weekStart, null)}
                ${renderMonthScopeButtons('Colazione', weekStart, 'breakfast')}
                ${renderMonthScopeButtons('Pranzo', weekStart, 'lunch')}
                ${renderMonthScopeButtons('Cena', weekStart, 'dinner')}
              </aside>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  elements.monthGrid.dataset.renderKey = monthRenderKey;
  restoreFocusWithin(elements.monthGrid, focusSnapshot);

  scheduleMonthAutoScroll();

}

function renderMonthDayNumber(day, extraClass = '') {
  const className = ['month-day-number', day.isToday ? 'month-day-number-today' : '', extraClass]
    .filter(Boolean)
    .join(' ');
  return `
    <button type="button" class="${className}" data-month-day="${day.date}" aria-label="Apri ${day.date}${day.isToday ? ', oggi' : ''}"${day.isToday ? ' aria-current="date"' : ''}>
      <span class="month-day-number-value">${day.dayNumber}</span>
    </button>
  `;
}

function handleMonthGridClick(event) {
  const mealButton = event.target.closest('[data-month-meal]');
  if (mealButton && !mealButton.disabled) {
    handleMonthMealButton(event, mealButton);
    return;
  }
  const dayButton = event.target.closest('[data-month-day]');
  if (dayButton) {
    handleMonthDateClick(dayButton.dataset.monthDay);
    return;
  }
  const scopeButton = event.target.closest('[data-month-scope]');
  if (scopeButton && !scopeButton.disabled) {
    handleMonthBulkButton(scopeButton);
  }
}

function renderMonthScopeButtons(label, weekStart, mealTypeId) {
  const scope = mealTypeId ? 'week-meal' : 'week';
  const icon = mealTypeId
    ? getMealIcon(mealTypeId)
    : getInterfaceIcon('calendar', '▦');
  const effect = getMonthScopeEffect(weekStart, mealTypeId);
  const action = effect === 'PRESENT' ? 'prenota' : 'libera';
  const selectedClass = effect === 'ABSENT' ? ' month-scope-toggle-selected' : '';
  return `
    <span class="month-scope-group">
      <span class="month-scope-label"><span aria-hidden="true">${icon}</span><span>${label}</span></span>
      <button type="button" class="month-scope-button month-scope-toggle${selectedClass}" data-month-scope="${scope}" data-week-start="${weekStart}" data-meal-type="${mealTypeId || ''}" data-month-effect="${effect}" aria-pressed="${effect === 'ABSENT'}" aria-label="${label}: ${action}" title="${label}: ${action}"><span class="month-scope-glyph" aria-hidden="true">${icon}</span></button>
    </span>
  `;
}

function getMonthScopeEffect(weekStart, mealTypeId) {
  const meals = getMonthScopeMeals(weekStart, mealTypeId);
  return meals.length > 0 && meals.every((meal) => meal.effect === 'PRESENT') ? 'ABSENT' : 'PRESENT';
}

function getMonthSelectionEffect() {
  const meals = getMonthScopeMeals(null, null);
  return meals.length > 0 && meals.every((meal) => meal.effect === 'PRESENT')
    ? 'ABSENT'
    : 'PRESENT';
}

function getMonthScopeMeals(weekStart, mealTypeId) {
  let days = state.participantMonth;
  if (weekStart) {
    const start = parseDateId(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    days = days.filter((day) => {
      const date = parseDateId(day.date);
      return date >= start && date <= end
        && date.getMonth() === state.monthDate.getMonth()
        && date.getFullYear() === state.monthDate.getFullYear();
    });
  }

  return days
    .flatMap((day) => day.meals || [])
    .filter((meal) => meal.isOpen)
    .filter((meal) => !mealTypeId || meal.mealTypeId === mealTypeId);
}

function resolveMode() {
  const view = new URLSearchParams(window.location.search).get('view');
  if (view === 'kitchen') return 'kitchen';
  if (view === 'summary') return 'summary';
  if (view === 'week') return 'week';
  if (view === 'participant') return 'participant';
  if (view === 'admin') return 'admin';
  return loadCachedDefaultView() === 'week' ? 'week' : 'participant';
}

function resolveEntryView() {
  return state?.centerContactSettings?.defaultView || loadCachedDefaultView();
}

function applyResidentEntryView() {
  if (!state.residentReady || !['participant', 'week'].includes(state.mode)) {
    return false;
  }

  const nextMode = resolveEntryView() === 'week' ? 'week' : 'participant';
  if (nextMode === state.mode) {
    return false;
  }

  const url = new URL(window.location.href);
  url.searchParams.set('view', nextMode);
  url.searchParams.set('access', 'friendly');
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  prepareMonthAutoScrollEntry(state.mode, nextMode);
  state.mode = nextMode;
  invalidateViewRequests();
  state.friendlyAccess = true;
  return true;
}

async function handleMealButton(button) {
  const day = state.participantWeek.find((item) => item.date === button.dataset.mealDate);
  const meal = day ? day.meals.find((item) => item.mealTypeId === button.dataset.mealId) : null;
  if (!meal || !state.selectedParticipant) {
    return;
  }

  const effect = button.dataset.effect;
  await saveMealOptimistically({
    meal,
    effect,
    sync: () => {
      syncWeekMealButton(button, meal);
      syncWeekSelectionControls();
    },
    onSaved: () => {
      state.selectedSummaryDate = button.dataset.mealDate;
    }
  });
}

async function handleDayBulkButton(button) {
  const day = state.participantWeek.find((item) => item.date === button.dataset.dayDate);
  if (!day || !state.selectedParticipant) {
    return;
  }

  const effect = button.dataset.dayEffect;
  const optimistic = beginOptimisticBulkSelection([day], effect);
  if (optimistic.meals.length === 0) {
    setParticipantStatus('Era già tutto impostato così');
    return;
  }

  button.setAttribute('aria-busy', 'true');
  syncWeekGridFromState();
  setParticipantStatus('Salvo la giornata...');

  try {
    const updatedMeals = await saveParticipantDay(
      state.selectedParticipant,
      optimistic.saveDays[0].meals,
      effect
    );
    optimistic.commit();
    state.selectedSummaryDate = button.dataset.dayDate;
    setParticipantStatus(updatedMeals > 0 ? 'Giornata aggiornata' : 'Era già tutto impostato così');
  } catch (error) {
    optimistic.rollback();
    setParticipantStatus(friendlyErrorMessage(error, 'Salvataggio riga non riuscito'));
  } finally {
    optimistic.finish();
    button.removeAttribute('aria-busy');
    syncWeekGridFromState();
  }
}

async function handleWeekMassButton(button) {
  if (!canManageMass()) {
    return;
  }

  const dateId = button.dataset.weekMassDate;
  const day = state.participantWeek.find((item) => item.date === dateId);
  const windowState = day ? getMassWindowState(day) : null;
  if (!windowState?.isOpen) {
    setParticipantStatus(windowState ? formatCutoffLabel(windowState) : 'Messa non modificabile');
    if (day) syncWeekMassButton(button, day, button.dataset.weekMassScheduled === 'true');
    return;
  }
  const massScheduled = button.dataset.weekMassScheduled !== 'true';
  const operationIndex = state.weekDailyOperations.findIndex((item) => item.dateId === dateId);
  const previousOperation = operationIndex >= 0
    ? { ...state.weekDailyOperations[operationIndex] }
    : null;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  if (operationIndex >= 0) {
    state.weekDailyOperations[operationIndex].massScheduled = massScheduled;
  } else {
    state.weekDailyOperations.push({ dateId, massScheduled });
  }
  syncWeekGridFromState();
  setParticipantStatus('Salvo la Messa...');

  try {
    await saveMassStatus(parseDateId(dateId), massScheduled);
    setParticipantStatus(massScheduled ? 'Messa prevista' : 'Messa non prevista');
  } catch (error) {
    if (previousOperation) {
      state.weekDailyOperations[operationIndex] = previousOperation;
    } else {
      state.weekDailyOperations = state.weekDailyOperations.filter((item) => item.dateId !== dateId);
    }
    setParticipantStatus(friendlyErrorMessage(error, 'Indicazione della Messa non salvata'));
  } finally {
    button.disabled = false;
    button.removeAttribute('aria-busy');
    syncWeekGridFromState();
  }
}

async function handleWeekMassBulkButton(button) {
  if (!canManageMass()) return;
  const openDays = state.participantWeek.filter((day) => getMassWindowState(day).isOpen);
  if (openDays.length === 0) {
    setParticipantStatus('Le Messe della settimana non sono più modificabili');
    return;
  }

  const massScheduled = button.dataset.weekMassScheduled === 'true';
  const previousOperations = state.weekDailyOperations.map((operation) => ({ ...operation }));
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  openDays.forEach((day) => setMassStatusInState(day.date, massScheduled));
  syncWeekGridFromState();
  setParticipantStatus('Salvo le Messe della settimana...');

  try {
    await saveMassStatuses(openDays.map((day) => parseDateId(day.date)), massScheduled);
    setParticipantStatus(massScheduled ? 'Messe della settimana previste' : 'Messe della settimana non previste');
  } catch (error) {
    state.weekDailyOperations = previousOperations;
    setParticipantStatus(friendlyErrorMessage(error, 'Indicazioni delle Messe non salvate'));
  } finally {
    button.removeAttribute('aria-busy');
    syncWeekGridFromState();
  }
}

function setMassStatusInState(dateId, massScheduled) {
  const operation = state.weekDailyOperations.find((item) => item.dateId === dateId);
  if (operation) {
    operation.massScheduled = massScheduled;
  } else {
    state.weekDailyOperations.push({ dateId, massScheduled });
  }
}

async function handleWeekBulkButton(button) {
  if (!state.selectedParticipant) return;

  const effect = button.dataset.weekEffect;
  const optimistic = beginOptimisticBulkSelection(state.participantWeek, effect);
  if (optimistic.meals.length === 0) {
    setParticipantStatus('Nessuna modifica necessaria');
    return;
  }

  button.setAttribute('aria-busy', 'true');
  syncWeekGridFromState();
  setParticipantStatus('Salvo la settimana...');

  try {
    const result = await saveParticipantMonthSelection(
      state.selectedParticipant,
      optimistic.saveDays,
      effect
    );
    if (result.failed > 0) {
      await loadCurrentParticipantCalendar({ forceStaticRefresh: true });
    } else {
      optimistic.commit();
    }
    if (result.requested === 0) {
      setParticipantStatus('Nessuna modifica necessaria');
    } else if (result.failed === 0) {
      setParticipantStatus(`Settimana aggiornata: ${result.saved} prenotazioni`);
    } else if (result.saved > 0) {
      setParticipantStatus(`Salvate ${result.saved} prenotazioni su ${result.requested}`);
    } else {
      setParticipantStatus('Settimana non aggiornata. Riprova.');
    }
  } catch (error) {
    optimistic.rollback();
    await loadCurrentParticipantCalendar({ forceStaticRefresh: true }).catch(() => undefined);
    setParticipantStatus(friendlyErrorMessage(error, 'Salvataggio settimana non riuscito'));
  } finally {
    optimistic.finish();
    button.removeAttribute('aria-busy');
    syncWeekGridFromState();
  }
}

async function handleWeekMealBulkButton(button) {
  if (!state.selectedParticipant) return;

  const effect = button.dataset.weekMealEffect;
  const mealTypeId = button.dataset.weekMealType;
  const mealLabel = button.dataset.weekMealLabel || 'Pasto';
  const optimistic = beginOptimisticBulkSelection(state.participantWeek, effect, mealTypeId);
  if (optimistic.meals.length === 0) {
    setParticipantStatus('Nessuna modifica necessaria');
    return;
  }

  button.setAttribute('aria-busy', 'true');
  syncWeekGridFromState();
  setParticipantStatus(`Salvo ${mealLabel.toLowerCase()}...`);

  try {
    const result = await saveParticipantMonthSelection(
      state.selectedParticipant,
      optimistic.saveDays,
      effect,
      mealTypeId
    );
    if (result.failed > 0) {
      await loadCurrentParticipantCalendar({ forceStaticRefresh: true });
    } else {
      optimistic.commit();
    }
    if (result.requested === 0) {
      setParticipantStatus('Nessuna modifica necessaria');
    } else if (result.failed === 0) {
      setParticipantStatus(`${mealLabel} aggiornata: ${result.saved} prenotazioni`);
    } else if (result.saved > 0) {
      setParticipantStatus(`Salvate ${result.saved} prenotazioni su ${result.requested}`);
    } else {
      setParticipantStatus(`${mealLabel} non aggiornata. Riprova.`);
    }
  } catch (error) {
    optimistic.rollback();
    await loadCurrentParticipantCalendar({ forceStaticRefresh: true }).catch(() => undefined);
    setParticipantStatus(friendlyErrorMessage(error, `Salvataggio ${mealLabel.toLowerCase()} non riuscito`));
  } finally {
    optimistic.finish();
    button.removeAttribute('aria-busy');
    syncWeekGridFromState();
  }
}

function handleSummaryDateChange(dateId) {
  state.selectedSummaryDate = dateId;
  renderParticipantMeals();
}

function handleMonthJumpChange() {
  const [year, month] = elements.monthJumpSelect.value.split('-').map(Number);
  setWeekStartFromDate(new Date(year, month - 1, 1), 'mese');
}

function handleWeekJumpChange() {
  setWeekStartFromDate(parseDateId(elements.weekJumpSelect.value), 'settimana');
}

function handleMonthDateClick(dateId) {
  const date = parseDateId(dateId);
  state.selectedSummaryDate = dateId;
  setWeekStartFromDate(date, 'settimana');
}

async function handleMonthMealButton(event, button) {
  event.stopPropagation();
  if (!state.selectedParticipant) return;
  const day = state.participantMonth.find((item) => item.date === button.dataset.monthDate);
  const meal = day?.meals.find((item) => item.mealTypeId === button.dataset.monthMealId);
  if (!meal || !meal.isOpen) return;

  const effect = button.dataset.monthEffect;
  await saveMealOptimistically({
    meal,
    effect,
    sync: () => {
      syncMonthMealButton(button, meal);
      syncMonthSelectionControls();
    }
  });
}

async function handleMonthBulkButton(button) {
  if (!state.selectedParticipant) return;

  const scope = button.dataset.monthScope;
  const effect = button.dataset.monthEffect;
  const mealTypeId = button.dataset.mealType || null;

  button.setAttribute('aria-busy', 'true');
  try {
    const days = scope === 'month'
      ? state.participantMonth
      : state.participantMonth.filter((day) => {
        const date = parseDateId(day.date);
        const weekStart = parseDateId(button.dataset.weekStart);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return date >= weekStart && date <= weekEnd
          && date.getMonth() === state.monthDate.getMonth()
          && date.getFullYear() === state.monthDate.getFullYear();
      });
    const optimistic = beginOptimisticBulkSelection(days, effect, mealTypeId);
    if (optimistic.meals.length === 0) {
      setParticipantStatus('Nessuna modifica necessaria');
      return;
    }

    syncMonthGridFromState();
    setParticipantStatus(`Salvo ${optimistic.meals.length} prenotazioni...`);
    let result;
    try {
      result = await saveParticipantMonthSelection(
        state.selectedParticipant,
        optimistic.saveDays,
        effect,
        mealTypeId
      );
      if (result.failed === 0) {
        optimistic.commit();
      }
    } catch (error) {
      optimistic.rollback();
      throw error;
    } finally {
      optimistic.finish();
    }
    if (result.failed > 0) {
      await loadCurrentParticipantCalendar({ forceStaticRefresh: true });
    }
    syncMonthGridFromState();
    if (result.requested === 0) {
      setParticipantStatus('Nessuna modifica necessaria');
    } else if (result.failed === 0) {
      setParticipantStatus(`Salvate ${result.saved} prenotazioni`);
    } else if (result.saved > 0) {
      setParticipantStatus(`Salvate ${result.saved} prenotazioni su ${result.requested}. Aggiorna e riprova per le rimanenti.`);
    } else {
      setParticipantStatus('Nessuna prenotazione salvata. Aggiorna e riprova.');
    }
  } catch (error) {
    await loadCurrentParticipantCalendar({ forceStaticRefresh: true }).catch(() => undefined);
    syncMonthGridFromState();
    setParticipantStatus(friendlyErrorMessage(error, 'Salvataggio non riuscito'));
  } finally {
    button.removeAttribute('aria-busy');
    syncMonthGridFromState();
  }
}

function handleAdminSaveContact() {
  const participantKey = state.adminParticipantId || 'new';
  return operationGuard.run(`admin:participant:${participantKey}`, performAdminSaveContact);
}

async function performAdminSaveContact() {
  const participant = state.adminParticipants.find((item) => item.participantId === state.adminParticipantId);

  try {
    const rawPhone = elements.adminPhoneInput.value.trim();
    const dietCode = readAdminDietCode();
    const dietTags = dietCode && dietCode !== 'STANDARD' ? [dietCode] : ['STANDARD'];
    const sortOrder = participant?.sortOrder
      || Math.max(0, ...state.adminParticipants.map((item) => Number(item.sortOrder || 0))) + 1;
    const viceAdminRole = canAssignOperationalRoles()
      ? elements.adminParticipantVice.checked
      : participant?.viceAdminRole === true;
    assertViceSelectionLimit(participant?.participantId || '', viceAdminRole);
    clearAdminParticipantFieldErrors();
    const profile = validateParticipantProfile({
      displayName: elements.adminParticipantName.value,
      signature: elements.adminParticipantSignature.value,
      groupId: elements.adminParticipantGroup.value,
      dietTags,
      liturgicalRole: canAssignOperationalRoles()
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
    const savedParticipantId = await saveAdminParticipant(participant?.participantId || '', {
      ...profile,
      expectedRevision: participant?.revision
    });
    if (viceAdminRole) {
      const invitation = await createViceAdministratorInvitation(savedParticipantId);
      if (invitation?.invitationId) {
        const invitationUrl = new URL('/', window.location.origin);
        invitationUrl.searchParams.set('view', 'admin');
        invitationUrl.searchParams.set('adminInvite', invitation.invitationId);
        invitationUrl.searchParams.set('adminRole', 'MANAGER');
        invitationUrl.searchParams.set('c', getActiveCenterId());
        openAccessShareDialog(t('role.vice'), invitationUrl.toString());
      }
    } else if (participant?.viceAdminRole === true) {
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
    elements.adminStatus.textContent = t('admin.people.saved');
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

function clearAdminParticipantFieldErrors() {
  [
    elements.adminParticipantName,
    elements.adminParticipantSignature,
    elements.adminPhoneInput
  ].forEach((field) => field.removeAttribute('aria-invalid'));
}

function focusInvalidAdminParticipantField(error) {
  const message = String(error?.message || '').toLowerCase();
  const field = message.includes('nome')
    ? elements.adminParticipantName
    : message.includes('sigla')
      ? elements.adminParticipantSignature
      : message.includes('telefono') || message.includes('numero')
        ? elements.adminPhoneInput
        : null;
  if (!field) return;
  field.setAttribute('aria-invalid', 'true');
  field.focus();
}

async function handleAdminDeleteParticipant() {
  const participant = state.adminParticipants.find((item) => item.participantId === state.adminParticipantId);
  await deleteParticipantFromAdminPanel(participant, elements.adminDeleteParticipant);
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

  const decision = await showActionDialog({
    title: t('dialog.deletePerson.title'), // title: 'Elimina definitivamente la persona'
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
  renderAdminParticipantOptions();
  renderAdminPeopleList();
  syncAdminContactForm();
  elements.adminStatus.textContent = t('admin.people.deleting');
  try {
    await deleteAdminParticipant(participant.participantId);
    elements.adminStatus.textContent = t('admin.people.deleted', { name: participant.displayName });
  } catch (error) {
    state.adminParticipants = previousAdminParticipants;
    state.participants = previousParticipants;
    state.adminParticipantId = previousSelectedParticipantId;
    state.adminPersonDirty = previousPersonDirty;
    renderAdminParticipantOptions();
    renderAdminPeopleList();
    syncAdminContactForm();
    elements.adminStatus.textContent = friendlyErrorMessage(error, 'Eliminazione non riuscita');
  } finally {
    state.pendingAdminParticipantDeleteIds.delete(participant.participantId);
    elements.adminSaveButton.disabled = false;
    elements.adminDeleteParticipant.disabled = !state.adminParticipantId;
    renderAdminPeopleList();
  }
}

function prepareWeekOperationalDate(dates) {
  const dateIds = dates.map((date) => formatDateId(date));
  const todayId = formatDateId(getCenterToday());
  const preferredId = dateIds.includes(state.weekOperationalDateId)
    ? state.weekOperationalDateId
    : dateIds.includes(todayId) ? todayId : dateIds[0];
  state.weekOperationalDateId = preferredId;
  elements.weekOperationsDay.innerHTML = dates.map((date) => (
    `<option value="${formatDateId(date)}">${escapeHtml(formatCalendarWeekLabel(date))}</option>`
  )).join('');
  elements.weekOperationsDay.value = preferredId;
  return parseDateId(preferredId);
}

async function refreshWeekOperations(forceRefresh = false) {
  if (!canManageDailyOperations() || state.mode !== 'week') {
    elements.weekOperations.hidden = true;
    return;
  }
  const requestVersion = ++state.weekOperationsRequestVersion;
  const dateId = elements.weekOperationsDay.value || state.weekOperationalDateId;
  if (!dateId) return;
  state.weekOperationalDateId = dateId;
  elements.weekOperationsStatus.textContent = t('week.operations.status.updating');
  try {
    const [health, note] = await Promise.all([
      loadDailyHealth(parseDateId(dateId), { forceRefresh }),
      loadKitchenNote(parseDateId(dateId), { forceRefresh })
    ]);
    if (requestVersion !== state.weekOperationsRequestVersion
      || state.mode !== 'week'
      || state.weekOperationalDateId !== dateId) {
      return;
    }
    state.weekOperationalHealth = health;
    state.weekOperationalNote = note;
    renderWeekOperations();
    elements.weekOperationsStatus.textContent = t('week.operations.status.ready');
  } catch (error) {
    elements.weekOperationsStatus.textContent = friendlyErrorMessage(error, 'Dati giornalieri non disponibili');
  }
}

function renderWeekOperations() {
  const allowed = state.mode === 'week' && canManageDailyOperations();
  elements.weekOperations.hidden = !allowed;
  if (!allowed) return;

  const activeParticipants = state.adminParticipants.filter((participant) => participant.status === 'ACTIVE');
  const selectedSickIds = new Set((state.weekOperationalHealth?.sickPeople || []).map((person) => person.participantId));
  const availableParticipants = activeParticipants.filter((participant) => !selectedSickIds.has(participant.participantId));
  const selectedParticipants = activeParticipants.filter((participant) => selectedSickIds.has(participant.participantId));
  elements.weekHealthList.innerHTML = activeParticipants.length > 0 ? `
    <div class="week-health-picker">
      <select data-week-sick-select aria-label="${escapeHtml(t('week.operations.person'))}"${availableParticipants.length ? '' : ' disabled'}>
        ${availableParticipants.map((participant) => `<option value="${escapeHtml(participant.participantId)}">${escapeHtml(participant.displayName)}${participant.groupId === 'group_ospiti' ? ' · ospite' : ''}</option>`).join('')}
      </select>
      <button type="button" class="secondary-action" data-week-sick-add${availableParticipants.length ? '' : ' disabled'}>${escapeHtml(t('common.actions.add'))}</button>
    </div>
    <div class="week-health-selected">
      ${selectedParticipants.map((participant) => `
        <div class="week-health-selected-row" data-week-sick-selected="${escapeHtml(participant.participantId)}">
          <span>${escapeHtml(participant.displayName)}${participant.groupId === 'group_ospiti' ? ' · ospite' : ''}</span>
          <button type="button" class="tertiary-action" data-week-sick-remove="${escapeHtml(participant.participantId)}">${escapeHtml(t('common.actions.delete'))}</button>
        </div>
      `).join('')}
    </div>
  ` : '<p class="empty-state">Nessuna persona disponibile</p>';

  const selectedParticipantId = elements.weekDietParticipant.value;
  elements.weekDietParticipant.innerHTML = activeParticipants.map((participant) => (
    `<option value="${escapeHtml(participant.participantId)}">${escapeHtml(participant.displayName)}</option>`
  )).join('');
  if (activeParticipants.some((participant) => participant.participantId === selectedParticipantId)) {
    elements.weekDietParticipant.value = selectedParticipantId;
  }

  const sickCount = selectedSickIds.size;
  const invitedMeals = state.weekOperationalHealth?.invitedMeals || {};
  let invitedTotal = 0;
  elements.weekInvitedInputs.forEach((input) => {
    const count = Math.min(999, Math.max(0, Math.floor(Number(invitedMeals[input.dataset.weekInvitedMeal]) || 0)));
    input.value = String(count);
    invitedTotal += count;
  });
  elements.weekInvitedSection.open = invitedTotal > 0;
  elements.weekInvitedStatus.textContent = invitedTotal > 0
    ? t('week.operations.invited.count', { count: invitedTotal })
    : t('week.operations.invited.empty');
  elements.weekHealthSection.open = sickCount > 0;
  elements.weekHealthStatus.textContent = sickCount > 0
    ? `${sickCount} ${sickCount === 1 ? 'persona ammalata' : 'persone ammalate'}`
    : 'Nessun ammalato';
  renderWeekKitchenNotes();
  renderWeekDietAssignments();
}

async function restoreResidentSettingsPanel() {
  if (state.residentSettingsRestorePending || state.adminRole || state.mode !== 'admin') return;
  state.residentSettingsRestorePending = true;
  try {
    if (!state.residentReady) {
      const restored = await restoreFriendlyResidentSession();
      if (!restored) return;
      state.participants = restored.participants;
      state.selectedParticipant = restored.participant;
      state.residentReady = true;
    }
    const settings = await loadCenterContactSettings();
    state.centerContactSettings = applyResidentPreferences(settings);
    await refreshResidentAdministratorAuthorization();
    state.residentSettingsMode = true;
    renderResidentSettingsPanel();
    renderMode();
  } catch (error) {
    elements.authStatus.textContent = friendlyErrorMessage(error, t('auth.resident.status'));
  } finally {
    state.residentSettingsRestorePending = false;
  }
  if (elements.adminSharedPasswordRow) elements.adminSharedPasswordRow.hidden = true;
  if (elements.adminPasswordRotationWarning) elements.adminPasswordRotationWarning.hidden = true;
}

function renderResidentSettingsPanel() {
  if (!state.residentSettingsMode || !state.residentReady || state.adminRole) return;
  state.adminActiveSection = 'adaptations';
  state.adminMobileSection = 'adaptations';
  elements.adminShell.dataset.adminActive = 'resident-settings';
  elements.adminShell.open = true;
  elements.adminAuthMethods.hidden = true;
  elements.authActions.hidden = true;
  elements.adminPanel.hidden = false;
  mountAdminSection('adaptations');
  syncAdminAdaptationsForm();
  applyAdminCapabilityVisibility();
}

async function refreshResidentAdministratorAuthorization() {
  if (!state.residentReady || state.adminRole) {
    state.residentAdministratorAuthorized = false;
    return false;
  }
  try {
    const authorization = await loadResidentAdministratorAuthorization();
    state.residentAdministratorAuthorized = authorization.active === true
      && Number(authorization.passwordVersion || 0)
        === Number(state.centerContactSettings.adminPasswordVersion || 0);
  } catch {
    state.residentAdministratorAuthorized = false;
  }
  return state.residentAdministratorAuthorized;
}

async function handleResidentAdministratorUnlock() {
  if (!state.selectedParticipant || !elements.residentAdminPassword?.value) return;
  elements.residentAdminUnlockButton.disabled = true;
  elements.residentAdminUnlockStatus.textContent = t('admin.sharedPassword.checking');
  try {
    await authorizeResidentAdministratorSession({
      centerId: getActiveCenterId(),
      participantId: state.selectedParticipant.participantId,
      password: elements.residentAdminPassword.value,
      passwordVersion: state.centerContactSettings.adminPasswordVersion
    });
    state.residentAdministratorAuthorized = true;
    elements.residentAdminPassword.value = '';
    elements.residentAdminUnlockStatus.textContent = t('admin.sharedPassword.unlocked');
    syncAdminAdaptationsForm();
  } catch (error) {
    elements.residentAdminUnlockStatus.textContent = friendlyErrorMessage(
      error,
      t('admin.sharedPassword.unlockFailed')
    );
  } finally {
    elements.residentAdminUnlockButton.disabled = false;
  }
}

async function handleViceGoogleAuthentication() {
  elements.viceAuthGoogle.disabled = true;
  elements.residentAdminUnlockStatus.textContent = t('app.header.verifyingAuth');
  try {
    await signInWithGoogle();
  } catch (error) {
    elements.residentAdminUnlockStatus.textContent = friendlyErrorMessage(error, t('auth.google.signIn'));
    elements.viceAuthGoogle.disabled = false;
  }
}

function handleViceEmailChoice() {
  const expanded = elements.viceAuthEmailForm.hidden;
  elements.viceAuthEmailForm.hidden = !expanded;
  elements.viceAuthEmailChoice.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  if (expanded) elements.viceAuthEmail.focus();
}

async function handleViceEmailAuthentication(event) {
  event.preventDefault();
  const submit = elements.viceAuthEmailForm.querySelector('[type="submit"]');
  submit.disabled = true;
  elements.residentAdminUnlockStatus.textContent = t('app.header.verifyingAuth');
  try {
    await signInAdministratorWithEmail(
      elements.viceAuthEmail.value,
      elements.viceAuthPassword.value
    );
    elements.viceAuthPassword.value = '';
  } catch (error) {
    elements.residentAdminUnlockStatus.textContent = friendlyErrorMessage(error, t('auth.email.signIn'));
    submit.disabled = false;
  }
}

async function handleWeekInvitedSave() {
  const invitedMeals = {};
  elements.weekInvitedInputs.forEach((input) => {
    invitedMeals[input.dataset.weekInvitedMeal] = Math.min(
      999,
      Math.max(0, Math.floor(Number(input.value) || 0))
    );
  });
  elements.weekInvitedSave.disabled = true;
  elements.weekInvitedStatus.textContent = t('week.operations.invited.saving');
  try {
    state.weekOperationalHealth = await saveInvitedMeals(
      parseDateId(state.weekOperationalDateId),
      invitedMeals
    );
    renderWeekOperations();
    const entries = ['breakfast', 'lunch', 'dinner']
      .filter((mealTypeId) => Number(invitedMeals[mealTypeId] || 0) > 0)
      .map((mealTypeId) => (
        `<span class="week-invited-saved-meal"><span aria-hidden="true">${getMealIcon(mealTypeId)}</span> ${Number(invitedMeals[mealTypeId])}</span>`
      ));
    elements.weekInvitedStatus.innerHTML = entries.length > 0
      ? `${escapeHtml(t('week.operations.invited.saved'))} ${entries.join(' ')}`
      : escapeHtml(t('week.operations.invited.empty'));
  } catch (error) {
    elements.weekInvitedStatus.textContent = friendlyErrorMessage(
      error,
      t('week.operations.invited.notSaved')
    );
  } finally {
    elements.weekInvitedSave.disabled = false;
  }
}

function renderWeekKitchenNotes() {
  const messages = Array.isArray(state.weekOperationalNote?.messages)
    ? state.weekOperationalNote.messages
    : state.weekOperationalNote?.text
      ? [{ id: 'legacy', text: state.weekOperationalNote.text }]
      : [];
  elements.weekKitchenNoteList.innerHTML = messages.map((message) => `
    <div class="week-kitchen-note-row">
      <p>${escapeHtml(message.text)}</p>
      <button type="button" class="tertiary-action" data-week-kitchen-note-remove="${escapeHtml(message.id)}">${escapeHtml(t('common.actions.delete'))}</button>
    </div>
  `).join('');
  elements.weekKitchenNoteStatus.textContent = messages.length > 0
    ? t('week.operations.note.present')
    : t('week.operations.note.empty');
}

function handleWeekHealthListClick(event) {
  const addButton = event.target.closest('[data-week-sick-add]');
  const removeButton = event.target.closest('[data-week-sick-remove]');
  if (!addButton && !removeButton) return;
  const currentPeople = Array.isArray(state.weekOperationalHealth?.sickPeople)
    ? [...state.weekOperationalHealth.sickPeople]
    : [];
  if (addButton) {
    const participantId = elements.weekHealthList.querySelector('[data-week-sick-select]')?.value;
    const participant = state.adminParticipants.find((item) => item.participantId === participantId);
    if (participant && !currentPeople.some((person) => person.participantId === participantId)) {
      currentPeople.push({
        participantId: participant.participantId,
        displayName: participant.displayName,
        groupId: participant.groupId
      });
    }
  } else {
    const participantId = removeButton.dataset.weekSickRemove;
    currentPeople.splice(0, currentPeople.length, ...currentPeople.filter((person) => person.participantId !== participantId));
  }
  state.weekOperationalHealth = { ...(state.weekOperationalHealth || {}), sickPeople: currentPeople };
  renderWeekOperations();
}

function renderWeekDietAssignments() {
  const assignments = (state.weekOperationalHealth?.dietAssignments || [])
    .filter((assignment) => /^\d+$/.test(normalizeDietCode(assignment.dietTag)));
  const participantsById = new Map(state.adminParticipants.map((participant) => [participant.participantId, participant]));
  elements.weekDietList.innerHTML = assignments.map((assignment) => {
    const participant = participantsById.get(assignment.participantId);
    const name = participant?.displayName || assignment.participantId;
    return `
      <div class="week-diet-row">
        <span>${escapeHtml(name)} · ${escapeHtml(normalizeDietCode(assignment.dietTag))}</span>
        <button type="button" class="tertiary-action" data-week-diet-remove="${escapeHtml(assignment.participantId)}">Rimuovi</button>
      </div>
    `;
  }).join('') || '<p class="empty-state">Nessuna dieta occasionale</p>';
  elements.weekDietStatus.textContent = assignments.length > 0
    ? `${assignments.length} ${assignments.length === 1 ? 'dieta occasionale' : 'diete occasionali'}`
    : 'Nessuna dieta occasionale';
}

async function handleWeekHealthSave() {
  const selectedIds = new Set(Array.from(
    elements.weekHealthList.querySelectorAll('[data-week-sick-selected]'),
    (row) => row.dataset.weekSickSelected
  ));
  const sickPeople = state.adminParticipants
    .filter((participant) => selectedIds.has(participant.participantId))
    .map((participant) => ({
      participantId: participant.participantId,
      displayName: participant.displayName,
      groupId: participant.groupId
    }));
  elements.weekHealthSave.disabled = true;
  elements.weekHealthStatus.textContent = t('week.operations.health.saving');
  try {
    state.weekOperationalHealth = await saveSickPeople(parseDateId(state.weekOperationalDateId), sickPeople);
    renderWeekOperations();
    elements.weekHealthStatus.textContent = sickPeople.length > 0 ? t('week.operations.health.saved') : t('week.operations.health.empty');
  } catch (error) {
    elements.weekHealthStatus.textContent = friendlyErrorMessage(error, 'Elenco non salvato');
  } finally {
    elements.weekHealthSave.disabled = false;
  }
}

async function handleWeekDietSave() {
  const participantId = elements.weekDietParticipant.value;
  if (!participantId) return;
  elements.weekDietSave.disabled = true;
  elements.weekDietStatus.textContent = t('week.operations.diet.saving');
  try {
    const dietTag = readDietCode(elements.weekDietType, elements.weekDietNumber);
    const duration = Number(elements.weekDietDuration.value) === 2 ? 2 : 1;
    const startDate = parseDateId(state.weekOperationalDateId);
    const savedDays = await Promise.all(Array.from({ length: duration }, async (_, index) => {
      const date = addCalendarDays(startDate, index);
      const dateId = formatDateId(date);
      const health = dateId === state.weekOperationalHealth?.dateId
        ? state.weekOperationalHealth
        : await loadDailyHealth(date);
      const dietAssignments = (health.dietAssignments || [])
        .filter((assignment) => assignment.participantId !== participantId);
      if (dietTag !== 'STANDARD') {
        dietAssignments.push({ participantId, dietTag });
      }
      return saveDietAssignments(date, dietAssignments);
    }));
    state.weekOperationalHealth = savedDays[0];
    renderWeekOperations();
    elements.weekDietStatus.textContent = dietTag === 'STANDARD'
      ? 'Dieta occasionale rimossa'
      : `Dieta salvata per ${duration === 1 ? 'un giorno' : 'due giorni'}`;
  } catch (error) {
    elements.weekDietStatus.textContent = friendlyErrorMessage(error, 'Dieta non salvata');
  } finally {
    elements.weekDietSave.disabled = false;
  }
}

async function handleWeekDietListClick(event) {
  const button = event.target.closest('[data-week-diet-remove]');
  if (!button) return;
  const dietAssignments = (state.weekOperationalHealth?.dietAssignments || [])
    .filter((assignment) => assignment.participantId !== button.dataset.weekDietRemove);
  button.disabled = true;
  elements.weekDietStatus.textContent = t('week.operations.diet.removing');
  try {
    state.weekOperationalHealth = await saveDietAssignments(
      parseDateId(state.weekOperationalDateId),
      dietAssignments
    );
    renderWeekOperations();
    elements.weekDietStatus.textContent = t('week.operations.diet.removed');
  } catch (error) {
    elements.weekDietStatus.textContent = friendlyErrorMessage(error, 'Dieta non rimossa');
    button.disabled = false;
  }
}

async function handleWeekKitchenNoteSave() {
  const noteText = elements.weekKitchenNoteInput.value.trim();
  if (!noteText) {
    elements.weekKitchenNoteStatus.textContent = t('week.operations.note.empty');
    return;
  }
  elements.weekKitchenNoteSave.disabled = true;
  elements.weekKitchenNoteStatus.textContent = t('week.operations.note.saving');
  try {
    state.weekOperationalNote = await saveKitchenNote(
      parseDateId(state.weekOperationalDateId),
      noteText
    );
    elements.weekKitchenNoteInput.value = '';
    renderWeekKitchenNotes();
    elements.weekKitchenNoteStatus.textContent = t('week.operations.note.saved');
  } catch (error) {
    elements.weekKitchenNoteStatus.textContent = friendlyErrorMessage(error, 'Salvataggio non riuscito');
  } finally {
    elements.weekKitchenNoteSave.disabled = false;
  }
}

async function handleWeekKitchenNoteListClick(event) {
  const button = event.target.closest('[data-week-kitchen-note-remove]');
  if (!button) return;
  button.disabled = true;
  elements.weekKitchenNoteStatus.textContent = t('common.actions.deleting');
  try {
    state.weekOperationalNote = await removeKitchenNoteMessage(
      parseDateId(state.weekOperationalDateId),
      button.dataset.weekKitchenNoteRemove
    );
    renderWeekKitchenNotes();
    elements.weekKitchenNoteStatus.textContent = t('week.operations.note.removed');
  } catch (error) {
    elements.weekKitchenNoteStatus.textContent = friendlyErrorMessage(error, 'Nota non rimossa');
    button.disabled = false;
  }
}

async function handleAdminExport() {
  if (!hasCurrentCapability(CAPABILITIES.EXPORT_CENTER_DATA)) return;
  elements.adminExportButton.disabled = true;
  elements.adminStatus.textContent = t('admin.export.preparing');
  try {
    const backup = await exportCenterData();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tavola-comune-export-' + backup.exportedAt.slice(0, 10) + '.json';
    link.click();
    URL.revokeObjectURL(url);
    elements.adminStatus.textContent = t('admin.export.ready', { count: backup.totalDocuments });
  } catch (error) {
    elements.adminStatus.textContent = friendlyErrorMessage(error, 'Esportazione non riuscita');
  } finally {
    elements.adminExportButton.disabled = false;
  }
}

function renderNameList(participants) {
  if (participants.length === 0) {
    return '<p class="empty-state empty-state--centered">Nessuno previsto</p>';
  }

  const rows = Math.min(5, participants.length);
  return `<ul class="contact-list contact-list-rows-${rows}">` + participants.map((participant) => `
    <li>${renderParticipantContact(participant)}</li>
  `).join('') + '</ul>';
}

function renderParticipantContact(participant, suffix = '') {
  const displayName = String(participant.displayName || '');
  const label = displayName + suffix;
  const phone = participant.phoneConsent ? normalizePhone(participant.phone) : '';
  const name = phone
    ? `<a class="contact-link" href="tel:${escapeHtml(phone)}">${escapeHtml(label)}</a>`
    : `<span>${escapeHtml(label)}</span>`;
  const whatsappNumber = participant.whatsappEnabled && phone
    ? phone.replace(/\D/g, '')
    : '';
  const whatsapp = whatsappNumber
    ? `<a class="whatsapp-link" href="https://wa.me/${whatsappNumber}" target="_blank" rel="noopener noreferrer" aria-label="Scrivi a ${escapeHtml(displayName)} su WhatsApp" title="WhatsApp"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"></a>`
    : '';
  return name + whatsapp;
}

function applyDailyDietsToSummary(meals, dietAssignments) {
  const dietByParticipant = new Map((dietAssignments || []).map((assignment) => (
    [assignment.participantId, assignment.dietTag]
  )));
  const applyDiet = (participant) => {
    const dietTag = dietByParticipant.get(participant.participantId);
    return dietTag ? { ...participant, dietTags: [dietTag] } : participant;
  };
  return (meals || []).map((meal) => ({
    ...meal,
    present: (meal.present || []).map(applyDiet),
    absent: (meal.absent || []).map(applyDiet)
  }));
}

function applyDailyDietsToKitchenMeals(meals, dietAssignments) {
  const dietByParticipant = new Map((dietAssignments || []).map((assignment) => (
    [assignment.participantId, assignment.dietTag]
  )));
  return (meals || []).map((meal) => {
    const counts = new Map();
    (meal.dietParticipants || []).forEach((participant) => {
      const temporaryDiet = dietByParticipant.get(participant.participantId);
      const tags = temporaryDiet ? [temporaryDiet] : participant.dietTags || ['STANDARD'];
      tags.filter((tag) => tag !== 'STANDARD').forEach((tag) => (
        counts.set(tag, (counts.get(tag) || 0) + 1)
      ));
    });
    return {
      ...meal,
      diets: [...counts.entries()]
        .map(([tag, count]) => ({ tag, label: formatDietLabel(tag), count }))
        .sort((left, right) => left.label.localeCompare(right.label, 'it'))
    };
  });
}

function renderGroupedSummary(participants) {
  if (participants.length === 0) {
    return '<p class="empty-state empty-state--centered">Nessuno previsto</p>';
  }

  const residents = participants.filter((participant) => participant.groupId === 'group_residenti');
  const guests = participants.filter((participant) => participant.groupId === 'group_ospiti');
  const residentDietParticipants = residents.filter((participant) =>
    Array.isArray(participant.dietTags) && participant.dietTags.some((tag) => tag !== 'STANDARD')
  );
  const standardResidents = residents.filter((participant) => !residentDietParticipants.includes(participant));
  const total = standardResidents.length + guests.length + residentDietParticipants.length;

  return `
    <div class="summary-groups">
      <section class="summary-group">
        <div class="summary-group-head">
          <h3>Totale</h3>
          <span>${total}</span>
        </div>
        <div class="summary-divider" aria-hidden="true"></div>
        <div class="summary-group-head">
          <h3>Residenti</h3>
          <span>${standardResidents.length}</span>
        </div>
        ${renderNameList(standardResidents)}
      </section>
      ${guests.length > 0 ? `
        <section class="summary-group">
          <div class="summary-group-head">
            <h3>Ospiti</h3>
            <span>${guests.length}</span>
          </div>
          ${renderNameList(guests)}
        </section>
      ` : ''}
      ${residentDietParticipants.length > 0 ? `
        <section class="summary-group">
          <div class="summary-group-head">
            <h3>Diete</h3>
            <span>${residentDietParticipants.length}</span>
          </div>
          ${renderDietNameList(residentDietParticipants)}
        </section>
      ` : ''}
    </div>
  `;
}

function renderDietNameList(participants) {
  return '<ul class="contact-list diet-contact-list">' + participants.map((participant) => {
    const dietCodes = (Array.isArray(participant.dietTags) ? participant.dietTags : [])
      .filter((tag) => tag !== 'STANDARD')
      .map(formatDietLabel);
    return `<li>${renderParticipantContact(participant, ` (${dietCodes.join(', ')})`)}</li>`;
  }).join('') + '</ul>';
}

function renderMeals(emptyMessage = 'Nessun dato cucina disponibile.') {
  renderKitchenHeading();
  if (state.kitchenDays.length > 0) {
    elements.kitchenNote.hidden = true;
    elements.kitchenSick.hidden = true;
    const massCard = elements.kitchenPanel.querySelector('[data-kitchen-mass]');
    if (massCard) {
      massCard.hidden = true;
    }
    mountSummaryMatrix(elements.cards, {
      days: state.kitchenDays,
      operationDays: state.kitchenOperations,
      kitchen: true,
      layout: state.centerContactSettings.kitchenLayout || 'classic',
      activeIndex: state.kitchenDayOffset,
      onActiveIndexChange: (index) => {
        selectKitchenMatrixDay(index, { scroll: false });
        renderKitchenHeading();
      }
    });
    scheduleOperationalAutoScroll();
    return;
  }
  const massCard = elements.kitchenPanel.querySelector('[data-kitchen-mass]');
  if (massCard) {
    massCard.hidden = false;
  }
  renderKitchenNote();
  renderKitchenMass();
  renderKitchenSickPeople();
  if (state.meals.length === 0) {
    elements.cards.innerHTML = '<p class="empty-state">' + escapeHtml(emptyMessage) + '</p>';
    return;
  }

  elements.cards.innerHTML = state.meals.map((meal) => {
    return `
      <article class="meal-card">
        <div>
          <p>${escapeHtml(getLocalizedMealLabel(meal.mealTypeId, meal.label))}</p>
          <strong aria-label="${escapeHtml(meal.count)} persone">${escapeHtml(meal.count)}</strong>
          <small>${meal.count === 1 ? 'persona' : 'persone'}</small>
          ${renderDietBreakdown(meal.diets)}
        </div>
        <p class="meal-window-label">${formatKitchenWindowLabel(meal)}</p>
      </article>
    `;
  }).join('');
}

function renderKitchenSickPeople() {
  const sickPeople = Array.isArray(state.kitchenDailyHealth?.sickPeople)
    ? state.kitchenDailyHealth.sickPeople
    : [];
  elements.kitchenSick.hidden = sickPeople.length === 0;
  elements.kitchenSickList.innerHTML = sickPeople.map((person) => (
    `<li>${escapeHtml(person.displayName)}${person.groupId === 'group_ospiti' ? ' · ospite' : ''}</li>`
  )).join('');
}

function renderKitchenMass() {
  const massScheduled = state.kitchenDailyOperation?.massScheduled === true;
  const statusLabel = t(massScheduled ? 'summary.yes' : 'summary.no');
  const card = elements.kitchenPanel.querySelector('[data-kitchen-mass]');
  card.classList.toggle('mass-card-yes', massScheduled);
  card.classList.toggle('mass-card-no', !massScheduled);
  card.setAttribute('aria-label', `Messa: ${statusLabel}`);
  card.querySelector('[data-kitchen-mass-value]').textContent = statusLabel;
}

function renderKitchenNote() {
  const text = Array.isArray(state.kitchenNote?.messages)
    ? state.kitchenNote.messages.map((message) => message.text).filter(Boolean).join('\n')
    : state.kitchenNote?.text?.trim() || '';
  elements.kitchenNote.hidden = !text;
  elements.kitchenNoteText.textContent = text;
}

function formatKitchenWindowLabel(meal) {
  const closesAt = toJavaScriptDate(meal.closesAt);
  if (!closesAt || Number.isNaN(closesAt.getTime())) {
    return 'Orario non disponibile';
  }

  const time = formatDateTime(closesAt, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: state.centerContactSettings.timezone || 'Europe/Rome'
  });
  return meal.status === 'OPEN' && closesAt.getTime() > Date.now()
    ? t('meal.cutoff', { time })
    : `${t('meal.status.closed')} (${time})`;
}

function formatKitchenRefreshLabel(date) {
  return `${t('common.status.saved')} ${formatTime(date)}`;
}

function toJavaScriptDate(value) {
  if (!value) {
    return null;
  }
  if (typeof value.toDate === 'function') {
    return value.toDate();
  }
  return new Date(value);
}

function formatDateTime(date, options, locale = getLocale()) {
  const key = locale + JSON.stringify(options);
  let formatter = dateTimeFormatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    dateTimeFormatterCache.set(key, formatter);
  }
  return formatter.format(date);
}

function renderDietBreakdown(diets) {
  if (!Array.isArray(diets) || diets.length === 0) {
    return '';
  }

  return '<dl class="diet-breakdown">' + diets.map((diet) => `
    <div>
      <dt>${escapeHtml(diet.label)}</dt>
      <dd>${escapeHtml(diet.count)}</dd>
    </div>
  `).join('') + '</dl>';
}

function getKitchenErrorMessage(error) {
  const message = error && error.message ? error.message : '';
  const code = error && error.code ? error.code : '';
  if (code.includes('permission-denied') || message.toLowerCase().includes('permission')) {
    return t('kitchen.accessNotReady');
  }

  return t('kitchen.empty');
}

function formatCalendarDate(date) {
  return formatDateTime(date, {
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  }, getLocale());
}

function formatSummaryDate(date) {
  const dateLabel = formatDateTime(date, {
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  }, getLocale());
  const dayLabel = state.summaryDayOffset === 1 ? t('time.tomorrow').toLowerCase() : t('time.today').toLowerCase();
  return `${dateLabel} (${dayLabel})`;
}

function formatCalendarWeekLabel(date) {
  return formatDateTime(date, {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  }, getLocale());
}

function normalizePhone(value) {
  return normalizePhoneNumber(value);
}

function friendlyErrorMessage(error, fallback) {
  return toUserMessage(error, fallback);
}

async function loadCurrentParticipantWeek(options = {}) {
  const participantOptions = {
    ...options,
    timezone: state.centerContactSettings.timezone
  };
  const dates = Array.from({ length: 7 }, (_, index) => addCalendarDays(state.weekStartDate, index));
  const emptyWeek = dates.map((date) => ({
    date: formatDateId(date),
    label: formatCalendarWeekLabel(date),
    isToday: formatDateId(date) === formatDateId(getCenterToday()),
    meals: []
  }));
  const operationalDate = canManageDailyOperations() ? prepareWeekOperationalDate(dates) : null;
  const [participantWeek, dailyOperations, operationalHealth, operationalNote] = await Promise.all([
    state.selectedParticipant
      ? loadParticipantWeek(state.selectedParticipant.participantId, state.weekStartDate, 7, participantOptions)
      : Promise.resolve(emptyWeek),
    canManageMass()
      ? loadDailyOperations(dates, { forceRefresh: options.forceStaticRefresh === true })
      : Promise.resolve([]),
    operationalDate
      ? loadDailyHealth(operationalDate, { forceRefresh: options.forceStaticRefresh === true })
      : Promise.resolve(null),
    operationalDate
      ? loadKitchenNote(operationalDate, { forceRefresh: options.forceStaticRefresh === true })
      : Promise.resolve(null)
  ]);
  if (options.isCurrentRequest && !options.isCurrentRequest()) return false;
  state.participantWeek = participantWeek;
  state.weekDailyOperations = dailyOperations;
  state.weekOperationalHealth = operationalHealth;
  state.weekOperationalNote = operationalNote;
  const selectedDay = getSelectedDay() || state.participantWeek[0] || null;
  if (selectedDay) {
    state.selectedSummaryDate = selectedDay.date;
  }
  state.participantSummary = null;
}

async function loadCurrentParticipantCalendar(options = {}) {
  if (!state.selectedParticipant && !(state.mode === 'week' && canUseWeekWithoutParticipant())) {
    state.participantWeek = [];
    state.participantMonth = [];
    state.participantSummary = null;
    return;
  }

  if (state.mode === 'week') {
    await loadCurrentParticipantWeek(options);
    if (options.isCurrentRequest && !options.isCurrentRequest()) return false;
    state.participantMonth = [];
  } else {
    const monthStart = startOfMonth(state.monthDate);
    const participantMonth = await loadParticipantWeek(
      state.selectedParticipant.participantId,
      monthStart,
      daysInMonth(monthStart),
      {
        ...options,
        timezone: state.centerContactSettings.timezone
      }
    );
    if (options.isCurrentRequest && !options.isCurrentRequest()) return false;
    state.participantMonth = participantMonth;
    state.participantWeek = [];
    state.participantSummary = null;
  }
  return true;
}

function getSelectedDay() {
  return state.participantWeek.find((day) => day.date === state.selectedSummaryDate) || null;
}

function shiftWeek(days) {
  const nextStart = new Date(state.weekStartDate);
  nextStart.setDate(nextStart.getDate() + days);
  setWeekStartFromDate(nextStart, 'settimana');
}

function shiftMonth(offset) {
  const nextMonth = new Date(state.monthDate);
  nextMonth.setMonth(nextMonth.getMonth() + offset, 1);
  setWeekStartFromDate(nextMonth, 'settimana');
}

function setWeekStartFromDate(date, source) {
  state.weekStartDate = startOfWeek(date);
  state.monthDate = startOfMonth(date);
  if (!state.selectedSummaryDate || startOfWeek(parseDateId(state.selectedSummaryDate)).getTime() !== state.weekStartDate.getTime()) {
    state.selectedSummaryDate = formatDateId(date);
  }
  if (state.selectedParticipant || (state.mode === 'week' && canUseWeekWithoutParticipant())) {
    refreshParticipant(source);
  } else {
    if (state.mode === 'week') {
      renderWeekControls();
    } else {
      renderCalendarControls();
      renderMonthGrid();
    }
  }
}

function renderMealCell(dateId, meal) {
  const mealLabel = getLocalizedMealLabel(meal.mealTypeId, meal.label);
  const stateLabel = getMealStateLabel(meal.effect === 'PRESENT');
  const pending = state.pendingMealKeys.has(getMealPendingKey(dateId, meal.mealTypeId));
  const disabled = meal.isOpen && !pending ? '' : ' disabled';
  const pressed = meal.effect === 'PRESENT' ? 'true' : 'false';
  const classes = 'week-meal-button meal-state-button meal-state-' + meal.effect.toLowerCase()
    + (meal.isOpen ? '' : ' meal-state-locked')
    + (pending ? ' meal-state-pending' : '');
  const cutoffLabel = formatCutoffLabel(meal);
  const ariaLabel = meal.isOpen ? `${mealLabel}: ${stateLabel}` : `${mealLabel}: ${stateLabel}. ${cutoffLabel}`;
  const shortLabel = mealLabel.slice(0, 1) || '•';
  const mark = meal.effect === 'PRESENT' ? '✓' : shortLabel;
  const caption = meal.isOpen ? stateLabel : cutoffLabel;
  return `
    <button type="button" class="${classes}" data-meal-date="${escapeHtml(dateId)}" data-meal-id="${escapeHtml(meal.mealTypeId)}" data-effect="${meal.effect === 'PRESENT' ? 'ABSENT' : 'PRESENT'}" aria-pressed="${pressed}" aria-label="${escapeHtml(ariaLabel)}" title="${escapeHtml(meal.isOpen ? stateLabel : cutoffLabel)}"${disabled}>
      <span class="week-meal-mark" aria-hidden="true">${mark}</span>
      <span class="week-meal-caption" aria-hidden="true">${escapeHtml(caption)}</span>
    </button>
  `;
}

function syncWeekMealButton(button, meal) {
  const isPresent = meal.effect === 'PRESENT';
  const pending = state.pendingMealKeys.has(getMealPendingKey(meal.mealDate, meal.mealTypeId));
  const mealLabel = getLocalizedMealLabel(meal.mealTypeId, meal.label);
  const stateLabel = getMealStateLabel(isPresent);
  const cutoffLabel = formatCutoffLabel(meal);
  const caption = meal.isOpen ? stateLabel : cutoffLabel;
  const shortLabel = mealLabel.slice(0, 1) || '•';
  const ariaLabel = meal.isOpen
    ? `${mealLabel}: ${stateLabel}`
    : `${mealLabel}: ${stateLabel}. ${cutoffLabel}`;

  button.classList.toggle('meal-state-present', isPresent);
  button.classList.toggle('meal-state-absent', !isPresent);
  button.classList.toggle('meal-state-locked', !meal.isOpen);
  button.classList.toggle('meal-state-pending', pending);
  button.dataset.effect = isPresent ? 'ABSENT' : 'PRESENT';
  button.setAttribute('aria-pressed', String(isPresent));
  button.setAttribute('aria-label', ariaLabel);
  button.title = meal.isOpen ? stateLabel : cutoffLabel;
  button.disabled = !meal.isOpen || pending;
  const mark = button.querySelector('.week-meal-mark');
  const label = button.querySelector('.week-meal-caption');
  if (mark) mark.textContent = isPresent ? '✓' : shortLabel;
  if (label) label.textContent = caption;
}

function syncMonthMealButton(button, meal) {
  const isPresent = meal.effect === 'PRESENT';
  const pending = state.pendingMealKeys.has(getMealPendingKey(meal.mealDate, meal.mealTypeId));
  const mealLabel = getLocalizedMealLabel(meal.mealTypeId, meal.label);
  const stateLabel = getMealStateLabel(isPresent);
  const actionLabel = meal.isOpen
    ? `${mealLabel}: ${stateLabel}`
    : `${mealLabel}: ${stateLabel}. ${formatCutoffLabel(meal)}`;

  button.classList.toggle('month-flag-present', isPresent);
  button.classList.toggle('month-flag-absent', !isPresent);
  button.classList.toggle('month-flag-locked', !meal.isOpen);
  button.classList.toggle('month-flag-pending', pending);
  button.dataset.monthEffect = isPresent ? 'ABSENT' : 'PRESENT';
  button.setAttribute('aria-pressed', String(isPresent));
  button.setAttribute('aria-label', actionLabel);
  button.title = meal.isOpen ? stateLabel : formatCutoffLabel(meal);
  button.disabled = !meal.isOpen || pending;
  const mark = button.querySelector('.month-flag-mark');
  if (mark) mark.textContent = isPresent ? '✓' : mealLabel.slice(0, 1);
}

function syncWeekSelectionControls() {
  const weekMeals = state.participantWeek.flatMap((day) => day.meals || []);
  const weekButton = elements.participantMeals.querySelector('[data-week-effect]');
  syncWeekScopeButton(weekButton, getBulkSelectionEffect(weekMeals), 'week-scope-button-complete', weekMeals);

  state.participantWeek.forEach((day) => {
    const dayButton = elements.participantMeals.querySelector(
      `[data-day-effect][data-day-date="${day.date}"]`
    );
    syncWeekScopeButton(dayButton, getBulkSelectionEffect(day.meals), 'week-day-button-complete', day.meals);
  });

  elements.participantMeals.querySelectorAll('[data-week-meal-type]').forEach((button) => {
    const columnMeals = weekMeals.filter((meal) => meal.mealTypeId === button.dataset.weekMealType);
    syncWeekScopeButton(button, getBulkSelectionEffect(columnMeals), 'week-meal-heading-complete', columnMeals);
  });

  const massBulkButton = elements.participantMeals.querySelector('[data-week-mass-bulk]');
  if (massBulkButton) {
    const openDays = state.participantWeek.filter((day) => getMassWindowState(day).isOpen);
    const allScheduled = openDays.length > 0 && openDays.every((day) => (
      state.weekDailyOperations.find((operation) => operation.dateId === day.date)?.massScheduled === true
    ));
    const nextScheduled = !allScheduled;
    const actionLabel = nextScheduled
      ? 'Segna Messa sì per i giorni modificabili'
      : 'Segna Messa no per i giorni modificabili';
    const busy = massBulkButton.getAttribute('aria-busy') === 'true';
    massBulkButton.classList.toggle('week-mass-heading-complete', allScheduled);
    massBulkButton.dataset.weekMassScheduled = String(nextScheduled);
    massBulkButton.setAttribute('aria-pressed', String(allScheduled));
    massBulkButton.setAttribute('aria-label', actionLabel);
    massBulkButton.title = actionLabel;
    massBulkButton.disabled = busy || openDays.length === 0;
  }
}

function syncWeekScopeButton(button, effect, completeClass, meals = []) {
  if (!button) return;
  const selected = effect === 'ABSENT';
  const openMeals = meals.filter((meal) => meal.isOpen);
  const hasPendingMeals = openMeals.some((meal) => (
    state.pendingMealKeys.has(getMealPendingKey(meal.mealDate, meal.mealTypeId))
  ));
  const busy = button.getAttribute('aria-busy') === 'true';
  button.classList.toggle(completeClass, selected);
  button.setAttribute('aria-pressed', String(selected));
  if (button.hasAttribute('data-week-effect')) button.dataset.weekEffect = effect;
  if (button.hasAttribute('data-day-effect')) button.dataset.dayEffect = effect;
  if (button.hasAttribute('data-week-meal-effect')) button.dataset.weekMealEffect = effect;
  button.disabled = busy || openMeals.length === 0 || hasPendingMeals;
}

function syncWeekGridFromState() {
  const daysByDate = new Map(state.participantWeek.map((day) => [day.date, day]));
  elements.participantMeals.querySelectorAll('[data-meal-date]').forEach((button) => {
    const day = daysByDate.get(button.dataset.mealDate);
    const meal = day?.meals.find((item) => item.mealTypeId === button.dataset.mealId);
    if (meal) syncWeekMealButton(button, meal);
  });
  elements.participantMeals.querySelectorAll('[data-week-mass-date]').forEach((button) => {
    const day = daysByDate.get(button.dataset.weekMassDate);
    const operation = state.weekDailyOperations.find((item) => item.dateId === button.dataset.weekMassDate);
    if (day) syncWeekMassButton(button, day, operation?.massScheduled === true);
  });
  syncWeekSelectionControls();
}

function syncWeekMassButton(button, day, massScheduled) {
  const label = t(massScheduled ? 'summary.yes' : 'summary.no');
  const windowState = getMassWindowState(day);
  const cutoffLabel = formatCutoffLabel(windowState);
  const busy = button.getAttribute('aria-busy') === 'true';
  button.classList.toggle('week-mass-button-yes', massScheduled);
  button.classList.toggle('week-mass-button-no', !massScheduled);
  button.classList.toggle('week-mass-button-locked', !windowState.isOpen);
  button.dataset.weekMassScheduled = String(massScheduled);
  button.setAttribute('aria-pressed', String(massScheduled));
  button.setAttribute('aria-label', `${day.label}. Messa: ${label}${windowState.isOpen ? '' : `. ${cutoffLabel}`}`);
  button.title = windowState.isOpen ? `Messa: ${label}` : cutoffLabel;
  button.disabled = busy || !windowState.isOpen;
  const value = button.querySelector('strong');
  if (value) value.textContent = label;
}

function syncMonthSelectionControls() {
  elements.monthGrid.querySelectorAll('[data-month-scope]').forEach((button) => {
    const meals = button.dataset.monthScope === 'month'
      ? getMonthScopeMeals(null, null)
      : getMonthScopeMeals(button.dataset.weekStart, button.dataset.mealType || null);
    const effect = meals.length > 0 && meals.every((meal) => meal.effect === 'PRESENT')
      ? 'ABSENT'
      : 'PRESENT';
    const selected = effect === 'ABSENT';
    const hasPendingMeals = meals.some((meal) => (
      state.pendingMealKeys.has(getMealPendingKey(meal.mealDate, meal.mealTypeId))
    ));
    const busy = button.getAttribute('aria-busy') === 'true';
    button.dataset.monthEffect = effect;
    button.classList.toggle('month-toggle-button-selected', button.dataset.monthScope === 'month' && selected);
    button.classList.toggle('month-scope-toggle-selected', button.dataset.monthScope !== 'month' && selected);
    button.setAttribute('aria-pressed', String(selected));
    button.disabled = busy || meals.length === 0 || hasPendingMeals;
  });

  elements.monthGrid.querySelectorAll('.month-week-action-row[data-week-start]').forEach((panel) => {
    const complete = getMonthScopeEffect(panel.dataset.weekStart, null) === 'ABSENT';
    panel.classList.toggle('month-week-complete', complete);
    panel.setAttribute('aria-label', `Azioni settimana${complete ? ', completata' : ''}`);
  });
}

function syncMonthGridFromState() {
  const daysByDate = new Map(state.participantMonth.map((day) => [day.date, day]));
  elements.monthGrid.querySelectorAll('[data-month-meal]').forEach((button) => {
    const day = daysByDate.get(button.dataset.monthDate);
    const meal = day?.meals.find((item) => item.mealTypeId === button.dataset.monthMealId);
    if (meal) syncMonthMealButton(button, meal);
  });
  syncMonthSelectionControls();
}

function beginOptimisticBulkSelection(days, effect, mealTypeId = null) {
  const meals = days
    .flatMap((day) => day.meals || [])
    .filter((meal) => meal.isOpen && (!mealTypeId || meal.mealTypeId === mealTypeId))
    .filter((meal) => meal.effect !== effect)
    .filter((meal) => !state.pendingMealKeys.has(getMealPendingKey(meal.mealDate, meal.mealTypeId)));
  const mealKeys = new Set(meals.map((meal) => getMealPendingKey(meal.mealDate, meal.mealTypeId)));
  const previousEffects = new Map(meals.map((meal) => [meal, meal.effect]));
  const saveDays = days.map((day) => ({
    ...day,
    meals: (day.meals || []).map((meal) => {
      const clone = { ...meal };
      if (!mealKeys.has(getMealPendingKey(meal.mealDate, meal.mealTypeId))) {
        clone.effect = effect;
      }
      return clone;
    })
  }));

  meals.forEach((meal) => {
    state.pendingMealKeys.add(getMealPendingKey(meal.mealDate, meal.mealTypeId));
    meal.effect = effect;
  });

  return {
    meals,
    saveDays,
    rollback() {
      previousEffects.forEach((previousEffect, meal) => {
        meal.effect = previousEffect;
      });
    },
    commit() {
      const savedAt = new Date();
      const periods = [state.participantWeek, state.participantMonth];
      periods
        .flatMap((daysInPeriod) => daysInPeriod || [])
        .flatMap((day) => day.meals || [])
        .filter((meal) => mealKeys.has(getMealPendingKey(meal.mealDate, meal.mealTypeId)))
        .forEach((meal) => {
          meal.effect = effect;
          meal.updatedAt = savedAt;
          if (!meal.createdAt) meal.createdAt = savedAt;
        });
    },
    finish() {
      mealKeys.forEach((key) => state.pendingMealKeys.delete(key));
    }
  };
}

async function saveMealOptimistically({ meal, effect, sync, onSaved }) {
  const pendingKey = getMealPendingKey(meal.mealDate, meal.mealTypeId);
  if (state.pendingMealKeys.has(pendingKey)) return;
  const previousEffect = meal.effect;
  state.pendingMealKeys.add(pendingKey);
  meal.effect = effect;
  sync();
  setParticipantStatus('Salvo...');

  try {
    await saveParticipantMeal(state.selectedParticipant, meal, effect);
    if (typeof onSaved === 'function') onSaved();
    setParticipantStatus('Prenotazione salvata');
  } catch (error) {
    meal.effect = previousEffect;
    setParticipantStatus(friendlyErrorMessage(error, 'Salvataggio non riuscito'));
  } finally {
    state.pendingMealKeys.delete(pendingKey);
    sync();
  }
}

function formatWeekDayCode(dateId) {
  const date = parseDateId(dateId);
  const symbols = ['D', 'L', 'M', 'X', 'G', 'V', 'S'];
  return `${symbols[date.getDay()]} ${date.getDate()}`;
}

function formatCutoffLabel(meal) {
  if (!meal?.closesAt) {
    return 'Non modificabile';
  }
  const time = formatDateTime(new Date(meal.closesAt), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: state.centerContactSettings.timezone || 'Europe/Rome'
  });
  return t('meal.status.closedAt', { time });
}

function formatWeekRange() {
  return formatWeekRangeFrom(state.weekStartDate);
}

function formatWeekRangeFrom(startDate) {
  const start = startDate;
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return formatDateTime(start, {
    day: '2-digit',
    month: 'short'
  }, getLocale()) + ' - ' + formatDateTime(end, {
    day: '2-digit',
    month: 'short'
  }, getLocale());
}

function startOfWeek(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - result.getDay());
  return result;
}

function startOfMonth(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(1);
  return result;
}

function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function formatMonthId(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
}

function formatMonthLabel(date) {
  const label = formatDateTime(date, {
    month: 'long',
    year: 'numeric'
  }, getLocale());
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function isDateInWeek(dateId, weekStartId) {
  const date = parseDateId(dateId);
  const start = parseDateId(weekStartId);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return date >= start && date <= end;
}

function parseDateId(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function buildMonthCells(monthDate, monthDays) {
  const firstDay = startOfMonth(monthDate);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());
  const todayId = formatDateId(getCenterToday());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const dateId = formatDateId(date);
    const monthEntry = monthDays.find((item) => item.date === dateId) || null;
    const meals = monthEntry ? monthEntry.meals : [];
    return {
      date: dateId,
      dayNumber: date.getDate(),
      inCurrentMonth: date.getMonth() === monthDate.getMonth(),
      isToday: dateId === todayId,
      isPast: dateId < todayId,
      isClosed: meals.length > 0 && meals.every((meal) => !meal.isOpen),
      meals
    };
  });
}

function renderMonthFlags(day) {
  const meals = Array.isArray(day.meals) ? day.meals : [];
  if (meals.length === 0) {
    return '';
  }

  return meals.map((meal) => {
    const mealLabel = getLocalizedMealLabel(meal.mealTypeId, meal.label);
    const short = mealLabel.slice(0, 1);
    const isPresent = meal.effect === 'PRESENT';
    const activeClass = meal.effect === 'PRESENT' ? 'month-flag-present' : 'month-flag-absent';
    const lockClass = meal.isOpen ? '' : ' month-flag-locked';
    const pending = state.pendingMealKeys.has(getMealPendingKey(day.date, meal.mealTypeId));
    const pendingClass = pending ? ' month-flag-pending' : '';
    const visibleMark = isPresent ? '✓' : short;
    const stateLabel = getMealStateLabel(isPresent);
    const actionLabel = meal.isOpen
      ? `${mealLabel}: ${stateLabel}`
      : `${mealLabel}: ${stateLabel}. ${formatCutoffLabel(meal)}`;
    return `<button type="button" class="month-flag ${activeClass}${lockClass}${pendingClass}" data-month-meal data-month-date="${escapeHtml(day.date)}" data-month-meal-id="${escapeHtml(meal.mealTypeId)}" data-month-effect="${isPresent ? 'ABSENT' : 'PRESENT'}" aria-pressed="${isPresent}" aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(meal.isOpen ? stateLabel : formatCutoffLabel(meal))}"${meal.isOpen && !pending ? '' : ' disabled'}><span class="month-flag-mark" aria-hidden="true">${escapeHtml(visibleMark)}</span></button>`;
  }).join('');
}

function getMealPendingKey(mealDate, mealTypeId) {
  return `${mealDate}_${mealTypeId}`;
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const hadServiceWorkerController = Boolean(navigator.serviceWorker.controller);
  let reloadingForUpdate = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadServiceWorkerController || reloadingForUpdate) return;
    reloadingForUpdate = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch(() => undefined);
  }, { once: true });
}

async function handleAccessLinkCopy(event) {
  const button = event.currentTarget;
  const scope = button.getAttribute('data-access-link');
  const url = getCachedAccessLinkUrl(scope) || await resolveAccessLinkUrl(scope);
  if (!url) return;
  const originalText = button.textContent;
  try {
    await navigator.clipboard.writeText(url);
    button.textContent = t('status.copied');
    button.setAttribute('aria-label', t('status.linkCopied'));
    window.setTimeout(() => {
      button.textContent = originalText;
      button.setAttribute('aria-label', scope === 'pasti' ? 'Copia link Pasti' : 'Copia link Cucina');
    }, 1400);
  } catch {
    openAccessShareDialog(scope === 'pasti' ? 'Prenotazione pasti' : 'Pannello cucina', url);
  }
}

async function handleAccessLinkShare(event) {
  const button = event.currentTarget;
  const scope = button.getAttribute('data-share-access-link');
  const url = getCachedAccessLinkUrl(scope);
  if (!url) return;

  const label = scope === 'pasti' ? 'Prenotazione pasti' : 'Pannello cucina';
  const shareData = { title: label, text: `${label}:`, url };
  try {
    if (typeof navigator.share === 'function' && (!navigator.canShare || navigator.canShare(shareData))) {
      await navigator.share(shareData);
      return;
    }
    openAccessShareDialog(label, url);
  } catch (error) {
    if (error?.name !== 'AbortError') {
      openAccessShareDialog(label, url);
    }
  }
}

function openAccessShareDialog(label, url) {
  let dialog = document.querySelector('[data-access-share-dialog]');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.className = 'access-share-dialog';
    dialog.setAttribute('data-access-share-dialog', '');
    dialog.innerHTML = `
      <div class="access-share-dialog-content">
        <div class="section-title access-share-dialog-header">
          <div>
            <p class="eyebrow">Link per accedere</p>
            <h2>Condividi collegamento</h2>
          </div>
          <button type="button" class="icon-button" data-access-share-close aria-label="Chiudi">×</button>
        </div>
        <div class="access-share-target">
          <span class="access-share-target-icon" aria-hidden="true">↗</span>
          <div>
            <strong data-access-share-label></strong>
            <small>Invia questo accesso alla persona interessata</small>
          </div>
        </div>
        <input class="access-share-url" data-access-share-url type="text" readonly aria-label="Collegamento da condividere">
        <div class="access-share-options">
          <a class="secondary-action access-share-option access-share-whatsapp" data-access-share-whatsapp target="_blank" rel="noopener"><img src="/icons/whatsapp.svg?v=20260808a" alt="" aria-hidden="true"><span>WhatsApp</span></a>
          <a class="secondary-action access-share-option" data-access-share-email><span class="access-share-option-icon" aria-hidden="true">@</span><span>Email</span></a>
          <button type="button" class="secondary-action access-share-option" data-access-share-copy><span class="access-share-option-icon" aria-hidden="true">⧉</span><span>Copia collegamento</span></button>
        </div>
        <p class="status-line" data-access-share-status aria-live="polite"></p>
      </div>`;
    document.body.append(dialog);
    dialog.querySelector('[data-access-share-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.querySelector('[data-access-share-copy]').addEventListener('click', async () => {
      const currentUrl = dialog.dataset.url || '';
      if (!currentUrl) return;
      try {
        await navigator.clipboard.writeText(currentUrl);
        dialog.querySelector('[data-access-share-status]').textContent = 'Collegamento copiato';
      } catch {
        const input = dialog.querySelector('[data-access-share-url]');
        input.focus();
        input.select();
        dialog.querySelector('[data-access-share-status]').textContent = 'Collegamento selezionato: usa Copia';
      }
    });
  }

  const message = `${label}: ${url}`;
  dialog.dataset.url = url;
  dialog.querySelector('[data-access-share-url]').value = url;
  dialog.querySelector('[data-access-share-label]').textContent = label;
  dialog.querySelector('[data-access-share-whatsapp]').href = `https://wa.me/?text=${encodeURIComponent(message)}`;
  dialog.querySelector('[data-access-share-email]').href = `mailto:?subject=${encodeURIComponent(label)}&body=${encodeURIComponent(message)}`;
  dialog.querySelector('[data-access-share-status]').textContent = '';
  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
}

function getCachedAccessLinkUrl(scope) {
  const centerId = getActiveCenterId();
  if (scope === 'pasti' && state.operationalLinks.publicTokenId) {
    return buildOperationalLink('participant', state.operationalLinks.publicTokenId, centerId, 'friendly');
  }
  if (scope === 'cucina' && state.operationalLinks.kitchenTokenId) {
    return buildOperationalLink('kitchen', state.operationalLinks.kitchenTokenId, centerId);
  }
  return '';
}

async function resolveAccessLinkUrl(scope) {
  const cachedUrl = getCachedAccessLinkUrl(scope);
  if (cachedUrl) return cachedUrl;

  const { loadOperationalLinks } = await import(domainModulePaths.accessLinks);
  const links = await loadOperationalLinks({ forceRefresh: true });
  const centerId = getActiveCenterId();
  if (scope === 'pasti') {
    return links.publicTokenId
      ? buildOperationalLink('participant', links.publicTokenId, centerId, 'friendly')
      : '';
  }
  if (scope === 'cucina') {
    return links.kitchenTokenId
      ? buildOperationalLink('kitchen', links.kitchenTokenId, centerId)
      : '';
  }
  return '';
}
