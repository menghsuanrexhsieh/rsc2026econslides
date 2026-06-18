source "https://rubygems.org"

# GitHub Pages builds this site with the github-pages gem, which pins Jekyll
# and all supported plugins to the exact versions GitHub Pages runs in
# production. Installing it locally (`bundle install`) reproduces that build.
gem "github-pages", group: :jekyll_plugins

# Needed to run `jekyll serve` locally on Ruby 3.x (webrick left the stdlib).
gem "webrick", "~> 1.8"

# Fix Faraday v2.0+ retry middleware warning/error
gem "faraday-retry"

