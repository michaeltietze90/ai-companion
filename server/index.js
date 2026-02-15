/**
 * Express Server for Heroku Deployment
 * 
 * Serves the React frontend and API routes (converted from Supabase Edge Functions)
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

// Import API routes
import agentforceSessionRouter from './routes/agentforce-session.js';
import agentforceMessageRouter from './routes/agentforce-message.js';
import heygenTokenRouter from './routes/heygen-token.js';
import heygenProxyRouter from './routes/heygen-proxy.js';
import elevenlabsTtsRouter from './routes/elevenlabs-tts.js';
import elevenlabsScribeTokenRouter from './routes/elevenlabs-scribe-token.js';
import deepgramTokenRouter from './routes/deepgram-token.js';
import deepgramTranscribeRouter from './routes/deepgram-transcribe.js';
import deepgramKeyRouter from './routes/deepgram-key.js';
import leaderboardRouter from './routes/leaderboard.js';
import conversationLogRouter from './routes/conversation-log.js';
import agentConfigRouter from './routes/agent-config.js';

// Import database initialization
import { initializeDatabase } from './lib/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api/agentforce-session', agentforceSessionRouter);
app.use('/api/agentforce-message', agentforceMessageRouter);
app.use('/api/heygen-token', heygenTokenRouter);
app.use('/api/heygen-proxy', heygenProxyRouter);
app.use('/api/elevenlabs-tts', elevenlabsTtsRouter);
app.use('/api/elevenlabs-scribe-token', elevenlabsScribeTokenRouter);
app.use('/api/deepgram-token', deepgramTokenRouter);
app.use('/api/deepgram-transcribe', deepgramTranscribeRouter);
app.use('/api/deepgram-key', deepgramKeyRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/conversation-log', conversationLogRouter);
app.use('/api/agent-config', agentConfigRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../dist')));

// Handle React routing - serve index.html for all non-API routes
// Use a function to handle catch-all that's compatible with Express 5
app.use((req, res, next) => {
  // Skip API routes and static file requests
  if (req.path.startsWith('/api/')) {
    return next();
  }
  // Check if it's a static file request (has extension)
  if (req.path.includes('.')) {
    return next();
  }
  // Serve index.html for all other routes (React Router)
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Create HTTP server for both Express and WebSocket
const server = createServer(app);

// WebSocket server for real-time log streaming
const wss = new WebSocketServer({ server, path: '/ws/logs' });

// Store connected log viewers
const logViewers = new Set();

wss.on('connection', (ws, req) => {
  const isViewer = req.url === '/ws/logs?role=viewer';
  const isSender = req.url === '/ws/logs?role=sender';
  
  if (isViewer) {
    logViewers.add(ws);
    console.log(`[WS] Log viewer connected. Total viewers: ${logViewers.size}`);
    
    ws.on('close', () => {
      logViewers.delete(ws);
      console.log(`[WS] Log viewer disconnected. Total viewers: ${logViewers.size}`);
    });
  } else if (isSender) {
    console.log('[WS] Log sender connected');
    
    ws.on('message', (data) => {
      // Broadcast to all viewers
      const message = data.toString();
      logViewers.forEach((viewer) => {
        if (viewer.readyState === 1) { // OPEN
          viewer.send(message);
        }
      });
    });
    
    ws.on('close', () => {
      console.log('[WS] Log sender disconnected');
    });
  }
  
  ws.on('error', (err) => {
    console.error('[WS] Error:', err.message);
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database tables (only if DATABASE_URL is set)
    if (process.env.DATABASE_URL) {
      await initializeDatabase();
      console.log('[Database] Connected and initialized');
    } else {
      console.log('[Database] No DATABASE_URL set, skipping database initialization');
    }
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`WebSocket available at /ws/logs`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

startServer();
