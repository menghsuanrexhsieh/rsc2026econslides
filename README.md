# RSC Economics Experience

Course website for the **RSC Economics Experience** (summer 2026). Built with
[Jekyll](https://jekyllrb.com) and hosted on GitHub Pages. It serves the course
**syllabus** and **HTML5 lecture slides** (reveal.js).

🔗 **Live site:** https://menghsuanrexhsieh.github.io/rsc2026econ/

## Structure

```
_config.yml          Site configuration
index.md             Home page
syllabus.md          Course syllabus            → /syllabus/
slides.md            Slides index               → /slides/
slides/              HTML5 reveal.js decks
  lecture-01.html
_layouts/            Page templates (default, page)
assets/css/style.css Site styles
```

## Run locally

```bash
bundle install          # first time only
bundle exec jekyll serve # → http://localhost:4000/rsc2026econ/
```

If you have Jekyll installed globally you can also just run `jekyll serve`.

## Add a lecture deck

Slides are plain **HTML5** files in `slides/`. Copy `slides/lecture-01.html`,
edit the `<section>` blocks (one per slide), then link the new deck from
`slides.md` and the schedule in `syllabus.md`. Commit and push — GitHub Pages
rebuilds automatically.
