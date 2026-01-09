import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ProtoMDeviceProps {
  children?: ReactNode;
  isActive?: boolean;
}

const ProtoMDevice = ({ children, isActive = true }: ProtoMDeviceProps) => {
  return (
    <div className="relative flex flex-col items-center justify-end h-full w-full">
      {/* Table surface */}
      <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-slate-900 via-slate-800 to-transparent">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-700/20 to-slate-600/30" />
        {/* Table reflection */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[120px] bg-gradient-radial from-cyan-500/10 via-blue-500/5 to-transparent blur-2xl" />
      </div>

      {/* Device container */}
      <div className="relative z-10 flex flex-col items-center mb-8">
        {/* Device body */}
        <div className="relative">
          {/* Outer frame - rounded rectangle */}
          <div className="relative w-[320px] h-[500px] rounded-[40px] bg-gradient-to-b from-slate-800 via-slate-900 to-black shadow-2xl border border-slate-700/50">
            {/* Inner bezel */}
            <div className="absolute inset-3 rounded-[30px] bg-gradient-to-b from-slate-900 to-black border border-slate-800/50">
              {/* Top sensors area */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-slate-700 shadow-inner" />
                <div className="w-3 h-3 rounded-full bg-slate-700 shadow-inner border border-slate-600/30" />
                <div className="w-2 h-2 rounded-full bg-slate-700 shadow-inner" />
              </div>

              {/* Screen area */}
              <div className="absolute top-14 left-4 right-4 bottom-4 rounded-[20px] bg-slate-800/80 overflow-hidden">
                {/* Screen glow effect */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 via-blue-500/5 to-transparent"
                    animate={{
                      opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                )}
                
                {/* Hologram container */}
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* Hologram effect overlay */}
                  {isActive && (
                    <>
                      {/* Scan lines */}
                      <div className="absolute inset-0 pointer-events-none opacity-20">
                        <div 
                          className="w-full h-full"
                          style={{
                            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 255, 0.03) 2px, rgba(0, 255, 255, 0.03) 4px)',
                          }}
                        />
                      </div>
                      
                      {/* Hologram glow */}
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: 'radial-gradient(ellipse at center, rgba(0, 255, 255, 0.1) 0%, transparent 70%)',
                        }}
                        animate={{
                          opacity: [0.3, 0.6, 0.3],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    </>
                  )}
                  
                  {/* Avatar content */}
                  {children}
                </div>
              </div>
            </div>

            {/* Side accents */}
            <div className="absolute left-0 top-1/3 w-1 h-16 bg-gradient-to-b from-transparent via-slate-600 to-transparent rounded-r" />
            <div className="absolute right-0 top-1/4 w-1 h-12 bg-gradient-to-b from-transparent via-slate-600 to-transparent rounded-l" />
            <div className="absolute right-0 top-1/4 mt-16 w-1 h-8 bg-gradient-to-b from-transparent via-slate-600 to-transparent rounded-l" />
          </div>

          {/* Device stand/neck */}
          <div className="relative mx-auto w-20 h-12 bg-gradient-to-b from-slate-800 to-slate-900">
            <div className="absolute inset-x-2 inset-y-0 bg-gradient-to-b from-slate-700 to-slate-800 rounded-b-lg" />
          </div>

          {/* Device base */}
          <div className="relative mx-auto">
            <div className="w-32 h-6 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 rounded-t-lg rounded-b-xl shadow-lg">
              <div className="absolute inset-x-4 top-1 h-1 bg-slate-600/50 rounded-full" />
            </div>
            {/* Base shadow */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-40 h-4 bg-black/40 blur-md rounded-full" />
          </div>
        </div>

        {/* Hologram projection effect from base */}
        {isActive && (
          <motion.div
            className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[280px] h-[400px] pointer-events-none"
            style={{
              background: 'linear-gradient(to top, rgba(0, 255, 255, 0.05) 0%, transparent 100%)',
              clipPath: 'polygon(20% 100%, 80% 100%, 95% 0%, 5% 0%)',
            }}
            animate={{
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </div>

      {/* Ambient lighting effects */}
      {isActive && (
        <>
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-cyan-500/5 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-[300px] h-[100px] bg-blue-500/10 blur-2xl rounded-full pointer-events-none" />
        </>
      )}
    </div>
  );
};

export default ProtoMDevice;
