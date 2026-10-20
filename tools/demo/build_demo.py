# Builds demo.html: the real widget (public/index.html + age.js) inside a mock Jotform form,
# with a fake Jotform API, a fixed "today" (2026-10-19) and a scripted pointer.
# Usage: python3 build_demo.py <project dir> <out dir>
import pathlib
import sys

project, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
html = (project / 'public/index.html').read_text()
(out / 'age.js').write_text((project / 'public/age.js').read_text())


def swap(old, new):
    global html
    assert html.count(old) == 1, old
    html = html.replace(old, new)


# Fixed clock + fake Jotform API. sendData drives the mock form's "conditions".
swap('<script src="https://js.jotform.com/JotFormCustomWidget.min.js"></script>', """<script>
(function () {
  var RealDate = Date, FIXED = new RealDate(2026, 9, 19, 12).getTime();
  window.Date = class extends RealDate {
    constructor(...a) { if (a.length) super(...a); else super(FIXED); }
    static now() { return FIXED; }
  };
})();
window.JFCustomWidget = { h: {}, subscribe: function (e, f) { this.h[e] = f; },
  sendData: function (d) { window.onWidgetValue && window.onWidgetValue(d.value); },
  sendSubmit: function () {}, requestFrameResize: function () {}, getWidgetSettings: function () { return {}; } };
</script>""")
# Run as if inside Jotform even though this page isn't framed.
swap("var standalone = window.parent === window;", "var standalone = false;")

swap('<div class="wrap">', """<div class="card">
<h1>Tattoo consent form</h1>
<label class="q">Date of birth <span>*</span></label>
<div class="wrap">""")

swap("""  <div id="debug" class="debug" hidden></div>
</div>
""", """  <div id="debug" class="debug" hidden></div>
</div>
<div class="section" id="sec-c"><div class="notice">Sorry, you must be at least 16 to get tattooed, even with a parent or guardian's approval.</div></div>
<div class="section" id="sec-b">
  <label class="q">Parent or guardian full name <span>*</span></label><div class="input">First and last name</div>
  <label class="q">Parent or guardian phone number <span>*</span></label><div class="input">(000) 000-0000</div>
  <label class="q">Parent or guardian photo ID <span>*</span></label><div class="upload">Browse files or drag them here</div>
</div>
<div class="section" id="sec-a">
  <label class="q">Photo ID <span>*</span></label><div class="upload">Browse files or drag them here</div>
</div>
<div class="submit" id="submit">Submit</div>
</div>
<div class="saved"><b>Saved:</b> <span id="saved">(nothing yet)</span></div>
<svg id="pointer" viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l15 10.5-6.6 1.3 3.9 7.3-2.7 1.4-3.9-7.3L4 20z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>
""")

swap('<style id="custom-css"></style>', """<style id="custom-css"></style>
<style>
  html, body { background: #f3f3fe; }
  body { padding: 20px 24px; }
  .card { background: #fff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,.06); padding: 26px 32px 28px; }
  h1 { margin: 0 0 20px; font-size: 22px; font-weight: 600; }
  label.q { display: block; font-size: 15px; font-weight: 600; margin: 0 0 8px; }
  label.q span { color: #f23a3c; }
  .wrap { padding: 0; }
  .section { display: none; margin-top: 14px; border-left: 3px solid #2e69ff; padding-left: 16px; margin-left: -19px; }
  .section.on { display: block; }
  .section label.q { margin-top: 14px; }
  .section label.q:first-child { margin-top: 0; }
  .input { height: 40px; border: 1px solid #c3cad8; border-radius: 4px; padding: 0 12px; display: flex; align-items: center; color: #8d8fa8; font-size: 15px; }
  .upload { height: 56px; border: 1px dashed #c3cad8; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #6c7389; font-size: 14px; }
  .notice { background: #fdecec; color: #a3242a; border-radius: 6px; padding: 12px 14px; font-size: 15px; }
  .submit { margin: 22px auto 0; width: 180px; height: 44px; border-radius: 6px; background: #57b965; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 17px; font-weight: 600; }
  .submit.off { display: none; }
  .saved { margin: 14px 4px 0; font: 12.5px ui-monospace, Menlo, monospace; color: #555b70; }
  .saved b { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; font-weight: 600; }
  #pointer { position: fixed; left: 0; top: 0; z-index: 9; pointer-events: none; filter: drop-shadow(0 1px 1px rgba(0,0,0,.3)); }
</style>""")

# Deterministic timeline: demo.html?t=<ms> draws exactly the state at that moment (no timers), so every
# captured frame is reproducible however busy the machine is.
swap('</body>', """<script>
var MOVE_MS = 600;
var START = { x: 560, y: 520 };
var steps = [   // [time, 'over', element id] | [time, 'at', [x, y]] | [time, 'choose', [id, value]] | [time, 'blur']
  [300, 'over', 'day'],    [900, 'choose', ['day', '12']],
  [1400, 'over', 'month'], [2000, 'choose', ['month', '5']],
  [2500, 'over', 'year'],  [3100, 'choose', ['year', '2012']],
  [5000, 'choose', ['year', '2009']],
  [7200, 'choose', ['year', '2008']],
  [8700, 'over', 'day'],   [9300, 'choose', ['day', '19']],
  [9800, 'over', 'month'], [10400, 'choose', ['month', '10']],
  [11100, 'at', [560, 330]], [11100, 'blur']
];
function centre(id) { var r = document.getElementById(id).getBoundingClientRect(); return { x: r.left + r.width * 0.55, y: r.top + r.height * 0.55 }; }
function ease(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
window.onWidgetValue = function (v) {
  document.getElementById('saved').textContent = v || '(nothing yet)';
  var g = (/Group: (\\w+)/.exec(v) || [])[1];
  ['a', 'b', 'c'].forEach(function (k) { document.getElementById('sec-' + k).classList.toggle('on', g === 'GROUP_' + k.toUpperCase()); });
  document.getElementById('submit').classList.toggle('off', g === 'GROUP_C');
};
JFCustomWidget.h.ready({});
var T = +(new URLSearchParams(location.search).get('t') || 0);
var pos = { x: START.x, y: START.y }, focused = null;
steps.forEach(function (s) {
  if (s[0] > T) return;
  if (s[1] === 'choose') {
    var el = document.getElementById(s[2][0]);
    el.value = s[2][1]; el.dispatchEvent(new Event('change')); focused = el;
  } else if (s[1] === 'blur') {
    focused = null;
  } else {
    var to = s[1] === 'over' ? centre(s[2]) : { x: s[2][0], y: s[2][1] };
    var k = ease(Math.min(1, (T - s[0]) / MOVE_MS));
    pos = { x: pos.x + (to.x - pos.x) * k, y: pos.y + (to.y - pos.y) * k };
  }
});
if (focused) focused.focus();
document.getElementById('pointer').style.transform = 'translate(' + pos.x + 'px,' + pos.y + 'px)';
</script></body>""")

(out / 'demo.html').write_text(html)
print('ok')
