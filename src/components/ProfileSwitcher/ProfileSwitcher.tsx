import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronDown, Check, Bot, Code, MessageSquare, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useSettingsStore, Profile, ResponseMode } from '@/stores/settingsStore';
import { useToast } from '@/hooks/use-toast';

interface ProfileSwitcherProps {
  disabled?: boolean;
}

export function ProfileSwitcher({ disabled }: ProfileSwitcherProps) {
  const { toast } = useToast();
  const {
    profiles,
    activeProfileId,
    addProfile,
    updateProfile,
    deleteProfile,
    setActiveProfileId,
    getActiveProfile,
  } = useSettingsStore();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  // Form state for new/edit profile
  const [formData, setFormData] = useState({
    name: '',
    salesforceOrgDomain: '',
    salesforceClientId: '',
    salesforceClientSecret: '',
    salesforceAgentId: '',
    salesforceApiHost: 'https://api.salesforce.com',
    responseMode: 'text' as ResponseMode,
  });

  const activeProfile = getActiveProfile();

  const handleCreateProfile = () => {
    if (!formData.name.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }

    const newProfile: Profile = {
      id: crypto.randomUUID(),
      name: formData.name,
      salesforceOrgDomain: formData.salesforceOrgDomain,
      salesforceClientId: formData.salesforceClientId,
      salesforceClientSecret: formData.salesforceClientSecret,
      salesforceAgentId: formData.salesforceAgentId,
      salesforceApiHost: formData.salesforceApiHost || 'https://api.salesforce.com',
      heygenApiKey: '',
      selectedAvatarId: '',
      selectedEmotion: 'friendly',
      customAvatars: [],
      ttsProvider: 'heygen',
      elevenLabsVoiceId: '',
      elevenLabsSpeed: 1.0,
      customElevenLabsVoices: [],
      heygenVoice: 'miguel',
      heygenVoiceSettings: {
        stability: 0.5,
        similarityBoost: 0.75,
        style: 0.5,
        useSpeakerBoost: true,
        rate: 1.0,
      },
      responseMode: formData.responseMode,
    };

    addProfile(newProfile);
    setActiveProfileId(newProfile.id);
    setShowCreateDialog(false);
    resetForm();
    
    toast({ title: 'Profile created', description: `"${newProfile.name}" is now active.` });
  };

  const handleEditProfile = (profile: Profile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      salesforceOrgDomain: profile.salesforceOrgDomain,
      salesforceClientId: profile.salesforceClientId,
      salesforceClientSecret: profile.salesforceClientSecret,
      salesforceAgentId: profile.salesforceAgentId,
      salesforceApiHost: profile.salesforceApiHost,
      responseMode: profile.responseMode,
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (!editingProfile || !formData.name.trim()) return;

    updateProfile(editingProfile.id, {
      name: formData.name,
      salesforceOrgDomain: formData.salesforceOrgDomain,
      salesforceClientId: formData.salesforceClientId,
      salesforceClientSecret: formData.salesforceClientSecret,
      salesforceAgentId: formData.salesforceAgentId,
      salesforceApiHost: formData.salesforceApiHost,
      responseMode: formData.responseMode,
    });

    setShowEditDialog(false);
    setEditingProfile(null);
    resetForm();
    
    toast({ title: 'Profile updated' });
  };

  const handleDeleteProfile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (profiles.length <= 1) {
      toast({ title: 'Cannot delete', description: 'Keep at least one profile.', variant: 'destructive' });
      return;
    }
    const profile = profiles.find(p => p.id === id);
    deleteProfile(id);
    toast({ title: 'Profile deleted', description: `"${profile?.name}" removed.` });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      salesforceOrgDomain: '',
      salesforceClientId: '',
      salesforceClientSecret: '',
      salesforceAgentId: '',
      salesforceApiHost: 'https://api.salesforce.com',
      responseMode: 'text',
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-9 gap-2 bg-secondary/50 backdrop-blur-sm border-border hover:bg-secondary/80"
          >
            <Bot className="w-4 h-4 text-primary" />
            <span className="max-w-24 truncate">{activeProfile?.name || 'Select Agent'}</span>
            {activeProfile?.responseMode === 'json' && (
              <Code className="w-3 h-3 text-warning" />
            )}
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {profiles.map((profile) => (
            <DropdownMenuItem
              key={profile.id}
              className="flex items-center justify-between gap-2 cursor-pointer"
              onClick={() => setActiveProfileId(profile.id)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {profile.id === activeProfileId && (
                  <Check className="w-4 h-4 text-primary shrink-0" />
                )}
                {profile.id !== activeProfileId && <div className="w-4" />}
                <span className="truncate">{profile.name}</span>
                {profile.responseMode === 'json' && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-warning/20 text-warning shrink-0">
                    JSON
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditProfile(profile);
                  }}
                >
                  <Settings2 className="w-3 h-3" />
                </Button>
                {profiles.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => handleDeleteProfile(profile.id, e)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openCreateDialog} className="cursor-pointer">
            <Plus className="w-4 h-4 mr-2" />
            Add New Agent Profile
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Profile Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              New Agent Profile
            </DialogTitle>
          </DialogHeader>
          <ProfileForm formData={formData} setFormData={setFormData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateProfile}>Create Profile</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              Edit Agent Profile
            </DialogTitle>
          </DialogHeader>
          <ProfileForm formData={formData} setFormData={setFormData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Reusable form component
interface ProfileFormProps {
  formData: {
    name: string;
    salesforceOrgDomain: string;
    salesforceClientId: string;
    salesforceClientSecret: string;
    salesforceAgentId: string;
    salesforceApiHost: string;
    responseMode: ResponseMode;
  };
  setFormData: React.Dispatch<React.SetStateAction<ProfileFormProps['formData']>>;
}

function ProfileForm({ formData, setFormData }: ProfileFormProps) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label>Profile Name</Label>
        <Input
          placeholder="e.g., Production Agent"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label>Salesforce Org Domain</Label>
        <Input
          placeholder="yourorg.my.salesforce.com"
          value={formData.salesforceOrgDomain}
          onChange={(e) => setFormData(prev => ({ ...prev, salesforceOrgDomain: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Client ID</Label>
          <Input
            placeholder="Connected App ID"
            value={formData.salesforceClientId}
            onChange={(e) => setFormData(prev => ({ ...prev, salesforceClientId: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Client Secret</Label>
          <Input
            type="password"
            placeholder="••••••••"
            value={formData.salesforceClientSecret}
            onChange={(e) => setFormData(prev => ({ ...prev, salesforceClientSecret: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Agent ID</Label>
        <Input
          placeholder="Agentforce Agent ID"
          value={formData.salesforceAgentId}
          onChange={(e) => setFormData(prev => ({ ...prev, salesforceAgentId: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label>API Host</Label>
        <Input
          placeholder="https://api.salesforce.com"
          value={formData.salesforceApiHost}
          onChange={(e) => setFormData(prev => ({ ...prev, salesforceApiHost: e.target.value }))}
        />
        <p className="text-xs text-muted-foreground">
          Use test.salesforce.com for sandbox environments
        </p>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
        <div className="flex items-center gap-2">
          {formData.responseMode === 'json' ? (
            <Code className="w-4 h-4 text-warning" />
          ) : (
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
          )}
          <div>
            <Label className="cursor-pointer">Structured JSON Responses</Label>
            <p className="text-xs text-muted-foreground">
              {formData.responseMode === 'json' 
                ? 'Parse JSON with actions & data' 
                : 'Plain text responses only'}
            </p>
          </div>
        </div>
        <Switch
          checked={formData.responseMode === 'json'}
          onCheckedChange={(checked) => 
            setFormData(prev => ({ ...prev, responseMode: checked ? 'json' : 'text' }))
          }
        />
      </div>
    </div>
  );
}
