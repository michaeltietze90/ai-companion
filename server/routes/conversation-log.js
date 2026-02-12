/**
 * Conversation Log API
 * Persists conversation events (voice transcripts, agent responses) to Postgres.
 * Used from today forward for conversation logging.
 */

import express from 'express';
import pg from 'pg';

const router = express.Router();

function getPool() {
  return new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
}

let pool = null;
function db() {
  if (!pool) pool = getPool();
  return pool;
}

const CONVERSATION_TYPES = ['voice-transcript', 'agentforce-response', 'trigger'];

async function ensureTable() {
  if (!process.env.DATABASE_URL) return false;
  try {
    await db().query(`
      CREATE TABLE IF NOT EXISTS conversation_logs (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        log_date DATE DEFAULT CURRENT_DATE,
        type VARCHAR(50),
        source VARCHAR(100),
        message TEXT,
        data JSONB
      )
    `);
    await db().query(`
      CREATE INDEX IF NOT EXISTS idx_conversation_logs_date 
      ON conversation_logs(log_date)
    `);
    return true;
  } catch (e) {
    console.error('[ConversationLog] Table creation failed:', e.message);
    return false;
  }
}

router.post('/', async (req, res) => {
  try {
    const { timestamp, type, source, message, data } = req.body;
    if (!type || !message) {
      return res.status(400).json({ error: 'type and message required' });
    }
    if (!CONVERSATION_TYPES.includes(type)) {
      return res.json({ saved: false, reason: 'not a conversation event' });
    }
    if (!process.env.DATABASE_URL) {
      console.log('[ConversationLog] No DATABASE_URL, skipping persist');
      return res.json({ saved: false, reason: 'no database' });
    }
    const hasTable = await ensureTable();
    if (!hasTable) return res.json({ saved: false, reason: 'table unavailable' });
    const logDate = timestamp ? new Date(timestamp).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    await db().query(
      `INSERT INTO conversation_logs (log_date, type, source, message, data)
       VALUES ($1, $2, $3, $4, $5)`,
      [logDate, type, source || '', message, data ? JSON.stringify(data) : null]
    );
    return res.json({ saved: true });
  } catch (error) {
    console.error('[ConversationLog] Insert error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { date, from, limit = 500 } = req.query;
    if (!process.env.DATABASE_URL) {
      return res.json({ logs: [], message: 'No database configured' });
    }
    const hasTable = await ensureTable();
    if (!hasTable) return res.json({ logs: [] });
    const logDate = date || from || new Date().toISOString().slice(0, 10);
    const result = await db().query(
      `SELECT id, created_at, log_date, type, source, message
       FROM conversation_logs
       WHERE log_date >= $1::date
       ORDER BY created_at DESC
       LIMIT $2`,
      [logDate, Math.min(parseInt(limit) || 500, 1000)]
    );
    return res.json({ logs: result.rows });
  } catch (error) {
    console.error('[ConversationLog] Fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
