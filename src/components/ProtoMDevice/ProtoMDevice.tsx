import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ProtoMDeviceProps {
  children?: ReactNode;
  isActive?: boolean;
}

const ProtoMDevice = ({ children, isActive = true }: ProtoMDeviceProps) => {
  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full">
      {/* Office environment background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient background - Agentforce inspired */}
        <div className="absolute inset-0 gradient-agentforce-hero" />
        
        {/* Flowing wave curves - Agentforce style */}
        <svg 
          className="absolute bottom-0 left-0 right-0 w-full h-[60%] opacity-20" 
          viewBox="0 0 1440 600" 
          preserveAspectRatio="none"
        >
          <path
            d="M0,300 C360,400 720,200 1080,300 C1260,350 1380,280 1440,300 L1440,600 L0,600 Z"
            fill="url(#wave-gradient)"
          />
          <defs>
            <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(210 100% 50%)" stopOpacity="0.3" />
              <stop offset="50%" stopColor="hsl(200 100% 45%)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="hsl(190 100% 40%)" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </svg>

        {/* Secondary wave */}
        <svg 
          className="absolute bottom-0 left-0 right-0 w-full h-[40%] opacity-15" 
          viewBox="0 0 1440 400" 
          preserveAspectRatio="none"
        >
          <path
            d="M0,200 C240,100 480,250 720,180 C960,110 1200,220 1440,150 L1440,400 L0,400 Z"
            fill="url(#wave-gradient-2)"
          />
          <defs>
            <linearGradient id="wave-gradient-2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(190 100% 50%)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="hsl(210 100% 50%)" stopOpacity="0.5" />
            </linearGradient>
          </defs>
        </svg>

        {/* Ambient light spots */}
        <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[30%] left-[5%] w-[400px] h-[400px] bg-accent/5 rounded-full blur-[80px]" />
      </div>

      {/* Office desk surface */}
      <div className="absolute bottom-0 left-0 right-0 h-[25%]">
        {/* Desk top */}
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(25_30%_15%)] via-[hsl(25_25%_20%)] to-[hsl(25_20%_25%)]" />
        
        {/* Wood grain texture overlay */}
        <div className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `repeating-linear-gradient(
              90deg,
              transparent,
              transparent 2px,
              rgba(139, 90, 43, 0.1) 2px,
              rgba(139, 90, 43, 0.1) 4px
            )`
          }}
        />
        
        {/* Desk edge highlight */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[hsl(25_30%_35%)] to-transparent" />
        
        {/* Device reflection on desk */}
        {isActive && (
          <motion.div 
            className="absolute top-4 left-1/2 -translate-x-1/2 w-[300px] h-[150px] bg-primary/10 blur-[60px] rounded-full"
            animate={{
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </div>

      {/* Device container - much bigger */}
      <div className="relative z-10 flex flex-col items-center" style={{ marginBottom: '12%' }}>
        {/* Device body */}
        <div className="relative">
          {/* Outer frame - sleek modern design */}
          <div className="relative w-[420px] h-[580px] rounded-[32px] bg-gradient-to-b from-[hsl(220_20%_15%)] via-[hsl(220_25%_10%)] to-[hsl(220_30%_5%)] shadow-2xl border border-[hsl(220_20%_25%)]">
            {/* Subtle metallic edge */}
            <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-white/5 via-transparent to-transparent" />
            
            {/* Inner bezel */}
            <div className="absolute inset-2 rounded-[26px] bg-gradient-to-b from-[hsl(220_30%_8%)] to-black border border-[hsl(220_20%_15%)]">
              {/* Top sensor bar - minimal */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-6">
                <div className="w-1.5 h-1.5 rounded-full bg-[hsl(220_20%_25%)]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[hsl(220_20%_20%)] border border-[hsl(220_20%_30%)]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[hsl(220_20%_25%)]" />
              </div>

              {/* Screen area - full size for avatar */}
              <div className="absolute top-10 left-3 right-3 bottom-3 rounded-[20px] bg-black overflow-hidden">
                {/* Screen glow effect */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-t from-primary/15 via-primary/5 to-transparent"
                    animate={{
                      opacity: [0.4, 0.7, 0.4],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                )}
                
                {/* Avatar content - fills entire screen */}
                <div className="relative w-full h-full">
                  {/* Subtle hologram scan lines */}
                  {isActive && (
                    <div className="absolute inset-0 pointer-events-none opacity-10 z-10">
                      <div 
                        className="w-full h-full"
                        style={{
                          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, hsl(210 100% 50% / 0.1) 3px, hsl(210 100% 50% / 0.1) 4px)',
                        }}
                      />
                    </div>
                  )}
                  
                  {children}
                </div>
              </div>
            </div>

            {/* Side buttons - subtle */}
            <div className="absolute left-0 top-[30%] w-0.5 h-12 bg-[hsl(220_20%_20%)] rounded-r" />
            <div className="absolute right-0 top-[25%] w-0.5 h-8 bg-[hsl(220_20%_20%)] rounded-l" />
            <div className="absolute right-0 top-[35%] w-0.5 h-6 bg-[hsl(220_20%_20%)] rounded-l" />
          </div>

          {/* Device stand - elegant */}
          <div className="relative mx-auto w-16 h-16 bg-gradient-to-b from-[hsl(220_20%_15%)] to-[hsl(220_25%_10%)]">
            <div className="absolute inset-x-1 inset-y-0 bg-gradient-to-b from-[hsl(220_15%_20%)] to-[hsl(220_20%_12%)]" />
          </div>

          {/* Device base - premium */}
          <div className="relative mx-auto">
            <div className="w-40 h-5 bg-gradient-to-b from-[hsl(220_15%_18%)] via-[hsl(220_20%_12%)] to-[hsl(220_25%_8%)] rounded-t-lg rounded-b-2xl shadow-lg">
              <div className="absolute inset-x-6 top-1 h-0.5 bg-[hsl(220_15%_25%)] rounded-full" />
            </div>
            {/* Base shadow on desk */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-48 h-6 bg-black/50 blur-xl rounded-full" />
          </div>
        </div>

        {/* Subtle hologram projection glow */}
        {isActive && (
          <motion.div
            className="absolute bottom-[100px] left-1/2 -translate-x-1/2 w-[360px] h-[500px] pointer-events-none"
            style={{
              background: 'linear-gradient(to top, hsl(210 100% 50% / 0.08) 0%, transparent 100%)',
              clipPath: 'polygon(15% 100%, 85% 100%, 98% 0%, 2% 0%)',
            }}
            animate={{
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ProtoMDevice;
