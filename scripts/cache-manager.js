
const fs = require('fs');
const path = require('path');

/**
 * Development Environment Cache Manager
 * Clears various caches that can cause issues during development
 */

const cacheDirs = [
  'node_modules/.vite',
  'node_modules/.cache',
  'dist',
  '.temp',
  '.cache'
];

const logColors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${logColors[color]}${message}${logColors.reset}`);
}

function removeDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      log(`✅ Cleared: ${dirPath}`, 'green');
      return true;
    } catch (error) {
      log(`❌ Failed to clear: ${dirPath} - ${error.message}`, 'red');
      return false;
    }
  } else {
    log(`ℹ️  Not found: ${dirPath}`, 'yellow');
    return true;
  }
}

function clearCaches() {
  log('🧹 Starting development cache cleanup...', 'blue');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  
  let cleared = 0;
  let failed = 0;

  cacheDirs.forEach(dir => {
    const success = removeDirectory(dir);
    if (success) cleared++;
    else failed++;
  });

  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  log(`🎉 Cache cleanup completed!`, 'bright');
  log(`   Cleared: ${cleared} directories`, 'green');
  if (failed > 0) {
    log(`   Failed: ${failed} directories`, 'red');
  }
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
}

function clearSpecific(target) {
  log(`🎯 Clearing specific cache: ${target}`, 'blue');
  
  switch (target) {
    case 'vite':
      removeDirectory('node_modules/.vite');
      break;
    case 'dist':
      removeDirectory('dist');
      break;
    case 'all':
      clearCaches();
      break;
    default:
      log(`❓ Unknown target: ${target}`, 'yellow');
      log('Available targets: vite, dist, all', 'yellow');
  }
}

// CLI support
const args = process.argv.slice(2);
if (args.length > 0) {
  clearSpecific(args[0]);
} else {
  clearCaches();
}

module.exports = { clearCaches, clearSpecific, removeDirectory };
