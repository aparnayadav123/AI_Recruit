import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_DIR = __dirname;
const DEBOUNCE_MS = 6000; // Wait 6 seconds after last change before pushing

let debounceTimer = null;
let isSyncing = false;

function log(msg) {
  const time = new Date().toLocaleTimeString();
  console.log(`[Auto-Sync ${time}] ${msg}`);
}

function runGit(command) {
  return execSync(command, { cwd: REPO_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

async function performSync() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const status = runGit('git status --porcelain').trim();
    if (!status) {
      isSyncing = false;
      return;
    }

    log('Changes detected! Preparing commit...');
    
    // Stage all changes (respects .gitignore)
    runGit('git add -A');

    // Summarize changed files
    const changedFiles = status
      .split('\n')
      .map(line => line.trim().split(/\s+/).slice(1).join(' '))
      .filter(Boolean)
      .slice(0, 4)
      .join(', ');

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const commitMsg = `sync: auto-commit updates [${changedFiles}] at ${timestamp}`;

    runGit(`git commit -m "${commitMsg}"`);
    log(`Committed: "${commitMsg}"`);

    // Pull with rebase to ensure clean history if remote has updates
    try {
      runGit('git pull --rebase origin main');
    } catch {
      // Ignore if no upstream commits
    }

    // Push to GitHub main branch
    log('Pushing to GitHub (origin main)...');
    runGit('git push origin main');
    log('✅ Successfully pushed to GitHub origin/main!');
    log('🚀 Triggered auto-deployments:');
    log('   - Vercel Frontend: https://ai-recruit-eight.vercel.app');
    log('   - Render Backend:  https://recruitai-backend-bvo0.onrender.com/api');

  } catch (err) {
    console.error('[Auto-Sync Error]:', err.message || err);
  } finally {
    isSyncing = false;
  }
}

function scheduleSync(filePath) {
  // Ignore noise
  if (!filePath) return;
  const normalized = filePath.replace(/\\/g, '/');
  if (
    normalized.includes('.git/') ||
    normalized.includes('node_modules/') ||
    normalized.includes('dist/') ||
    normalized.endsWith('.log') ||
    normalized.endsWith('.env') ||
    normalized.includes('.system_generated')
  ) {
    return;
  }

  log(`File changed: ${filePath}`);
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    performSync();
  }, DEBOUNCE_MS);
}

log(`Watcher started for repository: ${REPO_DIR}`);
log(`Watching for changes... Any edit will be automatically committed & pushed to GitHub main.`);

fs.watch(REPO_DIR, { recursive: true }, (eventType, filename) => {
  if (filename) {
    scheduleSync(filename);
  }
});

