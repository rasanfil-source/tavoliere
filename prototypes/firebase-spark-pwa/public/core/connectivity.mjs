export const NETWORK_ACTION_SELECTOR = [
  '[data-auth-button]',
  '[data-admin-email-signin]',
  '[data-admin-email-create]',
  '[data-resident-login-form]',
  '[data-owner-invitation-generate]',
  '[data-bootstrap-button]',
  '[data-center-initializer-button]',
  '[data-admin-center-settings-save]',
  '[data-admin-center-avatar-remove]',
  '[data-admin-vice-save]',
  '[data-admin-invitation-generate]',
  '[data-admin-transfer-ownership]',
  '[data-revoke-admin-invitation]',
  '[data-admin-save-button]',
  '[data-admin-delete-participant]',
  '[data-week-health-save]',
  '[data-week-diet-save]',
  '[data-week-diet-remove]',
  '[data-week-kitchen-note-save]',
  '[data-meal-date]',
  '[data-month-meal]',
  '[data-month-scope]',
  '[data-week-effect]',
  '[data-week-meal-type]',
  '[data-day-date]',
  '[data-week-mass-bulk]',
  '[data-week-mass-date]'
].join(',');

export function isConnectionAvailable(navigatorLike = globalThis.navigator) {
  return navigatorLike?.onLine !== false;
}

export function actionRequiresConnection(target) {
  return Boolean(target?.closest?.(NETWORK_ACTION_SELECTOR));
}
