/**
 * Agent Configuration API
 * 
 * Manages video triggers, keyword boosts, and settings per agent.
 * Protected by simple password authentication.
 */

import express from 'express';
import {
  getAllAgentConfig,
  updateAgentSettings,
  setKeywordBoosts,
  getVideoTriggers,
  createVideoTrigger,
  updateVideoTrigger,
  deleteVideoTrigger,
} from '../lib/database.js';

const router = express.Router();

// Simple password protection (set via env var)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }
  
  const password = authHeader.slice(7);
  if (password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Invalid password' });
  }
  
  next();
}

// Validate agent type
function validateAgentType(agentType) {
  return ['keynote', 'chat'].includes(agentType);
}

/**
 * GET /api/agent-config/:agentType
 * Get all configuration for an agent (public - used by frontend)
 */
router.get('/:agentType', async (req, res) => {
  try {
    const { agentType } = req.params;
    
    if (!validateAgentType(agentType)) {
      return res.status(400).json({ error: 'Invalid agent type. Must be "keynote" or "chat"' });
    }
    
    const config = await getAllAgentConfig(agentType);
    res.json(config);
  } catch (error) {
    console.error('[AgentConfig] Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch agent config' });
  }
});

/**
 * PUT /api/agent-config/:agentType/settings
 * Update agent settings (utteranceEndMs, agentId)
 */
router.put('/:agentType/settings', requireAuth, async (req, res) => {
  try {
    const { agentType } = req.params;
    const { utteranceEndMs, agentId } = req.body;
    
    if (!validateAgentType(agentType)) {
      return res.status(400).json({ error: 'Invalid agent type' });
    }
    
    if (typeof utteranceEndMs !== 'number' || utteranceEndMs < 100 || utteranceEndMs > 10000) {
      return res.status(400).json({ error: 'utteranceEndMs must be between 100 and 10000' });
    }
    
    // agentId can be string or null/empty to clear it
    const settings = await updateAgentSettings(agentType, { 
      utteranceEndMs, 
      agentId: agentId || null 
    });
    res.json({ success: true, settings });
  } catch (error) {
    console.error('[AgentConfig] Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * PUT /api/agent-config/:agentType/keywords
 * Replace all keyword boosts for an agent
 */
router.put('/:agentType/keywords', requireAuth, async (req, res) => {
  try {
    const { agentType } = req.params;
    const { keywords } = req.body;
    
    if (!validateAgentType(agentType)) {
      return res.status(400).json({ error: 'Invalid agent type' });
    }
    
    if (!Array.isArray(keywords)) {
      return res.status(400).json({ error: 'keywords must be an array' });
    }
    
    // Validate each keyword
    for (const kw of keywords) {
      if (!kw.word || typeof kw.word !== 'string') {
        return res.status(400).json({ error: 'Each keyword must have a "word" string' });
      }
      if (typeof kw.boost !== 'number' || kw.boost < 1 || kw.boost > 10) {
        return res.status(400).json({ error: 'Each keyword must have a "boost" between 1 and 10' });
      }
    }
    
    const result = await setKeywordBoosts(agentType, keywords);
    res.json({ success: true, keywords: result });
  } catch (error) {
    console.error('[AgentConfig] Error updating keywords:', error);
    res.status(500).json({ error: 'Failed to update keywords' });
  }
});

/**
 * GET /api/agent-config/:agentType/triggers
 * Get all video triggers for an agent
 */
router.get('/:agentType/triggers', async (req, res) => {
  try {
    const { agentType } = req.params;
    
    if (!validateAgentType(agentType)) {
      return res.status(400).json({ error: 'Invalid agent type' });
    }
    
    const triggers = await getVideoTriggers(agentType);
    res.json(triggers);
  } catch (error) {
    console.error('[AgentConfig] Error fetching triggers:', error);
    res.status(500).json({ error: 'Failed to fetch triggers' });
  }
});

/**
 * POST /api/agent-config/:agentType/triggers
 * Create a new video trigger
 */
router.post('/:agentType/triggers', requireAuth, async (req, res) => {
  try {
    const { agentType } = req.params;
    const { name, keywords, videoUrl, durationMs, position, speech, enabled } = req.body;
    
    if (!validateAgentType(agentType)) {
      return res.status(400).json({ error: 'Invalid agent type' });
    }
    
    if (!name || !keywords || !videoUrl) {
      return res.status(400).json({ error: 'name, keywords, and videoUrl are required' });
    }
    
    if (!Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ error: 'keywords must be a non-empty array' });
    }
    
    const trigger = await createVideoTrigger(agentType, {
      name,
      keywords,
      videoUrl,
      durationMs,
      position,
      speech,
      enabled,
    });
    
    res.status(201).json(trigger);
  } catch (error) {
    console.error('[AgentConfig] Error creating trigger:', error);
    res.status(500).json({ error: 'Failed to create trigger' });
  }
});

/**
 * PUT /api/agent-config/:agentType/triggers/:id
 * Update a video trigger
 */
router.put('/:agentType/triggers/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, keywords, videoUrl, durationMs, position, speech, enabled } = req.body;
    
    if (!name || !keywords || !videoUrl) {
      return res.status(400).json({ error: 'name, keywords, and videoUrl are required' });
    }
    
    const trigger = await updateVideoTrigger(parseInt(id), {
      name,
      keywords,
      videoUrl,
      durationMs,
      position,
      speech,
      enabled,
    });
    
    if (!trigger) {
      return res.status(404).json({ error: 'Trigger not found' });
    }
    
    res.json(trigger);
  } catch (error) {
    console.error('[AgentConfig] Error updating trigger:', error);
    res.status(500).json({ error: 'Failed to update trigger' });
  }
});

/**
 * DELETE /api/agent-config/:agentType/triggers/:id
 * Delete a video trigger
 */
router.delete('/:agentType/triggers/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await deleteVideoTrigger(parseInt(id));
    
    if (!deleted) {
      return res.status(404).json({ error: 'Trigger not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('[AgentConfig] Error deleting trigger:', error);
    res.status(500).json({ error: 'Failed to delete trigger' });
  }
});

/**
 * POST /api/agent-config/auth
 * Verify password (used by settings page)
 */
router.post('/auth', (req, res) => {
  const { password } = req.body;
  
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(403).json({ error: 'Invalid password' });
  }
});

export default router;
