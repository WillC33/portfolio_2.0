import { promises as fs } from 'fs';
import path from 'path';
import { marked } from 'marked';
import CleanCSS from 'clean-css';
import { minify } from 'html-minifier-terser';
import { minify as terserMinify } from 'terser';
import yaml from 'js-yaml';

/**
 * Potfolio build script options region
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
  sortClassName: true
};

const TERSER_OPTS = {
  mangle: true,
  compress: { dead_code: true, drop_console: true, drop_debugger: true, passes: 2 },
  format: { comments: false }
};

const log = (msg) => console.log(`➡️ ${msg}`);
const ok = (msg) => console.log(`✅ ${msg}`);

/*
 * Helper function to escape HTML attributes so all data are parsable strings
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
  * Parses the markdown of the blog files for adding them into the template
  * This throws many errors as we don't need to fail gracefully, if the fn
  * is broken, the script should not create a template
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
  * Minifies an html doc, as well as it's internal CSS and JS components
  */
async function minifyFile(content) {
  content = content.replace(/<style>([\s\S]*?)<\/style>/g, (match, css) => {
    return `<style>${cssMinifier.minify(css).styles}</style>`;
  });

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
  * Builds the blog post files and minifies them
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

    const tagsHtml = Array.isArray(frontmatter.tags)
      ? frontmatter.tags.map(tag => `<span class="tag">${escapeHtmlAttribute(tag)}</span>`).join('')
      : '';

    let html = template
      .replace(/\{\{title\}\}/g, escapeHtmlAttribute(frontmatter.title || ''))
      .replace(/\{\{description\}\}/g, escapeHtmlAttribute(frontmatter.description || ''))
      .replace(/\{\{date\}\}/g, escapeHtmlAttribute(frontmatter.date || ''))
      .replace(/\{\{readTime\}\}/g, escapeHtmlAttribute(frontmatter.readTime || ''))
      .replace(/\{\{tags\}\}/g, tagsHtml)
      .replace(/\{\{lead\}\}/g, escapeHtmlAttribute(frontmatter.lead || ''))
      .replace(/\{\{content\}\}/g, content); // Content is already HTML, don't escape

    html = await minifyFile(html);

    const postDir = path.join(buildDir, 'blog', frontmatter.slug);
    await fs.mkdir(postDir, { recursive: true });
    await fs.writeFile(path.join(postDir, 'index.html'), html);

    const sizeKB = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
    if (sizeKB > 14) throw new Error(`The post ${frontmatter.title} cannot be contained in an initial TCP call. Reduce it in size.`)
    ok(`blog/${frontmatter.slug}/ (${sizeKB}KB)`);

    posts.push({
      title: frontmatter.title,
      slug: frontmatter.slug,
      date: frontmatter.date,
      description: frontmatter.description,
      lead: frontmatter.lead,
      tags: frontmatter.tags,
      readTime: frontmatter.readTime
    });
  }

  return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
  * Builds the blog manifest json for maintaining the index
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
  * Copies the relevant assets to the build folder
  */
async function copyFiles() {
  log('Copying and minifying files...');

  const htmlFiles = ['index.html', 'profile.html', 'projects.html', 'blog.html'];
  const assetFiles = ['tiny.jpg', 'normal.jpg'];

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

  for (const file of assetFiles) {
    try {
      await fs.copyFile(path.join(srcDir, file), path.join(buildDir, file));
      ok(`${file}`);
    } catch (error) {
      console.log(`⚠️  Skipped ${file}`);
    }
  }
}

/**
  * Runs the build process
  */
async function build() {
  console.log('Building portfolio...\n');

  await fs.rm(buildDir, { recursive: true, force: true });
  await fs.mkdir(buildDir, { recursive: true });

  const posts = await buildBlogPosts();
  await buildManifests(posts);
  await copyFiles();

  console.log(`Build complete! Generated ${posts.length} posts`);
}

build().catch(console.error);
