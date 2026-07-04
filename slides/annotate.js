/*
 * Stylus annotation layer for the reveal.js lecture decks.
 * Adds a floating toolbar (pen / highlighter / eraser / undo / clear) and a
 * full-window canvas. Strokes are stored per slide (in memory for the session)
 * and redrawn when you navigate back to a slide.
 *
 * Works with mouse, finger, and stylus (Apple Pencil). Once a stylus is
 * detected, finger touches are ignored while a tool is active (palm rejection).
 */
(function () {
  'use strict';

  // ---------- state ----------
  var PEN_COLORS = ['#dc2626', '#2563eb', '#0f172a'];
  var HIGHLIGHT_COLOR = '#facc15';
  var PEN_WIDTH = 0.0035;        // stroke width as a fraction of window width
  var HIGHLIGHT_WIDTH = 0.022;
  var ERASE_RADIUS = 0.025;

  var tool = null;               // null | 'pen' | 'highlight' | 'erase'
  var penColor = PEN_COLORS[0];
  var strokesBySlide = {};       // 'h-v' -> [ {tool,color,width,points:[[nx,ny],...]} ]
  var currentStroke = null;
  var activePointerId = null;
  var penSeen = false;           // a real stylus has been used -> ignore touch
  var rafPending = false;

  // ---------- canvas ----------
  var canvas = document.createElement('canvas');
  canvas.className = 'annotate-canvas';
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  function slideKey() {
    try {
      var i = Reveal.getIndices();
      return i.h + '-' + (i.v || 0);
    } catch (e) {
      return '0-0';
    }
  }

  function slideStrokes() {
    var key = slideKey();
    if (!strokesBySlide[key]) strokesBySlide[key] = [];
    return strokesBySlide[key];
  }

  function resizeCanvas() {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }

  function drawStroke(s) {
    var pts = s.points;
    if (pts.length === 0) return;
    var w = window.innerWidth, h = window.innerHeight;
    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = s.color;
    ctx.globalAlpha = s.tool === 'highlight' ? 0.4 : 1;
    ctx.lineWidth = Math.max(1, s.width * w);
    ctx.moveTo(pts[0][0] * w, pts[0][1] * h);
    if (pts.length === 1) {
      ctx.lineTo(pts[0][0] * w + 0.1, pts[0][1] * h + 0.1);
    } else {
      for (var i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i][0] * w, pts[i][1] * h);
      }
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function redraw() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    var strokes = slideStrokes();
    for (var i = 0; i < strokes.length; i++) drawStroke(strokes[i]);
    if (currentStroke) drawStroke(currentStroke);
  }

  function scheduleRedraw() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () {
      rafPending = false;
      redraw();
    });
  }

  // ---------- pointer handling ----------
  function acceptPointer(e) {
    if (!tool) return false;
    if (e.pointerType === 'pen') { penSeen = true; return true; }
    if (e.pointerType === 'touch' && penSeen) return false; // palm rejection
    return true;
  }

  function normPoint(e) {
    return [e.clientX / window.innerWidth, e.clientY / window.innerHeight];
  }

  function eraseAt(nx, ny) {
    var strokes = slideStrokes();
    var before = strokes.length;
    for (var i = strokes.length - 1; i >= 0; i--) {
      var pts = strokes[i].points;
      for (var j = 0; j < pts.length; j++) {
        var dx = pts[j][0] - nx;
        var dy = (pts[j][1] - ny) * (window.innerHeight / window.innerWidth);
        if (dx * dx + dy * dy < ERASE_RADIUS * ERASE_RADIUS) {
          strokes.splice(i, 1);
          break;
        }
      }
    }
    if (strokes.length !== before) scheduleRedraw();
  }

  canvas.addEventListener('pointerdown', function (e) {
    if (!acceptPointer(e) || activePointerId !== null) return;
    e.preventDefault();
    activePointerId = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    var p = normPoint(e);
    if (tool === 'erase') {
      eraseAt(p[0], p[1]);
    } else {
      currentStroke = {
        tool: tool,
        color: tool === 'highlight' ? HIGHLIGHT_COLOR : penColor,
        width: tool === 'highlight' ? HIGHLIGHT_WIDTH : PEN_WIDTH,
        points: [p]
      };
      scheduleRedraw();
    }
  });

  canvas.addEventListener('pointermove', function (e) {
    if (e.pointerId !== activePointerId) return;
    e.preventDefault();
    var events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    if (events.length === 0) events = [e];
    for (var i = 0; i < events.length; i++) {
      var p = normPoint(events[i]);
      if (tool === 'erase') {
        eraseAt(p[0], p[1]);
      } else if (currentStroke) {
        currentStroke.points.push(p);
      }
    }
    if (tool !== 'erase') scheduleRedraw();
  });

  function endStroke(e) {
    if (e.pointerId !== activePointerId) return;
    activePointerId = null;
    if (currentStroke) {
      slideStrokes().push(currentStroke);
      currentStroke = null;
      scheduleRedraw();
    }
  }
  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);

  // ---------- toolbar ----------
  var ICONS = {
    pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>',
    highlight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l-6 6v3h9l3-3"/><path d="M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>',
    erase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20H7L3 16a1.4 1.4 0 0 1 0-2l10-10a1.4 1.4 0 0 1 2 0l6 6a1.4 1.4 0 0 1 0 2l-8 8"/><path d="M6 11l7 7"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/></svg>',
    clear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
    collapse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>'
  };

  var bar = document.createElement('div');
  bar.className = 'annotate-toolbar';
  document.body.appendChild(bar);

  function makeButton(name, title, onTap) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'annotate-btn annotate-btn-' + name;
    b.title = title;
    b.setAttribute('aria-label', title);
    b.innerHTML = ICONS[name] || '';
    b.addEventListener('click', onTap);
    bar.appendChild(b);
    return b;
  }

  var toggleBtn = makeButton('collapse', 'Annotation tools');
  toggleBtn.addEventListener('click', function () {
    bar.classList.toggle('annotate-open');
    if (!bar.classList.contains('annotate-open')) setTool(null);
  });

  var toolButtons = {};
  toolButtons.pen = makeButton('pen', 'Pen (draw)', function () {
    setTool(tool === 'pen' ? null : 'pen');
  });

  // color dots for the pen
  var colorRow = document.createElement('div');
  colorRow.className = 'annotate-colors';
  bar.appendChild(colorRow);
  var colorDots = PEN_COLORS.map(function (c) {
    var d = document.createElement('button');
    d.type = 'button';
    d.className = 'annotate-dot';
    d.style.background = c;
    d.title = 'Pen color';
    d.addEventListener('click', function () {
      penColor = c;
      setTool('pen');
      updateUI();
    });
    colorRow.appendChild(d);
    return d;
  });

  toolButtons.highlight = makeButton('highlight', 'Highlighter', function () {
    setTool(tool === 'highlight' ? null : 'highlight');
  });
  toolButtons.erase = makeButton('erase', 'Eraser (tap a stroke)', function () {
    setTool(tool === 'erase' ? null : 'erase');
  });
  makeButton('undo', 'Undo last stroke', function () {
    slideStrokes().pop();
    scheduleRedraw();
  });
  makeButton('clear', 'Clear this slide', function () {
    strokesBySlide[slideKey()] = [];
    scheduleRedraw();
  });

  function setTool(t) {
    tool = t;
    if (t) bar.classList.add('annotate-open');
    canvas.classList.toggle('annotate-active', !!t);
    document.body.classList.toggle('annotate-drawing', !!t);
    updateUI();
  }

  function updateUI() {
    Object.keys(toolButtons).forEach(function (name) {
      toolButtons[name].classList.toggle('annotate-selected', tool === name);
    });
    toggleBtn.classList.toggle('annotate-selected', !!tool);
    colorDots.forEach(function (d, i) {
      d.classList.toggle('annotate-dot-selected', PEN_COLORS[i] === penColor);
    });
  }

  // Esc puts the pointer back to normal navigation. Capture phase + stop
  // propagation so reveal.js doesn't also open its overview grid.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && tool) {
      e.preventDefault();
      e.stopPropagation();
      setTool(null);
    }
  }, true);

  // ---------- styles ----------
  var style = document.createElement('style');
  style.textContent = [
    '.annotate-canvas { position: fixed; inset: 0; z-index: 200; pointer-events: none; touch-action: none; }',
    '.annotate-canvas.annotate-active { pointer-events: auto; cursor: crosshair; }',
    '.annotate-toolbar { position: fixed; top: 50%; right: 10px; transform: translateY(-50%);',
    '  display: flex; flex-direction: column; align-items: center; gap: 8px; z-index: 210;',
    '  background: rgba(255,255,255,0.92); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);',
    '  border: 1px solid rgba(15,23,42,0.12); border-radius: 999px; padding: 8px 6px;',
    '  box-shadow: 0 6px 24px rgba(15,23,42,0.15); }',
    '.annotate-btn { width: 42px; height: 42px; border-radius: 50%; border: none; cursor: pointer;',
    '  display: none; align-items: center; justify-content: center; background: transparent;',
    '  color: #334155; padding: 0; touch-action: manipulation; }',
    '.annotate-btn svg { width: 22px; height: 22px; display: block; }',
    '.annotate-btn:hover { background: rgba(15,118,110,0.1); }',
    '.annotate-btn.annotate-selected { background: #0f766e; color: #fff; }',
    '.annotate-btn-collapse { display: flex; }',
    '.annotate-toolbar.annotate-open .annotate-btn { display: flex; }',
    '.annotate-colors { display: none; flex-direction: column; gap: 6px; padding: 2px 0; }',
    '.annotate-toolbar.annotate-open .annotate-colors { display: flex; }',
    '.annotate-dot { width: 18px; height: 18px; border-radius: 50%; border: 2px solid transparent;',
    '  cursor: pointer; padding: 0; }',
    '.annotate-dot-selected { border-color: #fff; box-shadow: 0 0 0 2px #0f766e; }',
    '@media print { .annotate-toolbar { display: none; } }'
  ].join('\n');
  document.head.appendChild(style);

  // ---------- reveal integration ----------
  window.addEventListener('resize', resizeCanvas);
  if (window.Reveal && Reveal.on) {
    Reveal.on('slidechanged', function () {
      currentStroke = null;
      scheduleRedraw();
    });
    Reveal.on('ready', scheduleRedraw);
    // Drawing over the overview grid makes no sense; drop the tool and hide
    // the ink until the overview closes.
    Reveal.on('overviewshown', function () {
      setTool(null);
      canvas.style.display = 'none';
    });
    Reveal.on('overviewhidden', function () {
      canvas.style.display = '';
      scheduleRedraw();
    });
  }
  resizeCanvas();
  updateUI();
})();
