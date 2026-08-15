export function sameOverrideKey(row, input) {
  return row.participantId === input.participantId &&
    row.mealDate === input.mealDate &&
    row.mealTypeId === input.mealTypeId;
}

export function applyOverrideAppendOnly(rows, input, options = {}) {
  const now = options.now || new Date().toISOString();
  const overrideId = options.overrideId || `ovr_${rows.length + 1}`;
  const previousRequest = rows.find((row) => row.requestId && row.requestId === input.requestId);

  if (previousRequest) {
    return {
      rows,
      idempotent: true,
      override: previousRequest
    };
  }

  const newRow = {
    overrideId,
    centerId: input.centerId,
    groupId: input.groupId,
    participantId: input.participantId,
    mealDate: input.mealDate,
    mealTypeId: input.mealTypeId,
    effect: input.effect,
    lifecycleStatus: 'CURRENT',
    source: input.source || 'TEST',
    requestId: input.requestId,
    createdByType: input.createdByType || 'TOKEN',
    createdByRef: input.createdByRef || 'test',
    createdAt: now,
    updatedAt: now,
    supersededAt: '',
    supersededByOverrideId: ''
  };

  const nextRows = rows.map((row) => {
    if (sameOverrideKey(row, input) && row.lifecycleStatus === 'CURRENT') {
      return {
        ...row,
        lifecycleStatus: 'SUPERSEDED',
        updatedAt: now,
        supersededAt: now,
        supersededByOverrideId: overrideId
      };
    }
    return row;
  });

  nextRows.push(newRow);

  return {
    rows: nextRows,
    idempotent: false,
    override: newRow
  };
}

export function chooseCurrentOverride(rows, key) {
  const matches = rows
    .filter((row) => sameOverrideKey(row, key) && row.lifecycleStatus === 'CURRENT')
    .sort((left, right) => {
      const byUpdatedAt = String(right.updatedAt || '').localeCompare(String(left.updatedAt || ''));
      if (byUpdatedAt !== 0) return byUpdatedAt;
      return String(right.overrideId || '').localeCompare(String(left.overrideId || ''));
    });

  return {
    override: matches[0] || null,
    duplicateCount: Math.max(0, matches.length - 1),
    needsRepair: matches.length > 1
  };
}

export function resolveEffectivePresence({ rules, ruleMeals, overrides, participantId, mealDate, mealTypeId }) {
  const key = { participantId, mealDate, mealTypeId };
  const current = chooseCurrentOverride(overrides, key);

  if (current.override) {
    return {
      present: current.override.effect === 'PRESENT',
      source: 'OVERRIDE',
      needsRepair: current.needsRepair
    };
  }

  const coveredByActiveRule = rules.some((rule) => {
    if (rule.participantId !== participantId || rule.status !== 'ACTIVE') return false;
    if (!dateInRange(mealDate, rule.startsOn, rule.endsOn)) return false;
    if (!weekdayAllowed(mealDate, rule.weekdaysMask)) return false;
    return ruleMeals.some((meal) => {
      return meal.reservationRuleId === rule.reservationRuleId &&
        meal.mealTypeId === mealTypeId &&
        meal.status === 'ACTIVE';
    });
  });

  return {
    present: coveredByActiveRule,
    source: coveredByActiveRule ? 'RULE' : 'NONE',
    needsRepair: false
  };
}

export function dateInRange(mealDate, startsOn, endsOn) {
  return mealDate >= startsOn && (!endsOn || mealDate <= endsOn);
}

export function weekdayAllowed(mealDate, weekdaysMask) {
  if (weekdaysMask === undefined || weekdaysMask === null || weekdaysMask === '') {
    return true;
  }

  const day = new Date(`${mealDate}T00:00:00Z`).getUTCDay();
  const mondayBasedIndex = day === 0 ? 6 : day - 1;
  return (Number(weekdaysMask) & (1 << mondayBasedIndex)) !== 0;
}
