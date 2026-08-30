#!/usr/bin/env python3
"""
build.py — Kaha Tahi site build

Turns Markdown in journal/posts/*.md and docs/*.md into styled HTML pages,
regenerates the journal index, drops the latest 3 posts into the homepage,
and rewrites sitemap.xml.

Run it before committing, or let .github/workflows/pages.yml run it on push:

    python3 build.py

Only dependency: `markdown` (pip install markdown).
"""

from __future__ import annotations

import datetime as dt
import html
import pathlib
import re
import sys

try:
    import markdown
except ModuleNotFoundError:
    sys.exit("Missing dependency: pip install markdown")

ROOT = pathlib.Path(__file__).parent
SITE = "https://kahatahi.co.nz"

POSTS_DIR = ROOT / "journal" / "posts"
JOURNAL_DIR = ROOT / "journal"
DOCS_DIR = ROOT / "docs"

# ---------------------------------------------------------------- partials

NAV = """\
  <nav class="nav">
    <a class="nav-brand" href="/">
      <img src="/assets/logo-tree.png" alt="" />
      <b>Kaha Tahi <span>Ltd.</span></b>
    </a>
    <div class="nav-links">
      <a href="/#services">Services</a>
      <a href="/membership/">Membership</a>
      <a href="/journal/"{journal_current}>Journal</a>
      <a href="/booking/">Book a job</a>
      <a href="/#contact">Contact</a>
      <a class="btn" href="https://accounts.kahatahi.co.nz">Sign in</a>
    </div>
  </nav>
"""

FOOTER = """\
  <footer class="footer">
    <div class="wrap">
      <span>© {year} Kaha Tahi Ltd.</span>
      <div class="footer-links">
        <a href="/membership/">Membership</a>
        <a href="/docs/members-fund/">Members Fund</a>
        <a href="https://accounts.kahatahi.co.nz/privacy.html">Privacy</a>
        <a href="https://accounts.kahatahi.co.nz/terms.html">Terms</a>
        <span>Palmerston North, Aotearoa</span>
      </div>
    </div>
  </footer>
"""

PAGE = """\
<!DOCTYPE html>
<html lang="en-NZ">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-18390096781"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());
  gtag('config', 'AW-18390096781');
</script>
<title>{title} — Kaha Tahi Ltd</title>
<meta name="description" content="{description}">
<link rel="canonical" href="{canonical}">
<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="Kaha Tahi Ltd">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{SITE}/assets/webasset.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="/favicon/favicon.svg">
<link rel="icon" type="image/png" href="/favicon/favicon-96x96.png" sizes="96x96">
<link rel="shortcut icon" href="/favicon/favicon.ico">
<link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png">
<link rel="manifest" href="/favicon/site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600&family=Inter:wght@400;500;600&family=Archivo+Black&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css">
</head>
<body>
{nav}
{main}
{footer}
</body>
</html>
"""

# ---------------------------------------------------------------- helpers

def nav(current: str = "") -> str:
    return NAV.format(journal_current=' aria-current="page"' if current == "journal" else "")


def footer() -> str:
    return FOOTER.format(year=dt.date.today().year)


def parse_front_matter(text: str) -> tuple[dict, str]:
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.DOTALL)
    if not m:
        return {}, text
    meta: dict[str, str] = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            k, _, v = line.partition(":")
            meta[k.strip()] = v.strip()
    return meta, m.group(2)


def md_to_html(body: str) -> str:
    return markdown.markdown(body, extensions=["extra", "sane_lists", "smarty"])


def slug_from_filename(p: pathlib.Path) -> str:
    stem = p.stem
    m = re.match(r"\d{4}-\d{2}-\d{2}-(.+)", stem)
    return m.group(1) if m else stem


def fmt_date(raw: str) -> tuple[str, dt.date]:
    d = dt.date.fromisoformat(raw.strip())
    return d.strftime("%-d %B %Y"), d


def render_page(**kw) -> str:
    kw.setdefault("og_type", "website")
    kw["description"] = html.escape(kw["description"], quote=True)
    kw["title"] = html.escape(kw["title"], quote=True)
    return PAGE.format(SITE=SITE, **kw)


# ---------------------------------------------------------------- journal

