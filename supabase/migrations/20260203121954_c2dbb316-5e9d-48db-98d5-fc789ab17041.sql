-- Create leaderboard_entries table
CREATE TABLE public.leaderboard_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  country TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;

-- Allow public read access (leaderboard is public)
CREATE POLICY "Leaderboard is publicly readable"
ON public.leaderboard_entries
FOR SELECT
USING (true);

-- Allow insert via service role (edge function)
CREATE POLICY "Service role can insert entries"
ON public.leaderboard_entries
FOR INSERT
WITH CHECK (true);

-- Create index for faster top score queries
CREATE INDEX idx_leaderboard_score ON public.leaderboard_entries(score DESC);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.leaderboard_entries;