const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function supaRest(path: string, method = 'GET', body?: unknown) {
  const opts: RequestInit = {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, opts);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Supabase REST error ${res.status}: ${t}`);
  }
  return res.json();
}

async function parseWithAI(rawText: string, source: string): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('AI service not configured');

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `You are a profile data parser. Given raw text from a ${source}, extract structured candidate data. Return ONLY valid JSON:
{
  "full_name": "string or null",
  "headline": "string or null",
  "location": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "links": {"github": null, "website": null, "portfolio": null, "linkedin": null},
  "skills": ["skill1", "skill2"],
  "experience": [{"company":"","title":"","start":"","end":"","bullets":["..."]}],
  "education": [{"institution":"","degree":"","field":"","year":""}],
  "projects": [{"name":"","description":"","url":"","technologies":[]}],
  "profile_summary": "2-3 sentence professional summary combining name, headline, top skills, and key experience"
}
Use null for unknown fields, empty arrays for missing lists.`
        },
        { role: 'user', content: `Parse this ${source} content:\n\n${rawText.substring(0, 12000)}` }
      ],
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error('Rate limit exceeded. Please try again shortly.');
    if (res.status === 402) throw new Error('AI credits exhausted. Please top up your workspace.');
    throw new Error(`AI parsing failed (${res.status})`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || '';
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
  return JSON.parse(match[1].trim());
}

async function createCandidate(profile: any) {
  // Check if candidate already exists for this external profile
  const existing = await fetch(
    `${SUPABASE_URL}/rest/v1/candidates?external_candidate_id=eq.${profile.id}&select=id`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    }
  );
  const existingData = await existing.json();
  if (existingData && existingData.length > 0) {
    // Update existing candidate
    const [updated] = await supaRest(`candidates?id=eq.${existingData[0].id}`, 'PATCH', {
      candidate_name: profile.full_name || 'Unknown',
      email: profile.email || null,
      source: 'data_sources',
    });
    return existingData[0];
  }

  // Create new candidate
  const summaryText = [
    profile.full_name,
    profile.headline,
    profile.profile_summary,
    `Skills: ${(profile.skills || []).join(', ')}`,
  ].filter(Boolean).join('. ');

  const [candidate] = await supaRest('candidates', 'POST', {
    candidate_name: profile.full_name || 'Unknown',
    email: profile.email || null,
    source: 'data_sources',
    cv_text: profile.raw_text || summaryText || 'Imported from data sources',
    overall_score: 0,
    recommendation: 'pending',
    status: 'imported',
    analysis_json: {
      source: profile.source,
      source_url: profile.source_url,
      profile_summary: profile.profile_summary,
      skills: profile.skills || [],
      experience: profile.experience || [],
      education: profile.education || [],
      projects: profile.projects || [],
      headline: profile.headline,
      location: profile.location,
      links: profile.links || {},
    },
    external_candidate_id: null,
    job_description: null,
  });
  return candidate;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { action, import_id, raw_text, source, source_url, github_username, website_url, file_path } = await req.json();

    if (!action) {
      return new Response(JSON.stringify({ error: 'Action required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── CV Upload / Paste ──
    if (action === 'cv_upload' || action === 'cv_paste') {
      if (!raw_text || raw_text.length < 20) {
        return new Response(JSON.stringify({ error: 'CV text is too short or missing.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (raw_text.length > 30000) {
        return new Response(JSON.stringify({ error: 'Text exceeds 30,000 character limit.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Create import record
      const [importRec] = await supaRest('imports', 'POST', {
        type: action,
        input: action === 'cv_upload' ? { file_path: file_path || null } : { pasted_text: raw_text.substring(0, 200) + '...' },
        status: 'processing',
      });

      try {
        const parsed = await parseWithAI(raw_text, 'CV/resume');

        const [profile] = await supaRest('external_profiles', 'POST', {
          full_name: parsed.full_name,
          headline: parsed.headline,
          location: parsed.location,
          email: parsed.email,
          phone: parsed.phone,
          links: parsed.links || {},
          skills: parsed.skills || [],
          experience: parsed.experience || [],
          education: parsed.education || [],
          projects: parsed.projects || [],
          source: action,
          source_url: null,
          raw_text: raw_text.substring(0, 50000),
          raw_json: parsed,
          profile_summary: parsed.profile_summary || null,
          status: 'ready',
        });

        // Update import
        await supaRest(`imports?id=eq.${importRec.id}`, 'PATCH', {
          external_profile_id: profile.id,
          status: 'ready',
        });

        // Auto-create candidate
        const candidate = await createCandidate(profile);

        return new Response(JSON.stringify({ success: true, profile, candidate, import: importRec }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        await supaRest(`imports?id=eq.${importRec.id}`, 'PATCH', {
          status: 'error',
          error_message: err instanceof Error ? err.message : 'Unknown error',
        });
        throw err;
      }
    }

    // ── GitHub Import ──
    if (action === 'github') {
      let username = github_username || '';
      // Extract username from URL
      const ghMatch = username.match(/github\.com\/([^/?\s]+)/i);
      if (ghMatch) username = ghMatch[1];
      username = username.replace(/^@/, '').trim();

      if (!username) {
        return new Response(JSON.stringify({ error: 'GitHub username or URL required.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const [importRec] = await supaRest('imports', 'POST', {
        type: 'github',
        input: { username, url: `https://github.com/${username}` },
        status: 'processing',
      });

      try {
        // Fetch public GitHub data
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const [userRes, reposRes] = await Promise.all([
          fetch(`https://api.github.com/users/${username}`, { signal: controller.signal, headers: { 'User-Agent': 'SWIMR-App' } }),
          fetch(`https://api.github.com/users/${username}/repos?sort=stars&per_page=10`, { signal: controller.signal, headers: { 'User-Agent': 'SWIMR-App' } }),
        ]);
        clearTimeout(timeout);

        if (!userRes.ok) {
          throw new Error(userRes.status === 404 ? `GitHub user "${username}" not found.` : `GitHub API error (${userRes.status})`);
        }

        const ghUser = await userRes.json();
        const repos = reposRes.ok ? await reposRes.json() : [];

        // Extract languages
        const langSet = new Set<string>();
        const topicSet = new Set<string>();
        const projectsList: any[] = [];

        for (const repo of repos) {
          if (repo.language) langSet.add(repo.language);
          (repo.topics || []).forEach((t: string) => topicSet.add(t));
          projectsList.push({
            name: repo.name,
            description: repo.description || '',
            url: repo.html_url,
            technologies: [repo.language, ...(repo.topics || [])].filter(Boolean),
          });
        }

        const rawText = `GitHub Profile: ${ghUser.name || username}\nBio: ${ghUser.bio || 'N/A'}\nLocation: ${ghUser.location || 'N/A'}\nCompany: ${ghUser.company || 'N/A'}\nPublic Repos: ${ghUser.public_repos}\nFollowers: ${ghUser.followers}\n\nLanguages: ${[...langSet].join(', ')}\nTopics: ${[...topicSet].join(', ')}\n\nTop Repos:\n${projectsList.map(p => `- ${p.name}: ${p.description}`).join('\n')}`;

        const summary = `${ghUser.name || username}. ${ghUser.bio || ''}. Skills: ${[...langSet].join(', ')}. ${projectsList.length} notable projects on GitHub.`;

        const [profile] = await supaRest('external_profiles', 'POST', {
          full_name: ghUser.name || username,
          headline: ghUser.bio || `GitHub developer with ${ghUser.public_repos} repos`,
          location: ghUser.location,
          email: ghUser.email,
          links: { github: ghUser.html_url, website: ghUser.blog || null },
          skills: [...langSet, ...topicSet],
          experience: ghUser.company ? [{ company: ghUser.company, title: 'Developer', start: '', end: '', bullets: [] }] : [],
          education: [],
          projects: projectsList,
          source: 'github',
          source_url: ghUser.html_url,
          raw_text: rawText,
          raw_json: { user: ghUser, repos },
          profile_summary: summary,
          status: 'ready',
        });

        await supaRest(`imports?id=eq.${importRec.id}`, 'PATCH', {
          external_profile_id: profile.id,
          status: 'ready',
        });

        // Auto-create candidate
        const candidate = await createCandidate(profile);

        return new Response(JSON.stringify({ success: true, profile, candidate, import: importRec }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        await supaRest(`imports?id=eq.${importRec.id}`, 'PATCH', {
          status: 'error',
          error_message: err instanceof Error ? err.message : 'Unknown error',
        });
        throw err;
      }
    }

    // ── Website Import ──
    if (action === 'website') {
      let url = website_url || '';
      if (!url.match(/^https?:\/\//)) url = `https://${url}`;

      // Validate URL
      try { new URL(url); } catch {
        return new Response(JSON.stringify({ error: 'Invalid URL.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Block LinkedIn
      if (url.includes('linkedin.com')) {
        return new Response(JSON.stringify({ error: 'LinkedIn import is not supported. Use CV upload, GitHub, or website instead.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Block internal IPs
      const hostname = new URL(url).hostname;
      if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(hostname) || hostname.startsWith('10.') || hostname.startsWith('192.168.') || hostname.startsWith('172.')) {
        return new Response(JSON.stringify({ error: 'Internal URLs are not allowed.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const [importRec] = await supaRest('imports', 'POST', {
        type: 'website',
        input: { url },
        status: 'processing',
      });

      try {
        const FIRECRAWL_KEY = Deno.env.get('FIRECRAWL_API_KEY');
        if (!FIRECRAWL_KEY) throw new Error('Firecrawl integration not configured.');

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true, waitFor: 3000 }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const scrapeData = await scrapeRes.json();
        if (!scrapeRes.ok || !scrapeData.success) {
          throw new Error('Failed to fetch website content. The site may be inaccessible.');
        }

        const markdown = scrapeData.data?.markdown || scrapeData.markdown || '';
        if (markdown.length < 30) throw new Error('Insufficient content extracted from website.');

        const parsed = await parseWithAI(markdown, 'personal website / portfolio');

        const [profile] = await supaRest('external_profiles', 'POST', {
          full_name: parsed.full_name,
          headline: parsed.headline,
          location: parsed.location,
          email: parsed.email,
          phone: parsed.phone,
          links: { ...parsed.links, website: url },
          skills: parsed.skills || [],
          experience: parsed.experience || [],
          education: parsed.education || [],
          projects: parsed.projects || [],
          source: 'website',
          source_url: url,
          raw_text: markdown.substring(0, 50000),
          raw_json: parsed,
          profile_summary: parsed.profile_summary || null,
          status: 'ready',
        });

        await supaRest(`imports?id=eq.${importRec.id}`, 'PATCH', {
          external_profile_id: profile.id,
          status: 'ready',
        });

        // Auto-create candidate
        const candidate = await createCandidate(profile);

        return new Response(JSON.stringify({ success: true, profile, candidate, import: importRec }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        await supaRest(`imports?id=eq.${importRec.id}`, 'PATCH', {
          status: 'error',
          error_message: err instanceof Error ? err.message : 'Unknown error',
        });
        throw err;
      }
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Import pipeline error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal error'
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
