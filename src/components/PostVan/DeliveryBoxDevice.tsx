import { motion } from "framer-motion";
import { ReactNode } from "react";

interface DeliveryBoxDeviceProps {
  children?: ReactNode;
  isActive?: boolean;
}

/**
 * Swiss Post Delivery Box styled device container
 * Replaces the Proto M device for the Post theme
 */
const DeliveryBoxDevice = ({ children, isActive = true }: DeliveryBoxDeviceProps) => {
  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full p-4">
      {/* Swiss Post themed background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Light warm gradient - Post style */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, #FAFAFA 0%, #F0EDE8 50%, #E8E4DD 100%)',
          }}
        />
        
        {/* Subtle yellow ambient glow */}
        <div 
          className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[120px]"
          style={{ background: 'rgba(255, 199, 34, 0.15)' }}
        />
        <div 
          className="absolute bottom-[20%] left-[20%] w-[300px] h-[300px] rounded-full blur-[80px]"
          style={{ background: 'rgba(255, 199, 34, 0.08)' }}
        />
        <div 
          className="absolute bottom-[20%] right-[20%] w-[300px] h-[300px] rounded-full blur-[80px]"
          style={{ background: 'rgba(227, 6, 19, 0.05)' }}
        />
      </div>

      {/* Device container - 9:16 aspect ratio */}
      <div 
        className="relative z-10 h-full max-h-[calc(100vh-2rem)]"
        style={{ aspectRatio: '9/16' }}
      >
        {/* Device body - Cardboard delivery box style */}
        <div className="relative w-full h-full">
          {/* Outer cardboard texture box */}
          <div 
            className="relative w-full h-full rounded-[3%] shadow-2xl border-2"
            style={{
              background: 'linear-gradient(145deg, #D4A574 0%, #C4956A 20%, #B8865C 50%, #A87650 80%, #986545 100%)',
              borderColor: '#8B5A3C',
            }}
          >
            {/* Cardboard texture overlay */}
            <div 
              className="absolute inset-0 rounded-[3%] opacity-30"
              style={{
                backgroundImage: `
                  repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139, 90, 60, 0.1) 2px, rgba(139, 90, 60, 0.1) 4px),
                  repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(139, 90, 60, 0.1) 2px, rgba(139, 90, 60, 0.1) 4px)
                `,
              }}
            />
            
            {/* Swiss Post tape stripe at top */}
            <div 
              className="absolute top-[3%] left-0 right-0 h-[4%] flex items-center justify-center z-10"
              style={{ background: '#FFC722' }}
            >
              <div className="flex items-center gap-2">
                <span 
                  className="font-black text-sm tracking-wider"
                  style={{ color: '#000000', fontFamily: 'Arial Black, sans-serif' }}
                >
                  DIE POST
                </span>
                {/* Swiss cross */}
                <div 
                  className="relative flex items-center justify-center rounded-sm"
                  style={{ 
                    width: '16px', 
                    height: '16px',
                    background: '#E30613',
                  }}
                >
                  <div 
                    className="absolute"
                    style={{
                      width: '10px',
                      height: '3px',
                      background: '#FFFFFF',
                    }}
                  />
                  <div 
                    className="absolute"
                    style={{
                      width: '3px',
                      height: '10px',
                      background: '#FFFFFF',
                    }}
                  />
                </div>
              </div>
            </div>
            
            {/* Inner screen cutout - like looking into the box */}
            <div 
              className="absolute top-[9%] left-[4%] right-[4%] bottom-[3%] rounded-[2%] overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
                boxShadow: 'inset 0 8px 32px rgba(0, 0, 0, 0.6)',
              }}
            >
              {/* Subtle glow from inside */}
              {isActive && (
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: 'radial-gradient(ellipse at center, rgba(255, 199, 34, 0.1) 0%, transparent 60%)',
                  }}
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
              
              {/* Avatar content */}
              <div className="relative w-full h-full">
                {/* Subtle scan lines for hologram effect */}
                {isActive && (
                  <div className="absolute inset-0 pointer-events-none opacity-10 z-10">
                    <div 
                      className="w-full h-full"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255, 199, 34, 0.1) 3px, rgba(255, 199, 34, 0.1) 4px)',
                      }}
                    />
                  </div>
                )}
                
                {children}
              </div>
            </div>

            {/* Box fold lines */}
            <div 
              className="absolute left-0 top-[9%] bottom-[3%] w-[4%]"
              style={{
                background: 'linear-gradient(90deg, rgba(139, 90, 60, 0.3), transparent)',
              }}
            />
            <div 
              className="absolute right-0 top-[9%] bottom-[3%] w-[4%]"
              style={{
                background: 'linear-gradient(-90deg, rgba(139, 90, 60, 0.3), transparent)',
              }}
            />
            
            {/* Fragile sticker */}
            <div 
              className="absolute bottom-[5%] right-[6%] px-2 py-1 rounded-sm transform rotate-[-5deg]"
              style={{ 
                background: '#E30613',
                boxShadow: '1px 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              <span className="text-white text-[10px] font-bold tracking-wider">FRAGILE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryBoxDevice;
