/**
 * Database connection and initialization
 * Uses PostgreSQL via Heroku
 */

import pg from 'pg';
const { Pool } = pg;

// Create pool from DATABASE_URL (set by Heroku)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

/**
 * Initialize database tables
 */
export async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    // Create agent_settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS agent_settings (
        id SERIAL PRIMARY KEY,
        agent_type VARCHAR(50) NOT NULL UNIQUE,
        utterance_end_ms INTEGER DEFAULT 1000,
        agent_id VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Add agent_id column if it doesn't exist (for existing deployments)
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='agent_settings' AND column_name='agent_id') THEN
          ALTER TABLE agent_settings ADD COLUMN agent_id VARCHAR(255) DEFAULT NULL;
        END IF;
      END $$;
    `);

    // Create keyword_boosts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS keyword_boosts (
        id SERIAL PRIMARY KEY,
        agent_type VARCHAR(50) NOT NULL,
        word VARCHAR(255) NOT NULL,
        boost INTEGER DEFAULT 5,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(agent_type, word)
      )
    `);

    // Create video_triggers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS video_triggers (
        id SERIAL PRIMARY KEY,
        agent_type VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        keywords TEXT[] NOT NULL,
        video_url TEXT NOT NULL,
        duration_ms INTEGER DEFAULT 5000,
        position VARCHAR(50) DEFAULT 'avatar',
        speech TEXT DEFAULT '',
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create visual_assets table for images/slides
    await client.query(`
      CREATE TABLE IF NOT EXISTS visual_assets (
        id SERIAL PRIMARY KEY,
        agent_type VARCHAR(50) NOT NULL DEFAULT 'all',
        name VARCHAR(255) NOT NULL,
        asset_type VARCHAR(50) NOT NULL,
        url TEXT NOT NULL,
        position_x INTEGER DEFAULT 50,
        position_y INTEGER DEFAULT 50,
        width INTEGER DEFAULT 50,
        height INTEGER DEFAULT NULL,
        reference_key VARCHAR(100) UNIQUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Insert default agent settings if not exists (including 'all' for shared settings)
    await client.query(`
      INSERT INTO agent_settings (agent_type, utterance_end_ms)
      VALUES ('keynote', 1000), ('chat', 1000), ('all', 1000)
      ON CONFLICT (agent_type) DO NOTHING
    `);

    console.log('[Database] Tables initialized successfully');
  } finally {
    client.release();
  }
}

/**
 * Get settings for an agent
 */
export async function getAgentSettings(agentType) {
  const result = await pool.query(
    'SELECT * FROM agent_settings WHERE agent_type = $1',
    [agentType]
  );
  return result.rows[0] || null;
}

/**
 * Update agent settings
 */
export async function updateAgentSettings(agentType, settings) {
  const { utteranceEndMs, agentId } = settings;
  
  // Build dynamic query based on what's provided
  if (agentId !== undefined) {
    const result = await pool.query(
      `INSERT INTO agent_settings (agent_type, utterance_end_ms, agent_id, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (agent_type) 
       DO UPDATE SET utterance_end_ms = $2, agent_id = $3, updated_at = NOW()
       RETURNING *`,
      [agentType, utteranceEndMs, agentId || null]
    );
    return result.rows[0];
  } else {
    const result = await pool.query(
      `INSERT INTO agent_settings (agent_type, utterance_end_ms, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (agent_type) 
       DO UPDATE SET utterance_end_ms = $2, updated_at = NOW()
       RETURNING *`,
      [agentType, utteranceEndMs]
    );
    return result.rows[0];
  }
}

/**
 * Get keyword boosts for an agent
 */
export async function getKeywordBoosts(agentType) {
  const result = await pool.query(
    'SELECT word, boost FROM keyword_boosts WHERE agent_type = $1 ORDER BY word',
    [agentType]
  );
  return result.rows;
}

/**
 * Set keyword boosts for an agent (replace all)
 */
export async function setKeywordBoosts(agentType, keywords) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Delete existing keywords for this agent
    await client.query(
      'DELETE FROM keyword_boosts WHERE agent_type = $1',
      [agentType]
    );
    
    // Insert new keywords
    for (const { word, boost } of keywords) {
      await client.query(
        'INSERT INTO keyword_boosts (agent_type, word, boost) VALUES ($1, $2, $3)',
        [agentType, word, boost]
      );
    }
    
    await client.query('COMMIT');
    return keywords;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Get video triggers for an agent
 */
export async function getVideoTriggers(agentType) {
  const result = await pool.query(
    `SELECT id, name, keywords, video_url, duration_ms, position, speech, enabled 
     FROM video_triggers 
     WHERE agent_type = $1 
     ORDER BY name`,
    [agentType]
  );
  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    keywords: row.keywords,
    videoUrl: row.video_url,
    durationMs: row.duration_ms,
    position: row.position,
    speech: row.speech,
    enabled: row.enabled,
  }));
}

/**
 * Create a video trigger
 */
export async function createVideoTrigger(agentType, trigger) {
  const { name, keywords, videoUrl, durationMs, position, speech, enabled } = trigger;
  const result = await pool.query(
    `INSERT INTO video_triggers (agent_type, name, keywords, video_url, duration_ms, position, speech, enabled)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [agentType, name, keywords, videoUrl, durationMs || 5000, position || 'avatar', speech || '', enabled !== false]
  );
  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    keywords: row.keywords,
    videoUrl: row.video_url,
    durationMs: row.duration_ms,
    position: row.position,
    speech: row.speech,
    enabled: row.enabled,
  };
}

