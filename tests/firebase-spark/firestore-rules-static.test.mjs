import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const rules = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/firestore.rules', import.meta.url),
  'utf8'
);

const participantData = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/participant-data.js', import.meta.url),
  'utf8'
);
const centerSettings = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/center-settings.js', import.meta.url),
  'utf8'
);

test('resident signature lookup uses only the canonical signature field', () => {
  assert.match(participantData, /normalizeResidentSignature\(participant\.signature\)/);
  assert.doesNotMatch(participantData, /const candidates\s*=\s*\[[\s\S]*participant\.(sigla|code|participantId|displayName)/);
  assert.match(participantData, /export async function restoreFriendlyResidentSession/);
  assert.match(participantData, /export async function forgetResidentDevice/);
  assert.match(participantData, /user\.isAnonymous/);
});

test('active access sessions expire with request.time', () => {
  assert.match(
    rules,
    /function hasSession\(centerId\)[\s\S]*request\.time < get\([\s\S]*accessSessions[\s\S]*\.data\.expiresAt;/
  );
});

test('access session expiry stays within the active link token', () => {
  assert.match(
    rules,
    /request\.resource\.data\.expiresAt > request\.time[\s\S]*request\.resource\.data\.expiresAt <= tokenData\(centerId, request\.resource\.data\.tokenId\)\.expiresAt/
  );
});

test('personal access token binding requires an existing participant', () => {
  assert.match(
    rules,
    /request\.resource\.data\.scope == 'PERSONAL'[\s\S]*participantExists\(centerId, request\.resource\.data\.participantId\)/
  );
  assert.match(
    rules,
    /function participantExists\(centerId, participantId\)[\s\S]*publicParticipants[\s\S]*\.data\.status == 'ACTIVE'/
  );
});

test('the common password can mint only bounded personal tokens', () => {
  assert.match(
    rules,
    /function isResidentTechnicalUser\(centerId\)[\s\S]*request\.auth\.token\.email\.lower\(\) == \('residenti\+' \+ centerId \+ '@tavola-comune\.local'\)\.lower\(\)/
  );
  assert.match(
    rules,
    /match \/linkTokens\/\{tokenId\}[\s\S]*isResidentTechnicalUser\(centerId\)[\s\S]*scope == 'PERSONAL'[\s\S]*targetType == 'PARTICIPANT'[\s\S]*duration\.value\(9001, 'd'\)/
  );
  assert.match(participantData, /getResidentTechnicalEmail\(getActiveCenterId\(\)\)/);
  assert.match(participantData, /PERSONAL_TOKEN_LIFETIME_DAYS = 9000/);
});

test('l autoiscrizione dei vice usa uno schema chiuso e non concede la gestione Messe', () => {
  const adminCreate = rules.match(/match \/admins\/\{adminUid\}[\s\S]*?match \/groups/)?.[0] || '';
  const invitationClaim = rules.match(/function invitationMembershipClaimIsValid\(centerId, adminUid\)[\s\S]*?\n    \}/)?.[0] || '';
  assert.match(adminCreate, /keys\(\)\.hasOnly\(\[/);
  assert.match(adminCreate, /invitationMembershipClaimIsValid\(centerId, adminUid\)/);
  assert.match(invitationClaim, /request\.resource\.data\.centerId == centerId/);
  assert.match(invitationClaim, /request\.resource\.data\.massPermission == \(request\.resource\.data\.role == 'ADMIN'\)/);
  assert.match(invitationClaim, /request\.resource\.data\.role == 'MANAGER'[\s\S]*viceAdminRole/);
});

test('un amministratore revocato può riaccettare soltanto con un nuovo invito valido', () => {
  const invitationClaim = rules.match(/function invitationMembershipClaimIsValid\(centerId, adminUid\)[\s\S]*?\n    \}/)?.[0] || '';
  const adminRules = rules.match(/match \/admins\/\{adminUid\}[\s\S]*?match \/groups/)?.[0] || '';
  assert.match(invitationClaim, /adminUid == request\.auth\.uid/);
  assert.match(invitationClaim, /adminInvitationClaimsRole\(/);
  assert.match(adminRules, /resource\.data\.status == 'REVOKED'[\s\S]*invitationMembershipClaimIsValid\(centerId, adminUid\)/);
  assert.match(adminRules, /'createdAt', 'updatedAt', 'revokedBy', 'revokedAt'/);
});

test('la successione mantiene sempre un responsabile e aggiorna i due ruoli insieme', () => {
  assert.match(rules, /function isCoordinatedOwnershipTransfer\(centerId\)/);
  assert.match(rules, /nextOwnerUid[\s\S]*role == 'OWNER'[\s\S]*request\.auth\.uid[\s\S]*status == 'REVOKED'/);
  assert.match(rules, /function isOwnershipRoleChange\(centerId, adminUid\)/);
  assert.match(rules, /function isOwnershipRevocation\(centerId, adminUid\)/);
  assert.match(rules, /affectedKeys\(\)\.hasOnly\(\[[\s\S]*'ownerUid'[\s\S]*'administratorName'[\s\S]*'administratorSignature'[\s\S]*'adminEmail'[\s\S]*'administratorPasswordRequired'[\s\S]*'updatedAt'[\s\S]*\]\)/);
  assert.match(rules, /!existsAfter\([\s\S]*admins\/\$\(request\.auth\.uid\)/);
  assert.match(rules, /request\.resource\.data\.status == 'REVOKED'[\s\S]*massPermission == false[\s\S]*dailyOperationsPermission == false/);
});

test('public sessions are read only for participant reservations', () => {
  const validator = rules.match(/function overrideValuesAreValid\(centerId\)[\s\S]*?\n    \}/)?.[0] || '';
  const personalSession = rules.match(/function personalOverrideSessionIsValid\(centerId, participantId\)[\s\S]*?\n    \}/)?.[0] || '';
  assert.match(validator, /personalOverrideSessionIsValid\(centerId, request\.resource\.data\.participantId\)/);
  assert.match(personalSession, /session\.scope == 'PERSONAL'/);
  assert.match(personalSession, /session\.participantId == participantId/);
  assert.match(personalSession, /token\.status == 'ACTIVE'/);
  assert.match(personalSession, /request\.time < token\.expiresAt/);
  assert.doesNotMatch(validator, /hasSessionScope\(centerId, 'PUBLIC'\)/);
});

test('participant writes and admin rule batches recheck active status at write time', () => {
  assert.match(
    rules,
    /function participantIsActive\(centerId, participantId\)[\s\S]*documents\/centers\/\$\(centerId\)\/participants\/\$\(participantId\)[\s\S]*\.data\.status == 'ACTIVE'/
  );
  assert.match(
    rules,
    /function overrideValuesAreValid\(centerId\)[\s\S]*participantIsActive\(centerId, request\.resource\.data\.participantId\)/
  );
  assert.match(
    rules,
    /match \/reservationRules\/\{ruleId\}[\s\S]*ruleStatusMatchesParticipant\(/
  );
  assert.match(rules, /function reservationRuleAllowsOverride\(centerId, ruleId, mealTypeId, mealDate\)/);
  assert.match(rules, /request\.resource\.data\.mealTypeIds == resource\.data\.mealTypeIds/);
});

test('un amministratore collega il proprio account alla Persona attiva', () => {
  assert.match(
    rules,
    /adminUid == request\.auth\.uid[\s\S]*participantIsActive\(centerId, request\.resource\.data\.participantId\)[\s\S]*'participantId', 'updatedAt'/
  );
});

test('le note cucina sono leggibili dalla cucina e gestibili dai ruoli Agenda', () => {
  assert.match(
    rules,
    /match \/kitchenNotes\/\{mealDate\}[\s\S]*hasSessionScope\(centerId, 'KITCHEN'\)[\s\S]*canManageDailyOperations\(centerId\)/
  );
  assert.match(
    rules,
    /match \/kitchenNotes\/\{mealDate\}[\s\S]*allow create, update: if canManageDailyOperations\(centerId\)[\s\S]*request\.resource\.data\.text\.size\(\) <= 1000/
  );
});

test('la messa e leggibile nelle viste operative e modificabile solo dai ruoli autorizzati', () => {
  assert.match(
    rules,
    /match \/dailyOperations\/\{dateId\}[\s\S]*hasSessionScope\(centerId, 'KITCHEN'\)[\s\S]*hasSessionScope\(centerId, 'PUBLIC'\)[\s\S]*hasSessionScope\(centerId, 'PERSONAL'\)/
  );
  assert.match(
    rules,
    /match \/dailyOperations\/\{dateId\}[\s\S]*allow create, update: if canManageMass\(centerId\)[\s\S]*massWindowIsOpen\(centerId, dateId\)[\s\S]*massScheduled is bool/
  );
  assert.match(
    rules,
    /function massWindowIsOpen\(centerId, dateId\)[\s\S]*mealWindowIsOpen\(centerId, dateId \+ '_dinner'\)/
  );
  assert.match(
    rules,
    /function canManageMass\(centerId\)[\s\S]*adminCanManageMass\(centerId\)[\s\S]*residentIsCenterAdministrator\(centerId\)[\s\S]*get\('liturgicalRole', false\) == true/
  );
  assert.match(
    rules,
    /function adminCanManageMass\(centerId\)[\s\S]*adminRole\(centerId\) in \['OWNER', 'ADMIN'\][\s\S]*massPermission/
  );
  assert.match(
    rules,
    /match \/admins\/\{adminUid\}[\s\S]*allow update: if canUpdateCenterAdministrator\(centerId\)[\s\S]*allow delete: if canDeleteCenterAdministrator\(centerId\)/
  );
});

test('responsabile amministratore e vice hanno confini di scrittura distinti', () => {
  assert.match(rules, /function isCenterOwner\(centerId\)[\s\S]*adminRole\(centerId\) == 'OWNER'/);
  assert.match(rules, /function canManageCenterConfiguration\(centerId\)[\s\S]*\['OWNER', 'ADMIN'\]/);
  assert.match(rules, /function canUpdateCenterAdministrator\(centerId\)[\s\S]*resource\.data\.get\('role', ''\) != 'OWNER'/);
  assert.match(rules, /match \/centers\/\{centerId\}[\s\S]*allow update: if canManageCenterConfiguration\(centerId\)/);
  assert.match(rules, /match \/participants\/\{participantId\}[\s\S]*allow delete: if canManageCenterConfiguration\(centerId\)/);
  assert.match(rules, /affectedKeys\(\)\.hasAny\(\['viceAdminRole', 'liturgicalRole'\]\)/);
});

test('l avatar del centro e leggibile dalle sessioni ma modificabile solo dagli amministratori principali', () => {
  assert.match(
    rules,
    /match \/assets\/\{assetId\}[\s\S]*allow read: if isAdmin\(centerId\) \|\| hasSession\(centerId\)/
  );
  assert.match(
    rules,
    /match \/assets\/\{assetId\}[\s\S]*allow create, update: if canManageAdministrativeRoles\(centerId\)[\s\S]*dataUrl\.size\(\) <= 300000/
  );
  assert.match(participantData, /'assets'/);
});

test('i contatti sono leggibili nel riepilogo solo quando il centro li condivide', () => {
  assert.match(
    rules,
    /function centerSharesParticipantContacts\(centerId\)[\s\S]*participantContactSharingEnabled == true/
  );
  assert.match(
    rules,
    /match \/participants\/\{participantId\}[\s\S]*centerSharesParticipantContacts\(centerId\)[\s\S]*hasSessionScope\(centerId, 'PUBLIC'\)/
  );
});

test('session update keeps immutable session fields unchanged', () => {
  for (const field of [
    'centerId',
    'scope',
    'targetType',
    'tokenId',
    'status',
    'expiresAt',
    'createdAt'
  ]) {
    assert.match(
      rules,
      new RegExp(`request\\.resource\\.data\\.${field} == resource\\.data\\.${field}`)
    );
  }
  assert.match(rules, /diff\(resource\.data\)\.affectedKeys\(\)\.hasOnly\(\['updatedAt'\]\)/);
  assert.doesNotMatch(rules, /diff\(resource\.data\)\.changedKeys\(\)/);
});

test('kitchen and public summary sessions can read reservation rules for counts', () => {
  assert.match(
    rules,
    /match \/reservationRules\/\{ruleId\}[\s\S]*hasSessionScope\(centerId, 'KITCHEN'\)/
  );
  assert.match(
    rules,
    /match \/reservationRules\/\{ruleId\}[\s\S]*hasSessionScope\(centerId, 'PUBLIC'\)/
  );
});

test('participant changes invalidate the kitchen rules cache', () => {
  assert.match(participantData, /participantDataUpdatedAt:\s*serverTimestamp\(\)/);
  assert.match(centerSettings, /participantDataVersion:\s*timestampVersion/);
});

test('participant overrides are queried by participant and date range', () => {
  assert.match(
    participantData,
    /where\('participantId', '==', participantId\),[\s\S]*where\('mealDate', '>=', startDateId\),[\s\S]*where\('mealDate', '<=', endDateId\)/
  );
  assert.match(
    participantData,
    /error\?\.code !== 'failed-precondition'[\s\S]*where\('participantId', '==', participantId\)[\s\S]*\.filter\(\(override\) => override\.mealDate >= startDateId && override\.mealDate <= endDateId\)/
  );
});

test('static participant calendar data uses a short cache with manual bypass', () => {
  assert.match(participantData, /STATIC_QUERY_CACHE_MS\s*=\s*10 \* 60 \* 1000/);
  assert.match(participantData, /getMealWindowsInRange\(startDateId, endDateId, options\.forceStaticRefresh\)/);
  assert.match(participantData, /if \(!forceRefresh && isFreshCacheEntry\(cached\)\)/);
});

test('summary static data is cached and invalidated by the participant version', () => {
  assert.match(participantData, /let publicParticipantsCache = null/);
  assert.match(participantData, /let summaryRulesCache = null/);
  assert.match(participantData, /canUseVersionedCache\(publicParticipantsCache, options\)/);
  assert.match(participantData, /canUseVersionedCache\(summaryRulesCache, options\)/);
  assert.match(participantData, /entry\.staticVersion === requestedVersion/);
});

test('bulk reservation saves report requested, saved, and failed counts', () => {
  assert.match(
    participantData,
    /return \{[\s\S]*requested: mealsToUpdate\.length,[\s\S]*saved: savedCount,[\s\S]*failed: failedCount/
  );
});

test('center export includes settings and kitchen notes without access credentials', () => {
  assert.match(participantData, /getDoc\(doc\(db, 'centers', getActiveCenterId\(\)\)\)/);
  assert.match(participantData, /Promise\.all\(collections\.map/);
  assert.match(participantData, /'kitchenNotes'/);
  assert.match(participantData, /'dailyOperations'/);
  assert.doesNotMatch(participantData, /const collections = \[[\s\S]*'accessSessions'/);
  assert.doesNotMatch(participantData, /const collections = \[[\s\S]*'linkTokens'/);
});

test('admin participant list keeps disabled people available for reactivation', () => {
  const adminList = participantData.match(/export async function listAdminParticipants\(\)[\s\S]*?\n\}/)?.[0] || '';
  assert.doesNotMatch(adminList, /filter\(\(participant\) => participant\.status === 'ACTIVE'\)/);
});

test('l amministratore puo eliminare una persona e i dati operativi collegati', () => {
  assert.match(participantData, /export async function deleteAdminParticipant/);
  assert.match(participantData, /\['reservationRules', 'reservationOverrides', 'accessSessions', 'linkTokens'\]/);
  assert.match(participantData, /deleteParticipantAccessCredentials\(centerId, resolvedId\)/);
  assert.match(participantData, /Promise\.all\(\['accessSessions', 'linkTokens'\]/);
  assert.match(participantData, /const \[ruleSnapshot, \.\.\.cleanupSnapshots\] = relatedSnapshots/);
  assert.match(participantData, /ruleRefs\.forEach\(\(ref\) => finalBatch\.delete\(ref\)\)/);
  assert.match(participantData, /participantDataUpdatedAt:\s*serverTimestamp\(\)/);
  assert.match(rules, /match \/reservationOverrides\/\{overrideId\}[\s\S]*allow delete: if isAdmin\(centerId\)/);
});

test('il ruolo vice comprende sempre la gestione quotidiana', () => {
  assert.match(rules, /function adminCanManageDailyOperations\(centerId\)[\s\S]*adminRole\(centerId\) in \['OWNER', 'ADMIN', 'MANAGER'\]/);
  assert.match(rules, /function canManageDailyOperations\(centerId\)[\s\S]*residentIsCenterAdministrator\(centerId\)[\s\S]*viceAdminRole/);
  assert.match(rules, /match \/dailyHealth\/\{dateId\}[\s\S]*allow create, update: if canManageDailyOperations\(centerId\)/);
  assert.match(rules, /match \/kitchenNotes\/\{mealDate\}[\s\S]*allow create, update: if canManageDailyOperations\(centerId\)/);
});

test('un account amministratore può appartenere a più centri senza duplicare l identità', () => {
  assert.match(rules, /function isBootstrapOwner\(\)[\s\S]*request\.auth\.uid == 'kWYvLr1fkKVuhZ8I8HrVivN2ra03'/);
  assert.match(rules, /request\.auth\.token\.email == 'donraimondo@parrocchiasanteugenio\.it'/);
  assert.match(rules, /function isOwnedCenterId\(centerId\)[\s\S]*centerId == 'center_' \+ request\.auth\.uid/);
  assert.match(rules, /function adminProfileTargetsActiveMembership\(adminUid\)[\s\S]*existsAfter[\s\S]*\/admins\/\$\(adminUid\)/);
  assert.match(rules, /match \/adminProfiles\/\{adminUid\}[\s\S]*adminProfileTargetsActiveMembership\(adminUid\)/);
  assert.match(rules, /isOwnedCenterId\(centerId\)[\s\S]*request\.resource\.data\.ownerUid == request\.auth\.uid/);
  assert.match(rules, /match \/centerInvitations\/\{invitationId\}/);
  assert.match(rules, /invitationClaimsCenter/);
});

test('il trasferimento collega amministratore Persona e dati del nuovo responsabile', () => {
  assert.match(rules, /request\.resource\.data\.role == 'ADMIN'[\s\S]*request\.resource\.data\.participantId == ''[\s\S]*publicParticipants/);
  assert.match(rules, /isCoordinatedOwnershipTransfer\(centerId\)[\s\S]*administratorName[\s\S]*administratorSignature[\s\S]*adminEmail/);
});

test('bootstrap extends access and calendar coverage without shortening the safety horizon', () => {
  const bootstrap = readFileSync(
    new URL('../../prototypes/firebase-spark-pwa/public/bootstrap-demo.js', import.meta.url),
    'utf8'
  );
  assert.match(bootstrap, /DEFAULT_ACCESS_EXPIRES_AT/);
  assert.match(bootstrap, /CALENDAR_COVERAGE_DAYS/);
  assert.match(bootstrap, /calendarCoveredThrough/);
  assert.match(bootstrap, /orderBy\('mealDate', 'desc'\)/);
  assert.match(bootstrap, /limit\(1\)/);
  assert.match(bootstrap, /WINDOW_BATCH_CONCURRENCY = 2/);
  assert.match(bootstrap, /Promise\.all\(plans\.map/);
  assert.doesNotMatch(bootstrap, /where\('mealDate', '>='/);
  assert.match(bootstrap, /WINDOW_BATCH_SIZE = 90/);
  assert.match(bootstrap, /cutoffs: reservationCutoffs/);
});

test('gli orari del centro riallineano il calendario senza riaprire i pasti', () => {
  const calendarConfiguration = readFileSync(
    new URL('../../prototypes/firebase-spark-pwa/public/calendar-configuration.js', import.meta.url),
    'utf8'
  );
  const index = readFileSync(
    new URL('../../prototypes/firebase-spark-pwa/public/index.html', import.meta.url),
    'utf8'
  );
  assert.match(index, /data-admin-cutoff-lunch/);
  assert.match(index, /data-admin-cutoff-dinner/);
  assert.match(index, /data-admin-cutoff-breakfast/);
  assert.match(calendarConfiguration, /transaction\.update\(doc\(db, 'centers', centerId, 'mealWindows'/);
  assert.doesNotMatch(calendarConfiguration, /status:\s*'OPEN'/);
  assert.match(calendarConfiguration, /status:\s*'ACTIVE'/);
  assert.match(calendarConfiguration, /status:\s*'COMPLETED'/);
});
