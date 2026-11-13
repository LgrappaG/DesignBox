import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';

const rootDir = process.cwd();
const testsDir = path.join(rootDir, 'tests');
const testFiles = fs
  .readdirSync(testsDir)
  .filter((name) => name.endsWith('.test.ts'))
  .sort();

if (testFiles.length === 0) {
  console.error('No *.test.ts files found in tests/.');
  process.exit(1);
}

const tempOutDir = fs.mkdtempSync(path.join(os.tmpdir(), 'designbox-tests-'));

try {
  const entryPoints = testFiles.map((file) => path.join(testsDir, file));
  await build({
    entryPoints,
    outdir: tempOutDir,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node24',
    outExtension: { '.js': '.mjs' },
    sourcemap: false,
    logLevel: 'silent',
  });

  const builtFiles = testFiles.map((file) =>
    path.join(tempOutDir, file.replace(/\.ts$/, '.mjs'))
  );

  const result = spawnSync(process.execPath, ['--test', ...builtFiles], {
    stdio: 'inherit',
  });

  process.exitCode = result.status ?? 1;
} finally {
  fs.rmSync(tempOutDir, { recursive: true, force: true });
}

