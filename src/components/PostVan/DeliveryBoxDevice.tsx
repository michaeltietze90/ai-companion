import { motion } from "framer-motion";
import { ReactNode } from "react";
import cardboardBoxImage from "@/assets/cardboard-box-open.png";

interface DeliveryBoxDeviceProps {
  children?: ReactNode;
  isActive?: boolean;
}

/**
 * Swiss Post Delivery Box styled device container
 * Uses a real cardboard box image with the avatar inside
 */
const DeliveryBoxDevice = ({ children, isActive = true }: DeliveryBoxDeviceProps) => {
  return (
    <div className="relative flex items-center justify-center h-full w-full">
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
      </div>

      {/* Main container - centered cardboard box */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        {/* Cardboard box frame */}
        <div className="relative" style={{ width: '90%', maxWidth: '800px' }}>
          {/* The cardboard box image */}
          <img 
            src={cardboardBoxImage} 
            alt="Cardboard box" 
            className="w-full h-auto relative z-20"
          />
          
          {/* Avatar container - positioned inside the box opening */}
          <div 
            className="absolute z-10 overflow-hidden"
            style={{
              // Position the avatar inside the box opening
              top: '8%',
              left: '12%',
              right: '12%',
              bottom: '28%',
              borderRadius: '4px',
            }}
          >
            {/* Dark interior background */}
            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
              }}
            />
            
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
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryBoxDevice;
