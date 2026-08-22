import { normalizeDietTags } from '../diet-utils.mjs?v=20260818w';

export function normalizeResidentSignature(value) {
  return String(value || '').trim().replace(/\s+/g, '').toUpperCase();
}

export function normalizePhoneNumber(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const hasInternationalPrefix = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 6 || digits.length > 15) return '';
  return `${hasInternationalPrefix ? '+' : ''}${digits}`;
}

export function validateParticipantProfile(profile = {}) {
  const displayName = String(profile.displayName || '').trim();
  const signature = normalizeResidentSignature(profile.signature);
  const initials = String(profile.initials || '').trim().replace(/\s+/g, '').toUpperCase();
  const rawPhone = String(profile.phone || '').trim();
  const phone = normalizePhoneNumber(rawPhone);

  if (!displayName || displayName.length > 120) {
    throw new Error('Il nome deve contenere da 1 a 120 caratteri.');
  }
  if (!/^[A-Z0-9]{2,12}$/.test(signature)) {
    throw new Error('La sigla deve contenere da 2 a 12 lettere o numeri.');
  }
  if (initials && !/^[\p{L}\p{N}]{1,6}$/u.test(initials)) {
    throw new Error('Le iniziali devono contenere da 1 a 6 lettere o numeri.');
  }
  if (rawPhone && !phone) {
    throw new Error('Il numero di telefono deve contenere da 6 a 15 cifre.');
  }

  return Object.freeze({
    active: profile.active !== false,
    displayName,
    groupId: profile.groupId === 'group_ospiti' ? 'group_ospiti' : 'group_residenti',
    initials,
    dietTags: normalizeDietTags(profile.dietTags),
    liturgicalRole: profile.liturgicalRole === true,
    sortOrder: Number.isFinite(Number(profile.sortOrder)) ? Number(profile.sortOrder) : 0,
    phone,
    phoneConsent: profile.phoneConsent === true,
    showContactInSummary: profile.showContactInSummary === true,
    signature,
    viceAdminRole: profile.viceAdminRole === true,
    whatsappEnabled: profile.whatsappEnabled === true
  });
}
