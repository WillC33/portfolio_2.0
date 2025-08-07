---
title: Building a Sub-14KB Blog When Every Byte Counts
slug: sub-14kb-blog-tcp-packet-optimisation
date: 2025-08-07
description: Explore the technical constraints and creative solutions behind building a complete blog system where each post must fit within a single TCP packet, including the build-time validation system that enforces this limit.
lead: How enforcing a 14KB limit per blog post transformed my approach to web performance and content delivery
tags: [performance, optimisation, tcp, networking]
---

## The TCP Packet Challenge

Last year, I created an extremely fast postfolio site with a 70kb bundle size and 100 on my lighthouse performance metric.But seeing the metrics at 0.5s was disappointing, on a slow connection there could be some delay to the site.
When I set out to rebuild my portfolio site, I didn't just want it to be fast, I wanted it to be *theoretically* fast. That meant understanding the networking fundamentals that govern how browsers receive data. The initial TCP congestion window on most servers is around 14KB, meaning the first roundtrip can deliver exactly that much data.
So, what if every blog post could load completely in that first packet?

## Setting the Constraint in Code

The beauty of constraints is they force creativity. In my build script, I implemented a hard check that would throw an error if any blog post exceeded the magical 14KB limit:

```javascript
const sizeKB = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
if (sizeKB > 14) throw new Error(
  `The post ${frontmatter.title} cannot be contained in an initial TCP call. 
   Reduce it in size.`
);
ok(`blog/${frontmatter.slug}/ (${sizeKB}KB)`);
```

This is a build failure. The business logic here is clear: if content can't meet the performance budget, it doesn't ship. This forced discipline at the authoring level.

## The Minification Pipeline

To squeeze every byte, I built a comprehensive minification pipeline that processes HTML, CSS, and JavaScript in a single pass:

```javascript
async function minifyFile(content) {
  // Minify inline CSS
  content = content.replace(/<style>([\s\S]*?)<\/style>/g, (match, css) => {
    return `<style>${cssMinifier.minify(css).styles}</style>`;
  });

  // Minify inline JavaScript with Terser
  const scriptMatches = [...content.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
  for (const match of scriptMatches) {
    const [fullMatch, jsCode] = match;
    if (jsCode.trim()) {
      const minified = await terserMinify(jsCode, TERSER_OPTS);
      if (minified.code) {
        content = content.replace(fullMatch, 
          fullMatch.replace(jsCode, minified.code));
      }
    }
  }

  return await minify(content, HTML_OPTS);
}
```

The configuration is aggressive—removing comments, collapsing whitespace, dropping optional tags, and even sorting attributes for better gzip compression. Every decision impacts the final byte count.

## Template Efficiency Through Escape Hatches

The blog template uses a clever pattern of placeholder replacement rather than a full templating engine:

```javascript
let html = template
  .replace(/\{\{title\}\}/g, escapeHtmlAttribute(frontmatter.title || ''))
  .replace(/\{\{description\}\}/g, escapeHtmlAttribute(frontmatter.description || ''))
  .replace(/\{\{content\}\}/g, content); // Content is already HTML
```

This prevents double-encoding while maintaining security for metadata fields. This lets me write naturally in Markdown without worrying about HTML entities.
And I am a huge fan of writing in md. I use obsidian to manage many of my notes but prefer to do my writing directly in Neovim, code and articles alike.

## The Performance Payoff

What does this constraint actually deliver? Let's examine the homepage's performance monitoring:

```javascript
function updateStats() {
  const loadTime = Math.round(performance.now() - pageStart);
  const sizeKB = Math.round(
    new Blob([document.documentElement.outerHTML]).size / 1024
  );
  document.getElementById("page-size").textContent = sizeKB + "kb";
  document.getElementById("load-time").textContent = loadTime + "ms";
}
```

This real-time feedback shows visitors (and me during development) the actual impact. Most pages load in under 50ms on decent connections—faster than a finger snap.
The home page hovers around 100ms as it requires some of the scripts to be bootstrapped rather than loaded in their actual fragements which is a shame.

## Business Impact: Content Discipline

The 14KB constraint fundamentally changed how I approach content:

1. **Quality over Quantity**: Every word must earn its bytes. This forces concise, impactful writing.

2. **Smart Asset Strategy**: Images are loaded progressively. The profile page demonstrates this with a pixelated placeholder that enhances on hover:

```javascript
function loadTiny() {
  tLoaded = 1;
  container.classList.add("loading");
  statusEl.textContent = "decoding...";
  setTimeout(() => {
    img.onload = () => {
      img.style.imageRendering = "pixelated";
      container.classList.remove("loading");
      container.classList.add("loaded");
    };
    img.src = "tiny.jpg";
  }, 500);
}
```
This creates an engagement drive solution to a constraint, part of why I decided to add the glitchy effects into the theme.

3. **Inline Everything**: External resources mean additional round trips. By inlining critical CSS and JavaScript, the entire page is self-contained.

## The Cascade Effect

This constraint cascaded through the entire architecture:

- **No external fonts**: System fonts only, saving 100KB+ per typeface
- **CSS-in-HTML**: Eliminating render-blocking stylesheets
- **Inline SVG cursors**: Even the custom cursor is a base64-encoded data URI
- **Semantic HTML**: Leveraging browser defaults instead of framework overhead
- **Not a single runtime dependency**: JS bloat is for build time only and even then the packages are minimal.

## Lessons Learned

The 14KB limit isn't arbitrary, it's rooted in the fundamentals of networking. By respecting this boundary, I've created a blog that loads instantly on everything from 3G phones to fiber connections. The build system enforces what performance budgets often only suggest as a theoretical ceiling.

The business logic is simple: in a world of bloated SPAs and multi-megabyte page loads, sometimes the best optimisation is saying no. Of course, this is a limited little static site in the end, but thinking about what can be left out is a great exercise in Agile philosophy.

This approach won't work for every project, but for a developer portfolio showcasing technical prowess? There's no better demonstration than a site that loads before your finger leaves the mouse button.

## Technical Takeaways

1. **Build-time validation beats runtime monitoring**—catch performance issues before deployment
2. **Constraints breed creativity**—the 14KB limit led to innovative solutions
3. **Measure everything**—the performance stats widget provides constant feedback
4. **Respect the network**—understanding TCP fundamentals informs better architecture

The entire build pipeline is open source, and I encourage you to steal these patterns. After all, the web could use more sites that respect both users' time and bandwidth. #UX #GreenComputingFuture

## //TODO:
I'd like to really dig into some of the JS and CSS and optimise for more users, there are still some accessibility concerns, clean code refactorings, and quality of life upgrades to be made.
But that is part of the ongoing fun of development.
