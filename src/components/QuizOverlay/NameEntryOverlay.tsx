import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuizOverlayStore } from '@/stores/quizOverlayStore';

export function NameEntryOverlay() {
  const { currentScore, prefillData, submitEntry, hideOverlay, isLoading, notifyDataEdit } = useQuizOverlayStore();
  
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
      // Notify Agentforce if data was edited (before saving)
      notifyDataEdit(firstName.trim(), lastName.trim(), country.trim());
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
        className="pointer-events-auto w-full max-w-md mx-auto"
        initial={{ y: 20, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.98 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
      >
        {/* Card */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl">
          {/* Header - Blue gradient matching leaderboard */}
          <div 
            className="relative px-5 py-4"
            style={{
              background: 'linear-gradient(135deg, #4BA3E3 0%, #2B7FC3 100%)',
            }}
          >
            {/* Close button */}
            <button
              onClick={hideOverlay}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            
            <h2 className="text-lg font-bold text-white">Quiz Complete!</h2>
            <p className="text-white/80 text-sm">Enter your details to save your score</p>
          </div>
          
          {/* Body - White background */}
          <div className="bg-white p-5">
            {/* Score display */}
            <div className="text-center mb-5 pb-4 border-b border-slate-100">
              <div className="text-xs font-semibold tracking-[0.15em] uppercase text-slate-400 mb-1">
                Your Score
              </div>
              <div className="text-3xl font-bold text-cyan-600">
                {currentScore.toLocaleString()}
                <span className="text-slate-400 text-base ml-1.5 font-normal">pts</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    className={`h-11 bg-slate-50 border-slate-200 focus:border-cyan-400 focus:ring-cyan-400/20 rounded-xl placeholder:text-slate-400 ${errors.firstName ? 'border-red-300 bg-red-50/50' : ''}`}
                  />
                </div>
                <div>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className={`h-11 bg-slate-50 border-slate-200 focus:border-cyan-400 focus:ring-cyan-400/20 rounded-xl placeholder:text-slate-400 ${errors.lastName ? 'border-red-300 bg-red-50/50' : ''}`}
                  />
                </div>
              </div>
              
              <Input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country"
                className={`h-11 bg-slate-50 border-slate-200 focus:border-cyan-400 focus:ring-cyan-400/20 rounded-xl placeholder:text-slate-400 ${errors.country ? 'border-red-300 bg-red-50/50' : ''}`}
              />

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={hideOverlay}
                  className="flex-1 h-11 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 h-11 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
                  style={{
                    background: 'linear-gradient(135deg, #4BA3E3 0%, #2B7FC3 100%)',
                  }}
                >
                  {isLoading ? 'Saving...' : 'Submit'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default NameEntryOverlay;
