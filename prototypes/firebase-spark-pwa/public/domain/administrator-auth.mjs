export function usesGoogleAdministratorAccess(user) {
  return Boolean(user?.providerData?.some((provider) => provider.providerId === 'google.com'));
}

export function requiresAdministratorPassword(user) {
  if (usesGoogleAdministratorAccess(user)) return false;
  return Boolean(user?.providerData?.some((provider) => provider.providerId === 'password'));
}
