/**
 * Leaderboard API
 * Handles leaderboard CRUD operations using Heroku Postgres
 * Replaces the Supabase Edge Function leaderboard/index.ts
 */

import express from 'express';
import pg from 'pg';

const router = express.Router();

// Use DATABASE_URL from Heroku Postgres (with SSL in production)
function getPool() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  return pool;
}

let pool = null;
function db() {
  if (!pool) pool = getPool();
  return pool;
}

router.post('/', async (req, res) => {
  try {
    const { action, entry, entries } = req.body;

    // GET: Fetch top 5 leaderboard entries
    if (action === 'get') {
      const result = await db().query(
        'SELECT * FROM leaderboard ORDER BY score DESC LIMIT 5'
      );

      const mapped = result.rows.map(row => ({
        id: row.id,
        first_name: row.first_name,
        last_name: row.last_name,
        country: row.country,
        score: row.score,
        created_at: row.created_at,
      }));

      return res.json({ entries: mapped });
    }

    // SAVE: Save a single entry
    if (action === 'save' && entry) {
      const insertResult = await db().query(
        `INSERT INTO leaderboard (first_name, last_name, country, score)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [entry.firstName, entry.lastName, entry.country, entry.score]
      );

      const savedEntry = insertResult.rows[0];

      // Fetch updated rankings
      const allResult = await db().query(
        'SELECT * FROM leaderboard ORDER BY score DESC'
      );

      const userRank = allResult.rows.findIndex(r => r.id === savedEntry.id) + 1;
      const top5 = allResult.rows.slice(0, 5).map(row => ({
        id: row.id,
        first_name: row.first_name,
        last_name: row.last_name,
        country: row.country,
        score: row.score,
        created_at: row.created_at,
      }));

      return res.json({
        success: true,
        entry: savedEntry,
        entries: top5,
        userRank,
      });
    }

    // BULK: Save multiple entries
    if (action === 'bulk' && entries) {
      for (const e of entries) {
        await db().query(
          `INSERT INTO leaderboard (first_name, last_name, country, score)
           VALUES ($1, $2, $3, $4)`,
          [e.firstName, e.lastName, e.country, e.score]
        );
      }

      return res.json({ success: true });
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: error.message || 'Unknown error' });
  }
});

export default router;
