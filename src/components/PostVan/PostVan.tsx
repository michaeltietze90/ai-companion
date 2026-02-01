import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";
import postVanClosed from "@/assets/post-van-back.jpg";
import postVanOpen from "@/assets/post-van-open.jpg";

interface PostVanProps {
  children?: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

const PostVan = ({ children, isOpen, onToggle }: PostVanProps) => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Van container */}
      <div 
        className="relative cursor-pointer select-none"
        style={{ 
          width: 'min(90vw, 1200px)', 
          height: 'min(70vh, 700px)',
        }}
        onClick={!isOpen ? onToggle : undefined}
      >
        {/* Closed van image */}
        <AnimatePresence mode="wait">
          {!isOpen && (
            <motion.div
              key="closed"
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
            >
              <img 
                src={postVanClosed} 
                alt="Swiss Post delivery van"
                className="w-full h-full object-contain drop-shadow-2xl"
              />
              
              {/* Click prompt */}
              <motion.div
                className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full"
                style={{ 
                  background: 'rgba(0, 0, 0, 0.75)',
                  backdropFilter: 'blur(8px)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <span className="text-white text-lg font-medium">
                  Klicken um zu öffnen 📦
                </span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Open van with avatar */}
        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.div
              key="open"
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Open van image as background */}
              <img 
                src={postVanOpen} 
                alt="Swiss Post delivery van with open doors"
                className="w-full h-full object-contain drop-shadow-2xl"
              />
              
              {/* Avatar overlay positioned in the cargo area */}
              <motion.div
                className="absolute overflow-hidden rounded-lg"
                style={{
                  // Position the avatar in the cargo opening
                  left: '26%',
                  right: '26%',
                  top: '18%',
                  bottom: '28%',
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                {/* Dark overlay to blend avatar with van interior */}
                <div 
                  className="absolute inset-0 pointer-events-none z-10"
                  style={{
                    background: 'radial-gradient(ellipse at center, transparent 40%, rgba(30, 25, 20, 0.6) 100%)',
                  }}
                />
                
                {/* Avatar content */}
                <div className="relative w-full h-full">
                  {children}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PostVan;
