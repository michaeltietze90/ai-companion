import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, User, Key, Bot, Save, Check, Image, Code, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSettingsStore, Profile, AvatarOption, VoiceEmotionType } from '@/stores/settingsStore';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

// Some popular public HeyGen avatar IDs
const DEFAULT_PUBLIC_AVATARS: AvatarOption[] = [
  { id: 'Angela-inblackskirt-20220820', name: 'Angela' },
  { id: 'Anna_public_3_20240108', name: 'Anna' },
  { id: 'josh_lite3_20230714', name: 'Josh' },
  { id: 'Kristin_public_2_20240108', name: 'Kristin' },
  { id: 'Monica-insuit-20220818', name: 'Monica' },
  { id: 'Tyler-incasualsuit-20220721', name: 'Tyler' },
  { id: 'Wayne_20240711', name: 'Wayne' },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { toast } = useToast();
  const {
    profiles,
    activeProfileId,
    publicAvatars,
    addProfile,
    updateProfile,
    deleteProfile,
    setActiveProfileId,
    setPublicAvatars,
  } = useSettingsStore();

  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [newAvatarId, setNewAvatarId] = useState('');
  const [newAvatarName, setNewAvatarName] = useState('');

  // Initialize public avatars if empty
  useEffect(() => {
    if (publicAvatars.length === 0) {
      setPublicAvatars(DEFAULT_PUBLIC_AVATARS);
    }
  }, [publicAvatars.length, setPublicAvatars]);

  // Set editing profile when modal opens
  useEffect(() => {
    if (isOpen) {
      const active = profiles.find((p) => p.id === activeProfileId);
      setEditingProfile(active || profiles[0] || null);
    }
  }, [isOpen, profiles, activeProfileId]);

  const handleSave = () => {
    if (!editingProfile) return;
    updateProfile(editingProfile.id, editingProfile);
    toast({
      title: 'Settings saved',
      description: `Profile "${editingProfile.name}" has been updated.`,
    });
  };

  const handleCreateProfile = () => {
    const newProfile: Profile = {
      id: crypto.randomUUID(),
      name: `Profile ${profiles.length + 1}`,
      salesforceOrgDomain: '',
      salesforceClientId: '',
      salesforceClientSecret: '',
      salesforceAgentId: '',
      salesforceApiHost: 'https://api.salesforce.com',
      heygenApiKey: '',
      selectedAvatarId: '',
      selectedEmotion: 'excited',
      customAvatars: [],
    };
    addProfile(newProfile);
    setEditingProfile(newProfile);
    setActiveProfileId(newProfile.id);
  };

  const handleDeleteProfile = (id: string) => {
    if (profiles.length <= 1) {
      toast({
        title: 'Cannot delete',
        description: 'You must have at least one profile.',
        variant: 'destructive',
      });
      return;
    }
    deleteProfile(id);
    const remaining = profiles.filter((p) => p.id !== id);
    setEditingProfile(remaining[0] || null);
  };

  const handleAddCustomAvatar = () => {
    if (!editingProfile || !newAvatarId.trim()) return;
    const customAvatar: AvatarOption = {
      id: newAvatarId.trim(),
      name: newAvatarName.trim() || newAvatarId.trim(),
      isCustom: true,
    };
    setEditingProfile({
      ...editingProfile,
      customAvatars: [...editingProfile.customAvatars, customAvatar],
    });
    setNewAvatarId('');
    setNewAvatarName('');
  };

  const handleRemoveCustomAvatar = (avatarId: string) => {
    if (!editingProfile) return;
    setEditingProfile({
      ...editingProfile,
      customAvatars: editingProfile.customAvatars.filter((a) => a.id !== avatarId),
      selectedAvatarId: editingProfile.selectedAvatarId === avatarId ? '' : editingProfile.selectedAvatarId,
    });
  };

  const allAvatars = [...publicAvatars, ...(editingProfile?.customAvatars || [])];

  const updateField = <K extends keyof Profile>(field: K, value: Profile[K]) => {
    if (!editingProfile) return;
    setEditingProfile({ ...editingProfile, [field]: value });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Profile Selector */}
          <div className="flex items-center gap-3 mb-6 p-3 rounded-lg bg-secondary/50">
            <Label className="text-sm text-muted-foreground">Profile:</Label>
            <Select
              value={editingProfile?.id || ''}
              onValueChange={(id) => {
                const profile = profiles.find((p) => p.id === id);
                if (profile) {
                  setEditingProfile(profile);
                  setActiveProfileId(id);
                }
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select profile" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleCreateProfile}>
              <Plus className="w-4 h-4 mr-1" />
              New
            </Button>
            {profiles.length > 1 && editingProfile && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDeleteProfile(editingProfile.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {editingProfile && (
            <Tabs defaultValue="salesforce" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="salesforce">Salesforce</TabsTrigger>
                <TabsTrigger value="heygen">HeyGen</TabsTrigger>
                <TabsTrigger value="rich-responses">Rich Responses</TabsTrigger>
                <TabsTrigger value="profile">Profile</TabsTrigger>
              </TabsList>

              {/* Salesforce Tab */}
              <TabsContent value="salesforce" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sf-domain">Org Domain</Label>
                  <Input
                    id="sf-domain"
                    placeholder="https://your-org.my.salesforce.com"
                    value={editingProfile.salesforceOrgDomain}
                    onChange={(e) => updateField('salesforceOrgDomain', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sf-client-id">Client ID</Label>
                  <Input
                    id="sf-client-id"
                    placeholder="Connected App Client ID"
                    value={editingProfile.salesforceClientId}
                    onChange={(e) => updateField('salesforceClientId', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sf-client-secret">Client Secret</Label>
                  <Input
                    id="sf-client-secret"
                    type="password"
                    placeholder="Connected App Client Secret"
                    value={editingProfile.salesforceClientSecret}
                    onChange={(e) => updateField('salesforceClientSecret', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sf-agent-id">Agent ID</Label>
                  <Input
                    id="sf-agent-id"
                    placeholder="Agentforce Agent ID"
                    value={editingProfile.salesforceAgentId}
                    onChange={(e) => updateField('salesforceAgentId', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sf-api-host">API Host</Label>
                  <Input
                    id="sf-api-host"
                    placeholder="https://api.salesforce.com"
                    value={editingProfile.salesforceApiHost}
                    onChange={(e) => updateField('salesforceApiHost', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use https://api.salesforce.com for production or sandbox environments
                  </p>
                </div>
              </TabsContent>

              {/* HeyGen Tab */}
              <TabsContent value="heygen" className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="heygen-key">API Key</Label>
                  <Input
                    id="heygen-key"
                    type="password"
                    placeholder="HeyGen API Key"
                    value={editingProfile.heygenApiKey}
                    onChange={(e) => updateField('heygenApiKey', e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Select Avatar</Label>
                  <Select
                    value={editingProfile.selectedAvatarId}
                    onValueChange={(id) => updateField('selectedAvatarId', id)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an avatar" />
                    </SelectTrigger>
                    <SelectContent>
                      {allAvatars.map((avatar) => (
                        <SelectItem key={avatar.id} value={avatar.id}>
                          <span className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            {avatar.name}
                            {avatar.isCustom && (
                              <span className="text-xs text-muted-foreground">(custom)</span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Emotion Selection */}
                <div className="space-y-3">
                  <Label>Voice Emotion</Label>
                  <Select
                    value={editingProfile.selectedEmotion}
                    onValueChange={(emotion) => updateField('selectedEmotion', emotion as VoiceEmotionType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an emotion" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excited">
                        <span className="flex items-center gap-2">
                          🎉 Excited
                          <span className="text-xs text-muted-foreground">- energetic, happy</span>
                        </span>
                      </SelectItem>
                      <SelectItem value="friendly">
                        <span className="flex items-center gap-2">
                          😊 Friendly
                          <span className="text-xs text-muted-foreground">- warm, approachable</span>
                        </span>
                      </SelectItem>
                      <SelectItem value="serious">
                        <span className="flex items-center gap-2">
                          🎯 Serious
                          <span className="text-xs text-muted-foreground">- professional, focused</span>
                        </span>
                      </SelectItem>
                      <SelectItem value="soothing">
                        <span className="flex items-center gap-2">
                          🧘 Soothing
                          <span className="text-xs text-muted-foreground">- calm, relaxing</span>
                        </span>
                      </SelectItem>
                      <SelectItem value="broadcaster">
                        <span className="flex items-center gap-2">
                          📺 Broadcaster
                          <span className="text-xs text-muted-foreground">- news anchor style</span>
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Changes take effect on next conversation start
                  </p>
                </div>

                {/* Custom Avatars */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <Label>Custom Avatars</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Avatar ID"
                      value={newAvatarId}
                      onChange={(e) => setNewAvatarId(e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Display Name"
                      value={newAvatarName}
                      onChange={(e) => setNewAvatarName(e.target.value)}
                      className="flex-1"
                    />
                    <Button variant="outline" onClick={handleAddCustomAvatar} disabled={!newAvatarId.trim()}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {editingProfile.customAvatars.length > 0 && (
                    <div className="space-y-2">
                      {editingProfile.customAvatars.map((avatar) => (
                        <div
                          key={avatar.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-secondary/50"
                        >
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{avatar.name}</span>
                            <span className="text-xs text-muted-foreground">({avatar.id})</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive h-8 w-8 p-0"
                            onClick={() => handleRemoveCustomAvatar(avatar.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Rich Responses Tab */}
              <TabsContent value="rich-responses" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Image className="w-5 h-5" />
                    <h3 className="font-semibold">Rich Response Tags</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Configure your Agentforce agent to include these tags in responses. The avatar will speak the text while displaying visuals as overlays.
                  </p>

                  {/* Visual Tag */}
                  <div className="p-4 rounded-lg bg-secondary/50 space-y-3">
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">Visual Tag</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Display images, GIFs, or videos as transparent overlays during speech.
                    </p>
                    <div className="bg-background/80 p-3 rounded-md font-mono text-xs overflow-x-auto">
                      <code className="text-green-400">
                        {'<visual type="image" src="URL" duration="5000" position="center" />'}
                      </code>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <span className="text-muted-foreground">type</span>
                      <span>image | gif | video</span>
                      <span className="text-muted-foreground">src</span>
                      <span>URL to media (PNG with transparency works)</span>
                      <span className="text-muted-foreground">duration</span>
                      <span>Display time: 5000 or "5s" (default: 5s)</span>
                      <span className="text-muted-foreground">position</span>
                      <span>center, top, bottom, left, right, topleft, topright, bottomleft, bottomright</span>
                      <span className="text-muted-foreground">startOffset</span>
                      <span>Delay before showing (optional)</span>
                    </div>
                  </div>

                  {/* Break Tag */}
                  <div className="p-4 rounded-lg bg-secondary/50 space-y-3">
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">Break Tag (SSML)</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Add pauses in speech for dramatic effect or timing.
                    </p>
                    <div className="bg-background/80 p-3 rounded-md font-mono text-xs">
                      <code className="text-green-400">
                        {'<break time="500ms" />'}
                      </code>
                    </div>
                  </div>

                  {/* Example */}
                  <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                    <div className="flex items-center gap-2 text-primary">
                      <Bot className="w-4 h-4" />
                      <span className="font-medium text-sm">Example Response</span>
                    </div>
                    <div className="bg-background/80 p-3 rounded-md font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                      <code className="text-foreground">
{`Hi! Let me show you our product.
<visual type="image" src="https://example.com/product.png" duration="4000" position="right"/>
This is our bestseller!
<break time="500ms"/>
Would you like to learn more?`}
                      </code>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p><strong>What happens:</strong></p>
                      <ul className="list-disc list-inside space-y-0.5 ml-2">
                        <li>Avatar speaks: "Hi! Let me show you our product. This is our bestseller! ... Would you like to learn more?"</li>
                        <li>Product image appears on the right for 4 seconds</li>
                        <li>Brief pause after "bestseller"</li>
                      </ul>
                    </div>
                  </div>

                  {/* Agent Instructions */}
                  <div className="p-4 rounded-lg bg-secondary/30 space-y-3">
                    <span className="font-medium text-sm">Agentforce Configuration</span>
                    <p className="text-xs text-muted-foreground">
                      Add instructions like this to your Agentforce agent's system prompt:
                    </p>
                    <ScrollArea className="h-32">
                      <div className="bg-background/80 p-3 rounded-md font-mono text-xs whitespace-pre-wrap">
                        <code className="text-muted-foreground">
{`When showing visual content, use this format:
<visual type="image" src="[URL]" duration="[ms]" position="[position]"/>

Positions: center, top, bottom, left, right, topleft, topright, bottomleft, bottomright

For pauses: <break time="500ms"/>

The visual tags will be removed from speech. Only the surrounding text is spoken.`}
                        </code>
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </TabsContent>

              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Profile Name</Label>
                  <Input
                    id="profile-name"
                    placeholder="My Profile"
                    value={editingProfile.name}
                    onChange={(e) => updateField('name', e.target.value)}
                  />
                </div>
                <div className="p-4 rounded-lg bg-secondary/30 space-y-2">
                  <h4 className="text-sm font-medium">Profile Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Salesforce Org:</span>
                    <span className="truncate">{editingProfile.salesforceOrgDomain || 'Not set'}</span>
                    <span className="text-muted-foreground">HeyGen Key:</span>
                    <span>{editingProfile.heygenApiKey ? '••••••••' : 'Not set'}</span>
                    <span className="text-muted-foreground">Avatar:</span>
                    <span>
                      {allAvatars.find((a) => a.id === editingProfile.selectedAvatarId)?.name || 'Not selected'}
                    </span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
