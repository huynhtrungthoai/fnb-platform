// Rebuilds the package; `node --watch-path` restarts this file when tokens or sources change.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const packageDir = resolve(import.meta.dirname, '..');
try {
  execFileSync('pnpm', ['run', 'build'], { cwd: packageDir, stdio: 'inherit' });
} catch {
  console.error('design-tokens: build failed, waiting for the next change');
}
// Keep the process alive so the dev task stays persistent between rebuilds.
setInterval(() => undefined, 60_000);
