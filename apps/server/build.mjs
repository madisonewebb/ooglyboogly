// Bundles the server and everything it imports into one file, so the runtime
// image needs no node_modules.
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const { version } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
);

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node26',
  sourcemap: true,
  // ws optionally loads these native addons and falls back without them.
  external: ['bufferutil', 'utf-8-validate', 'node:*'],
  // Lets bundled CommonJS dependencies call require() inside an ES module.
  banner: {
    js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
  },
  define: { __APP_VERSION__: JSON.stringify(version) },
  logLevel: 'info',
});
