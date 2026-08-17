const BREAKFAST_MEAL_TYPE_ID = "breakfast";
const STANDARD_DIET_TAG = "STANDARD";

export function buildSummaryMatrixScreens(
  days,
  participants = [],
  operationDays = [],
) {
  return buildMatrixScreens(days, participants, operationDays, true);
}

export function buildKitchenMatrixScreens(days, operationDays = []) {
  return buildMatrixScreens(days, [], operationDays, false);
}

function buildMatrixScreens(days, participants, operationDays, includeNames) {
  const normalizedDays = Array.isArray(days) ? days : [];
  const normalizedOperations = Array.isArray(operationDays)
    ? operationDays
    : [];
  const operationByDate = new Map(
    normalizedOperations.map((day) => [day.dateId, day]),
  );
  const participantDirectory = buildParticipantDirectory(
    normalizedDays,
    participants,
  );
  const mealOrder = getMealOrder(normalizedDays);
  const breakfastIndex = mealOrder.findIndex(
    (meal) => meal.mealTypeId === BREAKFAST_MEAL_TYPE_ID,
  );
  const sameDayMeals =
    breakfastIndex >= 0 ? mealOrder.slice(breakfastIndex + 1) : mealOrder;
  const followingMorningMeals =
    breakfastIndex >= 0 ? mealOrder.slice(0, breakfastIndex + 1) : [];
  return [0, 1].map((screenIndex) => {
    const columns = [
      ...sameDayMeals.map((meal) =>
        buildColumn(
          normalizedDays,
          screenIndex,
          meal,
          operationByDate,
          participantDirectory,
          includeNames,
        ),
      ),
      ...followingMorningMeals.map((meal) =>
        buildColumn(
          normalizedDays,
          screenIndex + 1,
          meal,
          operationByDate,
          participantDirectory,
          includeNames,
        ),
      ),
    ].filter(Boolean);
    const dateGroups = groupColumnsByDate(columns);

    return {
      index: screenIndex,
      dateId:
        normalizedDays[screenIndex]?.dateId || columns[0]?.dateId || "",
      labelKey: screenIndex === 0 ? "summary.today" : "summary.tomorrow",
      label: screenIndex === 0 ? "Oggi" : "Domani",
      columns,
      dateGroups,
      hasGuestGroup: columns.some((column) => column.guestCount > 0),
      hasSpecialDiets: columns.some(
        (column) => column.specialDiets.participantCount > 0,
      ),
      hasSickMeals: columns.some((column) => column.sickCount > 0),
      hasSickDiets: columns.some((column) => column.sickDiets.length > 0),
      hasMassInformation: dateGroups.length > 0,
      notesByDate: dateGroups
        .map((group) => ({
          dateId: group.dateId,
          notes: normalizeNotes(operationByDate.get(group.dateId)),
        }))
        .filter((group) => group.notes.length > 0),
    };
  });
}

function getMealOrder(days) {
  const firstDayWithMeals = days.find(
    (day) => Array.isArray(day.meals) && day.meals.length > 0,
  );
  return firstDayWithMeals
    ? firstDayWithMeals.meals.map((meal) => ({
        mealTypeId: meal.mealTypeId,
        label: meal.label,
      }))
    : [];
}

function buildParticipantDirectory(days, participants) {
  const directory = new Map();
  const remember = (participant) => {
    if (participant?.participantId) {
      directory.set(participant.participantId, {
        ...directory.get(participant.participantId),
        ...participant,
      });
    }
  };

  (Array.isArray(participants) ? participants : []).forEach(remember);
  days.forEach((day) =>
    day.meals?.forEach((meal) => {
      (Array.isArray(meal.present) ? meal.present : []).forEach(remember);
      (Array.isArray(meal.absent) ? meal.absent : []).forEach(remember);
      (Array.isArray(meal.dietParticipants)
        ? meal.dietParticipants
        : []
      ).forEach(remember);
    }),
  );
  return directory;
}