/**
 * Update a video trigger
 */
export async function updateVideoTrigger(id, trigger) {
  const { name, keywords, videoUrl, durationMs, position, speech, enabled } = trigger;
  const result = await pool.query(
    `UPDATE video_triggers 
     SET name = $2, keywords = $3, video_url = $4, duration_ms = $5, position = $6, speech = $7, enabled = $8, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, name, keywords, videoUrl, durationMs, position, speech, enabled]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    keywords: row.keywords,
    videoUrl: row.video_url,
    durationMs: row.duration_ms,
    position: row.position,
    speech: row.speech,
    enabled: row.enabled,
  };
}

/**
 * Delete a video trigger
 */
export async function deleteVideoTrigger(id) {
  const result = await pool.query(
    'DELETE FROM video_triggers WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rows.length > 0;
}

/**
 * Get all settings for an agent (combined with 'all' settings)
 * @param {string} agentType - 'keynote', 'chat', or 'all'
 * @param {boolean} includeAll - whether to merge 'all' settings (default: true for keynote/chat, false for 'all')
 */
export async function getAllAgentConfig(agentType, includeAll = true) {
  // If fetching 'all' directly, don't merge (would cause infinite loop)
  if (agentType === 'all' || !includeAll) {
    const [settings, keywords, triggers] = await Promise.all([
      getAgentSettings(agentType),
      getKeywordBoosts(agentType),
      getVideoTriggers(agentType),
    ]);
    
    return {
      agentType,
      utteranceEndMs: settings?.utterance_end_ms || 1000,
      agentId: settings?.agent_id || null,
      keywords,
      triggers,
    };
  }
  
  // Fetch both agent-specific and 'all' configs in parallel
  const [settings, agentKeywords, agentTriggers, allKeywords, allTriggers] = await Promise.all([
    getAgentSettings(agentType),
    getKeywordBoosts(agentType),
    getVideoTriggers(agentType),
    getKeywordBoosts('all'),
    getVideoTriggers('all'),
  ]);
  
  // Merge keywords: agent-specific boost wins for duplicates
  const keywordMap = new Map();
  for (const kw of allKeywords) {
    keywordMap.set(kw.word.toLowerCase(), kw);
  }
  for (const kw of agentKeywords) {
    keywordMap.set(kw.word.toLowerCase(), kw); // Overwrites 'all' if exists
  }
  const mergedKeywords = Array.from(keywordMap.values());
  
  // Merge triggers: simply combine both sets
  const mergedTriggers = [...allTriggers, ...agentTriggers];
  
  return {
    agentType,
    utteranceEndMs: settings?.utterance_end_ms || 1000,
    agentId: settings?.agent_id || null,
    keywords: mergedKeywords,
    triggers: mergedTriggers,
  };
}

/**
 * Get raw config for an agent without merging (for admin UI)
 */
export async function getRawAgentConfig(agentType) {
  return getAllAgentConfig(agentType, false);
}

// ==================== Visual Assets ====================

/**
 * Get all visual assets for an agent (or 'all')
 */
export async function getVisualAssets(agentType) {
  const result = await pool.query(
    `SELECT id, agent_type, name, asset_type, url, position_x, position_y, width, height, reference_key
     FROM visual_assets 
     WHERE agent_type = $1 
     ORDER BY name`,
    [agentType]
  );
  return result.rows.map(row => ({
    id: row.id,
    agentType: row.agent_type,
    name: row.name,
    assetType: row.asset_type,
    url: row.url,
    positionX: row.position_x,
    positionY: row.position_y,
    width: row.width,
    height: row.height,
    referenceKey: row.reference_key,
  }));
}

/**
 * Get merged visual assets (agent + 'all')
 */
export async function getMergedVisualAssets(agentType) {
  if (agentType === 'all') {
    return getVisualAssets('all');
  }
  
  const [agentAssets, allAssets] = await Promise.all([
    getVisualAssets(agentType),
    getVisualAssets('all'),
  ]);
  
  // Merge: agent-specific wins for same reference_key
  const assetMap = new Map();
  for (const asset of allAssets) {
    if (asset.referenceKey) {
      assetMap.set(asset.referenceKey, asset);
    }
  }
  for (const asset of agentAssets) {
    if (asset.referenceKey) {
      assetMap.set(asset.referenceKey, asset);
    }
  }
  
  // Return merged + any assets without reference keys
  const mergedByKey = Array.from(assetMap.values());
  const agentWithoutKey = agentAssets.filter(a => !a.referenceKey);
  const allWithoutKey = allAssets.filter(a => !a.referenceKey);
  
  return [...mergedByKey, ...agentWithoutKey, ...allWithoutKey];
}

/**
 * Get a visual asset by reference key
 */
export async function getVisualAssetByKey(referenceKey) {
  const result = await pool.query(
    `SELECT id, agent_type, name, asset_type, url, position_x, position_y, width, height, reference_key
     FROM visual_assets 
     WHERE reference_key = $1`,
    [referenceKey]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    agentType: row.agent_type,
    name: row.name,
    assetType: row.asset_type,
    url: row.url,
    positionX: row.position_x,
    positionY: row.position_y,
    width: row.width,
    height: row.height,
    referenceKey: row.reference_key,
  };
}

/**
 * Create a visual asset
 */
export async function createVisualAsset(asset) {
  const { agentType, name, assetType, url, positionX, positionY, width, height, referenceKey } = asset;
  const result = await pool.query(
    `INSERT INTO visual_assets (agent_type, name, asset_type, url, position_x, position_y, width, height, reference_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [agentType || 'all', name, assetType, url, positionX ?? 50, positionY ?? 50, width ?? 50, height, referenceKey || null]
  );
  const row = result.rows[0];
  return {
    id: row.id,
    agentType: row.agent_type,
    name: row.name,
    assetType: row.asset_type,
    url: row.url,
    positionX: row.position_x,
    positionY: row.position_y,
    width: row.width,
    height: row.height,
    referenceKey: row.reference_key,
  };
}

/**
 * Update a visual asset
 */
export async function updateVisualAsset(id, asset) {
  const { agentType, name, assetType, url, positionX, positionY, width, height, referenceKey } = asset;
  const result = await pool.query(
    `UPDATE visual_assets 
     SET agent_type = $2, name = $3, asset_type = $4, url = $5, position_x = $6, position_y = $7, 
         width = $8, height = $9, reference_key = $10, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, agentType, name, assetType, url, positionX, positionY, width, height, referenceKey || null]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    agentType: row.agent_type,
    name: row.name,
    assetType: row.asset_type,
    url: row.url,
    positionX: row.position_x,
    positionY: row.position_y,
    width: row.width,
    height: row.height,
    referenceKey: row.reference_key,
  };
}

/**
 * Delete a visual asset
 */
export async function deleteVisualAsset(id) {
  const result = await pool.query(
    'DELETE FROM visual_assets WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rows.length > 0;
}

export { pool };
