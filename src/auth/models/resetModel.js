// Simple in-memory reset token store (dev). Stores { code, expiresAt, sentAt } by email (lowercased).
const store = new Map();

function set(email, code, expiresAt, sentAt) {
  store.set(String(email).toLowerCase(), { code, expiresAt, sentAt: sentAt || Date.now() });
}

function get(email) {
  return store.get(String(email).toLowerCase()) || null;
}

function consume(email) {
  const e = String(email).toLowerCase();
  const v = store.get(e) || null;
  store.delete(e);
  return v;
}

// Check if a code was sent recently (within cooldown period in milliseconds)
function wasSentRecently(email, cooldownMs = 15 * 60 * 1000) {
  const entry = get(email);
  if (!entry || !entry.sentAt) return false;
  const timeSinceSent = Date.now() - entry.sentAt;
  return timeSinceSent < cooldownMs;
}

// Get time remaining until next code can be sent (in milliseconds)
function getTimeUntilNextCode(email, cooldownMs = 15 * 60 * 1000) {
  const entry = get(email);
  if (!entry || !entry.sentAt) return 0;
  const timeSinceSent = Date.now() - entry.sentAt;
  const remaining = cooldownMs - timeSinceSent;
  return remaining > 0 ? remaining : 0;
}

module.exports = { set, get, consume, wasSentRecently, getTimeUntilNextCode };
