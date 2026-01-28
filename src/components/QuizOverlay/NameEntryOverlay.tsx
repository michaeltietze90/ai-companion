import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Globe, Trophy, X } from 'lucide-react';
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative w-full max-w-md mx-4 p-8 rounded-2xl bg-gradient-to-br from-card via-card to-secondary/50 border border-border shadow-2xl"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          onClick={hideOverlay}
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            <Trophy className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Congratulations!</h2>
          <p className="text-muted-foreground">
            You scored <span className="text-primary font-semibold">{currentScore}</span> points
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="flex items-center gap-2 text-foreground">
              <User className="w-4 h-4 text-muted-foreground" />
              First Name
            </Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Enter your first name"
              className="bg-secondary/50 border-border focus:border-primary"
            />
            {errors.firstName && (
              <p className="text-sm text-destructive">{errors.firstName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName" className="flex items-center gap-2 text-foreground">
              <User className="w-4 h-4 text-muted-foreground" />
              Last Name
            </Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Enter your last name"
              className="bg-secondary/50 border-border focus:border-primary"
            />
            {errors.lastName && (
              <p className="text-sm text-destructive">{errors.lastName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="country" className="flex items-center gap-2 text-foreground">
              <Globe className="w-4 h-4 text-muted-foreground" />
              Country
            </Label>
            <Input
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Enter your country"
              className="bg-secondary/50 border-border focus:border-primary"
            />
            {errors.country && (
              <p className="text-sm text-destructive">{errors.country}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold rounded-xl shadow-lg shadow-primary/30"
          >
            Submit & View Leaderboard
          </Button>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default NameEntryOverlay;
