import assert from 'node:assert/strict';
import {mkdtemp, readFile, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {build} from 'vite';

test('production build uses relative asset paths', async () => {
  const outDir = await mkdtemp(path.join(tmpdir(), 'scholarhub-vite-'));

  try {
    await build({
      configFile: path.join(process.cwd(), 'vite.config.ts'),
      build: {outDir, emptyOutDir: true},
    });

    const html = await readFile(path.join(outDir, 'index.html'), 'utf8');
    const assetNames = await readdir(path.join(outDir, 'assets'));
    const cssName = assetNames.find((name) => name.endsWith('.css'));
    assert.ok(cssName);
    const css = await readFile(path.join(outDir, 'assets', cssName), 'utf8');

    assert.match(html, /href="\.\/assets\/[^"]+\.css"/);
    assert.doesNotMatch(html, /href="\/assets\//);
    assert.match(css, /\.flex\s*\{/);
    assert.match(css, /display:\s*flex/);
    assert.match(css, /\.min-h-screen\s*\{/);
  } finally {
    await rm(outDir, {recursive: true, force: true});
  }
});

test('dev server ignores runtime library data changes', async () => {
  const server = await readFile(path.join(process.cwd(), 'server.ts'), 'utf8');

  assert.match(server, /ignored:\s*\['\*\*\/data\/\*\*'\]/);
});
