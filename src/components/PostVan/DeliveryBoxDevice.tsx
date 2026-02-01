import { motion } from "framer-motion";
import { ReactNode } from "react";

interface DeliveryBoxDeviceProps {
  children?: ReactNode;
  isActive?: boolean;
}

/**
 * Swiss Post Professional Device Container
 * Clean, modern design with authentic Swiss Post branding
 */
const DeliveryBoxDevice = ({ children, isActive = true }: DeliveryBoxDeviceProps) => {
  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full py-4 px-4 md:px-6">
      {/* Device container - 9:16 aspect ratio */}
      <div 
        className="relative z-10 h-full max-h-[calc(100vh-8rem)]"
        style={{ aspectRatio: '9/16' }}
      >
        {/* Device body - Professional Swiss Post style */}
        <div className="relative w-full h-full">
          {/* Outer frame with Post Yellow accent */}
          <div 
            className="relative w-full h-full rounded-[24px] shadow-2xl overflow-hidden"
            style={{
              background: '#FFC722',
              padding: '3px',
            }}
          >
            {/* Inner device frame */}
            <div 
              className="relative w-full h-full rounded-[22px] overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, #1C1C1E 0%, #0D0D0F 100%)',
              }}
            >
              {/* Top bezel with Swiss Post logo */}
              <div 
                className="absolute top-0 left-0 right-0 h-[6%] z-20 flex items-center justify-center"
                style={{ 
                  background: '#FFC722',
                }}
              >
                {/* Swiss Post branding */}
                <div className="flex items-center gap-2">
                  <span 
                    className="font-black text-sm md:text-base italic tracking-tight"
                    style={{ color: '#000000', fontFamily: 'Arial Black, sans-serif' }}
                  >
                    DIE POST
                  </span>
                  {/* Swiss cross */}
                  <div 
                    className="relative flex items-center justify-center"
                    style={{ 
                      width: '20px', 
                      height: '20px',
                      background: '#E30613',
                    }}
                  >
                    <div 
                      className="absolute"
                      style={{
                        width: '12px',
                        height: '4px',
                        background: '#FFFFFF',
                      }}
                    />
                    <div 
                      className="absolute"
                      style={{
                        width: '4px',
                        height: '12px',
                        background: '#FFFFFF',
                      }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Main screen area */}
              <div 
                className="absolute top-[6%] left-0 right-0 bottom-[3%] overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #0a0a0f 0%, #12121a 50%, #0a0a0f 100%)',
                }}
              >
                {/* Subtle ambient glow */}
                {isActive && (
                  <>
                    <motion.div
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[25%] rounded-full blur-[60px] pointer-events-none"
                      style={{ background: 'rgba(255, 199, 34, 0.1)' }}
                      animate={{
                        opacity: [0.4, 0.7, 0.4],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  </>
                )}
                
                {/* Avatar content */}
                <div className="relative w-full h-full">
                  {children}
                </div>
              </div>

              {/* Bottom bezel */}
              <div 
                className="absolute bottom-0 left-0 right-0 h-[3%] z-20 flex items-center justify-center"
                style={{ 
                  background: 'linear-gradient(0deg, #2C2C2E 0%, #1C1C1E 100%)',
                  borderTop: '1px solid rgba(255, 199, 34, 0.3)',
                }}
              >
                <div className="flex items-center gap-1.5">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ background: isActive ? '#00A650' : '#666666' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryBoxDevice;
