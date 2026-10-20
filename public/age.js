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
      names[k] = isGroupName(n) ? n : DEFAULT_GROUPS[k];
    });
    return namesClash(Object.keys(names).map(function (k) { return names[k]; }))
      ? Object.assign({}, DEFAULT_GROUPS) : names;
  }

  function isGroupName(n) {
    return GROUP_NAME_RE.test(n) && /[A-Za-z]/.test(n);
  }

  // True if any name (ignoring case) is part of the fixed text or of another name in the list.
  function namesClash(names) {
    var lower = names.map(function (n) { return n.toLowerCase(); });
    return lower.some(function (a, i) {
      return FIXED_TEXT.indexOf(a) !== -1 || lower.some(function (b, j) { return i !== j && b.indexOf(a) !== -1; });
    });
  }

  /* ---------- Any number of groups (the ageGroups parameter) ---------- */

  // Saved for an age that no line covers (a gap between the ranges).
  var NO_GROUP = 'NO_GROUP';
  var MAX_GROUPS = 20;
  var LINE_RE = /^([A-Za-z0-9_-]+)\s*[=:]\s*(\d{1,3})\s*(?:(\+)|-\s*(\d{1,3}))?$/;

  // One group per line, "NAME = RANGE" (":" also works). RANGE is "18+", "16-17" or a single age "16".
  // Lines can also be separated with ";" or ",". The same name may appear on several lines.
  // Returns { groups: [{ name, from, to }] } (empty when the text is blank) or { error: "reason" };
  // on error the widget ignores the whole setting rather than guess.
  function parseAgeGroups(text) {
    // Jotform may pass the textarea with its line breaks, as HTML (<br>, <p>) or joined with spaces,
    // so HTML becomes line breaks and every "NAME =" starts a new line.
    var normalised = String(text || '')
      .replace(/<[^>]*>/g, '\n')
      .replace(/&nbsp;/gi, ' ')
      .replace(/([A-Za-z0-9_-]+\s*[=:])/g, '\n$1');
    var lines = normalised.split(/[\r\n;,]+/).map(function (l) { return l.trim(); }).filter(Boolean);
    if (lines.length > MAX_GROUPS) return { error: 'more than ' + MAX_GROUPS + ' lines' };
    var groups = [];
    for (var i = 0; i < lines.length; i++) {
      var m = LINE_RE.exec(lines[i]);
      if (!m) return { error: 'can’t read "' + lines[i] + '" (write it like ADULT = 18+ or TEEN = 13-17)' };
      var from = +m[2], to = m[3] ? Infinity : m[4] != null ? +m[4] : from;
      if (!isGroupName(m[1])) return { error: '"' + m[1] + '" isn’t a valid name (2–30 letters, numbers, _ or -, with a letter)' };
      if (from > to) return { error: 'in "' + lines[i] + '" the first age is bigger than the second' };
      var overlap = groups.filter(function (g) { return from <= g.to && g.from <= to; })[0];
      if (overlap) return { error: '"' + lines[i] + '" overlaps with ' + overlap.name };
      groups.push({ name: m[1], from: from, to: to });
    }
    var unique = groups.map(function (g) { return g.name; })
      .filter(function (n, i, all) { return all.indexOf(n) === i; });
    if (groups.length && namesClash(unique.concat(NO_GROUP))) {
      return { error: 'a name is part of another name, of ' + NO_GROUP + ', or of the words DOB, Age, Group' };
    }
    return { groups: groups };
  }

  function groupFor(age, groups) {
    for (var i = 0; i < groups.length; i++) {
      if (age >= groups[i].from && age <= groups[i].to) return groups[i].name;
    }
    return NO_GROUP;
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
    NO_GROUP: NO_GROUP,
    parseAgeGroups: parseAgeGroups,
    groupFor: groupFor,
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
