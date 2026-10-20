// Pure date/age logic. Loaded by the widget page as a plain script (sets window.AgeCalc);
// the tests run this same file in a Node vm sandbox.
// Dates are plain {y, m, d} objects (m is 1-12) to avoid timezone shifts from Date parsing.
(function (root) {
  'use strict';

  var GROUPS = { ADULT: 'ADULT', GUARDIAN: 'GUARDIAN', TOO_YOUNG: 'TOO_YOUNG' };

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function toIsoDate(date) {
    return date.y + '-' + pad(date.m) + '-' + pad(date.d);
  }

  function daysInMonth(y, m) {
    return new Date(y, m, 0).getDate();
  }

  function isValidDate(date) {
    return !!date &&
      Number.isInteger(date.y) && Number.isInteger(date.m) && Number.isInteger(date.d) &&
      date.m >= 1 && date.m <= 12 &&
      date.d >= 1 && date.d <= daysInMonth(date.y, date.m);
  }

  function today() {
    var now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
  }

  // Whole years completed on `on`. A Feb 29 birthday turns over on Mar 1 in non-leap years.
  function calculateAge(dob, on) {
    var age = on.y - dob.y;
    if (on.m < dob.m || (on.m === dob.m && on.d < dob.d)) age--;
    return age;
  }

  function ageGroup(age, minAge, adultAge) {
    if (age >= adultAge) return GROUPS.ADULT;
    if (age >= minAge) return GROUPS.GUARDIAN;
    return GROUPS.TOO_YOUNG;
  }

  // Value stored in the Jotform submission, e.g. "DOB: 1990-05-12 | Age: 36 | Group: ADULT".
  // Form conditions match on the group token with "contains".
  function formatValue(dob, age, group) {
    return 'DOB: ' + toIsoDate(dob) + ' | Age: ' + age + ' | Group: ' + group;
  }

  function parseDob(value) {
    var match = /(\d{4})-(\d{2})-(\d{2})/.exec(value || '');
    if (!match) return null;
    var date = { y: +match[1], m: +match[2], d: +match[3] };
    return isValidDate(date) ? date : null;
  }

  root.AgeCalc = {
    GROUPS: GROUPS,
    toIsoDate: toIsoDate,
    daysInMonth: daysInMonth,
    isValidDate: isValidDate,
    today: today,
    calculateAge: calculateAge,
    ageGroup: ageGroup,
    formatValue: formatValue,
    parseDob: parseDob
  };
})(this);
