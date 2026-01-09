import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ProtoMDeviceProps {
  children?: ReactNode;
  isActive?: boolean;
}

const ProtoMDevice = ({ children, isActive = true }: ProtoMDeviceProps) => {
  return (
    <div className="relative flex flex-col items-center justify-end h-full w-full pb-36">
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

      {/* Floor/surface area */}
      <div className="absolute bottom-0 left-0 right-0 h-36">
        {/* Surface gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(220_40%_6%)] to-transparent" />
        
        {/* Device reflection */}
        {isActive && (
          <motion.div 
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[120px] bg-primary/15 blur-[80px] rounded-full"
            animate={{
              opacity: [0.4, 0.6, 0.4],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </div>

      {/* Device container - larger and fully visible */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Device body */}
        <div className="relative">
          {/* Outer frame - sleek modern design */}
          <div className="relative w-[500px] h-[680px] rounded-[40px] bg-gradient-to-b from-[hsl(220_20%_18%)] via-[hsl(220_25%_12%)] to-[hsl(220_30%_6%)] shadow-2xl border border-[hsl(220_20%_25%)]">
            {/* Subtle metallic edge */}
            <div className="absolute inset-0 rounded-[40px] bg-gradient-to-br from-white/5 via-transparent to-transparent" />
            
            {/* Inner bezel */}
            <div className="absolute inset-3 rounded-[32px] bg-gradient-to-b from-[hsl(220_30%_8%)] to-black border border-[hsl(220_20%_15%)]">
              {/* Top sensor bar - minimal */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-8">
                <div className="w-2 h-2 rounded-full bg-[hsl(220_20%_25%)]" />
                <div className="w-3 h-3 rounded-full bg-[hsl(220_20%_20%)] border border-[hsl(220_20%_30%)]" />
                <div className="w-2 h-2 rounded-full bg-[hsl(220_20%_25%)]" />
              </div>

              {/* Screen area - full size for avatar */}
              <div className="absolute top-12 left-4 right-4 bottom-4 rounded-[24px] bg-black overflow-hidden">
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
            <div className="absolute left-0 top-[30%] w-1 h-14 bg-[hsl(220_20%_20%)] rounded-r" />
            <div className="absolute right-0 top-[25%] w-1 h-10 bg-[hsl(220_20%_20%)] rounded-l" />
            <div className="absolute right-0 top-[38%] w-1 h-8 bg-[hsl(220_20%_20%)] rounded-l" />
          </div>

          {/* Device stand - elegant */}
          <div className="relative mx-auto w-20 h-20 bg-gradient-to-b from-[hsl(220_20%_15%)] to-[hsl(220_25%_10%)]">
            <div className="absolute inset-x-1 inset-y-0 bg-gradient-to-b from-[hsl(220_15%_20%)] to-[hsl(220_20%_12%)]" />
          </div>

          {/* Device base - premium */}
          <div className="relative mx-auto">
            <div className="w-48 h-6 bg-gradient-to-b from-[hsl(220_15%_18%)] via-[hsl(220_20%_12%)] to-[hsl(220_25%_8%)] rounded-t-lg rounded-b-2xl shadow-lg">
              <div className="absolute inset-x-8 top-1.5 h-0.5 bg-[hsl(220_15%_25%)] rounded-full" />
            </div>
            {/* Base shadow */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-56 h-8 bg-black/60 blur-xl rounded-full" />
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProtoMDevice;
