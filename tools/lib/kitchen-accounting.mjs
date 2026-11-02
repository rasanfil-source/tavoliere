const MEAL_TYPE_IDS = ['breakfast', 'lunch', 'dinner'];

// Contabilità delle prenotazioni registrate per una giornata chiusa.
// Le regole correnti abilitano le prenotazioni operative, ma non sono uno
// storico: una sospensione successiva non annulla un override già registrato.
export function countKitchenMeals({ overrides = [], dailyHealth = {}, dateId }) {
  const sickIds = new Set((Array.isArray(dailyHealth.sickPeople) ? dailyHealth.sickPeople : [])
    .map(person => String(person?.participantId || '').trim())
    .filter(Boolean));
  const invitedMeals = dailyHealth.invitedMeals || {};
  const invitedCounts = {};
  const counts = {};

  for (const mealTypeId of MEAL_TYPE_IDS) {
    const overrideByParticipant = new Map(overrides
      .filter(override => override.mealDate === dateId
        && override.mealTypeId === mealTypeId
        && typeof override.participantId === 'string' && override.participantId)
      .map(override => [override.participantId, override]));
    let presentCount = 0;
    for (const [participantId, override] of overrideByParticipant) {
      if (override.effect === 'PRESENT' && !sickIds.has(participantId)) presentCount += 1;
    }

    const invitedCount = Math.min(999, Math.max(0, Math.floor(Number(invitedMeals[mealTypeId]) || 0)));
    invitedCounts[mealTypeId] = invitedCount;
    counts[mealTypeId] = presentCount + invitedCount;
  }

  return { counts, invitedCounts };
}
