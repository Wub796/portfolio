/* Orbital Dock — classic script, no dependencies. Payloads are always real nodes. */
(function () {
  'use strict';
  if (window.__orbitDock) return;
  var KIND = { narrative: 'moon', list: 'ringed', metrics: 'swarm', reference: 'probe', plan: 'lander', sequence: 'rocket', reflective: 'sail', table: 'tug', cluster: 'station', programs: 'freighter', legend: 'buoy' };
  function def(id, title, archetype, source, extra) { return Object.assign({ id: id, title: title, archetype: archetype, source: source }, extra); }
  // All inventory/grouping decisions live here, never in the page markup.
  var ORBIT_CONFIG = {
    mission: [
      def('north', 'North Star', 'sail', ['.manifesto', '.mission__note']),
      def('short', 'Short-term · Summer 2026', 'comms', '.mission__col:nth-child(1)'),
      def('future', 'Medium / long-term trajectory', 'probe', ['.mission__col:nth-child(2)', '.mission__col:nth-child(3)'])
    ],
    studies: [
      def('metrics', 'Flight telemetry', 'swarm', '.kpis'),
      def('courses', 'Coursework — 9th & 10th grade', 'tug', '.grid2 > .panel:first-child'),
      def('state', '', 'lander', { heading: '.grid2 > .panel:nth-child(2) > h3:nth-of-type(1)' }),
      def('honors', '', 'probe', { heading: '.grid2 > .panel:nth-child(2) > h3:nth-of-type(2)' }),
      def('sat', '', 'comms', { heading: '.grid2 > .panel:nth-child(2) > h3:nth-of-type(3)' }),
      def('grad', '', 'ringed', { heading: '.grid2 > .panel:nth-child(2) > h3:nth-of-type(4)' }),
      def('ladder', '', 'rocket', { heading: '.grid2 > .panel:nth-child(2) > h3:nth-of-type(5)' })
    ],
    college: [
      def('schools', 'Target list · 13 schools', 'ringed', ['.wrap > h3:first-of-type', '.unis']),
      def('pillars', 'Strategic pillars', 'sail', '.grid2 > .panel:first-child'),
      def('rounds', 'Application rounds — fall 2027', 'tug', '.grid2 > .panel:nth-child(2)'),
      def('liftoff', 'Operation Liftoff', 'lander', ['.wrap > h3:last-of-type', '.phases'])
    ],
    applications: [
      def('pipeline', 'Six-step application pipeline', 'tug', '.steps', { crates: 6 }),
      def('current', 'Current pipeline', 'station', '.grid2 > .panel:first-child'),
      def('docs', 'Required documents', 'comms', '.grid2 > .panel:nth-child(2)')
    ],
    // Every extracurricular is its own spacecraft: the 14 .row.ecard cards are
    // detached from the .ecards rack and launched as individual bodies.
    extracurriculars: [def('crew', '', 'ringed', null, {
      each: '.ecards > .ecard',
      titleSel: '.row__name',
      archetypes: ['ringed', 'moon', 'probe', 'comms', 'rocket', 'station', 'tug', 'lander', 'buoy', 'sail', 'swarm', 'freighter', 'ringed', 'probe']
    })],
    schedule: [
      def('school', 'School-day cargo', 'tug', ['.toggle', '#tableSchool', '#tableSummer'], { shared: 'schedule', mode: '#modeSchool' }),
      def('summer', 'Summer cargo', 'freighter', [], { shared: 'schedule', mode: '#modeSummer' }),
      def('rules', 'Four operating rules', 'swarm', '.rules'),
      def('legend', 'Schedule signal key', 'buoy', '.legend')
    ],
    meal: [
      def('metrics', 'Fuel telemetry', 'swarm', '.kpis'),
      def('fuel', '', 'moon', '.grid2:nth-of-type(2) > .panel:first-child'),
      def('practice', '', 'lander', '.grid2:nth-of-type(2) > .panel:nth-child(2)'),
      def('template', '', 'tug', '.grid2:nth-of-type(3) > .panel:first-child'),
      def('hydration', '', 'probe', '.grid2:nth-of-type(3) > .panel:nth-child(2)'),
      def('nutrients', '', 'sail', '.wrap > .panel')
    ],
    training: [
      def('gym', 'Weekly program · gym', 'station', ['.prog-h', '.prog__hint', '.toggle', '#progGym', '#progHome'], { shared: 'training', mode: '#modeGym' }),
      def('home', 'Weekly program · home', 'freighter', [], { shared: 'training', mode: '#modeHome' }),
      def('rules', '', 'moon', '.grid2 > .panel:first-child'),
      def('load', '', 'lander', '.grid2 > .panel:nth-child(2)'),
      def('sources', '', 'probe', '.wrap > .panel:nth-last-child(2)'),
      def('recovery', '', 'sail', '.wrap > .panel:last-child')
    ],
    deadlines: [def('programs', 'Program manifest', 'freighter', ['#dlGrid', '#dlEmpty'])]
  };
  var root = document.documentElement, reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var run = null, stylesheet = null;
  function safeStorage(key, value) { try { if (value !== undefined) sessionStorage.setItem(key, JSON.stringify(value)); else return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (_) { return null; } }
  function el(tag, cls, parent, text) { var n = document.createElement(tag); n.className = cls; if (text !== undefined) n.textContent = text; if (parent) parent.appendChild(n); return n; }
  function repeat(n, fn) { return Array.from({ length: n }, function (_, i) { return fn(i); }).join(''); }
  function svgArt(type, id, entry, payload) {
    var metal = 'url(#' + id + '-metal)', foil = 'url(#' + id + '-foil)', shade = 'url(#' + id + '-shade)';
    function rect(x, y, w, h, fill) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + (fill || metal) + '"/>' + (fill === foil ? '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="url(#' + id + '-grain)" stroke="none"/>' : ''); }
    function wing(x, y, w, h) { return '<g class="orb__wing">' + rect(x, y, w, h, '#39454a') + '<path d="' + repeat(12, function (i) { var xx = x + (i % 4) * w / 4, yy = y + Math.floor(i / 4) * h / 3; return 'M' + xx + ',' + yy + 'h' + w / 4 + 'v' + h / 3; }) + '" fill="none" stroke="#b3afa0" stroke-width=".5"/></g>'; }
    function beacon(x, y) { return '<circle class="orb__beacon" cx="' + x + '" cy="' + y + '" r="1.7" fill="var(--accent)" stroke="none"/>'; }
    function dish(x, y, r) { return '<g class="orb__dish"><path d="M' + (x - r) + ',' + y + 'Q' + x + ',' + (y + r * 1.6) + ' ' + (x + r) + ',' + y + 'Z" fill="' + metal + '"/><ellipse cx="' + x + '" cy="' + y + '" rx="' + r + '" ry="' + r * .32 + '" fill="#f0e3cc"/><ellipse cx="' + x + '" cy="' + y + '" rx="' + r * .72 + '" ry="' + r * .23 + '" fill="none"/><path d="M' + x + ',' + y + 'v-12m-7,12l7,-12 7,12" fill="none"/></g>'; }
    function crates(n, y) { return repeat(n, function (i) { var x = 36 + (i % 3) * 19, yy = y + Math.floor(i / 3) * 15; return '<g class="orb__cargo">' + rect(x, yy, 17, 13, i % 2 ? '#9b8c73' : foil) + '<path d="M' + (x + 4) + ',' + yy + 'v13m9,-13v13" stroke-width=".4"/><text x="' + (x + 6) + '" y="' + (yy + 9) + '" stroke="none" fill="#382d24" font-size="5">' + (i + 1) + '</text></g>'; }); }
    var art = '';
    if (type === 'moon' || type === 'ringed') {
      art = '<g class="orb__moon"><circle cx="60" cy="57" r="34" fill="' + metal + '"/><path d="M35,48q2,-20 20,-14t9,18q-7,10 -21,5Z M64,67q20,-20 23,-3t-16,16Z M40,75q-13,-9 -4,-14t17,10Z" fill="#534b3e" opacity=".17"/>' + repeat(9, function (i) { var x = 39 + (i * 17 % 42), y = 34 + (i * 23 % 46), r = 2 + i % 4; return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="url(#' + id + '-crater)" stroke="#e4cba2" stroke-width=".6"/>'; }) + '<circle cx="60" cy="57" r="34" fill="' + shade + '" stroke="#cbbb99"/><circle cx="60" cy="57" r="35.5" fill="none" stroke="#cfb48d" opacity=".2"/></g>';
      if (type === 'ringed') art += '<g class="orb__ring" transform="rotate(-24 60 57)"><path d="M29,49a49,17 0 1,0 62,0" fill="none" stroke="#b4a181" stroke-width="7" opacity=".55"/><path d="M22,46a56,22 0 1,0 76,0" fill="none" stroke="#a59073" stroke-width="3" opacity=".35"/><path d="M17,45a61,27 0 1,0 86,0" fill="none" stroke="#8c775c" stroke-width="1" stroke-dasharray="2 3" opacity=".5"/><path d="M30,59q32,18 60,-4" fill="none" stroke="#1c1815" stroke-width="5" opacity=".25"/></g>';
      art += beacon(81, 31);
    } else if (type === 'comms') {
      art = wing(8, 43, 31, 30) + wing(81, 43, 31, 30) + '<path d="M36,57h49M49,31l-5,-16m16,15v-18m9,19l8,-15M65,69l29,29" fill="none"/>' + rect(43, 38, 33, 35, foil) + '<path d="M44,40l30,31m-18,-33l-7,35m-5,-19l31,-7" opacity=".3"/><g class="orb__rtg">' + rect(45, 75, 13, 10) + '<path d="M43,77h17m-17,3h17m-17,3h17"/></g>' + dish(65, 33, 16) + '<path d="M60,75l-5,14h14l-4,-14" fill="' + metal + '"/><path class="orb__plume" d="M57,90l5,21 5,-21" fill="var(--accent)" stroke="none"/>' + beacon(76, 43) + '<circle cx="94" cy="98" r="2"/>';
    } else if (type === 'station') {
      art = '<path d="M17,59h89m-89,-4l12,9 12,-9 12,9 12,-9 12,9 12,-9 12,9" fill="none" stroke-width="1.3"/>' + wing(10, 16, 25, 26) + wing(10, 76, 25, 26) + wing(85, 16, 25, 26) + wing(85, 76, 25, 26) + '<g class="orb__modules">' + repeat(6, function (i) { return rect(40 + i % 3 * 13, 42 + Math.floor(i / 3) * 19, 11, 18) + '<path d="M' + (42 + i % 3 * 13) + ',' + (44 + Math.floor(i / 3) * 19) + 'v14m4,-14v14" stroke="#c8bba5"/>'; }) + '</g><path d="M51,42v-12l9,-6 8,6v12" fill="' + metal + '"/><path d="M54,30h12v7H54Z" fill="#e3a458" stroke="#6b4d37"/><path d="M42,78v15l8,7 8,-7v-15 M72,76l8,12 -7,9 -8,-9Z" fill="' + metal + '"/><g class="orb__arm"><path d="M78,53l9,-5 8,6 4,-14 -7,-9 5,-10 9,1" fill="none" stroke-width="2.5"/><path d="M102,19l7,3 -6,4" fill="none"/></g>' + repeat(Math.min(14, entry.modules || 4), function (i) { return rect(18 + i % 7 * 12, 65 + Math.floor(i / 7) * 8, 9, 6, foil); }) + '<path d="M44,50l4,1m12,9l3,-2m8,8h4" stroke="#66584b"/>' + beacon(13, 56) + beacon(107, 60);
    } else if (type === 'probe') {
      art = '<g class="orb__bus"><path d="M45,49l7,-9 16,-2 12,9 2,17 -9,12 -16,2 -12,-9 -3,-13Z" fill="' + foil + '"/><path d="M48,52l28,18m-23,-29l14,35m-20,-13l30,-13" opacity=".3"/></g><path d="M53,54L16,88m54,-29l31,38M62,69l-2,43" fill="none" stroke-width="1.5"/>' + dish(60, 38, 34) + '<g class="orb__rtg">' + rect(9, 80, 15, 18) + '<path d="M7,82h19m-19,4h19m-19,4h19m-19,4h19"/><circle cx="17" cy="89" r="10" fill="var(--accent)" opacity=".12" stroke="none"/></g><circle cx="60" cy="111" r="2"/><path d="M90,86l10,-5 8,11 -9,6Z" fill="' + metal + '"/>' + beacon(79, 65);
    } else if (type === 'lander') {
      art = repeat(4, function (i) { var x = i % 2 ? 85 : 34, y = i < 2 ? 61 : 77, xx = i % 2 ? 103 : 16; return '<g class="orb__leg"><path d="M' + x + ',53L' + xx + ',' + (y + 22) + 'M' + x + ',68L' + xx + ',' + (y + 22) + '" fill="none" stroke-width="2"/>' + rect(xx - 6, y + 21, 12, 3) + '</g>'; }) + '<path d="M37,35l14,-9h21l15,10 4,26 -13,15H45L30,62Z" fill="' + foil + '"/><path d="M35,46l49,18m-44,-32l20,41m15,-40l-9,43" opacity=".3"/><path d="M44,33h29l5,9H40Z" fill="' + metal + '"/>' + dish(58, 29, 13) + '<g class="orb__rover">' + rect(44, 77, 30, 9) + '<path d="M58,76v-8h9" fill="none"/>' + repeat(3, function (i) { return '<circle cx="' + (47 + i * 11) + '" cy="87" r="4" fill="#34312d"/>'; }) + '</g><path d="M34,63l-5,10h10Zm46,0l-3,10h10Z" fill="' + metal + '"/><path class="orb__plume" d="M29,75l-7,28 18,-28m37,0l-3,28 20,-28" fill="var(--accent)" opacity=".35" stroke="none"/>' + beacon(85, 42);
    } else if (type === 'rocket') {
      art = '<g class="orb__gimbal"><path d="M54,29l6,-18 6,18v65H54Z" fill="' + metal + '"/><path d="M54,45h12v13H54Zm6,23h6v20h-6Z" fill="#312c28"/><path d="M54,36h12m-12,29h12m-12,24h12" stroke="#a17e5b" stroke-width="2"/><path d="M54,78l-11,20h12m11,-20l11,20H65" fill="' + metal + '"/><path d="M58,14V3h4v11m-4,-9l4,4 -4,3" fill="none"/><path d="M54,93l-2,7h16l-2,-7" fill="#5f4e3d"/><path d="M56,76h2m4,1h2"/><path class="orb__plume" d="M53,101l7,18 7,-18" fill="var(--accent)" stroke="none"/></g>' + beacon(66, 33);
    } else if (type === 'swarm') {
      art = '<path d="M20,31L82,19 104,75 46,103Z" fill="none" opacity=".2" stroke-dasharray="2 4"/>' + repeat(4, function (i) { var x = [20, 75, 34, 85][i], y = [33, 23, 81, 75][i]; return '<g class="orb__cube" style="--orb-part:' + i + '"><path d="M' + x + ',' + y + 'l9,-5 15,6v20l-10,5 -14,-6Z" fill="' + metal + '"/><path d="M' + x + ',' + y + 'l14,6 10,-5m-10,5v24m-14,-17l14,6" fill="none" stroke="#887b68"/><path d="M' + (x + 3) + ',' + y + 'l-3,-13" fill="none"/><circle cx="' + (x + 7) + '" cy="' + (y + 12) + '" r="3" fill="#292d2e"/>' + beacon(x + 22, y + 5) + '</g>'; });
    } else if (type === 'sail') {
      art = '<g class="orb__sail"><path d="M60,12v96M12,60h96" fill="none" stroke-width=".7"/>' + repeat(4, function (i) { return '<path class="orb__quadrant" transform="rotate(' + i * 90 + ' 60 60)" d="M59,58L17,59 59,17Z" fill="' + foil + '" fill-opacity=".24" stroke="#b49a77" stroke-width=".5"/>'; }) + '<path d="M15,60L60,15 105,60 60,105Z" fill="none" opacity=".3" stroke-dasharray="1 3"/>' + rect(56, 56, 8, 8) + beacon(61, 58) + '</g>';
    } else if (type === 'tug') {
      art = '<g class="orb__tug"><path d="M16,27l10,-6 11,6v18l-10,5 -11,-6Z" fill="' + metal + '"/>' + wing(5, 23, 8, 21) + '<path d="M20,46l-4,10h19l-4,-10" fill="' + metal + '"/><path class="orb__plume" d="M18,57l8,18 8,-18" fill="var(--accent)" stroke="none"/><path d="M31,48l8,17 7,-1" fill="none" stroke-dasharray="3 2"/><path d="M35,68v31h61V68" fill="none" stroke-width="2"/>' + crates(entry.crates || 6, 69) + '<path d="M34,99h63" stroke-width="3"/>' + beacon(32, 31) + '</g>';
    } else if (type === 'freighter') {
      var types = Array.from(new Set(Array.from(payload.querySelectorAll('.dl-card')).map(function (c) { return c.dataset.type || 'cargo'; })));
      if (!types.length) types = ['flight', 'operations', 'reference', 'supplies'];
      art = '<path d="M13,61L24,46h79l8,15 -8,14H24Z" fill="' + metal + '"/><path d="M29,61h73M25,64l15,3m10,-2l23,4" stroke="#67584b"/><g class="orb__containers">' + repeat(types.length, function (i) { var x = 27 + (i % 8) * 9, y = 26 + Math.floor(i / 8) * 10; return '<path data-cargo-type="' + types[i].replace(/[^a-z0-9-]/gi, '') + '" d="M' + x + ',' + y + 'h8v8h-8Zm2,0v8m4,-8v8" fill="' + ['#b6a180', '#8e9a98', '#8c7664', '#b8afa0'][i % 4] + '" stroke-width=".4"/>'; }) + '</g><g class="orb__bells">' + repeat(4, function (i) { return '<path d="M103,' + (45 + i * 8) + 'l11,-2v7l-11,-1Z" fill="#54483a"/>'; }) + '</g><path d="M30,46L19,29 27,23 40,46m-10,29L20,94 28,99 40,75" fill="' + metal + '"/>' + beacon(18, 58) + beacon(104, 46);
    } else {
      art = '<path d="M60,24l15,26 -7,28H52l-7,-28Z" fill="' + metal + '"/><path d="M60,24V8m-6,10h12M52,78l-13,19h42L68,78" fill="none"/><g class="orb__ring"><ellipse cx="60" cy="54" rx="39" ry="13" fill="none" stroke="#b69b76" stroke-width="2"/><ellipse cx="60" cy="54" rx="28" ry="9" fill="none" stroke-dasharray="2 3"/></g><path d="M53,38h14l3,14H50Z" fill="var(--accent)" opacity=".65"/>' + beacon(60, 14);
    }
    return '<svg class="orb__art orb__art--' + type + '" viewBox="0 0 120 120" aria-hidden="true" focusable="false"><defs><linearGradient id="' + id + '-metal" class="orb__light" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#efe4d1"/><stop offset="1" stop-color="#6d6254"/></linearGradient><linearGradient id="' + id + '-foil"><stop stop-color="#d3af68"/><stop offset="1" stop-color="#6a5030"/></linearGradient><radialGradient id="' + id + '-shade" cx=".22" cy=".3"><stop offset=".3" stop-color="var(--accent)" stop-opacity=".05"/><stop offset="1" stop-color="#171719" stop-opacity=".8"/></radialGradient><radialGradient id="' + id + '-crater" cx=".7" cy=".7"><stop stop-color="#c3b393"/><stop offset="1" stop-color="#645b4c"/></radialGradient><pattern id="' + id + '-grain" width="120" height="120" patternUnits="userSpaceOnUse"><rect width="120" height="120" filter="url(#orb-foil-noise)" opacity=".1"/></pattern></defs><g class="orb__machine" stroke="#4a4036" stroke-width=".8" stroke-linejoin="round">' + art + '<path d="M50,60l4,-1m15,3l3,2" opacity=".35"/><text x="50" y="64" font-size="4" stroke="none" fill="#473c30" opacity=".6">BW-' + id.slice(-2) + '</text></g></svg>';
  }
  function start() {
    var planet = document.body.dataset.planet;
    if (!ORBIT_CONFIG[planet] || planet === 'sol') return;
    var wrap = document.querySelector('section.sec--page > .wrap');
    if (!wrap || run) return;
    var state = { planet: planet, openIndex: -1, lastIndex: -1, phase: 'idle' };
    var resources = [], listeners = [], timers = [], groups = [], originals = [], animations = [], active = true;
    var layer, panel, veil, live, stage, core, content, title, thumb, count, headTools, dock;
    var bodies = [], mobile = innerWidth <= 760, narrow = !mobile && innerWidth <= 1100, turn = 0, frame = 0, interval = 0, observer;
    // A narrow deck cannot hold a whole belt: show a window of ports and let
    // the swipe rotate which ones are on stage.
    var frontWindow = 4;
    var lockedAt = -Infinity, outsideAt = 0, oldOverflow = '', unhide = [], inertSaved = [], lastAnchor = null;
    // The scrim's own fade-out tracks the close; it must be cancelled before the
    // veil is revealed again or the next open would inherit opacity 0.
    var veilFade = null, crossFade = null, sheetSettle = null;
    var dockingTimer = 0, returnTimer = 0, closeTimer = 0, pendingReveal = null, pendingFinish = null, lockedIndex = -1;
    var handleClickBlockedUntil = 0, sheetDrag = null;
    var dockScroll = window.scrollY, desiredIndex = -1;
    function listen(n, name, fn, options) {
      var guarded = function (e) { if (!active) return; try { fn(e); } catch (_) { cleanup(); } };
      n.addEventListener(name, guarded, options); listeners.push(function () { n.removeEventListener(name, guarded, options); });
    }
    function later(fn, ms) { var timer = setTimeout(function () { if (active) { try { fn(); } catch (_) { cleanup(); } } }, ms); timers.push(timer); return timer; }
    function own(n) { resources.push(n); return n; }
    function record(n) { var marker = document.createComment('orb payload anchor'); n.parentNode.insertBefore(marker, n); originals.push({ node: n, parent: n.parentNode, next: n.nextSibling, marker: marker }); }
    function resolve(source) {
      if (typeof source === 'string') { var found = wrap.querySelector(source); if (!found) throw new Error('missing source: ' + source); return [found]; }
      if (Array.isArray(source)) return source.map(function (s) { var n = wrap.querySelector(s); if (!n) throw new Error('missing source: ' + s); return n; });
      var h = wrap.querySelector(source.heading); if (!h) throw new Error('missing heading');
      var nodes = [h], n = h.nextSibling; while (n && !(n.nodeType === 1 && n.matches('h3.mini-h'))) { nodes.push(n); n = n.nextSibling; } return nodes;
    }
    function group(nodes) {
      if (nodes.length === 1) { var n = nodes[0]; var anchor = document.createComment('orb return slot'); n.parentNode.insertBefore(anchor, n); var g = { element: n, parent: n.parentNode, next: n.nextSibling, anchor: anchor }; groups.push(g); return g; }
      var chest = el('div', 'orb__chest'); var parent = nodes[0].parentNode;
      var slot = document.createComment('orb return slot'); parent.insertBefore(slot, nodes[0]);
      // Chests assemble only on docking. In idle every original node stays in
      // its exact original parent/order, including heading/list clusters.
      nodes.forEach(function (n) { record(n); });
      var g = { element: chest, parent: parent, next: nodes[0], anchor: slot, chest: true, members: nodes }; groups.push(g); return g;
    }
    function restore(g) {
      if (g.chest) { g.members.slice().reverse().forEach(function (n) { var o = originals.find(function (v) { return v.node === n; }); if (o && o.marker.parentNode) o.marker.parentNode.insertBefore(n, o.marker.nextSibling); }); g.element.remove(); }
      else if (g.anchor.parentNode) g.anchor.parentNode.insertBefore(g.element, g.anchor.nextSibling);
    }
    function putBack() {
      if (state.openIndex < 0) return;
      var b = bodies[state.openIndex]; b.scroll = content.scrollTop;
      if (dock && dock.parentNode === headTools) restoreDock();
      // The same SVG, not a clone, leaves the header and returns to the body.
      b.drift.insertBefore(b.svg, b.drift.firstChild);
      if (b.tools) { if (b.toolsAnchor.parentNode) b.toolsAnchor.parentNode.insertBefore(b.tools, b.toolsAnchor.nextSibling); b.toolsAnchor.remove(); b.tools = null; }
      restore(b.group);
      (b.group.hygiene || []).forEach(function (v) { if (v.cls === null) v.node.removeAttribute('class'); else v.node.setAttribute('class', v.cls); if (v.style === null) v.node.removeAttribute('style'); else v.node.setAttribute('style', v.style); }); b.group.hygiene = [];
      b.button.setAttribute('aria-expanded', 'false'); b.button.setAttribute('aria-label', (b.index + 1) + '. ' + b.title + ' — open'); b.status.textContent = 'closed'; b.button.dataset.state = 'idle';
      state.openIndex = -1;
    }
    function restoreDock() { if (!dock) return; var d = originals.find(function (o) { return o.node === dock; }); if (d && d.marker.parentNode) d.marker.parentNode.insertBefore(dock, d.marker.nextSibling); }
    function backgroundInert(on) {
      // Decorative fixed layers (custom cursor, comet wake, glow) must never
      // go inert: the pointer readout is live chrome, not page content.
      function decorative(n) { return n.id === 'glow' || n.id === 'comet' || n.id === 'cursorDot' || n.id === 'cursorReticle' || n.id === 'cursorHud'; }
      if (on) { inertSaved = Array.from(document.body.children).filter(function (n) { return n !== panel && n !== veil && n !== live && n !== dock && n.tagName !== 'SCRIPT' && !decorative(n) && !n.classList.contains('orb__void'); }).map(function (n) { var v = n.inert; n.inert = true; return [n, v]; }); }
      else { inertSaved.forEach(function (v) { v[0].inert = v[1]; }); inertSaved = []; }
    }
    function scrollLock(on) {
      if (on) { oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; if (window.__orbitScroll) window.__orbitScroll(true); }
      else { document.body.style.overflow = oldOverflow; if (window.__orbitScroll) window.__orbitScroll(false); }
    }
    function cleanup() {
      if (!active) return; active = false;
      clearInterval(interval); cancelAnimationFrame(frame); timers.forEach(clearTimeout); animations.forEach(function (a) { a.cancel(); });
      [veilFade, crossFade, sheetSettle].forEach(function (a) { if (a) a.cancel(); });
      bodies.forEach(function (b) { if (b.flight) b.flight.cancel(); if (b.retreat) b.retreat.cancel(); });
      if (observer) observer.disconnect(); listeners.forEach(function (f) { f(); });
      var wasOpen = state.openIndex >= 0; putBack(); backgroundInert(false); if (wasOpen || root.classList.contains('orb-open')) scrollLock(false);
      groups.forEach(function (g) { restore(g); });
      originals.slice().reverse().forEach(function (o) { if (o.marker.parentNode) o.marker.parentNode.insertBefore(o.node, o.marker.nextSibling); o.marker.remove(); });
      groups.forEach(function (g) { g.anchor.remove(); if (g.chest) g.element.remove(); });
      unhide.forEach(function (n) { n.node.hidden = n.hidden; n.node.inert = n.inert; });
      window.__orbitReading = false;
      resources.forEach(function (n) { n.remove(); }); root.classList.remove('orb-ready', 'orb-open', 'orb-reduced', 'orb-intro', 'orb-hidden');
      document.dispatchEvent(new CustomEvent('bw:orbit', { detail: { open: false } })); run = null;
    }
    run = { destroy: cleanup, state: state, bodies: bodies, config: ORBIT_CONFIG[planet] };
    try {
      var stored = safeStorage('bw.orbit.state.v1') || {}; state.lastIndex = stored[planet] === undefined ? -1 : stored[planet];
      // Resolve the entire manifest BEFORE grouping changes nth-of-type paths.
      var entries = [];
      ORBIT_CONFIG[planet].forEach(function (d) {
        if (d.each) {
          var found = Array.from(wrap.querySelectorAll(d.each));
          if (!found.length) throw new Error('missing each: ' + d.each);
          var shapes = d.archetypes || [d.archetype];
          found.forEach(function (n, k) {
            entries.push({ def: Object.assign({}, d, { each: null, source: [], title: '', archetype: shapes[k % shapes.length] }), nodes: [n] });
          });
        } else {
          entries.push({ def: d, nodes: d.source.length === 0 ? [] : resolve(d.source) });
        }
      });
      var shared = {};
      entries.forEach(function (entry, i) {
        var d = entry.def, nodes = entry.nodes, g = d.shared && shared[d.shared];
        if (!g) { g = group(nodes); if (d.shared) shared[d.shared] = g; }
        var first = nodes.find(function (n) { return n.nodeType === 1; }) || g.element;
        var h = first.matches('h3,h2') ? first : first.querySelector('h3.mini-h,h2.sec__title');
        if (!h) { var prev = first.previousElementSibling; while (prev && !prev.matches('h3.mini-h,h2.sec__title')) prev = prev.previousElementSibling; h = prev; }
        var named = d.titleSel ? first.querySelector(d.titleSel) : null;
        var text = first.dataset.orbTitle || d.title || (named && named.textContent) || (h && h.textContent) || first.id || planet + ' · ' + (i + 1);
        text = text.trim().replace(/\s+/g, ' '); if (text.length > 42) text = text.slice(0, 41) + '…';
        bodies.push({ group: g, title: text, type: first.dataset.orbAs || d.archetype || KIND[d.kind] || 'moon', index: i, entry: d, scroll: 0 });
      });
      dock = document.getElementById('dlDock'); if (dock) record(dock);
      // Hide real source document only after layout commits; preserve all prior hidden states.
      unhide.push({ node: wrap, hidden: wrap.hidden, inert: wrap.inert });
      stage = own(el('div', 'orb__stage', wrap.parentNode));
      stage.setAttribute('aria-label', 'Orbital dock');
      core = el('button', 'orb__core', stage); core.type = 'button'; core.innerHTML = '<span class="orb__eyebrow">BW / ORBITAL DOCK</span><span class="orb__page"></span><span class="orb__hint">Select a spacecraft to dock · scroll for Ground Control</span>';
      core.querySelector('.orb__page').textContent = planet === 'extracurriculars' ? 'Extracurriculars' : planet.charAt(0).toUpperCase() + planet.slice(1);
      listen(core, 'click', function () { bodies[0].button.focus(); });
      el('div', 'orb__coordinates', stage, String(bodies.length).padStart(2, '0') + ' VESSELS / ALL PORTS CLOSED');
      layer = own(el('div', 'orb__layer', document.body)); layer.id = 'orbitLayer';
      layer.classList.add('orb__approaching'); layer.inert = true;
      var sceneScript = document.querySelector('script[src="js/scene.js"]');
      var sceneUnavailable = !!(window.__scene3d && window.__scene3d.ok === false) || document.readyState === 'complete' && !window.__getOrbitAnchor;
      var glow = el('div', 'orb__fallback', layer); glow.setAttribute('aria-hidden', 'true');
      var trace = el('div', 'orb__traces', layer); trace.setAttribute('aria-hidden', 'true');
      trace.innerHTML = '<svg width="1" height="1"><defs><filter id="orb-foil-noise"><feTurbulence type="fractalNoise" baseFrequency=".14" numOctaves="2" seed="8"/><feColorMatrix type="saturate" values="0"/></filter></defs>' + repeat(3, function () { return '<ellipse rx="365" ry="165"/>'; }) + '</svg>';
      repeat(12, function (i) { var debris = el('i', 'orb__debris', layer); debris.setAttribute('aria-hidden', 'true'); debris.style.cssText = '--orb-delay:-' + i * 3 + 's;left:' + (14 + i * 67 % 78) + '%;top:' + (28 + i * 31 % 56) + '%;width:' + (2 + i % 5) + 'px'; return ''; });
      el('i', 'orb__meteor', layer).setAttribute('aria-hidden', 'true');
      veil = own(el('div', 'orb__void', document.body)); veil.hidden = true; veil.setAttribute('aria-hidden', 'true');
      panel = own(el('div', 'orb__panel', document.body)); panel.id = 'orbitPanel'; panel.hidden = true; panel.dataset.cursorLabel = 'DOCKED'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'orb-title'); panel.tabIndex = -1;
      var handle = el('button', 'orb__handle', panel); handle.type = 'button'; handle.setAttribute('aria-label', 'Drag down or activate to dismiss');
      var header = el('header', 'orb__header', panel); thumb = el('div', 'orb__thumbnail', header); thumb.setAttribute('aria-hidden', 'true');
      var heading = el('div', 'orb__heading', header); count = el('span', 'orb__count', heading); title = el('h2', 'orb__title', heading); title.id = 'orb-title';
      var close = el('button', 'orb__close', header, '✕'); close.type = 'button'; close.setAttribute('aria-label', 'Close panel');
      headTools = el('div', 'orb__tools', panel);
      content = el('div', 'orb__content', panel); content.setAttribute('data-lenis-prevent', ''); content.tabIndex = 0; content.setAttribute('role', 'region'); content.setAttribute('aria-label', 'Docked payload');
      var footer = el('footer', 'orb__footer', panel); var prevBody = el('button', 'orb__prev', footer, '← previous body'), nextBody = el('button', 'orb__next', footer, 'next body →'); prevBody.type = nextBody.type = 'button';
      prevBody.disabled = nextBody.disabled = bodies.length < 2;
      live = own(el('div', 'orb__live', document.body)); live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-atomic', 'true');
      bodies.forEach(function (b, i) {
        var slot = el('div', 'orb__slot', layer); b.slot = slot;
        var button = el('button', 'orb__body', slot); b.button = button; button.type = 'button'; button.dataset.archetype = b.type; button.dataset.state = 'idle';
        button.setAttribute('aria-label', (i + 1) + '. ' + b.title + ' — open'); button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-controls', 'orbitPanel');
        button.style.setProperty('--orb-delay', '-' + (i * 3.7 + .8) + 's'); button.style.setProperty('--orb-strobe', (.6 + i * .13 % .8) + 's');
        b.drift = el('span', 'orb__drift', button); b.drift.innerHTML = svgArt(b.type, planet + '-' + String(i).padStart(2, '0'), b.entry, b.group.members ? b.group.members.find(function (n) { return n.nodeType === 1 && n.querySelector('.dl-card'); }) || b.group.members.find(function (n) { return n.nodeType === 1; }) : b.group.element); b.svg = b.drift.firstChild;
        var plate = el('span', 'orb__plate', b.drift); el('span', 'orb__port', plate); el('span', 'orb__number', plate, String(i + 1).padStart(2, '0')); el('span', 'orb__name', plate, b.title); b.status = el('span', 'orb__status', plate, 'closed');
        el('span', 'orb__reticle', b.drift).setAttribute('aria-hidden', 'true');
        button.dataset.cursorLabel = 'DOCK / ' + b.title;
        listen(button, 'pointerdown', function (e) { if (e.isPrimary && e.button === 0 && b.motion) b.motion.pause(); });
        function releasePointer() { if (b.motion && state.openIndex < 0 && !['locked','transit','closing'].includes(state.phase) && !document.hidden) { b.motion.updatePlaybackRate(button.matches(':hover,:focus') ? .3 : 1); b.motion.play(); } }
        listen(button, 'pointerup', releasePointer); listen(button, 'pointercancel', releasePointer);
        listen(button, 'click', function () { if (performance.now() - lockedAt > 250) open(i); });
        function hover(on) { if (state.openIndex >= 0 || ['locked','transit','closing'].includes(state.phase)) return; button.dataset.state = on ? 'hover' : 'idle'; state.phase = on ? 'hover' : 'idle'; if (b.motion) { b.motion.updatePlaybackRate(on ? .3 : 1); if (b.motion.playState === 'paused' && !document.hidden) b.motion.play(); } }
        listen(button, 'pointerenter', function () { hover(true); }); listen(button, 'pointerleave', function () { hover(false); });
        listen(button, 'focus', function () { hover(true); }); listen(button, 'blur', function () { hover(false); });
      });
      function nominal() { return { x: innerWidth / 2 + (mobile ? 0 : 28), y: innerHeight * (mobile ? .51 : .57), r: Math.min(innerWidth, innerHeight) * .12, sunX: -1, sunY: -.5, ok: false }; }
      function anchor() {
        if (window.__scene3d && window.__scene3d.ok === false) return nominal();
        if (typeof window.__getOrbitAnchor === 'function') {
          var a = window.__getOrbitAnchor();
          // Never replace an off-screen, stale, or not-yet-projected live planet
          // with a centred fallback. That made spacecraft precede their planet.
          return a && (!a.slug || a.slug === planet) ? a : { ok: false, visible: false };
        }
        return sceneUnavailable ? nominal() : { ok: false, visible: false };
      }
      function inView(a) { return a.visible !== false && (a.ok || a.visible === undefined); }
      function slotTransform(a) { return 'translate3d(' + Math.round(a.x) + 'px,' + Math.round(a.y) + 'px,0) scale(' + (a.scale || 1) + ') rotate(0deg)'; }
      function transformAt(b, ph) {
        var g = b.geometry, z = Math.sin(ph), scale = mobile ? 1 : .95 + z * .075;
        return 'translate3d(' + (Math.cos(ph) * g.radius).toFixed(2) + 'px,' + (Math.sin(ph) * g.radius * g.inclination).toFixed(2) + 'px,0) scale(' + scale.toFixed(3) + ') rotate(0deg)';
      }
      function phaseAt(b) { return b.geometry.phase + (b.motion ? Number(b.motion.currentTime || 0) / b.duration * Math.PI * 2 : 0); }
      function lightBody(b, a) {
        var ph = phaseAt(b), g = b.geometry, x = Math.cos(ph) * g.radius, y = Math.sin(ph) * g.radius * g.inclination;
        b.x = x; b.y = y;
        var band = Math.sin(ph) < -.08 ? 'far' : 'near';
        if (b.depth !== band) { b.depth = band; b.button.classList.toggle('orb__far', band === 'far'); b.slot.style.zIndex = band === 'far' ? '9' : '18'; }
        // A small limb mask on the far side, never a duplicated planet canvas.
        if (band === 'far') { b.button.style.setProperty('--orb-limb-x', (102 - x) + 'px'); b.button.style.setProperty('--orb-limb-y', (80 - y) + 'px'); b.button.style.setProperty('--orb-limb-r', a.r + 'px'); }
        var lightStep = Math.round(ph * 8 / Math.PI);
        if (b.lightStep !== lightStep) {
          b.lightStep = lightStep;
          var light = b.svg.querySelector('.orb__light');
          light.setAttribute('x1', String((1 - Math.cos(ph)) / 2)); light.setAttribute('y1', String((1 - Math.sin(ph)) / 2));
          light.setAttribute('x2', String((1 + Math.cos(ph)) / 2)); light.setAttribute('y2', String((1 + Math.sin(ph)) / 2));
          b.button.style.setProperty('--orb-light-angle', Math.atan2(-y, -x) * 180 / Math.PI + 'deg');
        }
      }
      // Concentric belts sized to the live planet. Every belt keeps real
      // clearance from the planet disc and its glow, and bodies are shared
      // round-robin between belts so no ring is ever crowded.
      function ringSpec(a) {
        var n = bodies.length;
        if (mobile) { var rxm = Math.max(56, innerWidth / 2 - 68); return [{ rx: rxm, ry: Math.max(200, Math.min(260, innerHeight * .30)), ring: 0, count: n, f: 1 }]; }
        // Between a phone and a wide desktop the belt cannot hold every port
        // without running into the page title, so it uses the same window model
        // on a circular arc — uniform spacing, no elliptical clustering.
        if (narrow) { var rr = Math.max(140, Math.min(innerWidth / 2 - 96, innerHeight * .30, 300)); return [{ rx: rr, ry: rr, ring: 0, count: n, f: 1 }]; }
        var limitX = Math.max(180, Math.min(a.x - 148, innerWidth - a.x - 126, 570));
        // The vertical bound only has to clear the left-aligned page title, not the
        // whole top strip, so the belts may run taller and stay further apart.
        var limitY = Math.max(96, Math.min(a.y - 150, innerHeight - a.y - 105, 380));
        // Two belts at most: their radial gap stays wider than a body, which
        // keeps every silhouette clear of the one behind it.
        var rings = n <= 4 ? 1 : 2, out = [];
        var floorX = (a.r || 0) * 1.35 + 96, floorY = (a.r || 0) * 1.35 + 70;
        for (var r = 0; r < rings; r++) {
          var inner = r === 0 && rings > 1;
          out.push({
            rx: Math.max(limitX * (inner ? .54 : 1), Math.min(floorX, limitX * 1.1)),
            ry: Math.max(limitY * (inner ? .78 : 1), Math.min(floorY, limitY * 1.1)),
            ring: r, count: Math.ceil((n - r) / rings), f: inner ? .6 : 1
          });
        }
        return out;
      }
      function place(b, a) {
        // Complete elliptical revolutions on the compositor; never a layout RAF.
        var previousPhase = b.geometry ? phaseAt(b) : null;
        if (b.motion) { b.motion.cancel(); animations.splice(animations.indexOf(b.motion), 1); b.motion = null; }
        var spec = ringSpec(a), s = spec[b.index % spec.length];
        var ph;
        if (mobile || narrow) {
          var rel = ((b.index - turn) % bodies.length + bodies.length) % bodies.length;
          b.front = rel < frontWindow;
          ph = Math.PI / 2 + (rel - (frontWindow - 1) / 2) * (2.6 / (frontWindow - 1));
        }
        else if (previousPhase !== null) ph = previousPhase;
        else {
          var local = (b.index - s.ring) / spec.length;
          s.count = Math.max(1, s.count);
          // The outer belt is offset by half the inner belt's step so the two
          // rings interleave instead of stacking up in the same gaps.
          var step = Math.PI * 2 / Math.max(1, spec[0].count);
          // Port 01 starts at the bottom of the belt, facing the viewer, so the
          // first thing on the deck is on stage rather than hidden round the back.
          ph = Math.PI / 2 + local * Math.PI * 2 / s.count + (s.ring ? step * .5 : 0);
        }
        var rx = s.rx, ry = s.ry;
        b.geometry = { radius: rx, phase: ph, speed: s.f, inclination: ry / rx, z: Math.sin(ph) };
        b.duration = (mobile ? 220000 : 232000 * s.f) / b.geometry.speed;
        b.slot.style.transform = slotTransform(a);
        b.button.style.transform = transformAt(b, ph);
        // A windowed belt must hold still: its ports are placed, not parked on
        // a revolution, so no WAAPI animation is created for them.
        if (!reduced.matches && !mobile && !narrow && b.button.animate) {
          // A slow revolution needs only a cheap polyline: 49 samples still
          // trace the ellipse to well under a pixel, at half the keyframe weight.
          var steps = bodies.length > 8 ? 49 : 97;
          var keys = Array.from({ length: steps }, function (_, j) { var theta = ph + j / (steps - 1) * Math.PI * 2; return { transform: transformAt(b, theta), opacity: .84 + Math.sin(theta) * .16, offset: j / (steps - 1) }; });
          b.motion = b.button.animate(keys, { duration: b.duration, iterations: Infinity }); animations.push(b.motion);
          if (state.openIndex >= 0 || document.hidden || ['locked','transit','closing'].includes(state.phase)) b.motion.pause();
          if (b.button === document.activeElement) b.motion.updatePlaybackRate(.3);
        }
        b.lightStep = null; lightBody(b, a);
        // Desktop shows the whole belt. A narrow deck shows only the front
        // window, so the swipe has somewhere to go.
        var near = !mobile && !narrow || !!b.front;
        b.button.style.visibility = near ? 'visible' : 'hidden'; b.button.tabIndex = near ? 0 : -1;
      }
      function layout(force) {
        mobile = innerWidth <= 760; narrow = !mobile && innerWidth <= 1100; var a = anchor();
        var visible = inView(a), arriving = layer.classList.contains('orb__approaching');
        layer.classList.toggle('orb__approaching', !visible); layer.inert = !visible;
        if (!visible) { bodies.forEach(function (b) { b.button.tabIndex = -1; }); return; }
        if (arriving) force = true;
        glow.hidden = a.ok; glow.style.transform = 'translate3d(' + Math.round(a.x) + 'px,' + Math.round(a.y) + 'px,0)';
        layer.style.setProperty('--orb-sun-x', a.sunX); layer.style.setProperty('--orb-sun-y', a.sunY);
        if (force || !lastAnchor) {
          bodies.forEach(function (b) { place(b, a); });
          trace.style.transform = 'translate3d(' + a.x + 'px,' + Math.round(a.y) + 'px,0)'; trace.style.left = trace.style.top = '0';
          var spec = ringSpec(a);
          trace.querySelectorAll('ellipse').forEach(function (ring, i) {
            var s = spec[i]; if (!s) { ring.style.opacity = '0'; return; }
            ring.style.opacity = '1'; ring.setAttribute('cx', '0'); ring.setAttribute('cy', '0'); ring.setAttribute('rx', s.rx); ring.setAttribute('ry', s.ry);
          });
        }
        // Belt radii come from the planet's projected size, so a camera that is
        // still arriving leaves the rig sized for a planet that is not there yet.
        // Re-place on a material change; the phase is preserved, so the belts
        // slide to their true ellipses instead of snapping.
        else if (Math.abs((a.r || 0) - (lastAnchor.r || 0)) > 8 || Math.abs(a.x - lastAnchor.x) > 60 || Math.abs(a.y - lastAnchor.y) > 60) bodies.forEach(function (b) { place(b, a); });
        else if (Math.abs(a.x - lastAnchor.x) + Math.abs(a.y - lastAnchor.y) > 3 || Math.abs((a.scale || 1) - (lastAnchor.scale || 1)) > .01) bodies.forEach(function (b) { b.slot.style.transform = slotTransform(a); });
        bodies.forEach(function (b) { lightBody(b, a); });
        lastAnchor = a;
      }
      function neutralize(g) {
        [g.element].concat(Array.from(g.element.querySelectorAll('*'))).forEach(function (n) {
          if (!n.classList) return;
          if (n.matches('.reveal,.flip3d,.cascade') || n.style.opacity === '0') {
            if (!g.hygiene) g.hygiene = [];
            g.hygiene.push({ node: n, cls: n.getAttribute('class'), style: n.getAttribute('style') });
            n.classList.add('is-in'); if (window.gsap) window.gsap.killTweensOf(n);
            n.style.setProperty('opacity', '1', 'important'); n.style.setProperty('transform', 'none', 'important'); n.style.setProperty('filter', 'none', 'important'); n.style.transitionDelay = '0s';
          }
        });
      }
      function announce(text) { live.textContent = text; }
      function hash(i) { try { history.replaceState(history.state, '', location.pathname + location.search + (i < 0 ? '' : '#orb-' + planet + '-' + (i + 1))); } catch (_) { /* file / private session */ } }
      function mount(i) {
        var b = bodies[i]; state.openIndex = i; state.lastIndex = i; title.textContent = String(i + 1).padStart(2, '0') + ' · ' + b.title;
        count.textContent = (i + 1) + ' of ' + bodies.length + ' / DOCKED';
        if (b.group.members) b.group.members.forEach(function (n) { b.group.element.appendChild(n); });
        content.appendChild(b.group.element); thumb.appendChild(b.svg);
        neutralize(b.group);
        var tools = b.group.element.querySelector('.toggle');
        if (tools) { b.tools = tools; b.toolsAnchor = document.createComment('orb switch plate'); tools.parentNode.insertBefore(b.toolsAnchor, tools); headTools.appendChild(tools); }
        if (b.entry.mode) { var mode = document.querySelector(b.entry.mode); if (mode) mode.click(); }
        if (dock) { headTools.appendChild(dock); document.dispatchEvent(new CustomEvent('bw:orbit', { detail: { open: true } })); }
        content.scrollTo({ top: b.scroll, behavior: 'instant' }); panel.classList.toggle('orb__scrolled', b.scroll > 12);
        prevBody.setAttribute('aria-label', 'Previous body: ' + bodies[(i + bodies.length - 1) % bodies.length].title);
        nextBody.setAttribute('aria-label', 'Next body: ' + bodies[(i + 1) % bodies.length].title);
        b.status.textContent = 'docked'; b.button.setAttribute('aria-expanded', 'true'); b.button.setAttribute('aria-label', (i + 1) + '. ' + b.title + ' — docked'); b.button.dataset.state = 'open';
        stored[planet] = i; safeStorage('bw.orbit.state.v1', stored); hash(i); announce('Panel opened: ' + b.title);
        // A port can be changed during the sheet's entrance, when its opacity
        // is legitimately between .35 and 1; do not mistake that for failure.
      }
      function open(i) {
        i = (i + bodies.length) % bodies.length;
        if (state.phase === 'locked' || state.phase === 'transit' || state.phase === 'closing') { desiredIndex = i; return; }
        if (state.openIndex === i) return;
        if (state.openIndex < 0 && layer.classList.contains('orb__approaching')) { desiredIndex = i; return; }
        lockedAt = performance.now();
        if (state.openIndex >= 0) {
          var previous = state.openIndex, focused = document.activeElement;
          if (crossFade) { crossFade.cancel(); crossFade = null; }
          panel.classList.add('orb__switching'); putBack(); mount(i); state.phase = 'open';
          if (!reduced.matches && content.animate) {
            var direction = (i - previous + bodies.length) % bodies.length === bodies.length - 1 ? -1 : 1;
            crossFade = content.animate([{ transform: 'translate3d(' + direction * 10 + 'px,0,0)', opacity: .65 }, { transform: 'translate3d(0,0,0)', opacity: 1 }], { duration: 180, easing: 'cubic-bezier(.16,1,.3,1)' });
            crossFade.onfinish = function () { crossFade.cancel(); crossFade = null; };
          }
          if (!panel.contains(focused)) close.focus({ preventScroll: true });
          return;
        }
        var b = bodies[i]; lockedIndex = i; state.phase = 'locked'; b.button.dataset.state = 'locked'; b.status.textContent = 'docking…';
        animations.forEach(function (a) { a.pause(); });
        lightBody(b, anchor()); b.frozenTransform = getComputedStyle(b.button).transform;
        dockScroll = window.scrollY; scrollLock(true); backgroundInert(true);
        layer.classList.remove('orb__offstage'); root.classList.add('orb-open');
        window.__orbitReading = true; document.dispatchEvent(new CustomEvent('bw:orbit', { detail: { open: true, title: b.title } }));
        function transit() {
          state.phase = 'transit'; b.button.dataset.state = 'transit';
          var a = anchor();
          if (!reduced.matches && b.button.animate) {
            var flight = b.button.animate([{ transform: b.frozenTransform }, { transform: 'translate3d(' + (innerWidth / 2 - a.x) + 'px,' + (innerHeight * .18 - a.y) + 'px,0) scale(.5)' }], { duration: 300, easing: 'cubic-bezier(.16,1,.3,1)' }); b.flight = flight;
          }
          if (reduced.matches) reveal(); else dockingTimer = later(reveal, 300);
        }
        function reveal() {
          pendingReveal = null; lockedIndex = -1;
          if (b.flight) { b.flight.cancel(); b.flight = null; }
          delete panel.dataset.state; panel.classList.remove('orb__switching','orb__dragging'); panel.style.animation = ''; panel.style.transform = ''; panel.style.removeProperty('--orb-sheet-offset');
          panel.hidden = veil.hidden = false; mount(i); state.phase = 'open'; panel.dataset.state = 'open'; outsideAt = performance.now(); close.focus({ preventScroll: true });
          if (desiredIndex >= 0) { var next = desiredIndex; desiredIndex = -1; open(next); }
        }
        pendingReveal = reveal;
        if (reduced.matches) transit(); else dockingTimer = later(transit, 120);
      }
      function closePanel() {
        if (lockedIndex >= 0 && state.openIndex < 0) {
          var locked = bodies[lockedIndex]; clearTimeout(dockingTimer); pendingReveal = null; lockedIndex = -1; desiredIndex = -1;
          if (locked.flight) { locked.flight.cancel(); locked.flight = null; }
          locked.button.dataset.state = 'idle'; locked.status.textContent = 'closed';
          root.classList.remove('orb-open'); state.phase = 'idle'; window.__orbitReading = false;
          backgroundInert(false); scrollLock(false); animations.forEach(function (a) { if (!document.hidden) a.play(); });
          locked.button.focus({ preventScroll: true }); announce('Docking cancelled');
          document.dispatchEvent(new CustomEvent('bw:orbit', { detail: { open: false } }));
          return;
        }
        if (state.openIndex < 0 || state.phase === 'closing') return;
        if (crossFade) { crossFade.cancel(); crossFade = null; }
        if (sheetSettle) { sheetSettle.cancel(); sheetSettle = null; }
        sheetDrag = null;
        var b = bodies[state.openIndex]; state.phase = 'closing'; panel.style.animation = ''; panel.dataset.state = 'closing';
        window.__orbitReading = false;
        // Take the scrim down in step with the fold instead of leaving ~450ms of
        // bare scrim behind a panel that has already gone. Guarded, and skipped
        // when motion is reduced (finish() then hides it immediately).
        if (!reduced.matches && veil.animate) {
          try { veilFade = veil.animate([{ opacity: getComputedStyle(veil).opacity }, { opacity: 0 }], { duration: 210, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' }); }
          catch (_) { veilFade = null; }
        }
        if (!reduced.matches) returnTimer = later(function () {
          b.drift.insertBefore(b.svg, b.drift.firstChild); b.button.dataset.state = 'closing';
          var a = anchor(); var retreat = b.button.animate([{ transform: 'translate3d(' + (innerWidth / 2 - a.x) + 'px,' + (innerHeight * .18 - a.y) + 'px,0) scale(.5)', opacity: 0 }, { transform: b.frozenTransform || transformAt(b, phaseAt(b)), opacity: 1 }], { duration: 294, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' }); b.retreat = retreat;
          retreat.onfinish = finish;
        }, 210);
        function finish() {
          if (!active || state.phase !== 'closing') return;
          clearTimeout(returnTimer); clearTimeout(closeTimer); pendingFinish = null;
          putBack(); panel.hidden = veil.hidden = true; delete panel.dataset.state; panel.style.transform = ''; panel.style.removeProperty('--orb-sheet-offset'); root.classList.remove('orb-open'); state.phase = 'idle'; backgroundInert(false); scrollLock(false); hash(-1);
          if (b.retreat) { b.retreat.cancel(); b.retreat = null; }
          if (veilFade) { try { veilFade.cancel(); } catch (_) {} veilFade = null; }
          animations.forEach(function (a) { if (a.playState === 'paused' && !document.hidden) a.play(); });
          b.button.focus({ preventScroll: true }); state.phase = 'idle'; announce('Panel closed: ' + b.title);
          document.dispatchEvent(new CustomEvent('bw:orbit', { detail: { open: false } }));
          if (desiredIndex >= 0) { var next = desiredIndex; desiredIndex = -1; open(next); }
        }
        pendingFinish = finish;
        if (reduced.matches) finish(); else closeTimer = later(finish, 560);
      }
      listen(close, 'click', closePanel);
      listen(handle, 'click', function (e) { if (e.detail === 0 || performance.now() > handleClickBlockedUntil) closePanel(); });
      listen(veil, 'click', function () { if (performance.now() - outsideAt > 260) closePanel(); });
      listen(prevBody, 'click', function () { open(state.openIndex - 1); }); listen(nextBody, 'click', function () { open(state.openIndex + 1); });
      listen(content, 'scroll', function () { panel.classList.toggle('orb__scrolled', content.scrollTop > 12); });
      listen(window, 'scroll', function () {
        if (state.openIndex >= 0 || !active) return;
        var progress = Math.min(1, window.scrollY / Math.max(1, innerHeight * .7));
        // Ground Control owns the end of the page: fold the whole belt away
        // well before the footer so nothing orbits across it.
        var remaining = Math.max(0, (document.documentElement.scrollHeight - innerHeight) - window.scrollY);
        var beforeEnd = Math.min(1, remaining / Math.max(1, innerHeight * .6));
        layer.style.opacity = String(Math.min(1 - progress * .65, beforeEnd));
        stage.style.setProperty('--orb-scroll', progress.toFixed(3));
      }, { passive: true });
      listen(document, 'keydown', function (e) {
        var typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
        if (e.key === 'Escape' && lockedIndex >= 0) { e.preventDefault(); e.stopImmediatePropagation(); closePanel(); return; }
        if (state.openIndex >= 0) {
          if (e.key === 'Escape') {
            // Deadline search owns its first Escape; a second Escape closes the ship.
            if (dock && document.activeElement === dock.querySelector('#dlSearch')) return;
            e.preventDefault(); e.stopImmediatePropagation(); closePanel(); return;
          }
          if (!typing && ['ArrowLeft', 'ArrowRight', '[', ']'].includes(e.key)) { e.preventDefault(); open(state.openIndex + (e.key === 'ArrowLeft' || e.key === '[' ? -1 : 1)); return; }
          if (e.key === 'Tab') {
            var items = Array.from(panel.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select,[tabindex="0"]')).filter(function (n) { return n.getClientRects().length && !n.closest('[hidden]'); });
            var at = items.indexOf(document.activeElement);
            if (e.shiftKey && at <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
            else if (!e.shiftKey && (at < 0 || at === items.length - 1)) { e.preventDefault(); items[0].focus(); }
          }
          if (e.key === 'Home' && !typing && !dock) { e.preventDefault(); content.scrollTop = 0; }
        } else if (!typing) {
          if (e.key === 'Tab') {
            var visibleBodies = bodies.filter(function (b) { return b.button.tabIndex === 0; });
            if (!e.shiftKey && document.activeElement === core && visibleBodies.length) { e.preventDefault(); visibleBodies[0].button.focus(); return; }
            if (e.shiftKey && visibleBodies.length && document.activeElement === visibleBodies[0].button) { e.preventDefault(); core.focus(); return; }
            if (!e.shiftKey && visibleBodies.length && document.activeElement === visibleBodies[visibleBodies.length - 1].button) { var ground = document.querySelector('.foot__nav a'); if (ground) { e.preventDefault(); ground.focus(); } return; }
          }
          if (dock && ['/', 'ArrowDown', 'ArrowUp', 'j', 'k', 'x', 'End'].includes(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); return; }
          if (e.key === 'Home') { e.preventDefault(); e.stopImmediatePropagation(); core.focus(); }
          if (['ArrowLeft', 'ArrowRight', '[', ']'].includes(e.key)) { var at = bodies.findIndex(function (b) { return b.button === document.activeElement; }); e.preventDefault(); var next = (Math.max(0, at) + (e.key === 'ArrowLeft' || e.key === '[' ? bodies.length - 1 : 1)) % bodies.length; if (mobile || narrow) { turn = ((next - 1) % bodies.length + bodies.length) % bodies.length; layout(true); } open(next); }
        }
      }, true);
      var drag = null;
      listen(layer, 'pointerdown', function (e) { if ((!mobile && !narrow) || state.openIndex >= 0 || !e.isPrimary || e.button !== 0) return; drag = { x: e.clientX, y: e.clientY, time: performance.now(), turn: turn, id: e.pointerId }; });
      listen(window, 'pointerup', function (e) {
        if (!drag || e.pointerId !== drag.id) return; var dx = e.clientX - drag.x, dy = e.clientY - drag.y, speed = dx / Math.max(1, performance.now() - drag.time) * 1000;
        if (Math.abs(dx) > Math.abs(dy) * 1.2 && (Math.abs(dx) > 26 || Math.abs(dx) > 10 && Math.abs(speed) > 120)) { lockedAt = performance.now(); turn = ((drag.turn + (dx < 0 ? 1 : bodies.length - 1)) % bodies.length + bodies.length) % bodies.length; layout(true); }
        drag = null;
      });
      listen(window, 'pointercancel', function () { drag = null; });
      function settleSheet() {
        if (!sheetDrag) return;
        var offset = sheetDrag.offset; sheetDrag = null; panel.classList.remove('orb__dragging');
        if (!reduced.matches && offset > 0 && panel.animate) {
          sheetSettle = panel.animate([{ transform: 'translate3d(0,' + offset + 'px,0)' }, { transform: 'translate3d(0,0,0)' }], { duration: 180, easing: 'cubic-bezier(.16,1,.3,1)' });
          sheetSettle.onfinish = function () { sheetSettle.cancel(); sheetSettle = null; };
        }
        panel.style.transform = ''; panel.style.removeProperty('--orb-sheet-offset');
      }
      listen(handle, 'pointerdown', function (e) {
        if (!mobile || state.phase !== 'open' || !e.isPrimary || e.button !== 0) return;
        if (sheetSettle) { sheetSettle.cancel(); sheetSettle = null; }
        panel.style.animation = 'none'; panel.classList.add('orb__dragging');
        sheetDrag = { y: e.clientY, offset: 0, id: e.pointerId }; handle.setPointerCapture(e.pointerId);
      });
      listen(handle, 'pointermove', function (e) {
        if (!sheetDrag || e.pointerId !== sheetDrag.id) return;
        var dy = e.clientY - sheetDrag.y;
        if (Math.abs(dy) > 4) handleClickBlockedUntil = performance.now() + 500;
        sheetDrag.offset = Math.max(0, dy);
        if (!reduced.matches) { panel.style.transform = 'translate3d(0,' + sheetDrag.offset + 'px,0)'; panel.style.setProperty('--orb-sheet-offset', sheetDrag.offset + 'px'); }
      });
      listen(handle, 'pointerup', function (e) {
        if (!sheetDrag || e.pointerId !== sheetDrag.id) return;
        // Browsers may coalesce the last pointermove. Suppress the synthetic
        // click from the release delta too, so a short fast pull is not a tap.
        if (Math.abs(e.clientY - sheetDrag.y) > 4) handleClickBlockedUntil = performance.now() + 500;
        sheetDrag.offset = Math.max(0, e.clientY - sheetDrag.y);
        if (!reduced.matches) panel.style.setProperty('--orb-sheet-offset', sheetDrag.offset + 'px');
        if (sheetDrag.offset > 60) { panel.classList.remove('orb__dragging'); closePanel(); }
        else settleSheet();
      });
      listen(handle, 'pointercancel', function () { if (sheetDrag) handleClickBlockedUntil = performance.now() + 500; settleSheet(); });
      listen(handle, 'lostpointercapture', settleSheet);
      listen(window, 'resize', function () { settleSheet(); cancelAnimationFrame(frame); frame = requestAnimationFrame(function () { try { layout(true); } catch (_) { cleanup(); } }); });
      listen(document, 'visibilitychange', function () { root.classList.toggle('orb-hidden', document.hidden); animations.forEach(function (a) { if (document.hidden || state.openIndex >= 0) a.pause(); else a.play(); }); });
      listen(reduced, 'change', function () {
        root.classList.toggle('orb-reduced', reduced.matches);
        if (reduced.matches) {
          if (crossFade) { crossFade.cancel(); crossFade = null; }
          if (sheetSettle) { sheetSettle.cancel(); sheetSettle = null; }
          settleSheet();
          if (pendingReveal) { clearTimeout(dockingTimer); pendingReveal(); }
          if (pendingFinish) pendingFinish();
        }
        layout(true);
      });
      listen(window, 'pagehide', cleanup);
      root.classList.toggle('orb-reduced', reduced.matches);
      layout(true);
      wrap.hidden = true; wrap.inert = true; root.classList.add('orb-ready');
      document.dispatchEvent(new CustomEvent('bw:orbit', { detail: { open: false } }));
      interval = setInterval(function () {
        if (!active || document.hidden || state.openIndex >= 0) return;
        try {
          layout(false);
          if (desiredIndex >= 0 && !layer.inert && !['locked','transit','closing'].includes(state.phase)) { var next = desiredIndex; desiredIndex = -1; open(next); }
        } catch (_) { cleanup(); }
      }, 100);
      // No per-spacecraft launch: the whole belt is already moving when the
      // camera reaches its planet. Only a failed/missing/finished module uses
      // the fallback: a slow CDN must not expose ships ahead of the 3D planet.
      function sceneFailed() { if (!window.__getOrbitAnchor) { sceneUnavailable = true; layout(true); } }
      if (sceneScript) listen(sceneScript, 'error', sceneFailed);
      listen(window, 'load', sceneFailed);
      listen(document, 'bw:orbit-flight', function () { layer.classList.add('orb__approaching'); layer.inert = true; bodies.forEach(function (b) { b.button.tabIndex = -1; }); });
      var match = location.hash.match(new RegExp('^#orb-' + planet + '-(\\d+)$'));
      if (match && bodies[Number(match[1]) - 1]) later(function () { open(Number(match[1]) - 1); }, reduced.matches ? 0 : 1500);
      // Stage/ground-control visibility without per-frame geometry reads.
      if (window.IntersectionObserver) { observer = new IntersectionObserver(function (entries) { var off = !entries[0].isIntersecting && state.openIndex < 0; layer.classList.toggle('orb__offstage', off); bodies.forEach(function (b) { b.button.tabIndex = off || layer.inert ? -1 : getComputedStyle(b.button).visibility === 'visible' ? 0 : -1; if (b.motion) { if (off) b.motion.pause(); else if (state.openIndex < 0 && !document.hidden) b.motion.play(); } }); }, { threshold: .18 }); observer.observe(stage); }
      listen(window, 'hashchange', function () { var m = location.hash.match(new RegExp('^#orb-' + planet + '-(\\d+)$')); if (m && bodies[Number(m[1]) - 1]) open(Number(m[1]) - 1); });
      run.open = open; run.close = closePanel; run.place = place;
    } catch (err) { window.__orbitDock.lastError = String(err); cleanup(); }
  }
  function ensureStyle() {
    if (document.querySelector('link[href="css/orbit.css"]')) return;
    stylesheet = el('link', ''); stylesheet.rel = 'stylesheet'; stylesheet.href = 'css/orbit.css'; document.head.appendChild(stylesheet);
  }
  window.__orbitDock = { config: ORBIT_CONFIG, kinds: KIND, init: function () { ensureStyle(); start(); }, destroy: function () { if (run) run.destroy(); }, getState: function () { return run ? run.state : null; } };
  start();
  document.addEventListener('bw:page-ready', function () { ensureStyle(); start(); });
  document.addEventListener('bw:page-leave', function () { if (run) run.destroy(); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) start(); });
})();
