/*
 * market-spectrum.js
 *
 * The market-structure sliding scale for Class 7. Perfect competition sits at
 * one end, monopoly at the other, and a draggable marker slides between them —
 * the point being that "price taker" and "price maker" are the two extremes of
 * a continuum.
 *
 * The zones are ordered by how much market power the structure *typically*
 * confers, but oligopoly is deliberately described as indeterminate: with price
 * competition over identical goods it collapses to P = MC (Bertrand), with
 * quantity competition it sits strictly between (Cournot), and with sustained
 * collusion it reaches the monopoly outcome. Class 7 ends by showing a duopoly
 * landing at the *competitive* end, so this card must not promise a middling
 * result — that would give away a wrong answer.
 *
 * Markup is a single empty div:
 *
 *   <div class="market-spectrum" data-pos="50"></div>
 *
 * data-pos (0 = perfect competition, 100 = monopoly) sets where the marker
 * starts. The deck can also call el.marketSpectrum.set(pos) to drive it — the
 * Class 7 payoff slide uses that to snap the marker back to the competitive end
 * once the Bertrand result lands.
 *
 * Follows the widget pattern in elasticity-explorer.js / demand-builder.js.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  var INK = '#111111', MUTED = '#6b6b6b';

  /* The four regimes, left (most competitive) to right (least). */
  var REGIMES = [
    {
      max: 12,
      key: 'pc',
      name: 'Perfect competition',
      tag: 'price takers',
      color: '#1e2bfa',
      firms: 'Very many, each tiny',
      price: '<em>P</em> = <em>MC</em>',
      power: 'None — the firm takes the price as given',
      profit: 'Zero in the long run',
      dwl: 'None if there are no market failures',
      eg: 'Wheat; one stall among hundreds at a produce market'
    },
    {
      max: 42,
      key: 'mc',
      name: 'Monopolistic competition',
      tag: 'many firms, differentiated products',
      color: '#4c56fb',
      firms: 'Many, but each sells something slightly different',
      price: '<em>P</em> above <em>MC</em>',
      power: 'Depends on differentiation and substitutes',
      profit: 'Competed back down to about zero as rivals enter',
      dwl: 'Depends on demand and costs',
      eg: 'Coffee shops; restaurants; hair salons'
    },
    {
      max: 80,
      key: 'oligopoly',
      name: 'Oligopoly',
      tag: 'a handful of firms who watch each other',
      color: '#d97706',
      today: true,
      firms: 'A handful — few enough to know each rival by name',
      price: 'Not pinned down: anywhere from <em>P</em> = <em>MC</em> to the monopoly price',
      power: 'However much their <em>strategies</em> leave them',
      profit: 'Depends on costs, demand, entry, and strategies',
      dwl: 'Anywhere from none at all to monopoly-sized',
      eg: 'Airlines; phone carriers; two gas stations on the same corner',
      note: 'Unlike the other three, oligopoly has <strong>no single answer</strong>. Where it lands ' +
            'depends on what the firms compete on and whether they can hold a bargain together — ' +
            'so it can sit anywhere on this scale, including right at either end. Pinning that down ' +
            'is what today is about.'
    },
    {
      max: 100,
      key: 'monopoly',
      name: 'Monopoly',
      tag: 'price maker',
      color: '#be123c',
      firms: 'One',
      price: 'Choose output where <em>MR</em> = <em>MC</em>; read price from demand',
      power: 'Constrained by demand and possible substitutes',
      profit: 'Can be positive; depends on demand and total cost',
      dwl: 'Depends on the output restriction, demand, and costs',
      eg: 'A drug still under patent; the only water utility in town'
    }
  ];

  var X0 = 70, X1 = 830, BAR_Y = 78, BAR_H = 26;
  // The marker pin rides above the bar, so at pos 0 and pos 100 it sits directly
  // over the end captions. Insetting them by the width of the arrowheads keeps
  // both readable no matter where the marker is parked.
  var CAP_INSET = 34;

  function regimeAt(pos) {
    for (var i = 0; i < REGIMES.length; i++) if (pos <= REGIMES[i].max) return REGIMES[i];
    return REGIMES[REGIMES.length - 1];
  }
  function bx(pos) { return X0 + (pos / 100) * (X1 - X0); }

  function svgEl(parent, tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    parent.appendChild(n);
    return n;
  }
  function el(parent, tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    parent.appendChild(n);
    return n;
  }

  function build(root) {
    var pos = parseFloat(root.dataset.pos);
    if (!isFinite(pos)) pos = 50;

    // ---------- the scale ----------
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 900 150');
    svg.setAttribute('class', 'ms-scale');
    svg.setAttribute('role', 'img');
    root.appendChild(svg);

    var defs = svgEl(svg, 'defs');
    var grad = svgEl(defs, 'linearGradient', { id: 'msGrad', x1: '0', y1: '0', x2: '1', y2: '0' });
    svgEl(grad, 'stop', { offset: '0%', 'stop-color': '#1e2bfa' });
    svgEl(grad, 'stop', { offset: '38%', 'stop-color': '#4c56fb' });
    svgEl(grad, 'stop', { offset: '68%', 'stop-color': '#d97706' });
    svgEl(grad, 'stop', { offset: '100%', 'stop-color': '#be123c' });

    // end captions
    svgEl(svg, 'text', {
      x: X0 + CAP_INSET, y: 30, 'font-size': 15, 'font-weight': 800, fill: '#1e2bfa'
    }, 'PERFECT COMPETITION');
    svgEl(svg, 'text', {
      x: X0 + CAP_INSET, y: 48, 'font-size': 12.5, fill: MUTED
    }, 'no market power · price taker');
    svgEl(svg, 'text', {
      x: X1 - CAP_INSET, y: 30, 'font-size': 15, 'font-weight': 800, fill: '#be123c', 'text-anchor': 'end'
    }, 'MONOPOLY');
    svgEl(svg, 'text', {
      x: X1 - CAP_INSET, y: 48, 'font-size': 12.5, fill: MUTED, 'text-anchor': 'end'
    }, 'all the market power · price maker');

    // the bar itself, with an arrowhead at each end
    svgEl(svg, 'polygon', {
      points: (X0 - 34) + ',' + (BAR_Y + BAR_H / 2) + ' ' + X0 + ',' + (BAR_Y - 6) + ' ' + X0 + ',' + (BAR_Y + BAR_H + 6),
      fill: '#1e2bfa'
    });
    svgEl(svg, 'polygon', {
      points: (X1 + 34) + ',' + (BAR_Y + BAR_H / 2) + ' ' + X1 + ',' + (BAR_Y - 6) + ' ' + X1 + ',' + (BAR_Y + BAR_H + 6),
      fill: '#be123c'
    });
    svgEl(svg, 'rect', {
      x: X0, y: BAR_Y, width: X1 - X0, height: BAR_H, fill: 'url(#msGrad)'
    });

    // zone dividers + labels
    var prev = 0;
    REGIMES.forEach(function (r, i) {
      if (i > 0) {
        svgEl(svg, 'line', {
          x1: bx(prev), y1: BAR_Y, x2: bx(prev), y2: BAR_Y + BAR_H,
          stroke: '#ffffff', 'stroke-width': 2, 'stroke-opacity': 0.85
        });
      }
      var mid = (prev + r.max) / 2;
      var t = svgEl(svg, 'text', {
        x: bx(mid), y: BAR_Y + BAR_H + 20, 'font-size': 12, 'font-weight': 700,
        fill: r.color, 'text-anchor': 'middle', 'data-zone': r.key
      }, r.name);
      if (r.today) {
        svgEl(svg, 'text', {
          x: bx(mid), y: BAR_Y + BAR_H + 36, 'font-size': 11, 'font-weight': 700,
          fill: '#b45309', 'text-anchor': 'middle'
        }, '↑ today');
      }
      prev = r.max;
    });

    // the marker: a pin hanging over the bar
    var marker = svgEl(svg, 'g', { 'class': 'ms-marker' });
    svgEl(marker, 'path', {
      d: 'M -11 -20 L 11 -20 L 0 -2 Z', fill: INK
    });
    svgEl(marker, 'circle', { cx: 0, cy: -28, r: 9, fill: INK, stroke: '#fff', 'stroke-width': 2.5 });
    svgEl(marker, 'line', { x1: 0, y1: -2, x2: 0, y2: BAR_H + 4, stroke: INK, 'stroke-width': 2.5 });

    // ---------- the slider ----------
    var controls = el(root, 'div', 'ms-controls');
    el(controls, 'span', 'ms-controls-label', 'Slide it &rarr;');
    var slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'ms-slider';
    slider.min = '0';
    slider.max = '100';
    slider.step = '1';
    slider.value = String(pos);
    slider.setAttribute('aria-label',
      'Market structure, from perfect competition at 0 to monopoly at 100');
    controls.appendChild(slider);
    slider.addEventListener('keydown', function (e) { e.stopPropagation(); });
    slider.addEventListener('keyup', function (e) { e.stopPropagation(); });

    // ---------- the description card ----------
    var card = el(root, 'div', 'ms-card');
    var head = el(card, 'div', 'ms-card-head');
    var name = el(head, 'span', 'ms-name', '');
    var tag = el(head, 'span', 'ms-tag', '');
    var grid = el(card, 'div', 'ms-grid');

    var ROWS = [
      ['How many firms?', 'firms'],
      ['Price vs. marginal cost', 'price'],
      ['Market power', 'power'],
      ['Long-run profit', 'profit'],
      ['Deadweight loss', 'dwl'],
      ['For example', 'eg']
    ];
    var cells = ROWS.map(function (row) {
      el(grid, 'div', 'ms-k', row[0]);
      return { key: row[1], node: el(grid, 'div', 'ms-v', '') };
    });
    var note = el(card, 'p', 'ms-note', '');

    function render() {
      var p = parseFloat(slider.value);
      var r = regimeAt(p);

      marker.setAttribute('transform', 'translate(' + bx(p) + ',' + BAR_Y + ')');

      name.textContent = r.name;
      name.style.color = r.color;
      tag.textContent = r.tag;
      card.style.borderLeftColor = r.color;

      cells.forEach(function (c) { c.node.innerHTML = r[c.key]; });

      // only oligopoly carries a caveat, so the note appears and disappears
      note.innerHTML = r.note || '';
      note.style.display = r.note ? '' : 'none';
      note.style.borderTopColor = r.color;

      // dim the zone labels that aren't the live one
      svg.querySelectorAll('text[data-zone]').forEach(function (t) {
        t.setAttribute('opacity', t.getAttribute('data-zone') === r.key ? '1' : '0.42');
      });

      svg.setAttribute('aria-label',
        'A sliding scale of market structures, ordered by how much market power they confer: ' +
        'perfect competition on the left, then monopolistic competition, then oligopoly, then ' +
        'monopoly on the right. The marker is currently on ' + r.name + ': ' + r.tag + '.' +
        (r.note ? ' Oligopoly has no single outcome — it can land anywhere on the scale.' : ''));
    }

    slider.addEventListener('input', render);
    ['touchstart', 'touchmove', 'touchend'].forEach(function (type) {
      root.addEventListener(type, function (e) { e.stopPropagation(); }, { passive: true });
    });

    root.marketSpectrum = {
      set: function (v) { slider.value = String(v); render(); }
    };

    render();
  }

  document.querySelectorAll('div.market-spectrum').forEach(build);
})();
