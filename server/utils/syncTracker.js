const fs = require('fs');
const path = require('path');

const syncPath = path.join(__dirname, '../data/lastSynced.json');

function writeLastSynced(type, status = 'success') {
  const now = new Date().toISOString();
  const data = {
    [type]: {
      timestamp: now,
      status
    }
  };

  try {
    let existing = {};
    if (fs.existsSync(syncPath)) {
      existing = JSON.parse(fs.readFileSync(syncPath, 'utf8'));
    }

    const merged = { ...existing, ...data };
    fs.writeFileSync(syncPath, JSON.stringify(merged, null, 2));
    console.log(`📦 Updated last sync for: ${type}`);
  } catch (err) {
    console.error('❌ Failed to write sync metadata:', err.message);
  }
}

function readLastSynced() {
  try {
    if (fs.existsSync(syncPath)) {
      return JSON.parse(fs.readFileSync(syncPath, 'utf8'));
    }
  } catch {
    return {};
  }
}

module.exports = {
  writeLastSynced,
  readLastSynced
};
