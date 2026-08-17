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

step('limpiando dist/ y out/', () => {
  rmSync(dist, { recursive: true, force: true });
  rmSync(out, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });
});

step('compilando popup.html / options.html con Next', () => {
  execSync('npx next build', { cwd: root, stdio: 'inherit' });
});

step('empaquetando el service worker de background', () => {
  esbuild.buildSync({
    entryPoints: [path.join(root, 'src/background/index.ts')],
    outfile: path.join(dist, 'background.js'),
    bundle: true,
    format: 'esm',
    target: 'chrome110',
    minify: false,
  });
});

step('copiando assets de Next a dist/', () => {
  cpSync(out, dist, { recursive: true });
});

step('arreglando nombres reservados (Chrome prohibe "_" al inicio de archivo/carpeta)', () => {
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

  // 1) Ficheros sueltos con "_" inicial (ej. _app-<hash>.js, _buildManifest.js):
  // se les quita el guion bajo y se reescriben las referencias a su nombre exacto.
  // OJO: no tocar identificadores tipo "__next"/"__NEXT_DATA__" (doble guion bajo,
  // sin barra), por eso el reemplazo se hace por nombre de archivo completo, no
  // por el token "_next" suelto.
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

  // 2) La carpeta _next -> next-assets, reescribiendo solo la ruta "/_next/".
  renameSync(path.join(dist, '_next'), path.join(dist, 'next-assets'));
  replaceInTextFiles((content) => content.split('/_next/').join('/next-assets/'));
});

step('copiando iconos', () => {
  cpSync(path.join(root, 'public/icons'), path.join(dist, 'icons'), { recursive: true });
});

step('generando manifest.json', () => {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    process.stdout.write(
      '   (!) GOOGLE_OAUTH_CLIENT_ID no esta definido en .env -- el login con Google no funcionara hasta que lo configures.\n',
    );
  }

  const template = readFileSync(path.join(root, 'manifest.template.json'), 'utf8');
  const manifest = template.replace('__GOOGLE_OAUTH_CLIENT_ID__', clientId ?? '__GOOGLE_OAUTH_CLIENT_ID__');
  writeFileSync(path.join(dist, 'manifest.json'), manifest);
});

step('listo', () => {
  process.stdout.write(`dist/ generado en ${dist}\nCarga esa carpeta en chrome://extensions (modo desarrollador -> "Cargar descomprimida").\n`);
});
