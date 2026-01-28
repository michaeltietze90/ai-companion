import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuizOverlayStore } from '@/stores/quizOverlayStore';

export function NameEntryOverlay() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [country, setCountry] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { currentScore, submitEntry, hideOverlay } = useQuizOverlayStore();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!country.trim()) newErrors.country = 'Country is required';
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
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop with Salesforce-style blur */}
      <motion.div 
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />

      <motion.div
        className="relative w-full max-w-md mx-4 rounded-2xl bg-card border border-border overflow-hidden shadow-2xl"
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
      >
        {/* Header gradient bar - Agentforce style */}
        <div className="h-1.5 w-full gradient-agentforce-wave" />
        
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-full"
          onClick={hideOverlay}
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring' }}
            >
              <span className="text-2xl">🏆</span>
            </motion.div>
            <h2 className="text-xl font-semibold text-foreground mb-1">Great Job!</h2>
            <p className="text-muted-foreground text-sm">
              You scored <span className="text-primary font-medium">{currentScore}</span> points
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-sm text-muted-foreground">
                First Name
              </Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
                className="h-11 bg-secondary/30 border-border/50 focus:border-primary/50 focus:ring-primary/20 rounded-lg"
              />
              {errors.firstName && (
                <p className="text-xs text-destructive mt-1">{errors.firstName}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lastName" className="text-sm text-muted-foreground">
                Last Name
              </Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
                className="h-11 bg-secondary/30 border-border/50 focus:border-primary/50 focus:ring-primary/20 rounded-lg"
              />
              {errors.lastName && (
                <p className="text-xs text-destructive mt-1">{errors.lastName}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="country" className="text-sm text-muted-foreground">
                Country
              </Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Enter your country"
                className="h-11 bg-secondary/30 border-border/50 focus:border-primary/50 focus:ring-primary/20 rounded-lg"
              />
              {errors.country && (
                <p className="text-xs text-destructive mt-1">{errors.country}</p>
              )}
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg shadow-lg shadow-primary/20"
              >
                Submit & View Leaderboard
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default NameEntryOverlay;
