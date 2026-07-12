---
layout: page
title: Class Slides
subtitle: HTML5 decks — open in any modern browser
permalink: /slides/
description: "HTML5 class slide decks for the RSC Economics Experience."
---

Each deck is a self-contained **HTML5** presentation built with
[reveal.js](https://revealjs.com). Open one and use the arrow keys (or swipe) to
navigate — press <code>F</code> for fullscreen, <code>S</code> for speaker notes,
and <code>Esc</code> for a slide overview.

<div class="cards">
  <a class="card" href="{{ '/slides/lecture-01.html' | relative_url }}">
    <h3>Class 1</h3>
    <p>Intro, Scarcity, Supply &amp; Demand, Equilibrium</p>
  </a>
  <a class="card" href="{{ '/slides/lecture-02.html' | relative_url }}">
    <h3>Class 2</h3>
    <p>Elasticity of Demand and Costs</p>
  </a>
  <!-- Hidden from public view (buttons intentionally not shown). Kept here so
       the subtitles are recorded for when these classes are re-exposed.
  <a class="card" href="{{ '/slides/lecture-03.html' | relative_url }}">
    <h3>Class 3</h3>
    <p>Marginal Revenue and Monopoly Pricing</p>
  </a>
  <a class="card" href="{{ '/slides/lecture-04.html' | relative_url }}">
    <h3>Class 4</h3>
    <p>More on Monopoly Pricing and Perfect Competition</p>
  </a>
  -->
</div>

More decks will appear here as the course progresses.

---

### Adding a new deck

Slides are plain HTML5 files in the `slides/` folder. To create the next one:

1. Copy `slides/lecture-01.html` to `slides/lecture-02.html`.
2. Edit the `<section>` blocks — each `<section>` is one slide.
3. Add a card above pointing to the new file.
4. Commit and push; GitHub Pages serves it automatically.
