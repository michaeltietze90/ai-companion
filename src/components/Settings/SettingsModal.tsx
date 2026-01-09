import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, User, Key, Bot, Save, Check } from 'lucide-react';
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
import { useSettingsStore, Profile, AvatarOption } from '@/stores/settingsStore';
import { useToast } from '@/hooks/use-toast';

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
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="salesforce">Salesforce</TabsTrigger>
                <TabsTrigger value="heygen">HeyGen</TabsTrigger>
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
