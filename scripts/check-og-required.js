import { execSync } from 'child_process';

function check() {
  try {
    // Get list of changed files (both staged, unstaged, and untracked)
    const outputStaged = execSync('git diff --name-only --cached', { encoding: 'utf8' });
    const outputUnstaged = execSync('git diff --name-only', { encoding: 'utf8' });
    const outputUntracked = execSync('git ls-files --others --exclude-standard', { encoding: 'utf8' });
    
    const allFiles = new Set([
      ...outputStaged.split('\n'),
      ...outputUnstaged.split('\n'),
      ...outputUntracked.split('\n')
    ].map(f => f.trim()).filter(f => f !== ''));

    if (allFiles.size === 0) {
      console.log('\x1b[32m%s\x1b[0m', '✅ No changes detected in the workspace.');
      return false;
    }

    const changedFiles = Array.from(allFiles);

    // Identify if any layout/style/code changes have occurred
    const isLayoutChanged = changedFiles.some(file => {
      // Ignore content md files
      if (file.startsWith('src/content/')) return false;
      // Ignore existing generated OG images
      if (file.startsWith('public/images/og/')) return false;
      // Ignore scripts (like check script)
      if (file.startsWith('scripts/')) return false;
      
      // If code, components, styles, or configuration changed, layout has changed
      return (
        file.endsWith('.astro') ||
        file.endsWith('.css') ||
        file.endsWith('.js') ||
        file.endsWith('.mjs') ||
        file.endsWith('.ts') ||
        file === 'package.json' ||
        file === 'yarn.lock' ||
        (file.startsWith('public/') && !file.startsWith('public/images/og/'))
      );
    });

    console.log('\n\x1b[1m%s\x1b[0m', 'Changed files list:');
    changedFiles.forEach(f => console.log(` - ${f}`));

    if (isLayoutChanged) {
      console.log('\n\x1b[33m%s\x1b[0m', '⚠️ Structural files or assets changed. You should recapture OG images (run: yarn build:local) before committing.');
      return true;
    } else {
      console.log('\n\x1b[32m%s\x1b[0m', '✅ Only content edits detected. You can commit directly without recapturing OG screenshots!');
      return false;
    }
  } catch (error) {
    console.error('Error checking changed files:', error.message);
    return true; // Default to safe option
  }
}

const layoutChanged = check();
process.exit(layoutChanged ? 1 : 0);
