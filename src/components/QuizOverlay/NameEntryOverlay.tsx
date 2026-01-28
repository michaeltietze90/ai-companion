import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuizOverlayStore } from '@/stores/quizOverlayStore';

export function NameEntryOverlay() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [country, setCountry] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { currentScore, submitEntry, hideOverlay } = useQuizOverlayStore();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = 'Required';
    if (!lastName.trim()) newErrors.lastName = 'Required';
    if (!country.trim()) newErrors.country = 'Required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      submitEntry(firstName.trim(), lastName.trim(), country.trim());
    }
  };

  return (
    <motion.div
      className="absolute inset-0 z-40 flex items-end justify-center pb-[8%] pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="pointer-events-auto w-[85%] max-w-[280px]"
        initial={{ y: 30, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        {/* Holographic card */}
        <div className="relative rounded-xl overflow-hidden">
          {/* Hologram glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-t from-primary/40 via-primary/20 to-accent/10 blur-xl opacity-60" />
          
          {/* Card content */}
          <div className="relative bg-black/70 backdrop-blur-md border border-primary/30 rounded-xl p-4">
            {/* Scan line effect */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, transparent 0%, hsl(210 100% 50% / 0.03) 50%, transparent 100%)',
                backgroundSize: '100% 8px',
              }}
            />
            
            {/* Top accent line */}
            <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

            {/* Header */}
            <div className="text-center mb-3">
              <div className="text-xs text-primary/80 font-medium tracking-wider uppercase mb-1">
                Quiz Complete
              </div>
              <div className="text-lg font-semibold text-foreground">
                <span className="text-primary">{currentScore}</span>
                <span className="text-muted-foreground text-sm ml-1">pts</span>
              </div>
            </div>

            {/* Compact Form */}
            <form onSubmit={handleSubmit} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    className={`h-8 text-xs bg-black/50 border-primary/20 focus:border-primary/50 rounded-lg placeholder:text-muted-foreground/50 ${errors.firstName ? 'border-destructive/50' : ''}`}
                  />
                </div>
                <div>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className={`h-8 text-xs bg-black/50 border-primary/20 focus:border-primary/50 rounded-lg placeholder:text-muted-foreground/50 ${errors.lastName ? 'border-destructive/50' : ''}`}
                  />
                </div>
              </div>
              
              <Input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country"
                className={`h-8 text-xs bg-black/50 border-primary/20 focus:border-primary/50 rounded-lg placeholder:text-muted-foreground/50 ${errors.country ? 'border-destructive/50' : ''}`}
              />

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={hideOverlay}
                  className="flex-1 h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="flex-1 h-8 text-xs bg-primary/80 hover:bg-primary text-white rounded-lg shadow-lg shadow-primary/20"
                >
                  Submit
                </Button>
              </div>
            </form>

            {/* Bottom accent */}
            <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default NameEntryOverlay;
