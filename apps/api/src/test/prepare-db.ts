import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TEST_DB = 'file:./test.db';

/** Recrée une base vierge avant la campagne de tests. */
export async function setup() {
  for (const file of fs.readdirSync(path.join(apiRoot, 'prisma'))) {
    if (file.startsWith('test.db')) fs.unlinkSync(path.join(apiRoot, 'prisma', file));
  }
  execFileSync('npx', ['prisma', 'db', 'push', '--skip-generate', '--accept-data-loss'], {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: TEST_DB },
    stdio: 'ignore',
  });
}
