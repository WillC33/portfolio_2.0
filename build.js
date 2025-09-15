import { promises as fs } from 'fs';
import path from 'path';
import { marked } from 'marked';
import CleanCSS from 'clean-css';
import { minify } from 'html-minifier-terser';
import { minify as terserMinify } from 'terser';
import yaml from 'js-yaml';
import { brotliCompressSync, constants } from 'zlib';

/**
 * Portfolio build script with aggressive optimizations
 */

marked.setOptions({ mangle: false, headerIds: false });

const buildDir = './build';
const srcDir = './src';
const blogDir = './src/blog';
const templatePath = './src/templates/blog-template.html';

const cssMinifier = new CleanCSS({ level: 2, format: 'compact' });

const HTML_OPTS = {
  collapseWhitespace: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  useShortDoctype: true,
  minifyCSS: true,
  minifyJS: false,
  removeEmptyAttributes: true,
  removeOptionalTags: true,
  removeAttributeQuotes: false,
  sortAttributes: true,
  sortClassName: true,
  minifyURLs: true,
  continueOnParseError: true,
  quoteCharacter: '"',
  preventAttributesEscaping: true
};

const TERSER_OPTS = {
  mangle: true,
  compress: {
    dead_code: true,
    drop_console: true,
    drop_debugger: true,
    passes: 2,
    pure_funcs: ['console.log'],
    unsafe: true,
    unsafe_comps: true,
    unsafe_math: true,
    unsafe_methods: true,
    unsafe_proto: true,
    unsafe_regexp: true
  },
  format: { comments: false }
};

const log = (msg) => console.log(`➡️ ${msg}`);
const ok = (msg) => console.log(`✅ ${msg}`);

/**
 * Escape HTML attributes
 */
function escapeHtmlAttribute(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Parse markdown files with frontmatter
 */
async function parseMarkdown(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) throw new Error(`Invalid frontmatter in ${filePath}`);

  try {
    const frontmatter = yaml.load(match[1]);
    const markdownContent = match[2];

    if (!frontmatter.title) throw new Error('Missing required field: title');
    if (!frontmatter.slug) throw new Error('Missing required field: slug');
    if (!frontmatter.date) throw new Error('Missing required field: date');

    return {
      frontmatter,
      content: marked(markdownContent)
    };
  } catch (error) {
    throw new Error(`Failed to parse frontmatter in ${filePath}: ${error.message}`);
  }
}

/**
 * Minify HTML with inline CSS and JS
 */
