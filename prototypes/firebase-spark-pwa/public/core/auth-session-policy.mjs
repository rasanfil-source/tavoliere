export function shouldProcessAdminAuthEvent({
  mode,
  residentAuthTransition = '',
  residentRestorePending = false,
  strongAuthUser = false
} = {}) {
  if (mode !== 'admin') return false;
  if ((residentAuthTransition || residentRestorePending) && !strongAuthUser) return false;
  return true;
}

export function shouldPreserveResidentViewAfterRefreshError({
  friendlyAccess = false,
  residentReady = false,
  hasParticipant = false,
  permissionDenied = false
} = {}) {
  return friendlyAccess && residentReady && hasParticipant && permissionDenied;
}
