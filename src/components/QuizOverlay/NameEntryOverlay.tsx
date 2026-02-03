import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuizOverlayStore } from '@/stores/quizOverlayStore';

export function NameEntryOverlay() {
  const { currentScore, prefillData, submitEntry, hideOverlay, isLoading } = useQuizOverlayStore();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [country, setCountry] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Apply prefill data when it changes
  useEffect(() => {
    if (prefillData) {
      if (prefillData.firstName) setFirstName(prefillData.firstName);
      if (prefillData.lastName) setLastName(prefillData.lastName);
      if (prefillData.country) setCountry(prefillData.country);
    }
  }, [prefillData]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = 'Required';
    if (!lastName.trim()) newErrors.lastName = 'Required';
    if (!country.trim()) newErrors.country = 'Required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      await submitEntry(firstName.trim(), lastName.trim(), country.trim());
    }
  };

  return (
    <motion.div
      className="absolute inset-x-[3%] bottom-[6%] z-40 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="pointer-events-auto w-full"
        initial={{ y: 20, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.98 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
      >
        {/* Card with Agentforce purple gradient */}
        <div className="relative rounded-2xl overflow-hidden">
          {/* Glow effect - purple/magenta */}
          <div 
            className="absolute -inset-2 blur-2xl opacity-40"
            style={{
              background: 'linear-gradient(135deg, hsl(280 70% 55% / 0.5) 0%, hsl(310 80% 50% / 0.4) 100%)',
            }}
          />
          
          {/* Card body */}
          <div className="relative bg-[hsl(220_30%_8%/0.92)] backdrop-blur-xl border border-[hsl(280_70%_55%/0.3)] rounded-2xl overflow-hidden">
            {/* Top gradient accent */}
            <div className="h-1 w-full gradient-agentforce-wave" />
            
            <div className="p-5">
              {/* Header */}
              <div className="text-center mb-4">
                <div 
                  className="text-xs font-semibold tracking-[0.2em] uppercase mb-1"
                  style={{ color: 'hsl(310 80% 70%)' }}
                >
                  Quiz Complete
                </div>
                <div className="text-2xl font-bold text-foreground">
                  <span className="text-gradient-agentforce">{currentScore}</span>
                  <span className="text-muted-foreground text-base ml-1.5 font-normal">pts</span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    className={`h-11 bg-[hsl(220_30%_12%/0.8)] border-[hsl(280_50%_40%/0.3)] focus:border-[hsl(280_70%_55%/0.6)] rounded-xl placeholder:text-muted-foreground/50 ${errors.firstName ? 'border-destructive/50' : ''}`}
                  />
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className={`h-11 bg-[hsl(220_30%_12%/0.8)] border-[hsl(280_50%_40%/0.3)] focus:border-[hsl(280_70%_55%/0.6)] rounded-xl placeholder:text-muted-foreground/50 ${errors.lastName ? 'border-destructive/50' : ''}`}
                  />
                </div>
                
                <Input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Country"
                  className={`h-11 bg-[hsl(220_30%_12%/0.8)] border-[hsl(280_50%_40%/0.3)] focus:border-[hsl(280_70%_55%/0.6)] rounded-xl placeholder:text-muted-foreground/50 ${errors.country ? 'border-destructive/50' : ''}`}
                />

                <div className="flex gap-3 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={hideOverlay}
                    className="flex-1 h-11 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 h-11 text-white font-medium rounded-xl shadow-lg disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(135deg, hsl(280 70% 55%) 0%, hsl(310 80% 50%) 100%)',
                    }}
                  >
                    {isLoading ? 'Saving...' : 'Submit'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default NameEntryOverlay;
