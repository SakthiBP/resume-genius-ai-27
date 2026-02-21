import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SearchParams {
  required_languages: string[];
  preferred_languages?: string[];
  seniority_level: string;
  preferred_location: {
    city?: string;
    country: string;
    remote_allowed: boolean;
  };
  result_count: number;
  role_title: string;
  role_description: string;
  required_skills: string[];
  company_name?: string;
}

const FOLLOWER_THRESHOLDS: Record<string, number> = {
  junior: 5,
  mid: 20,
  senior: 50,
  lead: 100,
  principal: 200,
};

async function githubFetch(url: string, token: string) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  // Check rate limit
  const remaining = res.headers.get("x-ratelimit-remaining");
  if (remaining && parseInt(remaining) < 3) {
    throw new Error("RATE_LIMIT_HIT_MID_SEARCH");
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status}: ${body}`);
  }
  return res.json();
}

function matchesLocation(
  profileLocation: string | null,
  preferred: SearchParams["preferred_location"]
): { passes: boolean; flag: string } {
  if (!profileLocation || profileLocation.trim() === "") {
    return { passes: true, flag: "unverified" };
  }
  const loc = profileLocation.toLowerCase();
  if (preferred.city && loc.includes(preferred.city.toLowerCase())) {
    return { passes: true, flag: "verified" };
  }
  if (loc.includes(preferred.country.toLowerCase())) {
    return { passes: true, flag: "verified" };
  }
  return { passes: false, flag: "mismatch" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GITHUB_TOKEN = Deno.env.get("GITHUB_API_TOKEN");
    if (!GITHUB_TOKEN) throw new Error("GITHUB_API_TOKEN not configured");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const params: SearchParams = await req.json();
    const {
      required_languages,
      seniority_level,
      preferred_location,
      result_count = 10,
      role_title,
      role_description,
      required_skills,
    } = params;

    const followerMin = FOLLOWER_THRESHOLDS[seniority_level.toLowerCase()] || 20;
    const primaryLang = required_languages[0] || "python";

    // Build search queries
    const queries: string[] = [];

    if (preferred_location.city) {
      queries.push(
        `language:${primaryLang} location:${preferred_location.city} followers:>${followerMin}`
      );
    }
    if (preferred_location.remote_allowed || !preferred_location.city) {
      queries.push(
        `language:${primaryLang} location:${preferred_location.country} followers:>${followerMin}`
      );
    }
    if (preferred_location.remote_allowed) {
      // Also search without location filter
      queries.push(
        `language:${primaryLang} followers:>${followerMin}`
      );
    }

    console.log("Search queries:", queries);

    // Fetch users from all queries, deduplicate
    const seenUsernames = new Set<string>();
    const allUsers: any[] = [];

    for (const q of queries) {
      try {
        const searchResult = await githubFetch(
          `https://api.github.com/search/users?q=${encodeURIComponent(q)}&sort=followers&order=desc&per_page=${Math.min(result_count * 3, 30)}`,
          GITHUB_TOKEN
        );
        for (const user of searchResult.items || []) {
          if (!seenUsernames.has(user.login)) {
            seenUsernames.add(user.login);
            allUsers.push(user);
          }
        }
        // Rate limit pause
        await new Promise((r) => setTimeout(r, 1000));
      } catch (e: any) {
        if (e.message === "RATE_LIMIT_HIT_MID_SEARCH") throw e;
        console.error("Search query failed:", e.message);
      }
    }

    console.log(`Found ${allUsers.length} unique users from search`);

    if (allUsers.length === 0) {
      return new Response(
        JSON.stringify({
          github_recommendations: null,
          error: "NO_LOCATION_MATCHES",
          location_searched: preferred_location.city || preferred_location.country,
          action_required:
            "No GitHub profiles found matching the required location. Consider enabling remote_allowed or broadening the location to country level.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch full profiles and repos for each user (up to result_count * 2)
    const profileLimit = Math.min(allUsers.length, result_count * 2);
    const enrichedCandidates: any[] = [];

    for (let i = 0; i < profileLimit; i++) {
      try {
        const [profile, reposData] = await Promise.all([
          githubFetch(`https://api.github.com/users/${allUsers[i].login}`, GITHUB_TOKEN),
          githubFetch(
            `https://api.github.com/users/${allUsers[i].login}/repos?sort=pushed&per_page=20`,
            GITHUB_TOKEN
          ),
        ]);

        // Location verification
        const locCheck = matchesLocation(profile.location, preferred_location);
        if (!locCheck.passes && !preferred_location.remote_allowed) {
          continue;
        }

        // Extract languages from repos
        const langCounts: Record<string, number> = {};
        const repos = (reposData || []).filter((r: any) => !r.fork);
        for (const repo of repos) {
          if (repo.language) {
            langCounts[repo.language] = (langCounts[repo.language] || 0) + (repo.stargazers_count || 1);
          }
        }
        const topLanguages = Object.entries(langCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([lang]) => lang);

        // Pick top relevant repos
        const pinnedRepos = repos
          .sort((a: any, b: any) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
          .slice(0, 5)
          .map((r: any) => ({
            repo_name: r.name,
            description: r.description || null,
            primary_language: r.language || "Unknown",
            stars: r.stargazers_count || 0,
            url: r.html_url,
          }));

        // Calculate account age
        const createdAt = new Date(profile.created_at);
        const accountAgeYears = Math.round(
          (Date.now() - createdAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000) * 10
        ) / 10;

        // Try to find email
        let email = profile.email || null;
        let emailSource = email ? "github_profile" : "not_found";
        if (!email && profile.bio) {
          const emailMatch = profile.bio.match(
            /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
          );
          if (emailMatch) {
            email = emailMatch[0];
            emailSource = "bio";
          }
        }

        enrichedCandidates.push({
          username: profile.login,
          github_profile_url: profile.html_url,
          display_name: profile.name || null,
          location_listed: profile.location || null,
          location_verified: locCheck.flag === "verified",
          location_flag: preferred_location.remote_allowed && locCheck.flag !== "verified"
            ? "remote_candidate"
            : locCheck.flag,
          email,
          email_source: emailSource,
          avatar_url: profile.avatar_url,
          bio: profile.bio || null,
          account_age_years: accountAgeYears,
          followers: profile.followers || 0,
          public_repos: profile.public_repos || 0,
          top_languages: topLanguages,
          pinned_repos: pinnedRepos,
          company: profile.company || null,
        });

        // Rate limit
        await new Promise((r) => setTimeout(r, 500));
      } catch (e: any) {
        if (e.message === "RATE_LIMIT_HIT_MID_SEARCH") throw e;
        console.error(`Failed to fetch profile ${allUsers[i].login}:`, e.message);
      }
    }

    if (enrichedCandidates.length === 0) {
      return new Response(
        JSON.stringify({
          github_recommendations: null,
          error: "NO_LOCATION_MATCHES",
          location_searched: preferred_location.city || preferred_location.country,
          action_required:
            "No GitHub profiles found matching the required location after verification.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // AI Scoring via Lovable AI Gateway
    console.log(`Scoring ${enrichedCandidates.length} candidates via AI...`);

    const scoringPrompt = `You are scoring GitHub developer profiles against a job role. Return ONLY valid JSON array.

Role: ${role_title}
Description: ${role_description}
Required Skills: ${required_skills.join(", ")}
Required Languages: ${required_languages.join(", ")}
Seniority: ${seniority_level}

For each candidate below, score them 0-100 based on:
- Language match vs required languages (30%)
- Project relevance to role (40%)
- Coding consistency & account maturity (20%)
- Code quality signals (10%)

Also provide:
- score_band: "red" (<40), "orange" (40-59), "amber" (60-69), "light_green" (70-84), "green" (85+)
- match_summary: 2 sentence plain-English summary for the recruiter
- standout_signals: array of 1-3 specific standout facts
- classification for each pinned repo: "core_relevant" | "adjacent" | "general_coding"

Candidates:
${JSON.stringify(
  enrichedCandidates.map((c) => ({
    username: c.username,
    display_name: c.display_name,
    bio: c.bio,
    top_languages: c.top_languages,
    account_age_years: c.account_age_years,
    followers: c.followers,
    public_repos: c.public_repos,
    pinned_repos: c.pinned_repos,
    company: c.company,
  })),
  null,
  2
)}

Return JSON array in format:
[{
  "username": "string",
  "recommendation_score": 0-100,
  "score_band": "string",
  "match_summary": "string",
  "standout_signals": ["string"],
  "repo_classifications": {"repo_name": "classification"}
}]`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: scoringPrompt }],
          temperature: 0.3,
        }),
      }
    );

    if (!aiResponse.ok) {
      const aiErr = await aiResponse.text();
      throw new Error(`AI scoring failed: ${aiErr}`);
    }

    const aiResult = await aiResponse.json();
    const rawContent = aiResult.choices?.[0]?.message?.content || "[]";

    // Parse AI response - strip markdown fences if present
    let scores: any[];
    try {
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      scores = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI scoring:", rawContent);
      scores = [];
    }

    // Merge scores into candidates
    const scoreMap = new Map(scores.map((s: any) => [s.username, s]));

    const scoredCandidates = enrichedCandidates
      .map((c, i) => {
        const scoring = scoreMap.get(c.username);
        return {
          ...c,
          rank: 0,
          recommendation_score: scoring?.recommendation_score ?? 50,
          score_band: scoring?.score_band ?? "orange",
          match_summary: scoring?.match_summary ?? "Profile found but could not be scored automatically.",
          standout_signals: scoring?.standout_signals ?? [],
          outreach_status: "not_contacted",
          outreach_email: null,
          pinned_repos: c.pinned_repos.map((r: any) => ({
            ...r,
            classification: scoring?.repo_classifications?.[r.repo_name] ?? "general_coding",
          })),
        };
      })
      .filter((c) => c.recommendation_score >= 60)
      .sort((a, b) => b.recommendation_score - a.recommendation_score)
      .slice(0, result_count)
      .map((c, i) => ({ ...c, rank: i + 1 }));

    if (scoredCandidates.length === 0) {
      return new Response(
        JSON.stringify({
          github_recommendations: null,
          error: "NO_CANDIDATES_ABOVE_THRESHOLD",
          action_required:
            "Profiles were found but none scored above 60 for this role. Consider relaxing the required_languages criteria or broadening the seniority level.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        github_recommendations: {
          role_searched_for: role_title,
          location_filter_applied: preferred_location.city || preferred_location.country,
          remote_included: preferred_location.remote_allowed,
          search_executed_at: new Date().toISOString(),
          total_profiles_scanned: allUsers.length,
          total_passed_location_filter: enrichedCandidates.length,
          total_passed_score_threshold: scoredCandidates.length,
          candidates_returned: scoredCandidates.length,
          recommended_candidates: scoredCandidates,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("github-recommend error:", error);

    if (error.message === "RATE_LIMIT_HIT_MID_SEARCH") {
      return new Response(
        JSON.stringify({
          github_recommendations: "partial",
          error: "RATE_LIMIT_HIT_MID_SEARCH",
          action_required:
            "Rate limit reached before completing the full search. Try again after a few minutes.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