function buildColumn(
  days,
  dayIndex,
  mealDefinition,
  operationByDate,
  participantDirectory,
  includeNames,
) {
  const day = days[dayIndex];
  if (!day) {
    return null;
  }

  const meal = day.meals?.find(
    (item) => item.mealTypeId === mealDefinition.mealTypeId,
  ) || {
    mealTypeId: mealDefinition.mealTypeId,
    label: mealDefinition.label,
    present: [],
  };
  const operationDay = operationByDate.get(day.dateId) || {};
  const sourceParticipants = Array.isArray(meal.present)
    ? meal.present
    : Array.isArray(meal.dietParticipants)
      ? meal.dietParticipants
      : [];
  const present = applyOccasionalDiets(
    sourceParticipants,
    getDietAssignments(operationDay),
    meal.mealTypeId,
  );
  const sickPeople = getSickPeople(operationDay);
  const sickIds = new Set(
    sickPeople.map((participant) => participant.participantId),
  );
  const diningParticipants = present.filter(
    (participant) => !sickIds.has(participant.participantId),
  );
  const sickMeal = findSickMeal(
    operationDay,
    meal.mealTypeId,
    participantDirectory,
    present,
  );
  const configuredTotal = Math.max(0, Math.floor(Number(meal.count) || 0));
  const diningTotal = Array.isArray(meal.present)
    ? diningParticipants.length
    : Math.max(0, configuredTotal - sickMeal.count);
  const invitedCount = getInvitedMealCount(operationDay, meal.mealTypeId);

  return {
    dayIndex,
    dateId: day.dateId,
    mealTypeId: meal.mealTypeId,
    label: meal.label,
    total: diningTotal + invitedCount,
    guestCount: invitedCount,
    specialDiets: summarizeSpecialDiets(diningParticipants),
    sickCount: sickMeal.count,
    sickDiets: sickMeal.diets,
    massStatus: getMassStatus(operationDay.dailyOperation, meal.mealTypeId),
    dayMassStatus: getDayMassStatus(operationDay.dailyOperation),
    breakfastPlanned:
      meal.mealTypeId === BREAKFAST_MEAL_TYPE_ID &&
      diningTotal + invitedCount + sickMeal.count > 0,
    names: includeNames
      ? diningParticipants.map((participant) => ({
          displayName: participant.displayName,
          dietTags: getSpecialDietTags(participant),
          phone: participant.phone || "",
          phoneConsent: participant.phoneConsent === true,
          whatsappEnabled: participant.whatsappEnabled === true,
        }))
      : [],
  };
}

function applyOccasionalDiets(participants, assignments, mealTypeId) {
  const assignmentByParticipant = new Map();
  (Array.isArray(assignments) ? assignments : []).forEach((assignment) => {
    const mealTypeIds = Array.isArray(assignment.mealTypeIds)
      ? assignment.mealTypeIds
      : [];
    if (
      assignment.status === "REMOVED" ||
      (mealTypeIds.length > 0 && !mealTypeIds.includes(mealTypeId))
    ) {
      return;
    }
    const label = String(
      assignment.dietLabel || assignment.dietTag || "",
    ).trim();
    if (!assignment.participantId || !label) {
      return;
    }
    const labels = assignmentByParticipant.get(assignment.participantId) || [];
    labels.push(label);
    assignmentByParticipant.set(assignment.participantId, labels);
  });

  return participants.map((participant) => ({
    ...participant,
    dietTags: [
      ...new Set([
        ...(Array.isArray(participant.dietTags) ? participant.dietTags : []),
        ...(assignmentByParticipant.get(participant.participantId) || []),
      ]),
    ],
  }));
}

function summarizeSpecialDiets(participants) {
  const counts = new Map();
  let participantCount = 0;

  participants.forEach((participant) => {
    const tags = getSpecialDietTags(participant);
    if (tags.length === 0) {
      return;
    }

    participantCount += 1;
    tags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
  });

  return {
    participantCount,
    items: [...counts.entries()].map(([tag, count]) => ({ tag, count })),
  };
}

function getSpecialDietTags(participant) {
  const tags = Array.isArray(participant.dietTags) ? participant.dietTags : [];
  return [
    ...new Set(
      tags
        .map((tag) => String(tag || "").trim())
        .filter((tag) => tag && tag.toUpperCase() !== STANDARD_DIET_TAG),
    ),
  ];
}

