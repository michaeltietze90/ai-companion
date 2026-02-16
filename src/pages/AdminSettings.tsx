import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings, Save, Plus, Trash2, Eye, EyeOff, Lock, 
  Video, Mic, AlertCircle, Check, ArrowLeft, Loader2,
  HelpCircle, Play, Download, Upload
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import HelpDocumentation from "@/components/admin/HelpDocumentation";
import AssetLibrary from "@/components/admin/AssetLibrary";

interface KeywordBoost {
  word: string;
  boost: number;
}

interface VideoTrigger {
  id?: number;
  name: string;
  keywords: string[];
  videoUrl: string;
  durationMs: number | null; // null = use full video length
  position: string;
  speech: string;
  enabled: boolean;
}

interface AgentConfig {
  agentType: string;
  utteranceEndMs: number;
  agentId: string | null;
  keywords: KeywordBoost[];
  triggers: VideoTrigger[];
}

const POSITIONS = [
  { value: 'avatar', label: 'Avatar (Seamless Overlay)' },
  { value: 'center', label: 'Center' },
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
];

const AdminSettings = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedAgent, setSelectedAgent] = useState<'keynote' | 'chat' | 'all'>('keynote');
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Local state for editing
  const [utteranceEndMs, setUtteranceEndMs] = useState(1000);
  const [agentId, setAgentId] = useState('');
  const [keywords, setKeywords] = useState<KeywordBoost[]>([]);
  const [triggers, setTriggers] = useState<VideoTrigger[]>([]);
  const [newKeyword, setNewKeyword] = useState({ word: '', boost: 5 });

  // Fetch config when agent changes
  const fetchConfig = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    try {
      // Use raw=true to get only this agent's settings (not merged with 'all')
      const res = await fetch(`/api/agent-config/${selectedAgent}?raw=true`);
      if (!res.ok) throw new Error('Failed to fetch config');
      
      const data: AgentConfig = await res.json();
      setConfig(data);
      setUtteranceEndMs(data.utteranceEndMs);
      setAgentId(data.agentId || '');
      setKeywords(data.keywords);
      setTriggers(data.triggers);
    } catch (error) {
      console.error('Error fetching config:', error);
      setSaveMessage({ type: 'error', text: 'Failed to load configuration' });
    } finally {
      setIsLoading(false);
    }
  }, [selectedAgent, isAuthenticated]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    try {
      const res = await fetch('/api/agent-config/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      
      if (res.ok) {
        setIsAuthenticated(true);
        localStorage.setItem('adminPassword', password);
      } else {
        setAuthError('Invalid password');
      }
    } catch {
      setAuthError('Failed to authenticate');
    }
  };

  // Check for saved password on mount
  useEffect(() => {
    const saved = localStorage.getItem('adminPassword');
    if (saved) {
      setPassword(saved);
      fetch('/api/agent-config/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: saved }),
      }).then(res => {
        if (res.ok) setIsAuthenticated(true);
      });
    }
  }, []);

  const getAuthHeader = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${password}`,
  });

  const saveSettings = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      // Save settings (utteranceEndMs and agentId)
      await fetch(`/api/agent-config/${selectedAgent}/settings`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify({ utteranceEndMs, agentId: agentId || null }),
      });
      
      // Save keywords
      await fetch(`/api/agent-config/${selectedAgent}/keywords`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify({ keywords }),
      });
      
      setSaveMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error saving:', error);
      setSaveMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const addKeyword = () => {
    if (newKeyword.word.trim()) {
      setKeywords([...keywords, { word: newKeyword.word.trim(), boost: newKeyword.boost }]);
      setNewKeyword({ word: '', boost: 5 });
    }
  };

  const removeKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const updateKeywordBoost = (index: number, boost: number) => {
    const updated = [...keywords];
    updated[index].boost = boost;
    setKeywords(updated);
  };

  const saveTrigger = async (trigger: VideoTrigger) => {
    setIsSaving(true);
    try {
      const method = trigger.id ? 'PUT' : 'POST';
      const url = trigger.id 
        ? `/api/agent-config/${selectedAgent}/triggers/${trigger.id}`
        : `/api/agent-config/${selectedAgent}/triggers`;
      
      const res = await fetch(url, {
        method,
        headers: getAuthHeader(),
        body: JSON.stringify(trigger),
      });
      
      if (!res.ok) throw new Error('Failed to save trigger');
      
      await fetchConfig();
      setSaveMessage({ type: 'success', text: 'Trigger saved!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error saving trigger:', error);
      setSaveMessage({ type: 'error', text: 'Failed to save trigger' });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTrigger = async (id: number) => {
    if (!confirm('Are you sure you want to delete this trigger?')) return;
    
    setIsSaving(true);
    try {
      const res = await fetch(`/api/agent-config/${selectedAgent}/triggers/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      
      if (!res.ok) throw new Error('Failed to delete trigger');
      
      await fetchConfig();
      setSaveMessage({ type: 'success', text: 'Trigger deleted' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error deleting trigger:', error);
      setSaveMessage({ type: 'error', text: 'Failed to delete trigger' });
    } finally {
      setIsSaving(false);
    }
  };

  const addNewTrigger = () => {
    setTriggers([
      ...triggers,
      {
        name: 'New Trigger',
        keywords: [],
        videoUrl: '',
        durationMs: null, // Default to full video length
        position: 'avatar',
        speech: '',
        enabled: true,
      },
    ]);
  };

  // Auth screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
        <motion.div
          className="max-w-sm w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Admin Settings</h1>
            <p className="text-muted-foreground text-sm mt-2">Enter password to continue</p>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-center"
            />
            {authError && (
              <p className="text-destructive text-sm text-center">{authError}</p>
            )}
            <Button type="submit" className="w-full">
              Unlock
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <Link to="/" className="text-muted-foreground text-sm hover:text-foreground">
              <ArrowLeft className="w-4 h-4 inline mr-1" />
              Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Header */}
      <header className="border-b border-border p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-bold">Agent Settings</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={selectedAgent} onValueChange={(v) => setSelectedAgent(v as 'keynote' | 'chat' | 'all')}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keynote">Keynote Only</SelectItem>
                <SelectItem value="chat">Exec Experience Only</SelectItem>
                <SelectItem value="all">All Agents (Shared)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* Save message */}
      <AnimatePresence>
        {saveMessage && (
          <motion.div
            className="fixed top-4 right-4 z-50"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              saveMessage.type === 'success' 
                ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                : 'bg-destructive/20 text-destructive border border-destructive/30'
            }`}>
              {saveMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {saveMessage.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="max-w-5xl mx-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="keywords" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="keywords" className="flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Keywords
              </TabsTrigger>
              <TabsTrigger value="triggers" className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                Triggers
              </TabsTrigger>
              <TabsTrigger value="assets" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Assets
              </TabsTrigger>
              <TabsTrigger value="help" className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                Help
              </TabsTrigger>
            </TabsList>

            {/* Keywords & Voice Settings */}
            <TabsContent value="keywords" className="space-y-6">
              {/* Agent Settings */}
              <div className="rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold mb-4">Agent Settings</h2>
                <div className="space-y-4">
                  <div>
                    <Label>Salesforce Agent ID</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      The Agentforce Agent ID for this experience. Leave empty to use server default.
                    </p>
                    <Input
                      type="text"
                      value={agentId}
                      onChange={(e) => setAgentId(e.target.value)}
                      placeholder="e.g., 0XxHn000001LXbYKAW"
                      className="w-full max-w-md font-mono"
                    />
                  </div>
                </div>
              </div>
              
              {/* Voice Settings */}
              <div className="rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold mb-4">Voice Settings</h2>
                <div className="space-y-4">
                  <div>
                    <Label>Utterance End Delay (ms)</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      How long to wait after silence before processing speech
                    </p>
                    <Input
                      type="number"
                      min={100}
                      max={10000}
                      step={100}
                      value={utteranceEndMs}
                      onChange={(e) => setUtteranceEndMs(parseInt(e.target.value) || 1000)}
                      className="w-40"
                    />
                  </div>
                </div>
              </div>

              {/* Keyword Boosts */}
              <div className="rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold">Keyword Boosts</h2>
                    <p className="text-sm text-muted-foreground">
                      Boost recognition accuracy for specific words/phrases (1-10)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      id="keyword-import"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            try {
                              const data = JSON.parse(event.target?.result as string);
                              if (data.keywords && Array.isArray(data.keywords)) {
                                setKeywords(data.keywords);
                                setSaveMessage({ type: 'success', text: `Imported ${data.keywords.length} keywords` });
                                setTimeout(() => setSaveMessage(null), 3000);
                              } else {
                                throw new Error('Invalid format');
                              }
                            } catch (err) {
                              setSaveMessage({ type: 'error', text: 'Invalid JSON format. Expected { keywords: [...] }' });
                            }
                          };
                          reader.readAsText(file);
                        }
                        e.target.value = '';
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('keyword-import')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      Import
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const data = { keywords };
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `keywords-${selectedAgent}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Export
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const template = {
                          keywords: [
                            { word: "Agentforce", boost: 5 },
                            { word: "Salesforce", boost: 4 },
                            { word: "Einstein", boost: 3 }
                          ]
                        };
                        const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'keywords-template.json';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      title="Download template JSON"
                    >
                      Template
                    </Button>
                  </div>
                </div>

                {/* Add keyword */}
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Word or phrase..."
                    value={newKeyword.word}
                    onChange={(e) => setNewKeyword({ ...newKeyword, word: e.target.value })}
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                  />
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={newKeyword.boost}
                    onChange={(e) => setNewKeyword({ ...newKeyword, boost: parseInt(e.target.value) || 5 })}
                    className="w-20"
                  />
                  <Button onClick={addKeyword}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Keyword list */}
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {keywords.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4 text-center">
                      No keywords configured. Add some above.
                    </p>
                  ) : (
                    keywords.map((kw, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                        <span className="flex-1 font-mono text-sm">{kw.word}</span>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={kw.boost}
                          onChange={(e) => updateKeywordBoost(idx, parseInt(e.target.value) || 5)}
                          className="w-20 h-8"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeKeyword(idx)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Save button */}
              <div className="flex justify-end">
                <Button onClick={saveSettings} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Keywords & Settings
                </Button>
              </div>
            </TabsContent>

            {/* Video Triggers */}
            <TabsContent value="triggers" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold">Video Triggers</h2>
                  <p className="text-sm text-muted-foreground">
                    Play videos when specific keywords are detected
                  </p>
                </div>
                <Button onClick={addNewTrigger}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Trigger
                </Button>
              </div>

              {triggers.length === 0 ? (
                <div className="rounded-xl border border-border p-8 text-center">
                  <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No video triggers configured</p>
                  <Button className="mt-4" onClick={addNewTrigger}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Trigger
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {triggers.map((trigger, idx) => (
                    <TriggerCard
                      key={trigger.id || `new-${idx}`}
                      trigger={trigger}
                      onSave={saveTrigger}
                      onDelete={trigger.id ? () => deleteTrigger(trigger.id!) : undefined}
                      isSaving={isSaving}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Visual Assets */}
            <TabsContent value="assets">
              <AssetLibrary 
                agentType={selectedAgent} 
                password={password}
                onMessage={(msg) => {
                  setSaveMessage(msg);
                  setTimeout(() => setSaveMessage(null), 3000);
                }}
              />
            </TabsContent>

            {/* Help & Documentation */}
            <TabsContent value="help">
              <HelpDocumentation />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

// Trigger Card Component
interface TriggerCardProps {
  trigger: VideoTrigger;
  onSave: (trigger: VideoTrigger) => void;
  onDelete?: () => void;
  isSaving: boolean;
}

const TriggerCard = ({ trigger, onSave, onDelete, isSaving }: TriggerCardProps) => {
  const [isEditing, setIsEditing] = useState(!trigger.id);
  const [local, setLocal] = useState(trigger);
  const [keywordsText, setKeywordsText] = useState(trigger.keywords.join(', '));
  const [showPreview, setShowPreview] = useState(false);

  const handleSave = () => {
    const keywords = keywordsText.split(',').map(k => k.trim()).filter(k => k);
    onSave({ ...local, keywords });
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${local.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
            <div>
              <h3 className="font-semibold">{local.name}</h3>
              <p className="text-sm text-muted-foreground">
                Keywords: {local.keywords.join(', ') || 'None'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {local.videoUrl && (
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(true)}>
                <Play className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
            {onDelete && (
              <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Video Preview Modal (collapsed view) */}
        <AnimatePresence>
          {showPreview && local.videoUrl && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPreview(false)}
            >
              <motion.div
                className="relative bg-background rounded-xl overflow-hidden shadow-2xl max-w-lg w-full mx-4"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-3 border-b border-border flex items-center justify-between">
                  <span className="text-sm font-medium">Preview: {local.name}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowPreview(false)}
                    className="h-6 w-6 p-0"
                  >
                    ✕
                  </Button>
                </div>
                <div className="relative bg-black" style={{ aspectRatio: '9/16', maxHeight: '70vh' }}>
                  <video
                    src={local.videoUrl}
                    controls
                    autoPlay
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                </div>
                <div className="p-3 border-t border-border text-center">
                  <p className="text-xs text-muted-foreground">
                    Preview in 9:16 hologram aspect ratio (2160×3840 scaled)
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/50 p-4 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Name</Label>
          <Input
            value={local.name}
            onChange={(e) => setLocal({ ...local, name: e.target.value })}
            placeholder="Trigger name"
          />
        </div>
        <div>
          <Label>Video URL</Label>
          <div className="flex gap-2">
            <Input
              value={local.videoUrl}
              onChange={(e) => setLocal({ ...local, videoUrl: e.target.value })}
              placeholder="https://example.com/video.mp4"
              className="flex-1"
            />
            {local.videoUrl && (
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setShowPreview(true)}
                className="shrink-0"
              >
                <Play className="w-4 h-4 mr-1" />
                Preview
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Video Preview Modal */}
      <AnimatePresence>
        {showPreview && local.videoUrl && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              className="relative bg-background rounded-xl overflow-hidden shadow-2xl max-w-lg w-full mx-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 border-b border-border flex items-center justify-between">
                <span className="text-sm font-medium">Preview: {local.name}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowPreview(false)}
                  className="h-6 w-6 p-0"
                >
                  ✕
                </Button>
              </div>
              {/* 9:16 aspect ratio container for hologram preview */}
              <div className="relative bg-black" style={{ aspectRatio: '9/16', maxHeight: '70vh' }}>
                <video
                  src={local.videoUrl}
                  controls
                  autoPlay
                  className="absolute inset-0 w-full h-full object-contain"
                  onError={() => {
                    setSaveMessage?.({ type: 'error', text: 'Failed to load video preview' });
                    setShowPreview(false);
                  }}
                />
              </div>
              <div className="p-3 border-t border-border text-center">
                <p className="text-xs text-muted-foreground">
                  Preview in 9:16 hologram aspect ratio (2160×3840 scaled)
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <Label>Keywords (comma separated)</Label>
        <Input
          value={keywordsText}
          onChange={(e) => setKeywordsText(e.target.value)}
          placeholder="backflip, back flip, salto"
        />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div>
          <Label>Duration</Label>
          <div className="flex items-center gap-2 mt-1">
            <Switch
              checked={local.durationMs === null}
              onCheckedChange={(checked) => setLocal({ ...local, durationMs: checked ? null : 5000 })}
            />
            <span className="text-sm text-muted-foreground">
              {local.durationMs === null ? 'Full video' : 'Custom'}
            </span>
          </div>
        </div>
        <div>
          <Label>Duration (ms)</Label>
          <Input
            type="number"
            value={local.durationMs ?? ''}
            onChange={(e) => setLocal({ ...local, durationMs: e.target.value ? parseInt(e.target.value) : null })}
            placeholder="Auto"
            disabled={local.durationMs === null}
          />
        </div>
        <div>
          <Label>Position</Label>
          <Select value={local.position} onValueChange={(v) => setLocal({ ...local, position: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POSITIONS.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Switch
            checked={local.enabled}
            onCheckedChange={(checked) => setLocal({ ...local, enabled: checked })}
          />
          <Label>Enabled</Label>
        </div>
      </div>

      <div>
        <Label>Speech (optional)</Label>
        <Input
          value={local.speech}
          onChange={(e) => setLocal({ ...local, speech: e.target.value })}
          placeholder="Text for avatar to say (leave empty for silent)"
        />
      </div>

      <div className="flex justify-end gap-2">
        {trigger.id && (
          <Button variant="ghost" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Trigger
        </Button>
      </div>
    </div>
  );
};

export default AdminSettings;
