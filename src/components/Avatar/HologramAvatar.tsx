import { motion } from "framer-motion";
import { User } from "lucide-react";

interface HologramAvatarProps {
  isConnected?: boolean;
  isSpeaking?: boolean;
  avatarUrl?: string;
}

const HologramAvatar = ({ isConnected = false, isSpeaking = false, avatarUrl }: HologramAvatarProps) => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Hologram avatar container */}
      <motion.div
        className="relative w-48 h-64 flex items-center justify-center"
        animate={{
          y: [0, -8, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Hologram base ring */}
        <motion.div
          className="absolute bottom-0 w-32 h-4"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="w-full h-full rounded-full bg-gradient-to-t from-cyan-400/40 to-transparent blur-sm" />
          <div className="absolute inset-0 rounded-full border border-cyan-400/30" />
        </motion.div>

        {/* Avatar silhouette with hologram effect */}
        <motion.div
          className="relative w-40 h-56 flex items-center justify-center"
          animate={isSpeaking ? {
            scale: [1, 1.02, 1],
          } : {}}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Hologram flicker effect */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{
              opacity: [0.8, 1, 0.9, 1, 0.8],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Avatar" 
                className="w-full h-full object-cover rounded-lg opacity-90"
                style={{
                  filter: 'drop-shadow(0 0 20px rgba(0, 255, 255, 0.5))',
                }}
              />
            ) : (
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                {/* Placeholder avatar */}
                <motion.div
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400/30 to-blue-500/30 border-2 border-cyan-400/50 flex items-center justify-center backdrop-blur-sm"
                  animate={{
                    boxShadow: [
                      '0 0 20px rgba(0, 255, 255, 0.3)',
                      '0 0 40px rgba(0, 255, 255, 0.5)',
                      '0 0 20px rgba(0, 255, 255, 0.3)',
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <User className="w-12 h-12 text-cyan-400/80" />
                </motion.div>

                {/* Body silhouette */}
                <motion.div
                  className="mt-4 w-28 h-32 rounded-t-3xl bg-gradient-to-b from-cyan-400/20 to-transparent border-t-2 border-x-2 border-cyan-400/30"
                  animate={{
                    opacity: [0.6, 0.8, 0.6],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />

                {/* Status indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                  <motion.div
                    className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-amber-400'}`}
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.7, 1, 0.7],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </div>
              </div>
            )}
          </motion.div>

          {/* Hologram color overlay */}
          <div 
            className="absolute inset-0 pointer-events-none rounded-lg"
            style={{
              background: 'linear-gradient(180deg, rgba(0, 255, 255, 0.1) 0%, rgba(0, 150, 255, 0.05) 100%)',
              mixBlendMode: 'overlay',
            }}
          />

          {/* Glitch lines effect */}
          <motion.div
            className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg"
            animate={{
              opacity: [0, 0.3, 0, 0.2, 0],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <div className="absolute top-1/4 left-0 right-0 h-0.5 bg-cyan-400/50" />
            <div className="absolute top-2/4 left-0 right-0 h-0.5 bg-cyan-400/30" />
            <div className="absolute top-3/4 left-0 right-0 h-0.5 bg-cyan-400/40" />
          </motion.div>
        </motion.div>

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/60 rounded-full"
            style={{
              left: `${20 + Math.random() * 60}%`,
              bottom: `${10 + Math.random() * 40}%`,
            }}
            animate={{
              y: [-20, -60, -20],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.div>
    </div>
  );
};

export default HologramAvatar;
