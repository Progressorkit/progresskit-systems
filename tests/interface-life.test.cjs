const test = require('node:test');
const assert = require('node:assert/strict');
const { motionQuality, motionPaused } = require('../assets/interface-life.js');

test('decorative quality respects narrow viewport, data saving and small device budgets', () => {
  assert.equal(motionQuality({}), 'full');
  assert.equal(motionQuality({ cores: 8, memory: 8 }), 'full');
  for (const input of [{ narrow: true }, { saveData: true }, { cores: 4 }, { cores: 1 }, { memory: 4 }, { memory: 2 }]) {
    assert.equal(motionQuality(input), 'compact');
  }
  assert.equal(motionQuality({ cores: 0, memory: 0 }), 'full');
});

test('user controls, accessibility and page lifecycle each stop decorative motion', () => {
  assert.equal(motionPaused({}), false);
  for (const input of [{ userPaused: true }, { scenePaused: true }, { reduced: true }, { hidden: true }]) {
    assert.equal(motionPaused(input), true);
  }
  assert.equal(motionPaused({ userPaused: false, scenePaused: false, reduced: false, hidden: false }), false);
});
