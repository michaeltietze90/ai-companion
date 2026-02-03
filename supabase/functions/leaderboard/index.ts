import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, entry, entries } = await req.json();

    // GET: Fetch top 5 leaderboard entries
    if (action === 'get' || req.method === 'GET') {
      console.log('Fetching leaderboard entries...');
      
      const { data, error } = await supabase
        .from('leaderboard_entries')
        .select('*')
        .order('score', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching leaderboard:', error);
        throw error;
      }

      console.log(`Found ${data?.length || 0} entries`);
      
      return new Response(
        JSON.stringify({ entries: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SAVE: Save a single entry
    if (action === 'save' && entry) {
      console.log('Saving leaderboard entry:', entry);
      
      const { data, error } = await supabase
        .from('leaderboard_entries')
        .insert({
          first_name: entry.firstName,
          last_name: entry.lastName,
          country: entry.country,
          score: entry.score,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving entry:', error);
        throw error;
      }

      // Fetch updated top 5 and user's rank
      const { data: allEntries } = await supabase
        .from('leaderboard_entries')
        .select('*')
        .order('score', { ascending: false });

      const userRank = allEntries?.findIndex(e => e.id === data.id) ?? -1;
      const top5 = allEntries?.slice(0, 5) || [];

      console.log(`Entry saved. User rank: ${userRank + 1}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          entry: data,
          entries: top5,
          userRank: userRank + 1,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // BULK: Save multiple entries (for syncing from Agentforce)
    if (action === 'bulk' && entries) {
      console.log('Bulk saving entries:', entries.length);
      
      const insertData = entries.map((e: any) => ({
        first_name: e.firstName,
        last_name: e.lastName,
        country: e.country,
        score: e.score,
      }));

      const { error } = await supabase
        .from('leaderboard_entries')
        .upsert(insertData, { onConflict: 'id' });

      if (error) {
        console.error('Error bulk saving:', error);
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Leaderboard error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
