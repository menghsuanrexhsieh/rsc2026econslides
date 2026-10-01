/*
 * bertrand-game.js
 *
 * The "gas station pricing game" for Class 7 — two stations on the same corner
 * compete on price. Market demand is P = 5 - 0.5Q (i.e. Q = 10 - 2P), marginal
 * cost is a constant $1, and there are no fixed costs. Whoever posts the lower
 * price serves the whole market; a tie splits it 50/50; the loser sells nothing.
 *
 *     pi_win(p) = (p - 1)(10 - 2p)      pi_tie(p) = pi_win(p) / 2      pi_lose = 0
 *
 * Two widgets, both built entirely from JS so the deck markup is a single div:
 *
 *   <div class="bertrand-duel"></div>
 *     The thing the class plays. Type both stations' prices, hit "Run the
 *     round", and it reports units sold and profit for each, appends the round
 *     to a log, and redraws a convergence chart of prices against round number.
 *     Reference lines sit at the collusive price ($3) and at MC ($1) so the
 *     race to the bottom is visible as it happens. The game runs a fixed five
 *     rounds; on the fifth the log closes with each station's total takings,
 *     next to what five rounds of holding at $3 would have paid.
 *
 *   <div class="bertrand-curve" data-rival="3"></div>
 *     The explainer. Drag the rival's price and watch YOUR profit as a function
 *     of YOUR price. The jump at the rival's price is the whole story: undercut
 *     by a penny and you take the entire market.
 *
 * Adapted from the widget pattern in elasticity-explorer.js / demand-builder.js.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  // ---------- market primitives ----------
  var A = 10, B = 2;               // Q = A - B*P
  var MC = 1;                      // constant marginal cost
  var PMAX = A / B;                // $5 — demand hits zero
  var PCOLL = 3;                   // monopoly / collusive price (MR = MC)
  var STEP = 0.01;                 // prices are posted to the cent
  var MAX_ROUNDS = 5;              // the class plays a fixed five rounds

  // ---------- palette ----------
  var INK = '#111111', MUTED = '#6b6b6b', AXIS = '#4d4d4d', GUIDE = '#9a9a9a';

  // The two firms: a hot orange against a deep cobalt. Maximum hue separation,
  // and they differ sharply in lightness too, so the pair survives greyscale
  // printing and the common forms of colour blindness — which a teal/violet
  // pair does not.
  var A_COL = '#ea580c';           // Station A
  var B_COL = '#155e75';           // Station B

  // Benchmarks are annotation, not data. Keeping them neutral means the only
  // saturated ink on a chart always stands for a firm.
  var REF_COLL = '#9a9a9a';        // the collusive price, $3
  var REF_MC = '#4d4d4d';          // marginal cost, $1
  var GOOD = '#1e2bfa';            // the cooperative outcome
  var NEG = '#be123c';             // a loss

  function demand(p) { return Math.max(0, A - B * p); }
  function profitAll(p) { return (p - MC) * demand(p); }
  function money(v) { return (v < 0 ? '−$' : '$') + Math.abs(v).toFixed(2); }
  function qty(v) { return (Math.round(v * 100) / 100).toString(); }

  /* Payoffs of one round. Lower price takes the market; a tie splits it. */
  function payoffs(pa, pb) {
    var qa, qb;
    if (pa < pb)      { qa = demand(pa); qb = 0; }
    else if (pb < pa) { qa = 0;          qb = demand(pb); }
    else              { qa = demand(pa) / 2; qb = qa; }
    return {
      qa: qa, qb: qb,
      pia: (pa - MC) * qa,
      pib: (pb - MC) * qb,
      outcome: pa === pb ? 'tie' : (pa < pb ? 'a' : 'b')
    };
  }

  /* Your best reply to a rival posting r, to the nearest cent. */
  function bestResponse(r) {
    // Check the actual whole-cent action set, including matching and selling
    // nothing. A one-cent undercut need not beat a tie near marginal cost.
    var best = { p: MC, pi: 0, kind: 'none' };
    for (var cents = 0; cents <= Math.round(PMAX * 100); cents++) {
      var p = cents / 100;
      var pi = payoffs(p, r).pia;
      if (pi > best.pi + 1e-10) {
        best = { p: p, pi: pi,
          kind: p === r ? 'match' : (p === PCOLL && r > PCOLL ? 'monopoly' : 'undercut') };
      }
    }
    return best;
  }

  // ---------- tiny DOM helpers ----------
  function svgEl(parent, tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    parent.appendChild(n);
    return n;
  }
  function el(parent, tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    parent.appendChild(n);
    return n;
  }

  /* Reveal reads arrows and digits globally; keep them inside the field. */
  function isolateKeys(input) {
    input.addEventListener('keydown', function (e) { e.stopPropagation(); });
    input.addEventListener('keyup', function (e) { e.stopPropagation(); });
  }
  /* ...and don't let a drag on the widget register as a slide swipe. */
  function isolateTouch(node) {
    ['touchstart', 'touchmove', 'touchend'].forEach(function (type) {
      node.addEventListener(type, function (e) { e.stopPropagation(); }, { passive: true });
    });
  }

  function priceField(row, label, value, color) {
    var wrap = el(row, 'div', 'bg-field');
    var lab = el(wrap, 'label', 'bg-field-label', label);
    lab.style.color = color;
    var box = el(wrap, 'span', 'bg-field-box');
    el(box, 'span', 'bg-dollar', '$');
    var input = document.createElement('input');
    input.type = 'number';
    input.className = 'coeff-input bg-price';
    input.min = '0';
    input.max = String(PMAX);
    input.step = String(STEP);
    input.value = value.toFixed(2);
    input.setAttribute('inputmode', 'decimal');
    input.style.borderColor = color;
    input.setAttribute('aria-label', label + ' price in dollars');
    box.appendChild(input);
    isolateKeys(input);
    return input;
  }

  // =====================================================================
  // Widget A — the duel the class plays
  // =====================================================================
  function buildDuel(root) {
    var rounds = [];

    // --- controls -----------------------------------------------------
    var controls = el(root, 'div', 'bg-row bg-controls');
    var inA = priceField(controls, 'Station A', 3, A_COL);
    var inB = priceField(controls, 'Station B', 3, B_COL);
    var runBtn = el(controls, 'button', 'bg-btn', '⛽ Run the round');
    var resetBtn = el(controls, 'button', 'bg-btn ghost', 'Reset');

    // --- per-station result cards ---------------------------------------
    var cards = el(root, 'div', 'bg-row bg-cards');
    var cardA = makeCard(cards, 'Station A', A_COL);
    var cardB = makeCard(cards, 'Station B', B_COL);

    function makeCard(parent, name, color) {
      var c = el(parent, 'div', 'bg-card');
      c.style.borderLeftColor = color;
      var head = el(c, 'div', 'bg-card-head');
      var t = el(head, 'span', 'bg-card-title', name);
      t.style.color = color;
      var badge = el(head, 'span', 'bg-badge', '—');
      var body = el(c, 'div', 'bg-card-body');
      var sold = el(body, 'span', 'bg-sold', 'sells —');
      var profit = el(body, 'span', 'bg-profit', '—');
      return { root: c, badge: badge, sold: sold, profit: profit, color: color };
    }

    // --- log + chart ----------------------------------------------------
    var lower = el(root, 'div', 'bg-row bg-lower');

    var logWrap = el(lower, 'div', 'bg-log-wrap');
    el(logWrap, 'div', 'bg-panel-title', 'Round log · ' + MAX_ROUNDS + ' rounds');
    var logScroll = el(logWrap, 'div', 'bg-log-scroll');
    var table = el(logScroll, 'table', 'bg-log');
    var thead = el(table, 'thead');
    var hr = el(thead, 'tr');
    ['#', 'A', 'B', 'π A', 'π B'].forEach(function (h) { el(hr, 'th', null, h); });
    var tbody = el(table, 'tbody');
    var emptyRow = el(tbody, 'tr', 'bg-empty');
    el(emptyRow, 'td', null, 'no rounds played yet').setAttribute('colspan', '5');
    // Closed out once the fifth round lands.
    var tfoot = el(table, 'tfoot');
    var totalRow = el(tfoot, 'tr', 'bg-total-row');
    el(totalRow, 'td', null, 'TOTAL').setAttribute('colspan', '3');
    var totalA = el(totalRow, 'td', 'bg-num', '—');
    var totalB = el(totalRow, 'td', 'bg-num', '—');
    tfoot.style.display = 'none';

    var chartWrap = el(lower, 'div', 'bg-chart-wrap');
    el(chartWrap, 'div', 'bg-panel-title', 'Where the block is heading');
    var chart = document.createElementNS(NS, 'svg');
    chart.setAttribute('viewBox', '0 0 480 250');
    chart.setAttribute('class', 'bg-chart');
    chart.setAttribute('role', 'img');
    chart.setAttribute('aria-label',
      'Chart of both stations’ posted prices against round number, with dashed ' +
      'reference lines at the collusive price of $3 and at marginal cost of $1.');
    chartWrap.appendChild(chart);

    // --- the final tally, revealed after the last round --------------------
    var tally = el(root, 'div', 'bg-tally');
    tally.style.display = 'none';

    // --- reference chips -------------------------------------------------
    var chips = el(root, 'div', 'bg-chips');
    addChip(chips, 'Both hold at $3', '→ $4.00 each', GOOD);
    addChip(chips, 'Undercut to $2.99', '→ $8.00, winner takes all', INK);
    addChip(chips, 'Both cut to $1 = MC', '→ $0.00 each', NEG);

    function addChip(parent, label, tail, color) {
      var c = el(parent, 'span', 'bg-chip');
      c.style.borderColor = color;
      var s = el(c, 'strong', null, label);
      s.style.color = color;
      el(c, 'span', null, ' ' + tail);
    }

    // --- chart drawing ---------------------------------------------------
    var X0 = 46, X1 = 462, Y0 = 208, Y1 = 26;

    function py(p) { return Y0 - (p / PMAX) * (Y0 - Y1); }
    function px(i, n) { return n <= 1 ? X0 : X0 + (i / (n - 1)) * (X1 - X0); }

    function drawChart() {
      while (chart.firstChild) chart.removeChild(chart.firstChild);
      var slots = Math.max(6, rounds.length);

      // reference bands
      [{ p: PCOLL, c: REF_COLL, t: 'collude $3' }, { p: MC, c: REF_MC, t: 'MC $1' }].forEach(function (ref) {
        svgEl(chart, 'line', {
          x1: X0, y1: py(ref.p), x2: X1, y2: py(ref.p),
          stroke: ref.c, 'stroke-width': 1.6, 'stroke-dasharray': '6 4', 'stroke-opacity': 0.75
        });
        svgEl(chart, 'text', {
          x: X1, y: py(ref.p) - 5, 'font-size': 11, 'font-weight': 700,
          fill: ref.c, 'text-anchor': 'end'
        }, ref.t);
      });

      // axes
      svgEl(chart, 'line', { x1: X0, y1: Y0, x2: X1, y2: Y0, stroke: AXIS, 'stroke-width': 2 });
      svgEl(chart, 'line', { x1: X0, y1: Y0, x2: X0, y2: Y1, stroke: AXIS, 'stroke-width': 2 });
      svgEl(chart, 'text', {
        x: (X0 + X1) / 2, y: 236, 'font-size': 12, fill: MUTED, 'text-anchor': 'middle'
      }, 'round');
      [0, 1, 2, 3, 4, 5].forEach(function (p) {
        svgEl(chart, 'text', {
          x: X0 - 7, y: py(p) + 4, 'font-size': 11, fill: MUTED, 'text-anchor': 'end'
        }, '$' + p);
      });

      if (!rounds.length) {
        svgEl(chart, 'text', {
          x: (X0 + X1) / 2, y: (Y0 + Y1) / 2, 'font-size': 13, fill: GUIDE, 'text-anchor': 'middle'
        }, 'play a round to start the trace');
        return;
      }

      // round numbers along the axis
      rounds.forEach(function (r, i) {
        svgEl(chart, 'text', {
          x: px(i, slots), y: Y0 + 17, 'font-size': 11, fill: MUTED, 'text-anchor': 'middle'
        }, String(i + 1));
      });

      // B is dashed so the two traces stay legible where they coincide — which,
      // once the price war bites, is most of the chart.
      [{ key: 'pa', c: A_COL, dash: null }, { key: 'pb', c: B_COL, dash: '7 5' }].forEach(function (series) {
        var pts = rounds.map(function (r, i) { return px(i, slots) + ',' + py(r[series.key]); });
        if (rounds.length > 1) {
          var attrs = {
            points: pts.join(' '), fill: 'none', stroke: series.c,
            'stroke-width': 3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'
          };
          if (series.dash) attrs['stroke-dasharray'] = series.dash;
          svgEl(chart, 'polyline', attrs);
        }
        rounds.forEach(function (r, i) {
          svgEl(chart, 'circle', {
            cx: px(i, slots), cy: py(r[series.key]), r: 5,
            fill: series.c, stroke: '#fff', 'stroke-width': 1.5
          });
        });
      });
    }

    // --- a round ----------------------------------------------------------
    function readPrice(input) {
      var v = parseFloat(input.value);
      var ok = isFinite(v) && v >= 0 && v <= PMAX;
      input.classList.toggle('invalid', !ok);
      return ok ? Math.round(v * 100) / 100 : null;
    }

    function paint(card, price, q, pi, role) {
      var label = role === 'tie' ? 'SPLITS' : (role === 'win' ? 'WINS' : 'SHUT OUT');
      card.badge.textContent = label;
      card.badge.className = 'bg-badge ' + role;
      card.sold.textContent = 'sells ' + qty(q) + (q === 1 ? ' unit' : ' units');
      card.profit.textContent = money(pi);
      card.profit.style.color = pi > 0 ? card.color : (pi < 0 ? NEG : MUTED);
      card.root.classList.toggle('dim', role === 'lose');
    }

    /* Five rounds in, close the log and total up what each station took. */
    function closeOut() {
      var sumA = rounds.reduce(function (t, r) { return t + r.pia; }, 0);
      var sumB = rounds.reduce(function (t, r) { return t + r.pib; }, 0);
      var collusive = profitAll(PCOLL) / 2 * MAX_ROUNDS;

      totalA.textContent = money(sumA);
      totalB.textContent = money(sumB);
      totalA.style.color = A_COL;
      totalB.style.color = B_COL;
      tfoot.style.display = '';

      while (tally.firstChild) tally.removeChild(tally.firstChild);
      el(tally, 'div', 'bg-tally-label', MAX_ROUNDS + ' rounds played — the takings');
      var row = el(tally, 'div', 'bg-tally-row');
      [['Station A', sumA, A_COL], ['Station B', sumB, B_COL]].forEach(function (s) {
        var box = el(row, 'div', 'bg-tally-box');
        box.style.borderLeftColor = s[2];
        var n = el(box, 'span', 'bg-tally-name', s[0]);
        n.style.color = s[2];
        var v = el(box, 'span', 'bg-tally-value', money(s[1]));
        v.style.color = s[2];
      });
      var best = Math.max(sumA, sumB);
      var lost = collusive - best;
      el(tally, 'p', 'bg-tally-note').innerHTML =
        'Holding at $3.00 for all ' + MAX_ROUNDS + ' rounds would have paid ' + money(collusive) +
        ' to <em>each</em> of you. The better of you took ' + money(best) +
        (lost > 0.005 ? ' — <strong>' + money(lost) + ' left on the table.</strong>' : '.');
      tally.style.display = '';

      runBtn.disabled = true;
      runBtn.textContent = 'That was round ' + MAX_ROUNDS;
      inA.disabled = true;
      inB.disabled = true;
    }

    function run() {
      if (rounds.length >= MAX_ROUNDS) return;
      var pa = readPrice(inA), pb = readPrice(inB);
      if (pa === null || pb === null) return;

      var r = payoffs(pa, pb);
      paint(cardA, pa, r.qa, r.pia, r.outcome === 'tie' ? 'tie' : (r.outcome === 'a' ? 'win' : 'lose'));
      paint(cardB, pb, r.qb, r.pib, r.outcome === 'tie' ? 'tie' : (r.outcome === 'b' ? 'win' : 'lose'));

      rounds.push({ pa: pa, pb: pb, pia: r.pia, pib: r.pib });
      if (emptyRow.parentNode) tbody.removeChild(emptyRow);

      var tr = el(tbody, 'tr');
      el(tr, 'td', 'bg-num', String(rounds.length));
      el(tr, 'td', null, '$' + pa.toFixed(2)).style.color = A_COL;
      el(tr, 'td', null, '$' + pb.toFixed(2)).style.color = B_COL;
      el(tr, 'td', 'bg-num', money(r.pia));
      el(tr, 'td', 'bg-num', money(r.pib));
      logScroll.scrollTop = logScroll.scrollHeight;

      drawChart();
      if (rounds.length >= MAX_ROUNDS) closeOut();
    }

    function reset() {
      rounds.length = 0;
      while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
      tbody.appendChild(emptyRow);
      tfoot.style.display = 'none';
      tally.style.display = 'none';
      runBtn.disabled = false;
      runBtn.textContent = '⛽ Run the round';
      inA.disabled = false;
      inB.disabled = false;
      [cardA, cardB].forEach(function (c) {
        c.badge.textContent = '—';
        c.badge.className = 'bg-badge';
        c.sold.textContent = 'sells —';
        c.profit.textContent = '—';
        c.profit.style.color = MUTED;
        c.root.classList.remove('dim');
      });
      inA.value = (3).toFixed(2);
      inB.value = (3).toFixed(2);
      inA.classList.remove('invalid');
      inB.classList.remove('invalid');
      drawChart();
    }

    runBtn.addEventListener('click', run);
    resetBtn.addEventListener('click', reset);
    [inA, inB].forEach(function (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); run(); }
      });
    });
    isolateTouch(root);

    // Exposed so the deck (and the verification harness) can drive a round.
    root.bertrand = {
      play: function (pa, pb) { inA.value = pa.toFixed(2); inB.value = pb.toFixed(2); run(); },
      rounds: rounds,
      reset: reset
    };

    drawChart();
  }

  // =====================================================================
  // Widget B — your profit against your price, given the rival's price
  // =====================================================================
  function buildCurve(root) {
    var rival = parseFloat(root.dataset.rival);
    if (!isFinite(rival)) rival = PCOLL;

    var head = el(root, 'div', 'bg-row bg-curve-head');
    var lab = el(head, 'label', 'bg-field-label', 'Your rival posts');
    lab.style.color = B_COL;
    var readout = el(head, 'span', 'bg-rival-readout', '$' + rival.toFixed(2));
    var slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'bg-slider';
    slider.min = '0.5';
    slider.max = String(PMAX);
    slider.step = String(STEP);
    slider.value = String(rival);
    slider.setAttribute('aria-label', 'rival price in dollars');
    head.appendChild(slider);
    isolateKeys(slider);

    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 660 330');
    svg.setAttribute('class', 'bg-curve-svg');
    svg.setAttribute('role', 'img');
    root.appendChild(svg);

    var verdict = el(root, 'div', 'bg-verdict');

    var X0 = 62, X1 = 610, Y0 = 268, Y1 = 26;
    var PIMAX = 9, PIMIN = -1.6;

    function px(p) { return X0 + (p / PMAX) * (X1 - X0); }
    function py(pi) { return Y0 - ((pi - PIMIN) / (PIMAX - PIMIN)) * (Y0 - Y1); }

    function render() {
      var r = Math.round(parseFloat(slider.value) * 100) / 100;
      readout.textContent = '$' + r.toFixed(2);
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      var br = bestResponse(r);

      // zero line
      svgEl(svg, 'line', {
        x1: X0, y1: py(0), x2: X1, y2: py(0),
        stroke: GUIDE, 'stroke-width': 1.2, 'stroke-dasharray': '4 4'
      });

      // axes
      svgEl(svg, 'line', { x1: X0, y1: Y0, x2: X1, y2: Y0, stroke: AXIS, 'stroke-width': 2.5 });
      svgEl(svg, 'polygon', { points: X1 + ',' + (Y0 - 5) + ' ' + X1 + ',' + (Y0 + 5) + ' ' + (X1 + 11) + ',' + Y0, fill: AXIS });
      svgEl(svg, 'line', { x1: X0, y1: Y0, x2: X0, y2: Y1, stroke: AXIS, 'stroke-width': 2.5 });
      svgEl(svg, 'polygon', { points: (X0 - 5) + ',' + Y1 + ' ' + (X0 + 5) + ',' + Y1 + ' ' + X0 + ',' + (Y1 - 11), fill: AXIS });
      svgEl(svg, 'text', { x: X1 + 16, y: Y0 + 5, 'font-size': 13, fill: INK, 'font-style': 'italic' }, 'your price');
      svgEl(svg, 'text', { x: X0 - 46, y: Y1 + 4, 'font-size': 13, fill: INK, 'font-style': 'italic' }, 'your profit');

      [0, 1, 2, 3, 4, 5].forEach(function (p) {
        svgEl(svg, 'text', {
          x: px(p), y: Y0 + 20, 'font-size': 12, fill: MUTED, 'text-anchor': 'middle'
        }, '$' + p);
      });
      [0, 2, 4, 6, 8].forEach(function (v) {
        svgEl(svg, 'text', {
          x: X0 - 8, y: py(v) + 4, 'font-size': 11, fill: MUTED, 'text-anchor': 'end'
        }, '$' + v);
      });

      // faint reference: what you'd earn with the whole market at every price
      var ref = [];
      for (var t = 0; t <= 100; t++) {
        var p = (t / 100) * PMAX;
        ref.push(px(p) + ',' + py(profitAll(p)));
      }
      svgEl(svg, 'polyline', {
        points: ref.join(' '), fill: 'none', stroke: GUIDE,
        'stroke-width': 1.6, 'stroke-dasharray': '5 5'
      });
      svgEl(svg, 'text', {
        x: px(3) + 6, y: py(8) - 10, 'font-size': 11, fill: MUTED
      }, 'whole market (if you always won)');

      // The payoff you actually face: undercut branch, tie point, shut-out
      // branch. Pricing far below cost runs off the bottom of the plot, so the
      // branch is clipped at the floor rather than drawn outside the frame.
      var under = [];
      for (var q = 0; q <= 120; q++) {
        var pu = (q / 120) * r;
        if (pu >= r) break;
        if (profitAll(pu) < PIMIN) continue;
        under.push(px(pu) + ',' + py(profitAll(pu)));
      }
      if (under.length > 1) {
        svgEl(svg, 'polyline', {
          points: under.join(' '), fill: 'none', stroke: A_COL,
          'stroke-width': 4, 'stroke-linecap': 'round'
        });
      }
      svgEl(svg, 'line', {
        x1: px(r), y1: py(0), x2: X1 - 8, y2: py(0),
        stroke: A_COL, 'stroke-width': 4, 'stroke-linecap': 'round'
      });

      // the rival's price, and the cliff at it
      svgEl(svg, 'line', {
        x1: px(r), y1: Y0, x2: px(r), y2: Y1 + 6,
        stroke: B_COL, 'stroke-width': 2, 'stroke-dasharray': '6 4'
      });
      svgEl(svg, 'text', {
        x: px(r), y: Y1, 'font-size': 12, 'font-weight': 700, fill: B_COL, 'text-anchor': 'middle'
      }, 'rival $' + r.toFixed(2));

      var tiePi = profitAll(r) / 2;
      svgEl(svg, 'circle', { cx: px(r), cy: py(tiePi), r: 6, fill: '#fff', stroke: B_COL, 'stroke-width': 3 });
      svgEl(svg, 'text', {
        x: px(r) + 12, y: py(tiePi) + 4, 'font-size': 11, 'font-weight': 700, fill: B_COL
      }, 'tie → ' + money(tiePi));

      // marginal cost
      svgEl(svg, 'line', {
        x1: px(MC), y1: Y0, x2: px(MC), y2: Y1 + 30,
        stroke: REF_MC, 'stroke-width': 1.8, 'stroke-dasharray': '4 4'
      });
      svgEl(svg, 'text', {
        x: px(MC), y: Y1 + 26, 'font-size': 11, 'font-weight': 700, fill: REF_MC, 'text-anchor': 'middle'
      }, 'MC $1');

      // your best reply
      if (br.kind !== 'none') {
        svgEl(svg, 'circle', { cx: px(br.p), cy: py(br.pi), r: 7, fill: '#111111', stroke: '#fff', 'stroke-width': 2.5 });
        svgEl(svg, 'text', {
          x: px(br.p) - 12, y: py(br.pi) - 12, 'font-size': 12.5, 'font-weight': 700,
          fill: '#111111', 'text-anchor': 'end'
        }, 'best reply ' + money(br.pi));
      }

      var msg;
      if (br.kind === 'monopoly') {
        msg = 'Your rival is priced above the monopoly price. Undercut all the way to $3 — ' +
              'you take the whole market and earn ' + money(br.pi) + '.';
      } else if (br.kind === 'match') {
        msg = 'Match at $' + br.p.toFixed(2) + ' to earn ' + money(br.pi) +
              '. On the whole-cent grid, undercutting to $1.00 earns zero.';
      } else if (br.kind === 'undercut') {
        msg = 'Shade a single cent under them, to $' + br.p.toFixed(2) + ', and you take the whole market: ' +
              money(br.pi) + ' instead of ' + money(tiePi) + ' for matching.';
      } else {
        msg = 'No positive profit is available against $' + r.toFixed(2) +
              '. Posting $1.00 earns zero: it either matches marginal cost or makes no sales. ' +
              'Selling below cost would make a loss.';
      }
      verdict.textContent = msg;
      svg.setAttribute('aria-label',
        'Your profit as a function of your own price when the rival posts $' + r.toFixed(2) +
        '. Below the rival’s price you win the whole market; at it you split; above it you earn nothing. ' + msg);
    }

    slider.addEventListener('input', render);
    isolateTouch(root);
    root.bertrandCurve = { set: function (v) { slider.value = String(v); render(); } };
    render();
  }

  document.querySelectorAll('div.bertrand-duel').forEach(buildDuel);
  document.querySelectorAll('div.bertrand-curve').forEach(buildCurve);
})();
