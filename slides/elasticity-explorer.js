/*
 * elasticity-explorer.js
 *
 * Interactive point-elasticity widget for the class decks. Any
 * <svg class="elasticity-explorer" data-a="..." data-b="..."> is turned into
 * a chart of the affine demand curve Q = A - B*P with a point that can be
 * dragged (mouse, touch, or stylus) along the curve. As the point moves the
 * chart reports P, Q, and the point elasticity of demand
 * |e| = B * P / Q, classified as elastic / unit-elastic / inelastic.
 *
 * data-a: horizontal (quantity) intercept A
 * data-b: |dQ/dP| slope magnitude B
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  // Regime colors: fills validated for CVD separation and contrast on white;
  // text steps are darker for 4.5:1 text contrast. Matches the deck palette
  // (amber = elastic, violet = unit-elastic, teal = inelastic).
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
  var T_MIN = 0.05, T_STEP = 0.025;

  function make(parent, tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    parent.appendChild(n);
    return n;
  }

  function build(svg) {
    var A = parseFloat(svg.dataset.a);
    var B = parseFloat(svg.dataset.b);
    var Pmax = A / B;

    // Plot geometry inside the 760x520 viewBox (same frame as the deck's
    // animated graphs): origin (70, 460), Q-intercept x = 650, P-intercept y = 100.
    var X0 = 70, Y0 = 460, XI = 650, YI = 100;
    function qx(q) { return X0 + (q / A) * (XI - X0); }
    function py(p) { return Y0 - (p / Pmax) * (Y0 - YI); }

    // ---- axes ----
    make(svg, 'line', { x1: X0, y1: Y0, x2: 705, y2: Y0, stroke: AXIS, 'stroke-width': 2.5 });
    make(svg, 'polygon', { points: '705,455 705,465 716,460', fill: AXIS });
    make(svg, 'line', { x1: X0, y1: Y0, x2: X0, y2: 52, stroke: AXIS, 'stroke-width': 2.5 });
    make(svg, 'polygon', { points: '65,52 75,52 70,41', fill: AXIS });
    make(svg, 'text', { x: 723, y: 466, 'font-size': 17, fill: INK, 'font-style': 'italic' }, 'Q');
    make(svg, 'text', { x: 44, y: 34, 'font-size': 17, fill: INK, 'font-style': 'italic' }, 'P ($)');

    // Intercept labels
    make(svg, 'text', { x: 62, y: YI + 5, 'font-size': 15, fill: MUTED, 'text-anchor': 'end' }, String(Pmax));
    make(svg, 'text', { x: XI, y: Y0 + 24, 'font-size': 15, fill: MUTED, 'text-anchor': 'middle' }, String(A));

    // ---- demand curve ----
    make(svg, 'line', { x1: qx(0), y1: py(Pmax), x2: qx(A), y2: py(0), stroke: INK, 'stroke-width': 3.5 });
    make(svg, 'text', { x: XI + 6, y: Y0 - 8, 'font-size': 17, fill: INK, 'font-style': 'italic' }, 'D');

    // ---- dynamic guides + axis values (created early so labels draw above them) ----
    var guideH = make(svg, 'line', { stroke: GUIDE, 'stroke-width': 1.5, 'stroke-dasharray': '5 4' });
    var guideV = make(svg, 'line', { stroke: GUIDE, 'stroke-width': 1.5, 'stroke-dasharray': '5 4' });
    var pLabel = make(svg, 'text', { x: 62, 'font-size': 16, 'font-weight': 700, 'text-anchor': 'end' }, '');
    var qLabel = make(svg, 'text', { y: Y0 + 24, 'font-size': 16, 'font-weight': 700, 'text-anchor': 'middle' }, '');

    // ---- region annotations along the curve ----
    var dx = qx(A) - qx(0), dy = py(0) - py(Pmax);
    var len = Math.sqrt(dx * dx + dy * dy);
    var nx = dy / len, ny = -dx / len;              // unit normal, pointing up-right
    var angle = Math.atan2(dy, dx) * 180 / Math.PI; // slope angle of D on screen

    function alongCurve(t, offset) {
      return { x: qx(0) + t * dx + offset * nx, y: py(Pmax) + t * dy + offset * ny };
    }
    function regionLabel(t, offset, color, str) {
      var pos = alongCurve(t, offset);
      make(svg, 'text', {
        x: pos.x, y: pos.y, 'font-size': 15, 'font-weight': 600, fill: color,
        'text-anchor': 'middle',
        transform: 'rotate(' + angle.toFixed(1) + ' ' + pos.x.toFixed(1) + ' ' + pos.y.toFixed(1) + ')'
      }, str);
    }
    regionLabel(0.22, 18, REGIMES.elastic.text, 'elastic: |ε| > 1');
    regionLabel(0.78, 18, REGIMES.inelastic.text, 'inelastic: |ε| < 1');

    // Midpoint tick
    var mA = alongCurve(0.5, 9), mB = alongCurve(0.5, -9);
    make(svg, 'line', { x1: mA.x, y1: mA.y, x2: mB.x, y2: mB.y,
                        stroke: REGIMES.unit.text, 'stroke-width': 3 });
    regionLabel(0.5, -22, REGIMES.unit.text, 'midpoint: |ε| = 1');

    // ---- readout panel ----
    make(svg, 'rect', { x: 425, y: 58, width: 310, height: 132, rx: 10,
                        fill: '#f8fafc', stroke: '#e2e8f0' });
    var tPQ = make(svg, 'text', { x: 441, y: 90, 'font-size': 18, 'font-weight': 600, fill: INK }, '');
    var tFormula = make(svg, 'text', { x: 441, y: 118, 'font-size': 16, fill: INK }, '');
    var chipRect = make(svg, 'rect', { x: 441, y: 134, width: 240, height: 34, rx: 17 });
    var chipText = make(svg, 'text', { x: 561, y: 156, 'font-size': 14, 'font-weight': 700,
                                       'text-anchor': 'middle', 'letter-spacing': '0.04em' }, '');

    // Dynamic takeaway sentence under the x-axis
    var tNote = make(svg, 'text', { x: 385, y: 510, 'font-size': 15, fill: AXIS,
                                    'text-anchor': 'middle' }, '');

    // ---- handle (topmost marks) ----
    var handle = make(svg, 'circle', { r: 10, stroke: '#ffffff', 'stroke-width': 3 });
    var dragHint = make(svg, 'text', { 'font-size': 15, 'font-weight': 600, fill: MUTED }, '← drag me');
    var hit = make(svg, 'circle', { r: 30, fill: 'rgba(0,0,0,0)', style: 'cursor: grab;' });

    function fmt(v) { return v.toFixed(2).replace(/\.?0+$/, ''); }

    function update(t) {
      var q = A * t, p = Pmax * (1 - t);
      var eps = (1 - t) / t; // = B * p / q for affine demand
      var regime = Math.abs(eps - 1) < 1e-9 ? REGIMES.unit
                 : eps > 1 ? REGIMES.elastic : REGIMES.inelastic;
      var x = qx(q), y = py(p);

      guideH.setAttribute('x1', X0); guideH.setAttribute('y1', y);
      guideH.setAttribute('x2', x);  guideH.setAttribute('y2', y);
      guideV.setAttribute('x1', x);  guideV.setAttribute('y1', y);
      guideV.setAttribute('x2', x);  guideV.setAttribute('y2', Y0);

      pLabel.setAttribute('y', y + 6);
      pLabel.setAttribute('fill', regime.text);
      pLabel.textContent = fmt(p);
      qLabel.setAttribute('x', x);
      qLabel.setAttribute('fill', regime.text);
      qLabel.textContent = fmt(q);

      handle.setAttribute('cx', x); handle.setAttribute('cy', y);
      handle.setAttribute('fill', regime.fill);
      hit.setAttribute('cx', x); hit.setAttribute('cy', y);
      dragHint.setAttribute('x', x + 22); dragHint.setAttribute('y', y - 14);

      tPQ.textContent = 'P = $' + fmt(p) + ' · Q = ' + fmt(q);
      tFormula.textContent = '|ε| = ' + fmt(B) + ' × ' + fmt(p) + ' / ' + fmt(q) +
                             ' = ' + (eps < 10 ? eps.toFixed(2) : eps.toFixed(1));
      chipRect.setAttribute('fill', regime.tint);
      chipText.setAttribute('fill', regime.text);
      chipText.textContent = regime.chip;
      tNote.textContent = regime.note;
    }

    // ---- interaction ----
    var tCur = 0.35;

    function pointerT(e) {
      var ctm = svg.getScreenCTM();
      if (!ctm) return tCur;
      var pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      // Orthogonal projection of the pointer onto the demand segment
      var t = ((pt.x - qx(0)) * dx + (pt.y - py(Pmax)) * dy) / (len * len);
      t = Math.max(T_MIN, Math.min(1, t));
      return Math.round(t / T_STEP) * T_STEP;
    }

    var dragging = false;
    svg.addEventListener('pointerdown', function (e) {
      e.preventDefault(); // also keeps click from focusing the svg
      e.stopPropagation();
      dragging = true;
      dragHint.remove();
      hit.setAttribute('style', 'cursor: grabbing;');
      try { svg.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
      tCur = pointerT(e);
      update(tCur);
    });
    svg.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      tCur = pointerT(e);
      update(tCur);
    });
    function endDrag() {
      dragging = false;
      hit.setAttribute('style', 'cursor: grab;');
    }
    svg.addEventListener('pointerup', endDrag);
    svg.addEventListener('pointercancel', endDrag);

    // Keep reveal.js from treating drags on the chart as slide swipes
    ['touchstart', 'touchmove', 'touchend'].forEach(function (type) {
      svg.addEventListener(type, function (e) { e.stopPropagation(); }, { passive: true });
    });

    // Keyboard support (Tab to the chart, then arrows walk the curve).
    // Mouse/touch never focuses it, so slide navigation is unaffected.
    svg.setAttribute('tabindex', '0');
    svg.addEventListener('keydown', function (e) {
      var delta = 0;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') delta = T_STEP;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') delta = -T_STEP;
      else if (e.key === 'Escape') { svg.blur(); return; }
      else return;
      e.preventDefault();
      e.stopPropagation();
      tCur = Math.max(T_MIN, Math.min(1, tCur + delta));
      update(tCur);
    });

    update(tCur);
  }

  document.querySelectorAll('svg.elasticity-explorer').forEach(build);
})();
