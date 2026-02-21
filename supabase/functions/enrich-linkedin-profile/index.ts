const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { linkedin_url } = await req.json();

    if (!linkedin_url || typeof linkedin_url !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'A valid LinkedIn profile URL is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL format
    const urlPattern = /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w\-%.]+\/?/i;
    if (!urlPattern.test(linkedin_url.trim())) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid LinkedIn profile URL. Expected format: https://linkedin.com/in/username' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl integration not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Scrape LinkedIn profile with Firecrawl
    console.log('Scraping LinkedIn profile:', linkedin_url.trim());
    const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: linkedin_url.trim(),
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    const scrapeData = await scrapeRes.json();

    if (!scrapeRes.ok || !scrapeData.success) {
      console.error('Firecrawl error:', scrapeData);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch LinkedIn profile. The profile may be private or the URL may be incorrect.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || '';
    if (!markdown || markdown.length < 50) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not extract meaningful content from this LinkedIn profile.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Use AI to parse into structured data
    console.log('Parsing profile with AI...');
    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a profile data extractor. Given raw LinkedIn profile content, extract structured candidate data. Return ONLY a valid JSON object with these fields:
{
  "name": "Full Name",
  "headline": "Professional headline",
  "location": "City, Country",
  "skills": ["skill1", "skill2", ...],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "e.g. 2 years 3 months",
      "description": "Brief summary of responsibilities"
    }
  ],
  "education": [
    {
      "institution": "University Name",
      "degree": "Degree type and field"
    }
  ],
  "summary": "2-3 sentence professional summary"
}
If a field cannot be determined, use null for strings or empty arrays for arrays. Do NOT include any explanation outside the JSON.`
          },
          {
            role: 'user',
            content: `Extract structured profile data from this LinkedIn content:\n\n${markdown.substring(0, 8000)}`
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!aiRes.ok) {
      console.error('AI parsing failed:', aiRes.status);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse profile data.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiRes.json();
    const rawContent = aiData.choices?.[0]?.message?.content || '';

    // Extract JSON from response (handle markdown code blocks)
    let parsed;
    try {
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawContent];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      console.error('Failed to parse AI response:', rawContent.substring(0, 500));
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to structure profile data from AI response.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Store in external_candidates table
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Check for existing entry with same LinkedIn URL
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
      // Return existing record
      return new Response(
        JSON.stringify({ success: true, candidate: existing[0], already_exists: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert new record
    const candidate = {
      name: parsed.name || 'Unknown',
      headline: parsed.headline || null,
      location: parsed.location || null,
      skills: parsed.skills || [],
      experience: parsed.experience || [],
      linkedin_url: linkedin_url.trim(),
      source: 'linkedin',
      raw_data: parsed,
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
      const insertErr = await insertRes.text();
      console.error('Insert failed:', insertErr);
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
    console.error('Enrichment error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
