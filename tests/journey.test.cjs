const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createJourney,
  updateJourney
} = require('../src/journey.js');
const { getJourneyOptions } = require('../src/chapters.js');

test('distance before the first milestone keeps the first stage active', () => {
  const journey = createJourney(getJourneyOptions());

  assert.deepEqual(updateJourney(journey, 11), {
    currentStage: 1,
    totalStages: 3,
    rowsPerStage: 12,
    event: null
  });
});

test('the first two milestones advance stages without resetting run state', () => {
  const journey = createJourney(getJourneyOptions());
  const runState = { score: 180, timeLeft: 21, bombs: 3 };

  const secondStage = updateJourney(journey, 12);
  const thirdStage = updateJourney(secondStage, 24);

  assert.equal(secondStage.currentStage, 2);
  assert.equal(secondStage.event, 'STAGE_ADVANCED');
  assert.equal(thirdStage.currentStage, 3);
  assert.equal(thirdStage.event, 'STAGE_ADVANCED');
  assert.deepEqual(runState, { score: 180, timeLeft: 21, bombs: 3 });
});

test('the final milestone completes the journey only at row 36', () => {
  const secondStage = updateJourney(createJourney(getJourneyOptions()), 12);
  const thirdStage = updateJourney(secondStage, 24);

  assert.equal(updateJourney(thirdStage, 35).event, null);
  assert.deepEqual(updateJourney(thirdStage, 36), {
    currentStage: 3,
    totalStages: 3,
    rowsPerStage: 12,
    event: 'JOURNEY_COMPLETED'
  });
});
