# kahatahi.co.nz

Static site for Kaha Tahi Ltd, served by GitHub Pages from this repo's root on
`main` (custom domain in `CNAME`).

Plain HTML/CSS — no framework, no CDN JavaScript. `assets/site.css` holds the
whole design system.

## Pages

| File | URL |
|---|---|
| `index.html` | `/` — home |
| `membership/index.html` | `/membership/` — tiers, pricing, Community Fund summary |
| `docs/members-fund.md` → `docs/members-fund/index.html` | `/docs/members-fund/` — full constitution |
| `journal/posts/*.md` → `journal/<slug>/index.html` | `/journal/<slug>/` — blog posts |
| `journal/index.html` | `/journal/` — post list (generated) |

## Adding a journal post

1. Create `journal/posts/YYYY-MM-DD-some-slug.md`:

   ```markdown
   ---
   title: Your headline
   date: 2026-09-10
   summary: One or two sentences shown in the list and as the social/SEO description.
   ---

   Body in Markdown. Use ## for section headings.
   ```

2. Run the build:

   ```
   python3 build.py
   ```

   (needs `pip install markdown` once)

3. Commit both the `.md` and the generated files. `build.py` also refreshes the
   journal index, the "latest 3" on the home page, and `sitemap.xml`.

The same flow applies to docs: drop a `.md` in `docs/`, run the build.

## Contact form

`index.html`'s form posts to a Formspree CLI project (`kaha tahi website`,
project id `3080013392728031027`, form key `contact`). The form config lives in
`formspree.json`. To change where enquiries go, or add spam settings, edit that
file and redeploy:

```
FORMSPREE_DEPLOY_KEY=<deploy key from Formspree project Settings> npx @formspree/cli deploy
```

The deploy key is a secret — keep it in a local `.env` (gitignored), never commit
it.
