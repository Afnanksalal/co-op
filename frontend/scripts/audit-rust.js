const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TAURI_ROOT = path.join(ROOT, 'src-tauri');

const TAURI_UPSTREAM_ADVISORIES = [
  'RUSTSEC-2024-0411',
  'RUSTSEC-2024-0412',
  'RUSTSEC-2024-0413',
  'RUSTSEC-2024-0414',
  'RUSTSEC-2024-0415',
  'RUSTSEC-2024-0416',
  'RUSTSEC-2024-0417',
  'RUSTSEC-2024-0418',
  'RUSTSEC-2024-0419',
  'RUSTSEC-2024-0420',
  'RUSTSEC-2024-0429',
  'RUSTSEC-2024-0370',
  'RUSTSEC-2025-0075',
  'RUSTSEC-2025-0080',
  'RUSTSEC-2025-0081',
  'RUSTSEC-2025-0098',
  'RUSTSEC-2025-0100',
];

const args = [
  'audit',
  '--deny',
  'warnings',
  ...TAURI_UPSTREAM_ADVISORIES.flatMap(id => ['--ignore', id]),
];

const result = spawnSync('cargo', args, {
  cwd: TAURI_ROOT,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
