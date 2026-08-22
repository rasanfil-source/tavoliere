// Single source of truth for the authentication/session lifecycle.
//
// Firebase and the friendly resident session are deliberately represented as
// two independent identities.  A Firebase event can therefore never promote a
// resident, and leaving the control panel cannot accidentally revoke a
// resident session while navigating back to bookings.

export const AUTH_STATES = Object.freeze({
  SIGNED_OUT: 'signed-out',
  RESTORING_RESIDENT: 'restoring-resident',
  RESIDENT_READY: 'resident-ready',
  ADMIN_CHECKING: 'admin-checking',
  ADMIN_READY: 'admin-ready',
  SIGNING_OUT: 'signing-out'
});

const ADMIN_ROLES = new Set(['OWNER', 'ADMIN', 'MANAGER']);

export function createInitialAuthState(overrides = {}) {
  return Object.freeze({
    state: AUTH_STATES.SIGNED_OUT,
    route: 'participant',
    residentReady: false,
    residentEntry: '',
    firebaseUid: '',
    firebaseStrong: false,
    adminRole: '',
    adminAuthorized: false,
    adminPending: false,
    adminRequestId: 0,
    transitionId: 0,
    ...overrides
  });
}

function withTransition(state, patch) {
  return Object.freeze({
    ...state,
    ...patch,
    transitionId: state.transitionId + 1
  });
}

/**
 * Apply one lifecycle event. Unknown/stale events are no-ops, which makes
 * late Firebase callbacks harmless after logout or a newer login.
 */
export function reduceAuthState(input, event = {}) {
  const state = input?.state ? input : createInitialAuthState(input);
  const type = event.type;
  const route = event.route || state.route;

  if (type === 'NAVIGATE') {
    return withTransition(state, { route });
  }
  if (type === 'RESIDENT_RESTORE_START') {
    return withTransition(state, {
      state: AUTH_STATES.RESTORING_RESIDENT,
      residentReady: false,
      residentEntry: '',
      adminAuthorized: false,
      adminRole: '',
      adminPending: false
    });
  }
  if (type === 'RESIDENT_LOGIN_START') {
    return withTransition(state, {
      state: AUTH_STATES.RESTORING_RESIDENT,
      residentReady: false,
      adminAuthorized: false,
      adminRole: '',
      adminPending: false
    });
  }
  if (type === 'RESIDENT_READY') {
    return withTransition(state, {
      state: AUTH_STATES.RESIDENT_READY,
      route: route === 'admin' ? 'participant' : route,
      residentReady: true,
      residentEntry: event.entry === 'vice' ? 'vice' : 'common',
      adminAuthorized: event.entry === 'vice',
      adminRole: event.entry === 'vice' ? 'MANAGER' : '',
      adminPending: false
    });
  }
  if (type === 'ADMIN_AUTH_START') {
    const adminRequestId = state.adminRequestId + 1;
    return withTransition(state, {
      state: AUTH_STATES.ADMIN_CHECKING,
      route: 'admin',
      adminPending: true,
      adminAuthorized: false,
      adminRole: '',
      adminRequestId
    });
  }
  if (type === 'ADMIN_AUTH_SUCCESS') {
    if (event.requestId !== undefined && event.requestId !== state.adminRequestId) return state;
    const role = ADMIN_ROLES.has(event.role) ? event.role : '';
    if (!event.firebaseUid || !role) return state;
    return withTransition(state, {
      state: AUTH_STATES.ADMIN_READY,
      route: 'admin',
      firebaseUid: String(event.firebaseUid),
      firebaseStrong: true,
      adminRole: role,
      adminAuthorized: true,
      adminPending: false
    });
  }
  if (type === 'ADMIN_AUTH_FAILURE') {
    if (event.requestId !== undefined && event.requestId !== state.adminRequestId) return state;
    return withTransition(state, {
      state: state.residentReady ? AUTH_STATES.RESIDENT_READY : AUTH_STATES.SIGNED_OUT,
      adminPending: false,
      adminAuthorized: false,
      adminRole: ''
    });
  }
  if (type === 'FIREBASE_AUTH_CHANGED') {
    // A Firebase event without a strong identity is never an admin session.
    if (!event.strong || !event.uid) {
      return state.adminAuthorized && state.state === AUTH_STATES.ADMIN_READY
        ? withTransition(state, {
          state: state.residentReady ? AUTH_STATES.RESIDENT_READY : AUTH_STATES.SIGNED_OUT,
          firebaseUid: '',
          firebaseStrong: false,
          adminRole: '',
          adminAuthorized: false,
          adminPending: false
        })
        : state;
    }
    return withTransition(state, {
      firebaseUid: String(event.uid),
      firebaseStrong: true
    });
  }
  if (type === 'SIGN_OUT_START') {
    return withTransition(state, { state: AUTH_STATES.SIGNING_OUT, adminPending: true });
  }
  if (type === 'SIGN_OUT_COMPLETE') {
    return withTransition(state, {
      state: AUTH_STATES.SIGNED_OUT,
      route: 'participant',
      residentReady: false,
      residentEntry: '',
      firebaseUid: '',
      firebaseStrong: false,
      adminRole: '',
      adminAuthorized: false,
      adminPending: false,
      adminRequestId: state.adminRequestId + 1
    });
  }
  return state;
}

export function selectAuthSurface(stateInput) {
  const state = stateInput?.state ? stateInput : createInitialAuthState(stateInput);
  const isAdminRoute = state.route === 'admin';
  const vicePanelReady = state.state === AUTH_STATES.RESIDENT_READY
    && state.residentEntry === 'vice'
    && state.adminRole === 'MANAGER';
  const adminPanelVisible = isAdminRoute
    && (state.state === AUTH_STATES.ADMIN_READY || vicePanelReady)
    && state.adminAuthorized
    && Boolean(state.adminRole)
    && !state.adminPending;
  const residentLoginVisible = !isAdminRoute
    && !state.residentReady
    && state.state !== AUTH_STATES.RESTORING_RESIDENT
    && state.state !== AUTH_STATES.SIGNING_OUT;
  return Object.freeze({
    adminPanelVisible,
    adminChecking: state.state === AUTH_STATES.ADMIN_CHECKING || state.adminPending,
    residentLoginVisible,
    residentViewsVisible: state.residentReady && !isAdminRoute,
    role: state.adminAuthorized ? state.adminRole : (state.residentReady ? 'RESIDENT' : '')
  });
}
