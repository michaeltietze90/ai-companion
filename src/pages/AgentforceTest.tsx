import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { startAgentSession, endAgentSession, sendAgentMessage } from '@/services/api';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AgentforceTest() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const log = (text: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${text}`]);
  };

  const handleStartSession = async () => {
    setLoading(true);
    log('Starting Agentforce session...');
    try {
      const result = await startAgentSession();
      setSessionId(result.sessionId);
      log(`✅ Session started: ${result.sessionId}`);
      if (result.welcomeMessage) {
        log(`Welcome message: ${result.welcomeMessage}`);
      }
    } catch (error) {
      log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!sessionId || !message.trim()) return;
    
    setLoading(true);
    log(`Sending: "${message}"`);
    try {
      const result = await sendAgentMessage(sessionId, message);
      log(`✅ Response: ${result.message}`);
      if (result.progressIndicators.length > 0) {
        log(`Progress: ${result.progressIndicators.join(' → ')}`);
      }
      setMessage('');
    } catch (error) {
      log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;
    
    setLoading(true);
    log('Ending session...');
    try {
      await endAgentSession(sessionId);
      log('✅ Session ended');
      setSessionId(null);
    } catch (error) {
      log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Agentforce API Test</h1>
        </div>

        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg">Session Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button 
                onClick={handleStartSession} 
                disabled={loading || !!sessionId}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Start Session
              </Button>
              <Button 
                onClick={handleEndSession} 
                disabled={loading || !sessionId}
                variant="destructive"
              >
                End Session
              </Button>
            </div>
            
            {sessionId && (
              <p className="text-sm text-green-400">
                Active Session: <code className="bg-slate-800 px-2 py-1 rounded">{sessionId}</code>
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg">Send Message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={!sessionId || loading}
                className="bg-slate-800 border-slate-600"
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={!sessionId || !message.trim() || loading}
              >
                Send
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg">Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-950 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm space-y-1">
              {logs.length === 0 ? (
                <p className="text-slate-500">No logs yet. Start a session to begin.</p>
              ) : (
                logs.map((log, i) => (
                  <p key={i} className="text-slate-300">{log}</p>
                ))
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLogs([])}
              className="mt-2 text-slate-400"
            >
              Clear Logs
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
