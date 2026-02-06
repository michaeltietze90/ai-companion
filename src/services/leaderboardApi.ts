/**
 * Leaderboard API Service
 * 
 * Replaces direct Supabase function calls with /api/leaderboard route.
 * Works with Heroku Express backend only (no Supabase dependency).
 */

const getApiUrl = () => '/api/leaderboard';

export async function fetchLeaderboard(): Promise<{ entries: any[] }> {
  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'get' }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch leaderboard');
  }

  return response.json();
}

export async function saveLeaderboardEntry(entry: {
  firstName: string;
  lastName: string;
  country: string;
  score: number;
}): Promise<{
  success: boolean;
  entry: any;
  entries: any[];
  userRank: number;
}> {
  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'save', entry }),
  });

  if (!response.ok) {
    throw new Error('Failed to save leaderboard entry');
  }

  return response.json();
}
