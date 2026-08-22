import { roleLabel } from '../role-policy.mjs?v=20260822a';

export function buildAdminOverview({
  role,
  participants = [],
  invitations = [],
  coverage = null,
  operationalLinks = null,
  canViewOperationalLinks = false,
  canManageCalendar = false,
  hasCollaborator = false,
  now = new Date()
} = {}) {
  const activePeople = participants.filter((participant) => participant.status === 'ACTIVE').length;
  const suspendedPeople = participants.length - activePeople;
  const activeInvitations = invitations.filter((invitation) => isActiveInvitation(invitation, now)).length;
  const checklist = buildChecklist({
    activePeople,
    coverage,
    canViewOperationalLinks,
    operationalLinks: canViewOperationalLinks ? operationalLinks : null,
    hasCollaborator
  });

  return {
    roleLabel: roleLabel(role),
    activePeople,
    suspendedPeople,
    activeInvitations,
    calendar: calendarSummary(coverage),
    checklist,
    linksKey: canViewOperationalLinks
      ? 'admin.overview.links.available'
      : 'admin.overview.links.ownerManaged'
  };
}

function buildChecklist({ activePeople, coverage, canViewOperationalLinks, operationalLinks, hasCollaborator }) {
  const items = [
    {
      id: 'people',
      labelKey: 'admin.overview.checklist.people',
      target: 'admin-person-editor',
      done: activePeople > 0,
      required: true
    }
  ];

  items.push({
    id: 'calendar',
    labelKey: 'admin.overview.checklist.calendar',
    target: 'admin-configuration-section',
    done: hasUsableCalendar(coverage),
    required: true
  });

  if (canViewOperationalLinks) {
    items.push(
      {
        id: 'publicLink',
        labelKey: 'admin.overview.checklist.publicLink',
        target: 'admin-overview-section',
        done: hasActiveToken(operationalLinks?.publicTokenId, operationalLinks?.publicStatus),
        required: true
      },
      {
        id: 'kitchenLink',
        labelKey: 'admin.overview.checklist.kitchenLink',
        target: 'admin-overview-section',
        done: hasActiveToken(operationalLinks?.kitchenTokenId, operationalLinks?.kitchenStatus),
        required: true
      }
    );
  }

  if (!hasCollaborator) {
    items.push({
      id: 'collaborator',
      labelKey: 'admin.overview.checklist.collaborator',
      target: 'admin-person-editor',
      done: false,
      required: false
    });
  }

  return {
    items,
    complete: items.filter((item) => item.required).every((item) => item.done)
  };
}

function hasActiveToken(tokenId, status) {
  return typeof tokenId === 'string' && tokenId.length > 0 && status === 'ACTIVE';
}

function hasUsableCalendar(coverage) {
  return Boolean(coverage?.through) && Number(coverage?.remainingDays || 0) >= 7;
}

function isActiveInvitation(invitation, now) {
  if (invitation?.status !== 'ACTIVE') return false;
  const expiresAt = toDate(invitation.expiresAt);
  return expiresAt !== null && expiresAt.getTime() > now.getTime();
}

function calendarSummary(coverage) {
  if (!coverage?.through) {
    return { labelKey: 'admin.overview.calendar.prepare', needsAttention: true };
  }
  if (Number(coverage.remainingDays || 0) < 45) {
    return { labelKey: 'admin.overview.calendar.extend', needsAttention: true };
  }
  const date = new Date(`${coverage.through}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return { labelKey: 'admin.overview.calendar.verify', needsAttention: true };
  }
  return {
    labelKey: 'admin.overview.calendar.until',
    through: coverage.through,
    needsAttention: false
  };
}

function toDate(value) {
  if (typeof value?.toDate === 'function') return value.toDate();
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? null : date;
}
