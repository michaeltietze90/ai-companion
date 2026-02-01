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
    <div className="relative flex flex-col items-center justify-center h-full w-full p-4 md:p-6">
      {/* Device container - 9:16 aspect ratio */}
      <div 
        className="relative z-10 h-full max-h-[calc(100vh-2rem)]"
        style={{ aspectRatio: '9/16' }}
      >
        {/* Device body - Professional Swiss Post style */}
        <div className="relative w-full h-full">
          {/* Outer frame with Post Yellow accent */}
          <div 
            className="relative w-full h-full rounded-[20px] shadow-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #FFC722 0%, #E5B31F 100%)',
              padding: '4px',
            }}
          >
            {/* Inner device frame */}
            <div 
              className="relative w-full h-full rounded-[18px] overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, #1C1C1E 0%, #0D0D0F 100%)',
              }}
            >
              {/* Top bezel with Post branding */}
              <div 
                className="absolute top-0 left-0 right-0 h-[5%] z-20 flex items-center justify-center gap-2"
                style={{ 
                  background: 'linear-gradient(180deg, #2C2C2E 0%, #1C1C1E 100%)',
                  borderBottom: '1px solid rgba(255, 199, 34, 0.2)',
                }}
              >
                {/* Post Logo */}
                <div 
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                  style={{ background: 'rgba(255, 199, 34, 0.15)' }}
                >
                  <span 
                    className="font-black text-xs tracking-wide"
                    style={{ color: '#FFC722', fontFamily: 'Arial Black, sans-serif' }}
                  >
                    POST
                  </span>
                  {/* Swiss cross */}
                  <div 
                    className="relative flex items-center justify-center rounded-sm"
                    style={{ 
                      width: '14px', 
                      height: '14px',
                      background: '#E30613',
                    }}
                  >
                    <div 
                      className="absolute"
                      style={{
                        width: '8px',
                        height: '2px',
                        background: '#FFFFFF',
                      }}
                    />
                    <div 
                      className="absolute"
                      style={{
                        width: '2px',
                        height: '8px',
                        background: '#FFFFFF',
                      }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Main screen area */}
              <div 
                className="absolute top-[5%] left-0 right-0 bottom-[4%] overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #0a0a0f 0%, #12121a 50%, #0a0a0f 100%)',
                }}
              >
                {/* Subtle Post yellow ambient glow */}
                {isActive && (
                  <>
                    <motion.div
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[30%] rounded-full blur-[80px] pointer-events-none"
                      style={{ background: 'rgba(255, 199, 34, 0.08)' }}
                      animate={{
                        opacity: [0.5, 0.8, 0.5],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                    <motion.div
                      className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-[60%] h-[20%] rounded-full blur-[60px] pointer-events-none"
                      style={{ background: 'rgba(227, 6, 19, 0.05)' }}
                      animate={{
                        opacity: [0.3, 0.6, 0.3],
                      }}
                      transition={{
                        duration: 5,
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

              {/* Bottom bezel with subtle branding */}
              <div 
                className="absolute bottom-0 left-0 right-0 h-[4%] z-20 flex items-center justify-center"
                style={{ 
                  background: 'linear-gradient(0deg, #2C2C2E 0%, #1C1C1E 100%)',
                  borderTop: '1px solid rgba(255, 199, 34, 0.2)',
                }}
              >
                <div className="flex items-center gap-1.5">
                  <div 
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: isActive ? '#00A650' : '#666666' }}
                  />
                  <span 
                    className="text-[10px] tracking-wider uppercase"
                    style={{ color: 'rgba(255, 255, 255, 0.4)' }}
                  >
                    AI Assistant
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Decorative corner accents */}
          <div 
            className="absolute -top-1 -left-1 w-6 h-6 rounded-tl-[24px]"
            style={{ 
              background: 'transparent',
              border: '2px solid rgba(255, 199, 34, 0.3)',
              borderRight: 'none',
              borderBottom: 'none',
            }}
          />
          <div 
            className="absolute -top-1 -right-1 w-6 h-6 rounded-tr-[24px]"
            style={{ 
              background: 'transparent',
              border: '2px solid rgba(255, 199, 34, 0.3)',
              borderLeft: 'none',
              borderBottom: 'none',
            }}
          />
          <div 
            className="absolute -bottom-1 -left-1 w-6 h-6 rounded-bl-[24px]"
            style={{ 
              background: 'transparent',
              border: '2px solid rgba(255, 199, 34, 0.3)',
              borderRight: 'none',
              borderTop: 'none',
            }}
          />
          <div 
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-br-[24px]"
            style={{ 
              background: 'transparent',
              border: '2px solid rgba(255, 199, 34, 0.3)',
              borderLeft: 'none',
              borderTop: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default DeliveryBoxDevice;
