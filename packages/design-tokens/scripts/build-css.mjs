// Writes dist/theme.css from the compiled generator. Runs after `tsc` in the build script.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const distDir = resolve(import.meta.dirname, '../dist');
const { generateCss } = await import('../dist/src/index.js');

mkdirSync(distDir, { recursive: true });
writeFileSync(resolve(distDir, 'theme.css'), generateCss());
