/**
 * ============================================================
 * GURAY SICID LMS — GITHUB AUTO-SYNC MODULE
 * ============================================================
 * Automatically pushes persistent_data.json back to GitHub
 * after every data change so that Render re-deployments always
 * start with the LATEST data, not an old git snapshot.
 *
 * Required Environment Variables (set in Render dashboard):
 *   GITHUB_TOKEN  — Personal Access Token with repo write access
 *   GITHUB_OWNER  — GitHub username/org  (default: nurdinfx)
 *   GITHUB_REPO   — Repository name      (default: couch-maryan)
 *   GITHUB_BRANCH — Branch to sync to    (default: main)
 * ============================================================
 */

const fs = require('fs');

function getSyncConfig() {
  return {
    token: (process.env.GITHUB_TOKEN || '').trim(),
    owner: (process.env.GITHUB_OWNER || 'nurdinfx').trim(),
    repo: (process.env.GITHUB_REPO || 'couch-maryan').trim(),
    branch: (process.env.GITHUB_BRANCH || 'main').trim(),
    filePath: 'database/persistent_data.json'
  };
}

// ──────────────────────────────────────────────
// Internal: fetch the current SHA of the file
// (GitHub requires SHA when updating an existing file)
// ──────────────────────────────────────────────
async function getFileSha(config) {
  try {
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.filePath}?ref=${config.branch}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'GurayLMS-AutoSync/1.0'
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.sha || null;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────
// Core: push the JSON content to GitHub
// ──────────────────────────────────────────────
async function pushToGitHub(jsonContent) {
  const config = getSyncConfig();
  if (!config.token) {
    // Silent in local development; token not set
    return false;
  }

  try {
    const sha = await getFileSha(config);
    const base64Content = Buffer.from(jsonContent, 'utf8').toString('base64');
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const body = {
      message: `chore: auto-sync db snapshot [${now} UTC]`,
      content: base64Content,
      branch: config.branch
    };
    if (sha) body.sha = sha; // required by GitHub when file already exists

    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.filePath}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'GurayLMS-AutoSync/1.0'
      },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      console.log(`[GitHubSync] ✅ persistent_data.json successfully synced to GitHub (${now} UTC)`);
      return true;
    } else {
      const err = await res.json().catch(() => ({}));
      console.error('[GitHubSync] ❌ Push failed:', err.message || res.status);
      return false;
    }
  } catch (err) {
    console.error('[GitHubSync] ❌ Network error during sync:', err.message);
    return false;
  }
}

// ──────────────────────────────────────────────
// Debounced scheduler — batches rapid saves
// into a single GitHub push after 8 seconds
// of inactivity. Prevents GitHub API rate limits.
// ──────────────────────────────────────────────
let _debounceTimer = null;

function scheduleSyncToGitHub(filePath) {
  const config = getSyncConfig();
  if (!config.token) return; // noop in local dev

  if (_debounceTimer) clearTimeout(_debounceTimer);

  _debounceTimer = setTimeout(async () => {
    _debounceTimer = null;
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        await pushToGitHub(content);
      }
    } catch (err) {
      console.error('[GitHubSync] Could not read persistence file:', err.message);
    }
  }, 8000); // 8-second debounce window
}

module.exports = { scheduleSyncToGitHub, pushToGitHub, getSyncConfig };
