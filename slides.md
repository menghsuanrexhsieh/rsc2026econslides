---
layout: page
title: Lecture Slides
subtitle: HTML5 decks — open in any modern browser
permalink: /slides/
description: "HTML5 lecture slide decks for the RSC Economics Experience."
---

Each deck is a self-contained **HTML5** presentation built with
[reveal.js](https://revealjs.com). Open one and use the arrow keys (or swipe) to
navigate — press <code>F</code> for fullscreen, <code>S</code> for speaker notes,
and <code>Esc</code> for a slide overview.

<div class="cards">
  <a class="card" href="{{ '/slides/lecture-01.html' | relative_url }}">
    <h3>Lecture 1</h3>
    <p>Intro, Scarcity, Supply &amp; Demand, Equilibrium</p>
  </a>
  <a class="card" href="{{ '/slides/lecture-02.html' | relative_url }}">
    <h3>Lecture 2</h3>
    <p>Algebra, Shifts, Elasticity &amp; Marginal Revenue</p>
  </a>
  <a class="card" href="{{ '/slides/lecture-03.html' | relative_url }}">
    <h3>Lecture 3</h3>
    <p>Elasticities, Marginal Revenue, &amp; Cost Functions</p>
  </a>
  <a class="card" href="{{ '/slides/lecture-04.html' | relative_url }}">
    <h3>Lecture 4</h3>
    <p>Monopoly, Perfect Competition, &amp; Equilibria</p>
  </a>
  <a class="card" href="{{ '/slides/lecture-05.html' | relative_url }}">
    <h3>Lecture 5</h3>
    <p>Social Welfare, Efficiency, &amp; Deadweight Loss</p>
  </a>
  <a class="card" href="{{ '/slides/lecture-06.html' | relative_url }}">
    <h3>Lecture 6</h3>
    <p>Game Theory: Nash Equilibrium &amp; Coordination</p>
  </a>
</div>

More decks will appear here as the course progresses — see the
[schedule]({{ '/syllabus/#schedule' | relative_url }}) for what's coming.

---

### Adding a new deck

Slides are plain HTML5 files in the `slides/` folder. To create the next one:

1. Copy `slides/lecture-01.html` to `slides/lecture-02.html`.
2. Edit the `<section>` blocks — each `<section>` is one slide.
3. Add a card above (and a link in the syllabus) pointing to the new file.
4. Commit and push; GitHub Pages serves it automatically.
