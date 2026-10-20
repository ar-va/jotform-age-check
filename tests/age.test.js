// Run from the project root with: npm test
// public/age.js is a plain browser script, so it runs here in a vm sandbox, exactly as the browser loads it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const sandbox = {};
vm.runInNewContext(readFileSync(new URL('../public/age.js', import.meta.url), 'utf8'), sandbox);
const { AgeCalc } = sandbox;

const d = (y, m, day) => ({ y, m, d: day });

test('age turns over exactly on the birthday', () => {
  const dob = d(2008, 10, 19);
  assert.equal(AgeCalc.calculateAge(dob, d(2026, 10, 18)), 17);
  assert.equal(AgeCalc.calculateAge(dob, d(2026, 10, 19)), 18);
  assert.equal(AgeCalc.calculateAge(dob, d(2026, 10, 20)), 18);
});

test('earlier month in the year is not yet a birthday', () => {
  assert.equal(AgeCalc.calculateAge(d(2000, 12, 1), d(2026, 1, 15)), 25);
});

test('Feb 29 birthday turns over on Mar 1 in non-leap years', () => {
  const dob = d(2008, 2, 29);
  assert.equal(AgeCalc.calculateAge(dob, d(2026, 2, 28)), 17);
  assert.equal(AgeCalc.calculateAge(dob, d(2026, 3, 1)), 18);
  assert.equal(AgeCalc.calculateAge(dob, d(2028, 2, 29)), 20);
});

test('age groups use 16 and 18 as inclusive lower bounds', () => {
  assert.equal(AgeCalc.ageGroup(15, 16, 18), 'TOO_YOUNG');
  assert.equal(AgeCalc.ageGroup(16, 16, 18), 'GUARDIAN');
  assert.equal(AgeCalc.ageGroup(17, 16, 18), 'GUARDIAN');
  assert.equal(AgeCalc.ageGroup(18, 16, 18), 'ADULT');
  assert.equal(AgeCalc.ageGroup(40, 16, 18), 'ADULT');
});

test('group tokens never contain one another (safe for "contains" conditions)', () => {
  const tokens = Object.values(AgeCalc.GROUPS);
  for (const a of tokens) for (const b of tokens) {
    if (a !== b) assert.ok(!a.includes(b), `${a} contains ${b}`);
  }
});

test('formatValue and parseDob round-trip', () => {
  const value = AgeCalc.formatValue(d(1990, 5, 2), 36, 'ADULT');
  assert.equal(value, 'DOB: 1990-05-02 | Age: 36 | Group: ADULT');
  assert.deepEqual({ ...AgeCalc.parseDob(value) }, d(1990, 5, 2));
});

test('isValidDate rejects impossible dates', () => {
  assert.equal(AgeCalc.isValidDate(d(2023, 2, 29)), false);
  assert.equal(AgeCalc.isValidDate(d(2024, 2, 29)), true);
  assert.equal(AgeCalc.isValidDate(d(2024, 4, 31)), false);
  assert.equal(AgeCalc.parseDob('2023-02-30'), null);
});
