import { motion } from "framer-motion";
import { User } from "lucide-react";
import { RefObject } from "react";

interface HologramAvatarProps {
  isConnected?: boolean;
  isSpeaking?: boolean;
  avatarUrl?: string;
  videoRef?: RefObject<HTMLVideoElement>;
  isMuted?: boolean;
}

const HologramAvatar = ({ isConnected = false, isSpeaking = false, avatarUrl, videoRef, isMuted = false }: HologramAvatarProps) => {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Full screen avatar container */}
      <div className="relative w-full h-full">
        {/* Video/Avatar fills entire screen */}
        <motion.div
          className="absolute inset-0"
          animate={isSpeaking ? {
            scale: [1, 1.01, 1],
          } : {}}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Hologram flicker effect */}
          <motion.div
            className="absolute inset-0"
            animate={{
              opacity: [0.95, 1, 0.97, 1, 0.95],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {videoRef ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isMuted}
                className="w-full h-full object-cover"
                style={{
                  filter: 'brightness(1.05) saturate(1.1)',
                }}
              />
            ) : avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            ) : (
              /* Placeholder when no video/avatar */
              <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[hsl(220_30%_8%)] to-black">
                {/* Agentforce-style avatar placeholder */}
                <motion.div
                  className="relative"
                  animate={{
                    y: [0, -10, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  {/* Avatar circle with glow */}
                  <motion.div
                    className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 border-2 border-primary/40 flex items-center justify-center backdrop-blur-sm"
                    animate={{
                      boxShadow: [
                        '0 0 30px hsl(210 100% 50% / 0.2)',
                        '0 0 60px hsl(210 100% 50% / 0.4)',
                        '0 0 30px hsl(210 100% 50% / 0.2)',
                      ],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <User className="w-16 h-16 text-primary/70" />
                  </motion.div>

                  {/* Body silhouette */}
                  <motion.div
                    className="mt-6 mx-auto w-36 h-40 rounded-t-[50px] bg-gradient-to-b from-primary/15 to-transparent border-t-2 border-x-2 border-primary/20"
                    animate={{
                      opacity: [0.5, 0.7, 0.5],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </motion.div>

                {/* Status text */}
                <motion.div
                  className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2"
                  animate={{
                    opacity: [0.6, 1, 0.6],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-primary'}`} />
                  <span className="text-sm text-muted-foreground">
                    {isConnected ? 'Connected' : 'Ready to connect'}
                  </span>
                </motion.div>

                {/* Floating particles */}
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-primary/50 rounded-full"
                    style={{
                      left: `${15 + Math.random() * 70}%`,
                      bottom: `${20 + Math.random() * 50}%`,
                    }}
                    animate={{
                      y: [-30, -80, -30],
                      opacity: [0, 0.8, 0],
                    }}
                    transition={{
                      duration: 4 + Math.random() * 3,
                      repeat: Infinity,
                      delay: Math.random() * 3,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
            )}
          </motion.div>

          {/* Subtle blue overlay for hologram effect - only when video is showing */}
          {(videoRef || avatarUrl) && (
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, hsl(210 100% 50% / 0.03) 0%, hsl(210 100% 50% / 0.08) 100%)',
                mixBlendMode: 'screen',
              }}
            />
          )}

          {/* Edge vignette */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 50%, hsl(220 30% 5% / 0.6) 100%)',
            }}
          />
        </motion.div>
      </div>
    </div>
  );
};

export default HologramAvatar;
