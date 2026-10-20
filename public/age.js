// Pure date/age logic. Loaded by the widget page as a plain script (sets window.AgeCalc);
// the tests run this same file in a Node vm sandbox.
// Dates are plain {y, m, d} objects (m is 1-12) to avoid timezone shifts from Date parsing.
(function (root) {
  'use strict';

  // Group names saved in the value. above: age >= adultAge; between: minAge <= age < adultAge;
  // below: age < minAge. Each can be renamed with a widget parameter (see groupNames).
  var DEFAULT_GROUPS = { above: 'GROUP_A', between: 'GROUP_B', below: 'GROUP_C' };
  var GROUP_NAME_RE = /^[A-Za-z0-9_-]{2,30}$/;
  // The rest of the saved value: a name found in here would make "Contains" match every submission.
  var FIXED_TEXT = 'dob: | age: | group: ';

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

  function ageGroup(age, minAge, adultAge, names) {
    names = names || DEFAULT_GROUPS;
    if (age >= adultAge) return names.above;
    if (age >= minAge) return names.between;
    return names.below;
  }

  // Custom names must be safe for Jotform's "Contains": letters, digits, _ and - only, at least one
  // letter (digits alone could match the date or age), not part of the fixed text (e.g. "AGE"), and
  // no name inside another, ignoring case. A name that breaks the character rules falls back to its
  // default; if the names then clash, all three defaults are used.
  function groupNames(custom) {
    var names = {};
    Object.keys(DEFAULT_GROUPS).forEach(function (k) {
      var n = String((custom && custom[k]) || '').trim();
      names[k] = GROUP_NAME_RE.test(n) && /[A-Za-z]/.test(n) ? n : DEFAULT_GROUPS[k];
    });
    var lower = Object.keys(names).map(function (k) { return names[k].toLowerCase(); });
    var clash = lower.some(function (a, i) {
      return FIXED_TEXT.indexOf(a) !== -1 || lower.some(function (b, j) { return i !== j && b.indexOf(a) !== -1; });
    });
    return clash ? Object.assign({}, DEFAULT_GROUPS) : names;
  }

  // Value stored in the Jotform submission, e.g. "DOB: 1990-05-12 | Age: 36 | Group: GROUP_A".
  // Form conditions match on the group name with "Contains".
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
    DEFAULT_GROUPS: DEFAULT_GROUPS,
    groupNames: groupNames,
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
