import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const gitlink = execFileSync(
  'git',
  ['ls-tree', 'HEAD', 'apps/api/src/modules/core'],
  { cwd: repoRoot, encoding: 'utf8' },
).trim();
const expected = /^160000 commit ([0-9a-f]{40})\tapps\/api\/src\/modules\/core$/.exec(gitlink)?.[1];
const pinned = readFileSync(
  new URL('../apps/api/core-submodule.sha', import.meta.url),
  'utf8',
).trim();

if (!expected || pinned !== expected) {
  console.error(
    `Core deploy pin mismatch: gitlink=${expected ?? 'missing'}, core-submodule.sha=${pinned}`,
  );
  process.exit(1);
}

console.log(`Core deploy pin matches gitlink: ${pinned}`);
