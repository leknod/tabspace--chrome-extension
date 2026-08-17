import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync, cpSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as esbuild from 'esbuild';
import 'dotenv/config';

const root = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const dist = path.join(root, 'dist');
const out = path.join(root, 'out');

function step(label, fn) {
  process.stdout.write(`-> ${label}\n`);
  fn();
}

step('cleaning dist/ and out/', () => {
  rmSync(dist, { recursive: true, force: true });
  rmSync(out, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });
});

step('building popup.html / options.html with Next', () => {
  execSync('npx next build', { cwd: root, stdio: 'inherit' });
});

step('bundling the background service worker', () => {
  esbuild.buildSync({
    entryPoints: [path.join(root, 'src/background/index.ts')],
    outfile: path.join(dist, 'background.js'),
    bundle: true,
    format: 'esm',
    target: 'chrome110',
    minify: false,
  });
});

step('copying Next assets to dist/', () => {
  cpSync(out, dist, { recursive: true });
});

step('fixing reserved names (Chrome forbids "_" at the start of a file/folder)', () => {
  const TEXT_EXTENSIONS = new Set(['.html', '.js', '.css', '.json', '.map']);

  function walkFiles(dir, files = []) {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walkFiles(full, files);
      else files.push(full);
    }
    return files;
  }

  function replaceInTextFiles(replacer) {
    for (const file of walkFiles(dist)) {
      if (!TEXT_EXTENSIONS.has(path.extname(file))) continue;
      const content = readFileSync(file, 'utf8');
      const next = replacer(content);
      if (next !== content) writeFileSync(file, next);
    }
  }

  // 1) Loose files with a leading "_" (e.g. _app-<hash>.js, _buildManifest.js):
  // strip the underscore and rewrite references to their exact name.
  // NOTE: don't touch identifiers like "__next"/"__NEXT_DATA__" (double underscore,
  // no slash), so the replacement is done by full file name, not by the loose
  // "_next" token.
  const renamedBasenames = [];
  for (const file of walkFiles(dist)) {
    const base = path.basename(file);
    if (base.startsWith('_')) {
      const newBase = base.replace(/^_+/, '');
      renameSync(file, path.join(path.dirname(file), newBase));
      renamedBasenames.push([base, newBase]);
    }
  }
  if (renamedBasenames.length > 0) {
    replaceInTextFiles((content) => {
      let next = content;
      for (const [from, to] of renamedBasenames) next = next.split(from).join(to);
      return next;
    });
  }

  // 2) The _next folder -> next-assets, rewriting only the "/_next/" path.
  renameSync(path.join(dist, '_next'), path.join(dist, 'next-assets'));
  replaceInTextFiles((content) => content.split('/_next/').join('/next-assets/'));
});

step('copying icons', () => {
  cpSync(path.join(root, 'public/icons'), path.join(dist, 'icons'), { recursive: true });
});

step('generating manifest.json', () => {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    process.stdout.write(
      '   (!) GOOGLE_OAUTH_CLIENT_ID is not set in .env -- Google login will not work until you configure it.\n',
    );
  }

  const template = readFileSync(path.join(root, 'manifest.template.json'), 'utf8');
  const manifest = template.replace('__GOOGLE_OAUTH_CLIENT_ID__', clientId ?? '__GOOGLE_OAUTH_CLIENT_ID__');
  writeFileSync(path.join(dist, 'manifest.json'), manifest);
});

step('done', () => {
  process.stdout.write(`dist/ generated at ${dist}\nLoad that folder in chrome://extensions (Developer mode -> "Load unpacked").\n`);
});
