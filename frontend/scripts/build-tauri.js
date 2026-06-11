const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BACKUP_ROOT = path.join(ROOT, '.tauri-build-backups');
const NEXT_EXPORT_OUT = 'out';
const TAURI_OUT = 'out-tauri';

const SERVER_ONLY_FILES = [
  'src/proxy.ts',
  'src/app/sitemap.ts',
];

const WEB_ONLY_ROUTES = [
  'src/app/page.tsx',
  'src/app/account',
  'src/app/activate',
  'src/app/admin',
  'src/app/auth',
  'src/app/download',
  'src/app/login',
  'src/app/privacy',
  'src/app/terms',
];

const TAURI_CONFIG = 'next.config.tauri.js';
const ORIGINAL_CONFIG = 'next.config.js';

function resolvePath(relativePath) {
  return path.join(ROOT, relativePath);
}

function backupPathFor(relativePath) {
  return path.join(BACKUP_ROOT, relativePath.replace(/[\\/]/g, '__'));
}

function backupFiles() {
  console.log('Backing up web-only files...');
  fs.rmSync(BACKUP_ROOT, { recursive: true, force: true });
  fs.mkdirSync(BACKUP_ROOT, { recursive: true });

  for (const file of [...SERVER_ONLY_FILES, ...WEB_ONLY_ROUTES]) {
    const fullPath = resolvePath(file);
    if (fs.existsSync(fullPath)) {
      fs.renameSync(fullPath, backupPathFor(file));
      console.log(`  Backed up: ${file}`);
    }
  }

  const originalPath = resolvePath(ORIGINAL_CONFIG);
  const tauriConfigPath = resolvePath(TAURI_CONFIG);

  if (fs.existsSync(originalPath)) {
    fs.renameSync(originalPath, backupPathFor(ORIGINAL_CONFIG));
    console.log(`  Backed up: ${ORIGINAL_CONFIG}`);
  }

  fs.copyFileSync(tauriConfigPath, originalPath);
  console.log(`  Using: ${TAURI_CONFIG} -> ${ORIGINAL_CONFIG}`);
}

function restoreFiles() {
  console.log('Restoring original files...');

  for (const file of [...SERVER_ONLY_FILES, ...WEB_ONLY_ROUTES]) {
    const fullPath = resolvePath(file);
    const backupPath = backupPathFor(file);
    if (fs.existsSync(backupPath)) {
      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          fs.rmSync(fullPath, { recursive: true });
        } else {
          fs.unlinkSync(fullPath);
        }
      }
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.renameSync(backupPath, fullPath);
      console.log(`  Restored: ${file}`);
    }
  }

  const originalPath = resolvePath(ORIGINAL_CONFIG);
  const backupConfigPath = backupPathFor(ORIGINAL_CONFIG);
  if (fs.existsSync(backupConfigPath)) {
    if (fs.existsSync(originalPath)) {
      fs.unlinkSync(originalPath);
    }
    fs.renameSync(backupConfigPath, originalPath);
    console.log(`  Restored: ${ORIGINAL_CONFIG}`);
  }

  fs.rmSync(BACKUP_ROOT, { recursive: true, force: true });
}

function cleanBeforeBuild() {
  for (const generatedPath of [NEXT_EXPORT_OUT, TAURI_OUT, '.next']) {
    const fullPath = resolvePath(generatedPath);
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 });
    }
  }
}

function cleanStaleNextTypes() {
  const nextPath = resolvePath('.next');
  if (fs.existsSync(nextPath)) {
    fs.rmSync(nextPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 });
  }
}

function moveExportToTauriOut() {
  const nextOutPath = resolvePath(NEXT_EXPORT_OUT);
  const tauriOutPath = resolvePath(TAURI_OUT);

  if (!fs.existsSync(nextOutPath)) {
    throw new Error('Next.js static export did not produce ./out');
  }

  fs.rmSync(tauriOutPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 });
  fs.renameSync(nextOutPath, tauriOutPath);
}

function build() {
  console.log('Building Next.js static export for Tauri...\n');
  cleanBeforeBuild();
  execSync('npx next build', {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXT_PUBLIC_TAURI: '1',
    },
  });
  moveExportToTauriOut();
  console.log(`\nStatic export complete. Output in ./${TAURI_OUT}/`);
}

try {
  backupFiles();
  build();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  restoreFiles();
  cleanStaleNextTypes();
}