def build_journal() -> list[dict]:
    posts = []
    for p in sorted(POSTS_DIR.glob("*.md"), reverse=True):
        meta, body = parse_front_matter(p.read_text())
        if not meta.get("title") or not meta.get("date"):
            print(f"  ! skipping {p.name}: needs title + date front matter")
            continue
        slug = meta.get("slug") or slug_from_filename(p)
        date_str, date_obj = fmt_date(meta["date"])
        posts.append({
            "slug": slug,
            "title": meta["title"],
            "summary": meta.get("summary", ""),
            "date_str": date_str,
            "date_obj": date_obj,
            "body_html": md_to_html(body),
            "url": f"/journal/{slug}/",
        })

    for post in posts:
        article = f"""\
  <main class="wrap-narrow article">
    <a class="backlink" href="/journal/">All journal entries</a>
    <p class="article-meta">{post['date_str']}</p>
    <h1>{html.escape(post['title'])}</h1>
    <div class="article-body">
{post['body_html']}
    </div>
    <p style="margin-top:48px"><a class="btn" href="/#contact">Get in touch</a></p>
  </main>
"""
        out = render_page(
            title=post["title"],
            description=post["summary"] or post["title"],
            canonical=f"{SITE}{post['url']}",
            og_type="article",
            nav=nav("journal"),
            main=article,
            footer=footer(),
        )
        dest = JOURNAL_DIR / post["slug"] / "index.html"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(out)
        print(f"  journal/{post['slug']}/")

    # index
    items = "\n".join(
        f"""      <a class="post-item" href="{p['url']}">
        <p class="article-meta">{p['date_str']}</p>
        <h3>{html.escape(p['title'])}</h3>
        <p>{html.escape(p['summary'])}</p>
      </a>"""
        for p in posts
    )
    index_main = f"""\
  <main class="wrap-narrow article">
    <p class="kicker">Journal</p>
    <h1>Notes on the work</h1>
    <p class="lede">The community, the model, and building things properly — written as we go.</p>
    <div class="post-list" style="margin-top:36px">
{items}
    </div>
  </main>
"""
    (JOURNAL_DIR / "index.html").write_text(render_page(
        title="Journal",
        description="Notes from Kaha Tahi Ltd on the work, the community, and building a social enterprise in Palmerston North.",
        canonical=f"{SITE}/journal/",
        nav=nav("journal"),
        main=index_main,
        footer=footer(),
    ))
    print("  journal/index.html")
    return posts


def inject_homepage_posts(posts: list[dict]) -> None:
    index = ROOT / "index.html"
    if not index.exists():
        return
    text = index.read_text()
    start, end = "<!-- POSTS:start -->", "<!-- POSTS:end -->"
    if start not in text or end not in text:
        print("  ! homepage has no POSTS markers — skipping journal injection")
        return
    cards = "\n".join(
        f"""        <a class="card" href="{p['url']}">
          <p class="article-meta">{p['date_str']}</p>
          <h3>{html.escape(p['title'])}</h3>
          <p style="color:var(--text-muted);font-size:0.95rem;margin:0">{html.escape(p['summary'])}</p>
        </a>"""
        for p in posts[:3]
    )
    new = f"{start}\n{cards}\n        <!-- POSTS:end -->"
    text = re.sub(re.escape(start) + r".*?" + re.escape(end), new, text, flags=re.DOTALL)
    index.write_text(text)
    print("  index.html (latest posts)")


# ---------------------------------------------------------------- docs

def build_docs() -> list[str]:
    urls = []
    for p in sorted(DOCS_DIR.glob("*.md")):
        meta, body = parse_front_matter(p.read_text())
        slug = meta.get("slug") or p.stem
        title = meta.get("title", slug)
        main = f"""\
  <main class="wrap-narrow doc">
    <a class="backlink" href="/membership/">Back to Membership</a>
    <h1>{html.escape(title)}</h1>
    <div class="doc-body">
{md_to_html(body)}
    </div>
  </main>
"""
        (DOCS_DIR / slug / "index.html").parent.mkdir(parents=True, exist_ok=True)
        (DOCS_DIR / slug / "index.html").write_text(render_page(
            title=title,
            description=meta.get("summary", title),
            canonical=f"{SITE}/docs/{slug}/",
            og_type="article",
            nav=nav(),
            main=main,
            footer=footer(),
        ))
        urls.append(f"/docs/{slug}/")
        print(f"  docs/{slug}/")
    return urls


# ---------------------------------------------------------------- sitemap

def build_sitemap(posts: list[dict], doc_urls: list[str]) -> None:
    static = ["/", "/membership/", "/journal/"]
    today = dt.date.today().isoformat()
    rows = []
    for u in static + doc_urls:
        rows.append(f"  <url><loc>{SITE}{u}</loc><changefreq>monthly</changefreq></url>")
    for p in posts:
        rows.append(
            f"  <url><loc>{SITE}{p['url']}</loc>"
            f"<lastmod>{p['date_obj'].isoformat()}</lastmod>"
            f"<changefreq>yearly</changefreq></url>"
        )
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(rows)
        + "\n</urlset>\n"
    )
    print(f"  sitemap.xml ({len(rows)} urls, {today})")


# ---------------------------------------------------------------- main

def main() -> None:
    print("Building Kaha Tahi site…")
    posts = build_journal()
    inject_homepage_posts(posts)
    doc_urls = build_docs()
    build_sitemap(posts, doc_urls)
    print("Done.")


if __name__ == "__main__":
    main()
