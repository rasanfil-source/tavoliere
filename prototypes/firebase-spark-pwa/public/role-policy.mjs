export const CENTER_ROLES = Object.freeze({
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER'
});

export const CAPABILITIES = Object.freeze({
  OPEN_ADMIN_AREA: 'openAdminArea',
  VIEW_CENTER_OVERVIEW: 'viewCenterOverview',
  MANAGE_ADAPTATIONS: 'manageAdaptations',
  MANAGE_CENTER_SETTINGS: 'manageCenterSettings',
  MANAGE_CENTER_AVATAR: 'manageCenterAvatar',
  MANAGE_CALENDAR: 'manageCalendar',
  MANAGE_PARTICIPANTS: 'manageParticipants',
  DELETE_PARTICIPANTS: 'deleteParticipants',
  MANAGE_DAILY_OPERATIONS: 'manageDailyOperations',
  MANAGE_MASS: 'manageMass',
  ASSIGN_VICE: 'assignVice',
  ASSIGN_LITURGY: 'assignLiturgy',
  MANAGE_ADMINS: 'manageAdmins',
  TRANSFER_OWNERSHIP: 'transferOwnership',
  VIEW_OPERATIONAL_LINKS: 'viewOperationalLinks',
  MANAGE_OPERATIONAL_LINKS: 'manageOperationalLinks',
  EXPORT_CENTER_DATA: 'exportCenterData',
  RESTORE_CENTER_DATA: 'restoreCenterData',
  VIEW_AUDIT_LOG: 'viewAuditLog',
  MANAGE_PLATFORM_CENTERS: 'managePlatformCenters'
});

const OWNER_CAPABILITIES = [
  CAPABILITIES.OPEN_ADMIN_AREA,
  CAPABILITIES.VIEW_CENTER_OVERVIEW,
  CAPABILITIES.MANAGE_ADAPTATIONS,
  CAPABILITIES.MANAGE_CENTER_SETTINGS,
  CAPABILITIES.MANAGE_CENTER_AVATAR,
  CAPABILITIES.MANAGE_CALENDAR,
  CAPABILITIES.MANAGE_PARTICIPANTS,
  CAPABILITIES.DELETE_PARTICIPANTS,
  CAPABILITIES.MANAGE_DAILY_OPERATIONS,
  CAPABILITIES.ASSIGN_VICE,
  CAPABILITIES.ASSIGN_LITURGY,
  CAPABILITIES.MANAGE_ADMINS,
  CAPABILITIES.TRANSFER_OWNERSHIP,
  CAPABILITIES.VIEW_OPERATIONAL_LINKS,
  CAPABILITIES.MANAGE_OPERATIONAL_LINKS,
  CAPABILITIES.EXPORT_CENTER_DATA,
  CAPABILITIES.RESTORE_CENTER_DATA,
  CAPABILITIES.VIEW_AUDIT_LOG
];

const ADMIN_CAPABILITIES = OWNER_CAPABILITIES.filter((capability) => ![
  CAPABILITIES.MANAGE_ADMINS,
  CAPABILITIES.TRANSFER_OWNERSHIP,
  CAPABILITIES.RESTORE_CENTER_DATA
].includes(capability));

// Il vice entra come residente con sigla e password amministratori. Il suo
// pannello è deliberatamente operativo e ristretto: Persone, Link e
// Impostazioni. Configurazione, Attività e passaggio di consegne restano
// riservati a responsabile/amministratori con autenticazione forte.
const MANAGER_CAPABILITIES = [
  CAPABILITIES.OPEN_ADMIN_AREA,
  CAPABILITIES.MANAGE_ADAPTATIONS,
  CAPABILITIES.MANAGE_PARTICIPANTS,
  CAPABILITIES.DELETE_PARTICIPANTS,
  CAPABILITIES.MANAGE_DAILY_OPERATIONS,
  CAPABILITIES.VIEW_OPERATIONAL_LINKS
];

const ROLE_CAPABILITIES = Object.freeze({
  [CENTER_ROLES.OWNER]: new Set(OWNER_CAPABILITIES),
  [CENTER_ROLES.ADMIN]: new Set(ADMIN_CAPABILITIES),
  [CENTER_ROLES.MANAGER]: new Set(MANAGER_CAPABILITIES)
});

export function normalizeCenterRole(role) {
  const normalized = String(role || '').trim().toUpperCase();
  return Object.values(CENTER_ROLES).includes(normalized) ? normalized : '';
}

export function roleLabel(role) {
  return {
    [CENTER_ROLES.OWNER]: 'Responsabile del centro',
    [CENTER_ROLES.ADMIN]: 'Amministratore',
    [CENTER_ROLES.MANAGER]: 'Vice amministratore'
  }[normalizeCenterRole(role)] || 'Partecipante';
}

export function getRoleCapabilities(role, options = {}) {
  const normalizedRole = normalizeCenterRole(role);
  const capabilities = new Set(ROLE_CAPABILITIES[normalizedRole] || []);

  if (options.liturgicalRole === true) {
    capabilities.add(CAPABILITIES.MANAGE_MASS);
  }
  // La spunta identifica la Persona ammessa; l'abilitazione effettiva richiede
  // anche una sessione residente con la password amministratori corrente.
  if (options.platformOwner === true) {
    capabilities.add(CAPABILITIES.MANAGE_PLATFORM_CENTERS);
  }

  return capabilities;
}

export function hasCapability(role, capability, options = {}) {
  return getRoleCapabilities(role, options).has(capability);
}

export function getRolePolicyRows() {
  return Object.values(CENTER_ROLES).map((role) => ({
    role,
    capabilities: [...ROLE_CAPABILITIES[role]]
  }));
}
