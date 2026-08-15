export const PRESENT = 'PRESENT';
export const ABSENT = 'ABSENT';

import { normalizeDietTags } from './diet-utils.mjs?v=20260815q';

const VALID_EFFECTS = new Set([PRESENT, ABSENT]);

export function ruleApplies(rule, participantId, mealTypeId, mealDate) {
  return Boolean(rule)
    && rule.status === 'ACTIVE'
    && rule.participantId === participantId
    && Array.isArray(rule.mealTypeIds)
    && rule.mealTypeIds.includes(mealTypeId)
    && (!rule.startsOn || rule.startsOn <= mealDate)
    && (!rule.endsOn || rule.endsOn >= mealDate);
}

export function findApplicableRule(rules, participantId, mealTypeId, mealDate) {
  return (Array.isArray(rules) ? rules : []).find((rule) => (
    ruleApplies(rule, participantId, mealTypeId, mealDate)
  )) || null;
}

export function resolveEffectiveDietTags(rule, override) {
  if (Array.isArray(rule?.dietTags) && rule.dietTags.length > 0) {
    return normalizeDietTags(rule.dietTags);
  }
  if (Array.isArray(override?.dietTags) && override.dietTags.length > 0) {
    return normalizeDietTags(override.dietTags);
  }
  return ['STANDARD'];
}

export function resolveEffectiveEffect({
  participantId,
  mealTypeId,
  mealDate,
  rules,
  override
}) {
  const rule = findApplicableRule(rules, participantId, mealTypeId, mealDate);
  if (!rule) {
    return ABSENT;
  }

  if (VALID_EFFECTS.has(override?.effect)) {
    return override.effect;
  }

  return ABSENT;
}
