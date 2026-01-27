import { useState } from "react";
import { Volume2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { synthesizeSpeech, TTSOptions } from "@/services/elevenLabsTTS";
import { VoiceEmotionType } from "@/stores/settingsStore";

interface VoicePreviewButtonProps {
  emotion: VoiceEmotionType;
  voiceId?: string;
  speed?: number;
  size?: "sm" | "default" | "lg" | "icon";
  className?: string;
}

const PREVIEW_PHRASES: Record<VoiceEmotionType, string> = {
  excited: "This is amazing! I can't wait to help you with your project today!",
  friendly: "Hello there! It's great to meet you. How can I help?",
  serious: "Let me analyze this situation carefully and provide you with accurate information.",
  soothing: "Take a deep breath. Everything is going to be just fine.",
  broadcaster: "Good evening. Tonight we bring you the latest updates from around the world.",
};

export function VoicePreviewButton({
  emotion,
  voiceId = "EXAVITQu4vr4xnSDxMaL",
  speed = 1.0,
  size = "icon",
  className = "",
}: VoicePreviewButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  const handlePreview = async () => {
    // Stop current playback if any
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      URL.revokeObjectURL(currentAudio.src);
      setCurrentAudio(null);
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);

    try {
      const phrase = PREVIEW_PHRASES[emotion];
      console.log(`[Voice Preview] Playing "${emotion}" emotion: "${phrase}"`);
      
      const options: TTSOptions = {
        voiceId,
        emotion,
        speed,
      };

      const audioBlob = await synthesizeSpeech(phrase, options);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      setCurrentAudio(audio);

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setCurrentAudio(null);
        setIsPlaying(false);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setCurrentAudio(null);
        setIsPlaying(false);
      };

      await audio.play();
    } catch (error) {
      console.error("[Voice Preview] Error:", error);
      setIsPlaying(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handlePreview}
      className={`text-muted-foreground hover:text-foreground ${className}`}
      title={isPlaying ? "Stop preview" : `Preview ${emotion} voice`}
    >
      {isPlaying ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Volume2 className="w-4 h-4" />
      )}
    </Button>
  );
}