function findSickMeal(
  operationDay,
  mealTypeId,
  participantDirectory,
  mealParticipants,
) {
  const dailyHealth = operationDay?.dailyHealth || operationDay;
  const meals = Array.isArray(dailyHealth?.sickMeals)
    ? dailyHealth.sickMeals
    : [];
  const item = meals.find((meal) => meal.mealTypeId === mealTypeId);
  if (item) {
    const dietLabels = Array.isArray(item.dietLabels) ? item.dietLabels : [];
    return {
      count: Math.max(0, Math.floor(Number(item.count) || 0)),
      diets: summarizeDietLabels(dietLabels),
    };
  }

  const assignments = getDietAssignments(operationDay);
  const assignmentByParticipant = new Map(
    assignments.map((assignment) => [
      assignment.participantId,
      String(assignment.dietLabel || assignment.dietTag || "").trim(),
    ]),
  );
  const mealDirectory = new Map(
    (Array.isArray(mealParticipants) ? mealParticipants : []).map(
      (participant) => [participant.participantId, participant],
    ),
  );
  const sickPeople = getSickPeople(operationDay);
  const dietLabels = [];
  sickPeople.forEach((sickPerson) => {
    const participant =
      mealDirectory.get(sickPerson.participantId) ||
      participantDirectory.get(sickPerson.participantId) ||
      sickPerson;
    const participantDiets = new Set(getSpecialDietTags(participant));
    const occasionalDiet = assignmentByParticipant.get(
      sickPerson.participantId,
    );
    if (occasionalDiet && occasionalDiet.toUpperCase() !== STANDARD_DIET_TAG) {
      participantDiets.add(occasionalDiet);
    }
    participantDiets.forEach((tag) => dietLabels.push(tag));
  });
  return {
    count: sickPeople.length,
    diets: summarizeDietLabels(dietLabels),
  };
}

function summarizeDietLabels(labels) {
  const counts = new Map();
  (Array.isArray(labels) ? labels : []).forEach((label) => {
    const tag = String(label || "").trim();
    if (!tag || tag.toUpperCase() === STANDARD_DIET_TAG) return;
    counts.set(tag, (counts.get(tag) || 0) + 1);
  });
  return [...counts.entries()].map(([tag, count]) => ({ tag, count }));
}

function getMassStatus(dailyOperation, mealTypeId) {
  const normalizedOperation = dailyOperation?.dailyOperation || dailyOperation;
  const value = normalizedOperation?.massByMeal?.[mealTypeId];
  if (value === "YES" || value === "NO") {
    return value;
  }
  if (
    normalizedOperation &&
    typeof normalizedOperation.massScheduled === "boolean"
  ) {
    return normalizedOperation.massScheduled ? "YES" : "NO";
  }
  return "UNKNOWN";
}

function getDayMassStatus(dailyOperation) {
  const normalizedOperation = dailyOperation?.dailyOperation || dailyOperation;
  const mealValues = Object.entries(normalizedOperation?.massByMeal || {})
    .filter(([mealTypeId]) => mealTypeId !== BREAKFAST_MEAL_TYPE_ID)
    .map(([, value]) => value);
  if (mealValues.includes("YES")) return "YES";
  if (mealValues.includes("NO")) return "NO";
  if (
    normalizedOperation &&
    typeof normalizedOperation.massScheduled === "boolean"
  ) {
    return normalizedOperation.massScheduled ? "YES" : "NO";
  }
  return "UNKNOWN";
}

function getSickPeople(operationDay) {
  const dailyHealth = operationDay?.dailyHealth || operationDay;
  return Array.isArray(dailyHealth?.sickPeople) ? dailyHealth.sickPeople : [];
}

function getDietAssignments(operationDay) {
  const dailyHealth = operationDay?.dailyHealth || operationDay;
  return Array.isArray(operationDay?.occasionalDiets)
    ? operationDay.occasionalDiets
    : Array.isArray(dailyHealth?.dietAssignments)
      ? dailyHealth.dietAssignments
      : [];
}

function getInvitedMealCount(operationDay, mealTypeId) {
  const dailyHealth = operationDay?.dailyHealth || operationDay;
  return Math.min(
    999,
    Math.max(0, Math.floor(Number(dailyHealth?.invitedMeals?.[mealTypeId]) || 0)),
  );
}

function normalizeNotes(operationDay) {
  const notes = Array.isArray(operationDay?.notes)
    ? operationDay.notes
    : operationDay?.note
      ? [operationDay.note]
      : [];
  return notes.filter((note) => note && note.status !== "REMOVED" && note.text);
}

function groupColumnsByDate(columns) {
  return columns.reduce((groups, column) => {
    const previous = groups[groups.length - 1];
    if (previous && previous.dateId === column.dateId) {
      previous.span += 1;
      return groups;
    }

    groups.push({
      dayIndex: column.dayIndex,
      dateId: column.dateId,
      span: 1,
    });
    return groups;
  }, []);
}
