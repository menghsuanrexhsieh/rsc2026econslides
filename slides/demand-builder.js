/*
 * demand-builder.js
 *
 * "Build your own demand curve" widget. Adapted from elasticity-explorer.js:
 * the student types the two POSITIVE coefficients of the affine demand curve
 * Q = A - B*P into <input> slots, and the chart re-renders live — axis
 * intercepts move (Q-intercept = A, P-intercept = A/B), the midpoint is marked
 * with dotted guide lines, and a point can be dragged along the curve to read
 * off the point elasticity |e| = B*P/Q, classified elastic / unit / inelastic.
 *
 * Markup:
 *   <svg class="demand-builder" data-a="12" data-b="2"
 *        data-input-a="db-a" data-input-b="db-b"></svg>
 *   <input id="db-a" class="coeff-input"> ... <input id="db-b" class="coeff-input">
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  var REGIMES = {
    elastic:   { fill: '#d97706', text: '#b45309', tint: 'rgba(217, 119, 6, 0.13)',
                 chip: 'ELASTIC · |ε| > 1',
                 note: '%ΔQ exceeds %ΔP — consumers are highly responsive here.' },
    unit:      { fill: '#7c3aed', text: '#6d28d9', tint: 'rgba(124, 58, 237, 0.13)',
                 chip: 'UNIT-ELASTIC · |ε| = 1',
                 note: '%ΔQ exactly matches %ΔP — the midpoint of a linear demand curve.' },
    inelastic: { fill: '#0d9488', text: '#0f766e', tint: 'rgba(13, 148, 136, 0.13)',
                 chip: 'INELASTIC · |ε| < 1',
                 note: '%ΔQ is smaller than %ΔP — consumers barely respond here.' }
  };

  var INK = '#1e293b', MUTED = '#64748b', AXIS = '#475569', GUIDE = '#94a3b8';
  var MID = '#7c3aed';
  var T_MIN = 0.05, T_STEP = 0.025;

  function make(parent, tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    parent.appendChild(n);
    return n;
  }
  function fmt(v) { return v.toFixed(2).replace(/\.?0+$/, ''); }

  function build(svg) {
    // Plot geometry inside the 760x520 viewBox.
    var X0 = 70, Y0 = 460, XI = 650, YI = 100;
    var A, B, Pmax, dx, dy, len, tCur = 0.35, dragging = false;

    // References to the parts that change every render / drag.
    var els = {};

    function qx(q) { return X0 + (q / A) * (XI - X0); }
    function py(p) { return Y0 - (p / Pmax) * (Y0 - YI); }

    function render(newA, newB) {
      A = newA; B = newB; Pmax = A / B;
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      // ---- axes ----
      make(svg, 'line', { x1: X0, y1: Y0, x2: 705, y2: Y0, stroke: AXIS, 'stroke-width': 2.5 });
      make(svg, 'polygon', { points: '705,455 705,465 716,460', fill: AXIS });
      make(svg, 'line', { x1: X0, y1: Y0, x2: X0, y2: 52, stroke: AXIS, 'stroke-width': 2.5 });
      make(svg, 'polygon', { points: '65,52 75,52 70,41', fill: AXIS });
      make(svg, 'text', { x: 723, y: 466, 'font-size': 17, fill: INK, 'font-style': 'italic' }, 'Q');
      make(svg, 'text', { x: 44, y: 34, 'font-size': 17, fill: INK, 'font-style': 'italic' }, 'P ($)');

      // Intercept labels (update with the coefficients)
      make(svg, 'text', { x: 62, y: YI + 5, 'font-size': 15, 'font-weight': 700, fill: MUTED, 'text-anchor': 'end' }, fmt(Pmax));
      make(svg, 'text', { x: XI, y: Y0 + 24, 'font-size': 15, 'font-weight': 700, fill: MUTED, 'text-anchor': 'middle' }, fmt(A));
      make(svg, 'circle', { cx: X0, cy: YI, r: 4, fill: MUTED });
      make(svg, 'circle', { cx: XI, cy: Y0, r: 4, fill: MUTED });

      // ---- demand curve ----
      make(svg, 'line', { x1: qx(0), y1: py(Pmax), x2: qx(A), y2: py(0), stroke: INK, 'stroke-width': 3.5 });
      make(svg, 'text', { x: XI + 6, y: Y0 - 8, 'font-size': 17, fill: INK, 'font-style': 'italic' }, 'D');

      dx = qx(A) - qx(0); dy = py(0) - py(Pmax);
      len = Math.sqrt(dx * dx + dy * dy);

      // ---- midpoint: dotted guides to both axes + label ----
      var mx = qx(A / 2), my = py(Pmax / 2);
      make(svg, 'line', { x1: X0, y1: my, x2: mx, y2: my, stroke: MID, 'stroke-width': 1.5, 'stroke-dasharray': '3 4' });
      make(svg, 'line', { x1: mx, y1: my, x2: mx, y2: Y0, stroke: MID, 'stroke-width': 1.5, 'stroke-dasharray': '3 4' });
      make(svg, 'circle', { cx: mx, cy: my, r: 5, fill: '#ffffff', stroke: MID, 'stroke-width': 2.5 });
      make(svg, 'text', { x: mx + 10, y: my - 8, 'font-size': 13, 'font-weight': 700, fill: MID }, 'midpoint · |ε| = 1');
      make(svg, 'text', { x: 62, y: my + 5, 'font-size': 15, 'font-weight': 700, fill: MID, 'text-anchor': 'end' }, fmt(Pmax / 2));
      make(svg, 'text', { x: mx, y: Y0 + 21, 'font-size': 16, 'font-weight': 700, fill: MID, 'text-anchor': 'middle' }, fmt(A / 2));

      // ---- readout panel ----
      make(svg, 'rect', { x: 425, y: 58, width: 310, height: 132, rx: 10, fill: '#f8fafc', stroke: '#e2e8f0' });
      els.tPQ = make(svg, 'text', { x: 441, y: 90, 'font-size': 18, 'font-weight': 600, fill: INK }, '');
      els.tFormula = make(svg, 'text', { x: 441, y: 118, 'font-size': 16, fill: INK }, '');
      els.chipRect = make(svg, 'rect', { x: 441, y: 134, width: 240, height: 34, rx: 17 });
      els.chipText = make(svg, 'text', { x: 561, y: 156, 'font-size': 14, 'font-weight': 700, 'text-anchor': 'middle', 'letter-spacing': '0.04em' }, '');
      els.tNote = make(svg, 'text', { x: 385, y: 510, 'font-size': 15, fill: AXIS, 'text-anchor': 'middle' }, '');

      // ---- dynamic guides for the dragging point ----
      els.guideH = make(svg, 'line', { stroke: GUIDE, 'stroke-width': 1.5, 'stroke-dasharray': '5 4' });
      els.guideV = make(svg, 'line', { stroke: GUIDE, 'stroke-width': 1.5, 'stroke-dasharray': '5 4' });
      els.pLabel = make(svg, 'text', { x: 62, 'font-size': 16, 'font-weight': 700, 'text-anchor': 'end' }, '');
      els.qLabel = make(svg, 'text', { y: Y0 + 24, 'font-size': 16, 'font-weight': 700, 'text-anchor': 'middle' }, '');

      // ---- draggable handle ----
      els.handle = make(svg, 'circle', { r: 10, stroke: '#ffffff', 'stroke-width': 3 });
      els.hit = make(svg, 'circle', { r: 30, fill: 'rgba(0,0,0,0)', style: 'cursor: grab;' });

      update(tCur);
    }

    function update(t) {
      var q = A * t, p = Pmax * (1 - t);
      var eps = (1 - t) / t;
      var regime = Math.abs(eps - 1) < 1e-9 ? REGIMES.unit : eps > 1 ? REGIMES.elastic : REGIMES.inelastic;
      var x = qx(q), y = py(p);

      els.guideH.setAttribute('x1', X0); els.guideH.setAttribute('y1', y);
      els.guideH.setAttribute('x2', x);  els.guideH.setAttribute('y2', y);
      els.guideV.setAttribute('x1', x);  els.guideV.setAttribute('y1', y);
      els.guideV.setAttribute('x2', x);  els.guideV.setAttribute('y2', Y0);

      els.pLabel.setAttribute('y', y + 6); els.pLabel.setAttribute('fill', regime.text); els.pLabel.textContent = fmt(p);
      els.qLabel.setAttribute('x', x); els.qLabel.setAttribute('fill', regime.text); els.qLabel.textContent = fmt(q);

      els.handle.setAttribute('cx', x); els.handle.setAttribute('cy', y); els.handle.setAttribute('fill', regime.fill);
      els.hit.setAttribute('cx', x); els.hit.setAttribute('cy', y);

      els.tPQ.textContent = 'P = $' + fmt(p) + ' · Q = ' + fmt(q);
      els.tFormula.textContent = '|ε| = ' + fmt(B) + ' × ' + fmt(p) + ' / ' + fmt(q) +
                                 ' = ' + (eps < 10 ? eps.toFixed(2) : eps.toFixed(1));
      els.chipRect.setAttribute('fill', regime.tint);
      els.chipText.setAttribute('fill', regime.text); els.chipText.textContent = regime.chip;
      els.tNote.textContent = regime.note;
    }

    function pointerT(e) {
      var ctm = svg.getScreenCTM();
      if (!ctm) return tCur;
      var pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      var t = ((pt.x - qx(0)) * dx + (pt.y - py(Pmax)) * dy) / (len * len);
      t = Math.max(T_MIN, Math.min(1, t));
      return Math.round(t / T_STEP) * T_STEP;
    }

    // ---- interaction ----
    svg.addEventListener('pointerdown', function (e) {
      e.preventDefault(); e.stopPropagation();
      dragging = true;
      try { svg.setPointerCapture(e.pointerId); } catch (err) { /* gone */ }
      tCur = pointerT(e); update(tCur);
    });
    svg.addEventListener('pointermove', function (e) { if (dragging) { tCur = pointerT(e); update(tCur); } });
    function endDrag() { dragging = false; }
    svg.addEventListener('pointerup', endDrag);
    svg.addEventListener('pointercancel', endDrag);
    ['touchstart', 'touchmove', 'touchend'].forEach(function (type) {
      svg.addEventListener(type, function (e) { e.stopPropagation(); }, { passive: true });
    });
    svg.setAttribute('tabindex', '0');
    svg.addEventListener('keydown', function (e) {
      var delta = 0;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') delta = T_STEP;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') delta = -T_STEP;
      else if (e.key === 'Escape') { svg.blur(); return; }
      else return;
      e.preventDefault(); e.stopPropagation();
      tCur = Math.max(T_MIN, Math.min(1, tCur + delta)); update(tCur);
    });

    // ---- wire the coefficient inputs ----
    var inA = document.getElementById(svg.dataset.inputA);
    var inB = document.getElementById(svg.dataset.inputB);
    function readCoeffs() {
      var a = parseFloat(inA.value), b = parseFloat(inB.value);
      var okA = isFinite(a) && a > 0, okB = isFinite(b) && b > 0;
      inA.classList.toggle('invalid', !okA);
      inB.classList.toggle('invalid', !okB);
      if (okA && okB) render(a, b);
    }
    [inA, inB].forEach(function (input) {
      input.addEventListener('input', readCoeffs);
      // block a leading minus / negative values outright
      input.addEventListener('keydown', function (e) { if (e.key === '-') e.preventDefault(); });
    });

    render(parseFloat(svg.dataset.a), parseFloat(svg.dataset.b));
  }

  document.querySelectorAll('svg.demand-builder').forEach(build);
})();
