import { motion, AnimatePresence } from "framer-motion";
import { ReactNode, useState } from "react";

interface PostVanProps {
  children?: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

const PostVan = ({ children, isOpen, onToggle }: PostVanProps) => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Swiss Post Van - CSS illustration */}
      <div 
        className="relative cursor-pointer select-none"
        style={{ width: '900px', height: '500px' }}
      >
        {/* Van Body */}
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={{ scale: isOpen ? 0.85 : 1, x: isOpen ? -100 : 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          {/* Main body - yellow */}
          <div 
            className="absolute rounded-lg shadow-2xl"
            style={{
              left: '50px',
              top: '80px',
              width: '750px',
              height: '320px',
              background: 'linear-gradient(180deg, hsl(45 100% 55%) 0%, hsl(42 100% 50%) 100%)',
              borderRadius: '12px 12px 8px 8px',
            }}
          >
            {/* Roof curvature */}
            <div 
              className="absolute"
              style={{
                top: '-20px',
                left: '0',
                right: '0',
                height: '40px',
                background: 'linear-gradient(180deg, hsl(45 100% 58%) 0%, hsl(45 100% 55%) 100%)',
                borderRadius: '20px 20px 0 0',
              }}
            />
            
            {/* DIE POST logo area */}
            <div 
              className="absolute flex items-center gap-3"
              style={{ top: '40px', left: '280px' }}
            >
              <span 
                className="font-bold tracking-wide"
                style={{ 
                  fontSize: '42px', 
                  color: 'hsl(220 10% 15%)',
                  fontFamily: 'Arial Black, sans-serif',
                  letterSpacing: '-1px',
                }}
              >
                DIE POST
              </span>
              {/* Swiss cross logo */}
              <div 
                className="relative flex items-center justify-center"
                style={{ 
                  width: '50px', 
                  height: '50px',
                }}
              >
                <div 
                  className="absolute"
                  style={{
                    width: '40px',
                    height: '12px',
                    background: 'hsl(0 85% 50%)',
                    borderRadius: '2px',
                  }}
                />
                <div 
                  className="absolute"
                  style={{
                    width: '12px',
                    height: '40px',
                    background: 'hsl(0 85% 50%)',
                    borderRadius: '2px',
                  }}
                />
              </div>
            </div>

            {/* Tagline */}
            <div 
              className="absolute"
              style={{ top: '160px', left: '180px' }}
            >
              <span 
                style={{ 
                  fontSize: '22px', 
                  color: 'hsl(220 10% 20%)',
                  fontStyle: 'italic',
                  fontFamily: 'Georgia, serif',
                }}
              >
                Pakete kommen immer gut an.
              </span>
            </div>

            {/* Gray stripe at bottom */}
            <div 
              className="absolute"
              style={{
                bottom: '0',
                left: '0',
                right: '0',
                height: '50px',
                background: 'hsl(220 10% 35%)',
                borderRadius: '0 0 8px 8px',
              }}
            />

            {/* Cabin/Front section */}
            <div 
              className="absolute"
              style={{
                left: '-50px',
                top: '80px',
                width: '120px',
                height: '220px',
                background: 'linear-gradient(180deg, hsl(45 100% 55%) 0%, hsl(42 100% 48%) 100%)',
                borderRadius: '40px 0 8px 8px',
              }}
            >
              {/* Windshield */}
              <div 
                className="absolute"
                style={{
                  top: '10px',
                  left: '10px',
                  width: '80px',
                  height: '100px',
                  background: 'linear-gradient(160deg, hsl(200 30% 70%) 0%, hsl(200 20% 40%) 100%)',
                  borderRadius: '30px 4px 4px 4px',
                  border: '3px solid hsl(220 10% 25%)',
                }}
              />
              {/* Side mirror */}
              <div 
                className="absolute"
                style={{
                  top: '60px',
                  left: '-15px',
                  width: '20px',
                  height: '30px',
                  background: 'hsl(220 10% 25%)',
                  borderRadius: '4px',
                }}
              />
              {/* Front gray stripe */}
              <div 
                className="absolute"
                style={{
                  bottom: '0',
                  left: '0',
                  right: '0',
                  height: '20px',
                  background: 'hsl(220 10% 35%)',
                  borderRadius: '0 0 8px 8px',
                }}
              />
            </div>
          </div>

          {/* Wheels */}
          <div 
            className="absolute"
            style={{
              bottom: '80px',
              left: '100px',
              width: '80px',
              height: '80px',
              background: 'radial-gradient(circle, hsl(220 10% 30%) 40%, hsl(220 10% 15%) 45%, hsl(220 10% 30%) 50%, hsl(220 10% 20%) 100%)',
              borderRadius: '50%',
              boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
            }}
          />
          <div 
            className="absolute"
            style={{
              bottom: '80px',
              right: '140px',
              width: '80px',
              height: '80px',
              background: 'radial-gradient(circle, hsl(220 10% 30%) 40%, hsl(220 10% 15%) 45%, hsl(220 10% 30%) 50%, hsl(220 10% 20%) 100%)',
              borderRadius: '50%',
              boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
            }}
          />

          {/* Click instruction when closed */}
          {!isOpen && (
            <motion.div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full"
              style={{ 
                background: 'hsla(0 0% 0% / 0.7)',
                backdropFilter: 'blur(8px)',
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={onToggle}
            >
              <span className="text-white text-lg font-medium">
                Klicken Sie auf den Lieferwagen 🚛
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* Rear Door - animates open */}
        <motion.div
          className="absolute origin-left cursor-pointer"
          style={{
            right: '40px',
            top: '85px',
            width: '100px',
            height: '315px',
            background: 'linear-gradient(90deg, hsl(42 100% 48%) 0%, hsl(45 100% 55%) 100%)',
            borderRadius: '0 8px 8px 0',
            boxShadow: isOpen ? '-4px 0 12px rgba(0,0,0,0.3)' : 'none',
          }}
          initial={false}
          animate={{ 
            rotateY: isOpen ? -110 : 0,
            x: isOpen ? 60 : 0,
          }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          onClick={onToggle}
        >
          {/* Door handle */}
          <div 
            className="absolute"
            style={{
              top: '45%',
              left: '15px',
              width: '15px',
              height: '50px',
              background: 'hsl(220 10% 30%)',
              borderRadius: '4px',
            }}
          />
          {/* Gray stripe on door */}
          <div 
            className="absolute"
            style={{
              bottom: '0',
              left: '0',
              right: '0',
              height: '50px',
              background: 'hsl(220 10% 35%)',
              borderRadius: '0 0 8px 0',
            }}
          />
          {/* Tail light */}
          <div 
            className="absolute"
            style={{
              top: '20px',
              right: '10px',
              width: '20px',
              height: '60px',
              background: 'linear-gradient(180deg, hsl(0 70% 50%) 0%, hsl(30 90% 50%) 70%)',
              borderRadius: '4px',
            }}
          />
        </motion.div>

        {/* Avatar container - inside the van */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="absolute overflow-hidden"
              style={{
                right: '150px',
                top: '90px',
                width: '350px',
                height: '300px',
                background: 'linear-gradient(180deg, hsl(30 20% 25%) 0%, hsl(25 15% 15%) 100%)',
                borderRadius: '8px 0 0 8px',
                border: '4px solid hsl(30 15% 20%)',
                boxShadow: 'inset 0 0 30px rgba(0,0,0,0.5)',
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              {/* Interior lighting effect */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at center top, hsla(45 100% 70% / 0.15) 0%, transparent 60%)',
                }}
              />
              
              {/* Packages in background */}
              <div className="absolute bottom-2 left-2 w-12 h-10 bg-amber-800/60 rounded" />
              <div className="absolute bottom-2 left-16 w-10 h-14 bg-amber-900/50 rounded" />
              <div className="absolute bottom-14 left-4 w-8 h-8 bg-amber-700/40 rounded" />

              {/* Avatar content */}
              <div className="relative w-full h-full">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PostVan;
