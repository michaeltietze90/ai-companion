import { useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  useAppVoiceSettingsStore, 
  AppVoiceSettings, 
  HeyGenVoiceSettings 
} from '@/stores/appVoiceSettingsStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReconnectAvatar?: () => void;
  /** Which app's settings to show: keynote or pitch */
  appType?: 'keynote' | 'pitch';
}

export function SettingsModal({ 
  isOpen, 
  onClose, 
  onReconnectAvatar,
  appType = 'keynote'
}: SettingsModalProps) {
  const { toast } = useToast();
  
  // Get the appropriate settings and updater based on appType
  const keynoteSettings = useAppVoiceSettingsStore(state => state.keynote);
  const pitchSettings = useAppVoiceSettingsStore(state => state.pitch);
  const updateKeynoteSettings = useAppVoiceSettingsStore(state => state.updateKeynoteSettings);
  const updatePitchSettings = useAppVoiceSettingsStore(state => state.updatePitchSettings);

  const settings = appType === 'keynote' ? keynoteSettings : pitchSettings;
  const updateSettings = appType === 'keynote' ? updateKeynoteSettings : updatePitchSettings;

  const updateVoiceSetting = (key: keyof HeyGenVoiceSettings, value: number | boolean) => {
    updateSettings({
      voiceSettings: {
        ...settings.voiceSettings,
        [key]: value,
      },
    });
  };

  const handleReconnect = () => {
    if (onReconnectAvatar) {
      onReconnectAvatar();
      onClose();
      toast({
        title: 'Reconnecting Avatar',
        description: 'Applying new voice settings...',
      });
    }
  };

  const appLabels = {
    keynote: 'Keynote',
    pitch: 'Pitch',
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            {appLabels[appType]} Voice Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Stability */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Stability</Label>
              <span className="text-sm text-muted-foreground">
                {settings.voiceSettings.stability.toFixed(2)}
              </span>
            </div>
            <Slider
              value={[settings.voiceSettings.stability]}
              onValueChange={([value]) => updateVoiceSetting('stability', value)}
              min={0}
              max={1}
              step={0.05}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Lower = more expressive, Higher = more consistent
            </p>
          </div>

          {/* Similarity Boost */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Similarity Boost</Label>
              <span className="text-sm text-muted-foreground">
                {settings.voiceSettings.similarityBoost.toFixed(2)}
              </span>
            </div>
            <Slider
              value={[settings.voiceSettings.similarityBoost]}
              onValueChange={([value]) => updateVoiceSetting('similarityBoost', value)}
              min={0}
              max={1}
              step={0.05}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              How closely to match original voice
            </p>
          </div>

          {/* Style */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Style Exaggeration</Label>
              <span className="text-sm text-muted-foreground">
                {settings.voiceSettings.style.toFixed(2)}
              </span>
            </div>
            <Slider
              value={[settings.voiceSettings.style]}
              onValueChange={([value]) => updateVoiceSetting('style', value)}
              min={0}
              max={1}
              step={0.05}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Higher = more stylized delivery
            </p>
          </div>

          {/* Speed/Rate */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Speaking Speed</Label>
              <span className="text-sm text-muted-foreground">
                {settings.voiceSettings.rate.toFixed(1)}x
              </span>
            </div>
            <Slider
              value={[settings.voiceSettings.rate]}
              onValueChange={([value]) => updateVoiceSetting('rate', value)}
              min={0.5}
              max={2.0}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.5x</span>
              <span>1.0x</span>
              <span>2.0x</span>
            </div>
          </div>

          {/* Speaker Boost Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div>
              <Label>Speaker Boost</Label>
              <p className="text-xs text-muted-foreground">
                Enhances clarity and similarity
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.voiceSettings.useSpeakerBoost}
              onChange={(e) => updateVoiceSetting('useSpeakerBoost', e.target.checked)}
              className="h-5 w-5 rounded border-muted-foreground"
            />
          </div>

          {/* Reconnect Button */}
          {onReconnectAvatar && (
            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground mb-3">
                Changes require reconnecting the avatar to take effect.
              </p>
              <Button 
                onClick={handleReconnect}
                className="w-full"
                variant="default"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reconnect Avatar with New Settings
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
