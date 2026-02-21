const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, headline, location, skills, experience, linkedin_url } = await req.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Candidate name is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Check for duplicate by LinkedIn URL if provided
    if (linkedin_url && typeof linkedin_url === 'string' && linkedin_url.trim().length > 0) {
      const checkRes = await fetch(
        `${supabaseUrl}/rest/v1/external_candidates?linkedin_url=eq.${encodeURIComponent(linkedin_url.trim())}&select=id,name,headline,location,skills,experience,linkedin_url,created_at`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );
      const existing = await checkRes.json();
      if (existing && existing.length > 0) {
        return new Response(
          JSON.stringify({ success: true, candidate: existing[0], already_exists: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const candidate = {
      name: name.trim(),
      headline: headline?.trim() || null,
      location: location?.trim() || null,
      skills: Array.isArray(skills) ? skills : [],
      experience: Array.isArray(experience) ? experience : [],
      linkedin_url: linkedin_url?.trim() || null,
      source: 'manual_entry',
      raw_data: { name, headline, location, skills, experience },
    };

    const insertRes = await fetch(`${supabaseUrl}/rest/v1/external_candidates`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(candidate),
    });

    if (!insertRes.ok) {
      const err = await insertRes.text();
      console.error('Insert failed:', err);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to store candidate data.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const [inserted] = await insertRes.json();

    return new Response(
      JSON.stringify({ success: true, candidate: inserted, already_exists: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