async function minifyFile(content) {
  // Minify inline CSS
  content = content.replace(/<style>([\s\S]*?)<\/style>/g, (match, css) => {
    return `<style>${cssMinifier.minify(css).styles}</style>`;
  });

  // Minify inline JavaScript
  const scriptMatches = [...content.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
  for (const match of scriptMatches) {
    const [fullMatch, jsCode] = match;
    if (jsCode.trim()) {
      try {
        const minified = await terserMinify(jsCode, TERSER_OPTS);
        if (minified.code) {
          content = content.replace(fullMatch, fullMatch.replace(jsCode, minified.code));
        }
      } catch (error) {
        console.log(`⚠️  JS minify failed: ${error.message}`);
      }
    }
  }

  return await minify(content, HTML_OPTS);
}

/**
 * Calculate read time
 */
const getReadTime = wordCount => Math.ceil(wordCount / 220);

/**
 * Build blog posts
 */
async function buildBlogPosts() {
  log('Processing blog posts...');

  let template = await fs.readFile(templatePath, 'utf8');

  const blogFiles = await fs.readdir(blogDir);
  const markdownFiles = blogFiles.filter(file => file.endsWith('.md'));
  const posts = [];

  await fs.mkdir(path.join(buildDir, 'blog'), { recursive: true });

  for (const file of markdownFiles) {
    const filePath = path.join(blogDir, file);
    const { frontmatter, content } = await parseMarkdown(filePath);

    const wordCount = content.split(/\s+/).length;

    const tagsHtml = Array.isArray(frontmatter.tags)
      ? frontmatter.tags.map(tag => `<span class="tag">${escapeHtmlAttribute(tag)}</span>`).join('')
      : '';

    let html = template
      .replace(/\{\{title\}\}/g, escapeHtmlAttribute(frontmatter.title || ''))
      .replace(/\{\{description\}\}/g, escapeHtmlAttribute(frontmatter.description || ''))
      .replace(/\{\{date\}\}/g, escapeHtmlAttribute(frontmatter.date.toLocaleDateString('en-CA') || ''))
      .replace(/\{\{readTime\}\}/g, escapeHtmlAttribute(getReadTime(wordCount) || ''))
      .replace(/\{\{tags\}\}/g, tagsHtml)
      .replace(/\{\{lead\}\}/g, escapeHtmlAttribute(frontmatter.lead || ''))
      .replace(/\{\{content\}\}/g, content);

    html = await minifyFile(html);

    const postDir = path.join(buildDir, 'blog', frontmatter.slug);
    await fs.mkdir(postDir, { recursive: true });
    await fs.writeFile(path.join(postDir, 'index.html'), html);

    const sizeKB = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
    if (sizeKB > 14) throw new Error(`The post ${frontmatter.title} cannot be contained in an initial TCP call. Reduce it in size. Current: ${sizeKB}`)
    ok(`blog/${frontmatter.slug}/ (${sizeKB}KB)`);

    posts.push({
      title: frontmatter.title,
      slug: frontmatter.slug,
      date: frontmatter.date,
      description: frontmatter.description,
      lead: frontmatter.lead,
      tags: frontmatter.tags,
      readTime: getReadTime(wordCount)
    });
  }

  return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * Build blog manifests
 */
async function buildManifests(posts) {
  log('Building chunked manifests...');

  const CHUNK_SIZE = 5;
  const manifestsDir = path.join(buildDir, 'blog', 'manifests');
  await fs.mkdir(manifestsDir, { recursive: true });

  for (let i = 0; i < posts.length; i += CHUNK_SIZE) {
    const chunk = posts.slice(i, i + CHUNK_SIZE);
    const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;
    const chunkData = {
      chunk: chunkNum,
      totalChunks: Math.ceil(posts.length / CHUNK_SIZE),
      posts: chunk,
      totalPosts: posts.length
    };

    await fs.writeFile(
      path.join(manifestsDir, `chunk_${chunkNum}.json`),
      JSON.stringify(chunkData)
    );
  }

  await fs.writeFile(
    path.join(manifestsDir, 'index.json'),
    JSON.stringify({
      totalPosts: posts.length,
      totalChunks: Math.ceil(posts.length / CHUNK_SIZE),
      postsPerChunk: CHUNK_SIZE,
      lastUpdated: new Date().toISOString()
    })
  );

  const chunks = Math.ceil(posts.length / CHUNK_SIZE);
  ok(`${chunks} manifest chunks (${posts.length} posts)`);
}

/**
 * Copy and minify files
 */
async function copyFiles() {
  log('Copying and minifying files...');

  const htmlFiles = ['index.html', 'profile.html', 'projects.html', 'blog.html'];
  const assetFiles = ['tiny.jpg', 'normal.jpg', 'favicon.ico'];

  // Copy HTML files
  for (const file of htmlFiles) {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(buildDir, file);

    try {
      let content = await fs.readFile(srcPath, 'utf8');
      const minified = await minifyFile(content);
      await fs.writeFile(destPath, minified);

      const sizeKB = (Buffer.byteLength(minified, 'utf8') / 1024).toFixed(1);
      ok(`${file} (${sizeKB}KB)`);
    } catch (error) {
      console.log(`⚠️  Skipped ${file}: ${error.message}`);
    }
  }

  // Copy asset files
  for (const file of assetFiles) {
    try {
      await fs.copyFile(path.join(srcDir, file), path.join(buildDir, file));
      ok(`${file}`);
    } catch (error) {
      console.log(`⚠️  Skipped ${file}`);
    }
  }

  // Copy _headers file if it exists
  try {
    await fs.copyFile(path.join(srcDir, '_headers'), path.join(buildDir, '_headers'));
    ok('_headers');
  } catch (error) {
    console.log('⚠️  No _headers file found');
  }

  // Copy service worker if it exists
  try {
    const swContent = await fs.readFile(path.join(srcDir, 'sw.js'), 'utf8');
    const minifiedSw = (await terserMinify(swContent, TERSER_OPTS)).code;
    await fs.writeFile(path.join(buildDir, 'sw.js'), minifiedSw);
    ok('sw.js');
  } catch (error) {
    console.log('⚠️  No service worker found');
  }
}

/**
 * Precompress all HTML files with Brotli
 */
async function precompressAssets() {
  log('Pre-compressing assets with Brotli...');

  async function compressRecursive(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await compressRecursive(fullPath);
      } else if (entry.name.endsWith('.html') || entry.name.endsWith('.json')) {
        const content = await fs.readFile(fullPath);

        // Maximum compression level 11
        const compressed = brotliCompressSync(content, {
          params: {
            [constants.BROTLI_PARAM_QUALITY]: 11,
            [constants.BROTLI_PARAM_LGWIN]: 24,
            [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT
          }
        });

        await fs.writeFile(`${fullPath}.br`, compressed);

        const originalSize = content.length;
        const compressedSize = compressed.length;
        const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

        const relPath = path.relative(buildDir, fullPath);
        ok(`Compressed ${relPath}: ${ratio}% reduction (${(compressedSize / 1024).toFixed(1)}KB)`);
      }
    }
  }

  await compressRecursive(buildDir);
}

/**
 * Generate optimized headers file for Cloudflare Pages
 */
async function generateHeaders() {
  log('Generating optimized headers...');

  const headers = `# Global security headers
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: same-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains

# Root and index - aggressive caching
/
  Cache-Control: public, max-age=86400, s-maxage=2592000, immutable
  Link: </profile.html>; rel=prefetch, </projects.html>; rel=prefetch, </blog.html>; rel=prefetch

/index.html  
  Cache-Control: public, max-age=86400, s-maxage=2592000, immutable
  Link: </profile.html>; rel=prefetch, </projects.html>; rel=prefetch, </blog.html>; rel=prefetch

# Blog index - no cache (shows latest posts)
/blog.html
  Cache-Control: no-cache, no-store, must-revalidate, max-age=0

# Blog manifests - short cache for updates  
/blog/manifests/*.json
  Cache-Control: public, max-age=300, s-maxage=900

# Individual blog posts - long cache (content doesn't change)
/blog/*/index.html
  Cache-Control: public, max-age=86400, s-maxage=2592000

# Images - cache forever with versioning
/*.jpg
  Cache-Control: public, max-age=31536000, s-maxage=31536000, immutable
  Accept-CH: DPR, Width, Viewport-Width

/*.ico
  Cache-Control: public, max-age=31536000, s-maxage=31536000, immutable

# Service worker - no cache
/sw.js
  Cache-Control: no-cache, no-store, must-revalidate, max-age=0`;

  await fs.writeFile(path.join(buildDir, '_headers'), headers);
  ok('Generated optimized _headers with s-maxage directives');
}
/**
 * Main build process
 */
async function build() {
  console.log('🚀 Building optimized portfolio...\n');

  // Clean and create build directory
  await fs.rm(buildDir, { recursive: true, force: true });
  await fs.mkdir(buildDir, { recursive: true });

  // Build steps
  const posts = await buildBlogPosts();
  await buildManifests(posts);
  await copyFiles();
  await precompressAssets();
  await generateHeaders();

  console.log(`\n✨ Build complete! Generated ${posts.length} posts`);
  console.log('📦 Files are pre-compressed with Brotli for maximum speed');
  console.log('🚀 Deploy with: wrangler pages deploy');
}

// Run build
build().catch(console.error);
