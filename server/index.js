/**
 * Express Server for Heroku Deployment
 * 
 * Serves the React frontend and API routes (converted from Supabase Edge Functions)
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Import API routes
import agentforceSessionRouter from './routes/agentforce-session.js';
import agentforceMessageRouter from './routes/agentforce-message.js';
import heygenTokenRouter from './routes/heygen-token.js';
import heygenProxyRouter from './routes/heygen-proxy.js';
import elevenlabsTtsRouter from './routes/elevenlabs-tts.js';
import elevenlabsScribeTokenRouter from './routes/elevenlabs-scribe-token.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes (replaces Supabase Edge Functions)
app.use('/api/agentforce-session', agentforceSessionRouter);
app.use('/api/agentforce-message', agentforceMessageRouter);
app.use('/api/heygen-token', heygenTokenRouter);
app.use('/api/heygen-proxy', heygenProxyRouter);
app.use('/api/elevenlabs-tts', elevenlabsTtsRouter);
app.use('/api/elevenlabs-scribe-token', elevenlabsScribeTokenRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../dist')));

// Handle React routing - serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
