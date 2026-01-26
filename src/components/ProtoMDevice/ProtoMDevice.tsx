import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ProtoMDeviceProps {
  children?: ReactNode;
  isActive?: boolean;
}

const ProtoMDevice = ({ children, isActive = true }: ProtoMDeviceProps) => {
  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full p-4">
      {/* Clean gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Deep gradient background */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 120% 80% at 50% 20%, hsl(210 100% 20%) 0%, hsl(220 40% 8%) 50%, hsl(220 50% 4%) 100%)',
          }}
        />
        
        {/* Subtle ambient glow */}
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] left-[20%] w-[300px] h-[300px] bg-accent/5 rounded-full blur-[80px]" />
        <div className="absolute bottom-[20%] right-[20%] w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px]" />
      </div>

      {/* Device container - 9:16 aspect ratio (2160x3840 scaled to fit viewport) */}
      <div 
        className="relative z-10 h-full max-h-[calc(100vh-2rem)]"
        style={{ aspectRatio: '9/16' }}
      >
        {/* Device body - fills the aspect ratio container */}
        <div className="relative w-full h-full">
          {/* Outer frame - sleek modern design */}
          <div className="relative w-full h-full rounded-[6%] bg-gradient-to-b from-[hsl(220_20%_18%)] via-[hsl(220_25%_12%)] to-[hsl(220_30%_6%)] shadow-2xl border border-[hsl(220_20%_25%)]">
            {/* Subtle metallic edge */}
            <div className="absolute inset-0 rounded-[6%] bg-gradient-to-br from-white/5 via-transparent to-transparent" />
            
            {/* Inner bezel */}
            <div className="absolute inset-[2%] rounded-[5%] bg-gradient-to-b from-[hsl(220_30%_8%)] to-black border border-[hsl(220_20%_15%)]">
              {/* Top sensor bar - minimal */}
              <div className="absolute top-[1.5%] left-1/2 -translate-x-1/2 flex items-center gap-[3%]">
                <div className="w-2 h-2 rounded-full bg-[hsl(220_20%_25%)]" />
                <div className="w-3 h-3 rounded-full bg-[hsl(220_20%_20%)] border border-[hsl(220_20%_30%)]" />
                <div className="w-2 h-2 rounded-full bg-[hsl(220_20%_25%)]" />
              </div>

              {/* Screen area - full size for avatar */}
              <div className="absolute top-[4%] left-[3%] right-[3%] bottom-[1.5%] rounded-[4%] bg-black overflow-hidden">
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
            <div className="absolute left-0 top-[30%] w-[0.5%] h-[5%] bg-[hsl(220_20%_20%)] rounded-r" />
            <div className="absolute right-0 top-[25%] w-[0.5%] h-[4%] bg-[hsl(220_20%_20%)] rounded-l" />
            <div className="absolute right-0 top-[32%] w-[0.5%] h-[3%] bg-[hsl(220_20%_20%)] rounded-l" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProtoMDevice;
