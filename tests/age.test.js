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
  assert.equal(AgeCalc.ageGroup(15, 16, 18), 'GROUP_C');
  assert.equal(AgeCalc.ageGroup(16, 16, 18), 'GROUP_B');
  assert.equal(AgeCalc.ageGroup(17, 16, 18), 'GROUP_B');
  assert.equal(AgeCalc.ageGroup(18, 16, 18), 'GROUP_A');
  assert.equal(AgeCalc.ageGroup(40, 16, 18), 'GROUP_A');
});

test('default group names never contain one another (safe for "contains" conditions)', () => {
  const names = Object.values(AgeCalc.DEFAULT_GROUPS);
  for (const a of names) for (const b of names) {
    if (a !== b) assert.ok(!a.includes(b), `${a} contains ${b}`);
  }
});

test('custom group names are used when they are safe', () => {
  const names = { ...AgeCalc.groupNames({ above: 'ADULT', between: 'GUARDIAN', below: 'TOO_YOUNG' }) };
  assert.deepEqual(names, { above: 'ADULT', between: 'GUARDIAN', below: 'TOO_YOUNG' });
  assert.equal(AgeCalc.ageGroup(17, 16, 18, names), 'GUARDIAN');
  assert.deepEqual({ ...AgeCalc.groupNames({ between: 'Teen' }) }, { above: 'GROUP_A', between: 'Teen', below: 'GROUP_C' });
});

test('unsafe custom group names fall back to the defaults', () => {
  const defaults = { ...AgeCalc.DEFAULT_GROUPS };
  // bad characters, too short, digits only: just that name falls back
  assert.deepEqual({ ...AgeCalc.groupNames({ above: 'OVER 18', between: 'B', below: '1617' }) }, defaults);
  assert.equal(AgeCalc.groupNames({ above: 'A|B', below: 'KIDS' }).below, 'KIDS');
  // part of the fixed text, a name inside another, or duplicates (ignoring case): all defaults
  assert.deepEqual({ ...AgeCalc.groupNames({ above: 'AGE', between: 'MINOR', below: 'CHILD' }) }, defaults);
  assert.deepEqual({ ...AgeCalc.groupNames({ above: 'TEENS', between: 'teen', below: 'CHILD' }) }, defaults);
  assert.deepEqual({ ...AgeCalc.groupNames({ above: 'X1', between: 'X1', below: 'X2' }) }, defaults);
  assert.deepEqual({ ...AgeCalc.groupNames({ between: 'GROUP_A' }) }, defaults);
});

test('formatValue and parseDob round-trip', () => {
  const value = AgeCalc.formatValue(d(1990, 5, 2), 36, 'GROUP_A');
  assert.equal(value, 'DOB: 1990-05-02 | Age: 36 | Group: GROUP_A');
  assert.deepEqual({ ...AgeCalc.parseDob(value) }, d(1990, 5, 2));
});

test('isValidDate rejects impossible dates', () => {
  assert.equal(AgeCalc.isValidDate(d(2023, 2, 29)), false);
  assert.equal(AgeCalc.isValidDate(d(2024, 2, 29)), true);
  assert.equal(AgeCalc.isValidDate(d(2024, 4, 31)), false);
  assert.equal(AgeCalc.parseDob('2023-02-30'), null);
});
