import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert HR analyst and recruitment AI agent.
You analyze CVs/resumes against job descriptions and return structured evaluations
in JSON format. Return ONLY valid JSON - no markdown, no explanation, no preamble.

SCORING METHODOLOGY:
- Each section is scored 0-100 based on how many core requirements are satisfied
- Partial credit (smaller percentage boosts) awarded for relevant adjacent points
- 30 and lower = bad, 50 = average, 70 = good, 85+ = exceptional
- Deduct for vagueness and unquantified claims
- Reward specific metrics and clear impact statements
- Final composite score = weighted average of all section scores (weights defined per section)
- All recommendations and suggestions must be written from the HR recruiter's perspective, not the applicant's

Return this exact JSON structure:
{
  "candidate_name": "string",
  "email": "string or null",
  "summary": "2-3 sentence executive summary",
  "sentiment_analysis": {
    "score": 0-100,
    "tone": "confident|neutral|uncertain",
    "confidence_level": "high|medium|low",
    "notes": "string"
  },
  "job_description_match": {
    "weight": 0.20,
    "score": 0-100,
    "keywords_required": ["string"],
    "keywords_found": ["string"],
    "keywords_missing": ["string"],
    "keyword_match_percentage": 0-100,
    "role_alignment_notes": "string"
  },
  "skills_assessment": {
    "weight": 0.15,
    "score": 0-100,
    "technical_skills": ["skill1", "skill2"],
    "soft_skills": ["skill1", "skill2"],
    "certifications": ["cert1"],
    "required_skills_matched": ["string"],
    "required_skills_missing": ["string"],
    "bonus_relevant_skills": ["string"],
    "skill_match_percentage": 0-100
  },
  "education": {
    "weight": 0.15,
    "score": 0-100,
    "institution": "string",
    "degree": "string",
    "course": "string",
    "gpa_or_grade": "string or null — keep the ORIGINAL format exactly as stated on the CV (e.g. '3.7 GPA', 'First Class Honours', '1.3 German scale', '8.5 CGPA')",
    "grade_quality_tier": "exceptional|strong|good|average|below_average — normalised quality tier (see GRADE NORMALISATION below)",
    "qs_ranking_tier": "top_10|top_50|top_100|top_200|top_500|unranked|unknown — based on QS World University Rankings (see EDUCATION SCORING below)",
    "course_relevance": "highly_relevant|relevant|partially_relevant|not_relevant — relevance of the degree course to the job description",
    "expected_years_to_complete": number,
    "actual_years_taken": "number or null",
    "completed_on_time": "yes|no|unknown",
    "prestige_tier": "target|high|mid|low|unknown",
    "target_universities_matched": ["string"],
    "notes": "string"
  },
  "work_experience": {
    "weight": 0.25,
    "score": 0-100,
    "total_years": number,
    "progression": "strong_upward|steady|lateral|unclear",
    "industry_relevance": 0-100,
    "company_prestige_avg": "high|mid|low|mixed",
    "roles": [
      {
        "title": "string",
        "company": "string",
        "company_prestige": "high|mid|low|unknown",
        "duration_months": number,
        "relevance_to_role": 0-100,
        "highlights": ["string"]
      }
    ],
    "employment_gaps": [
      {
        "period": "string",
        "duration_months": number,
        "severity": "low|medium|high"
      }
    ],
    "notes": "string"
  },
  "right_to_work": {
    "weight": 0.10,
    "score": 0-100,
    "candidate_nationality": "string or null",
    "recruiter_country": "string (input by recruiter)",
    "visa_sponsorship_required": "yes|no|unknown",
    "sponsorship_available": "yes|no|not_specified",
    "eligible_to_work": "yes|no|likely|unlikely|unknown",
    "visa_type_if_applicable": "string or null",
    "notes": "string — flag if verification is required"
  },
  "red_flags": {
    "weight": 0.05,
    "score": 0-100,
    "employment_gaps": [
      {
        "period": "string",
        "duration_months": number,
        "severity": "low|medium|high"
      }
    ],
    "inconsistencies": ["string"],
    "vague_descriptions": ["string"],
    "red_flag_count": number,
    "notes": "string"
  },
  "overall_score": {
    "section_scores": {
      "job_description_match": {"score": 0-100, "weight": 0.20, "weighted_score": 0-100},
      "skills_assessment": {"score": 0-100, "weight": 0.15, "weighted_score": 0-100},
      "education": {"score": 0-100, "weight": 0.15, "weighted_score": 0-100},
      "work_experience": {"score": 0-100, "weight": 0.25, "weighted_score": 0-100},
      "right_to_work": {"score": 0-100, "weight": 0.10, "weighted_score": 0-100},
      "red_flags": {"score": 0-100, "weight": 0.05, "weighted_score": 0-100},
      "sentiment_analysis": {"score": 0-100, "weight": 0.10, "weighted_score": 0-100}
    },
    "composite_score": 0-100,
    "score_band": "red|orange|amber|light_green|green",
    "recommendation": "strong_yes|yes|maybe|no|strong_no",
    "improvement_suggestions": ["string"]
  },
  "agent_metrics": {
    "estimated_manual_review_minutes": number,
    "cost_estimate_usd": number
  }
}

SECTION SCORING RULES:
job_description_match: Score based on % of required keywords/criteria found. Award full points per keyword matched. Partial credit for adjacent/related terms.
skills_assessment: Score based on required skills satisfied. Partial credit for transferable or related skills. Bonus points for exceeding requirements.
education: Score based on THREE primary factors:
   1. UNIVERSITY PRESTIGE — assess using your broad knowledge of global university reputation across MULTIPLE ranking systems (QS, THE, ARWU/Shanghai, US News Global) and general industry perception. Do NOT rely on any single ranking list. Acknowledge that reputation varies by subject area — a university might be elite for engineering but mid-tier for business. Classify into tiers:
     - Elite = globally top ~20 (e.g., Oxbridge, Ivy League, MIT, Stanford, ETH Zurich) (qs_ranking_tier: "top_10")
     - Top Tier = globally top ~100 (qs_ranking_tier: "top_50" or "top_100")
     - Strong = top ~250 (qs_ranking_tier: "top_200")
     - Mid Tier = top ~500 (qs_ranking_tier: "top_500")
     - Lower Tier = below top 500 or unranked (qs_ranking_tier: "unranked")
     Consider the specific subject area relevance when assessing prestige — e.g., a university known for engineering excellence should rank higher when evaluating an engineering candidate.
  2. GRADE QUALITY — accept ALL grading systems worldwide and normalise:
     - UK: First Class Honours, Upper Second (2:1), Lower Second (2:2), Third Class
     - US: GPA on 4.0 scale
     - European: ECTS grades (A-F), percentage systems, German 1.0-5.0 scale (1.0 = best)
     - Indian: CGPA on 10.0 scale, percentage, First/Second/Third Division
     - Australian: HD (High Distinction), D (Distinction), C (Credit), P (Pass)
     - Chinese: percentage out of 100
     - Any other system — interpret and normalise it
     GRADE NORMALISATION into grade_quality_tier:
     - "exceptional": UK First / US 3.8+ / German 1.0-1.3 / Indian 9.0+ / AU HD / CN 90+
     - "strong": UK 2:1 / US 3.5-3.79 / German 1.4-2.0 / Indian 8.0-8.9 / AU D / CN 80-89
     - "good": UK 2:2 / US 3.0-3.49 / German 2.1-3.0 / Indian 7.0-7.9 / AU C / CN 70-79
     - "average": US 2.5-2.99 / German 3.1-3.5 / Indian 6.0-6.9 / AU P / CN 60-69
     - "below_average": anything below the above thresholds
     Keep gpa_or_grade in the ORIGINAL format from the CV. The normalised tier goes in grade_quality_tier.
  3. DEGREE LEVEL AND SUBJECT RELEVANCE:
     Degree level weighting:
     - PhD / Doctorate = highest weight
     - Masters = high weight
     - Bachelors = standard weight
     - Foundation degree / HND / Associate = lower weight
     - A-Levels / High School only = lowest weight
     Subject relevance must be scored DYNAMICALLY against the specific role being analysed. No subject is inherently good or bad — relevance depends entirely on the role. Examples:
     - English Literature for Content Strategist = highly_relevant
     - English Literature for Software Engineer = not_relevant
     - Computer Science for Software Engineer = highly_relevant
     - Computer Science for Marketing Manager = not_relevant
     - Mathematics for Quantitative Analyst = highly_relevant
     - Mathematics for HR Manager = not_relevant
     Set course_relevance to: highly_relevant | relevant | partially_relevant | not_relevant based on how well the degree subject maps to the role's requirements.
  Also factor in: degree completion (on time = full credit). Deduct for incomplete degrees or extended duration. If target universities are provided in the role, check if the candidate's institution matches any of them.
work_experience: Score based on: relevance of roles to JD, company prestige, industry experience match, career progression, and employment gap severity. Partial credit for adjacent industries or transferable roles.
right_to_work: Full score if eligible with no sponsorship needed. Deduct proportionally for uncertainty or sponsorship requirements. Score 0 if clearly ineligible. Flag all cases requiring human verification.
red_flags: Starts at 100, deduct per flag found. Weight deductions by severity (high = -20, medium = -10, low = -5). Vague descriptions and inconsistencies each deduct 5 points.
composite_score: Weighted average of all 7 section scores. Weights must sum to 1.0.

IMPORTANT — Perspective:
All suggestions, recommendations, and improvement notes MUST be
written for the HR recruiter reviewing this candidate, NOT for
the candidate themselves. Frame every suggestion as an action
the recruiter should take or a risk they should be aware of.

Role-Specific Scoring:
- If a job description / role is provided, score all sections specifically against that role's requirements.
- If NO job description / role is provided, set job_description_match score to 0, keywords to empty arrays, and skill_match_percentage to 0 — do not guess or fabricate scores.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY");
    if (!CLAUDE_API_KEY) {
      throw new Error("CLAUDE_API_KEY is not configured");
    }

    const body = await req.json();
    const { cv_text, job_description } = body;

    console.log("Incoming request body keys:", Object.keys(body));
    console.log("job_description received:", job_description ? job_description.substring(0, 200) + "..." : "NONE");

    if (!cv_text || cv_text.length < 20) {
      return new Response(
        JSON.stringify({ error: "No resume text provided or text too short." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const startTime = Date.now();

    let originalUserMessage: string;
    if (job_description) {
      originalUserMessage = `Analyse this CV for the following role:\n\n${job_description}\n\n<cv_text>\n${cv_text}\n</cv_text>\n\nEvaluate all sections specifically against this role's requirements. Return ONLY valid JSON.`;
    } else {
      originalUserMessage = `Analyse this CV as a general professional evaluation (no specific role selected):\n\n<cv_text>\n${cv_text}\n</cv_text>\n\nSince no role is specified, set job_description_match score to 0 and keywords to empty arrays. Return ONLY valid JSON.`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 6000,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: originalUserMessage
        }]
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Claude API error:", response.status, errorBody);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();

    const inputTokens = data.usage.input_tokens;
    const outputTokens = data.usage.output_tokens;
    const costUSD = (inputTokens * 3 / 1000000) + (outputTokens * 15 / 1000000);
    const cost = costUSD * 0.79;

    let jsonStr = data.content[0].text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    let analysis;
    try {
      analysis = JSON.parse(jsonStr);
    } catch (e) {
      // If parsing fails, retry with a correction message
      const retryResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 6000,
          messages: [
            { role: 'user', content: originalUserMessage },
            { role: 'assistant', content: data.content[0].text },
            { role: 'user', content: 'Your previous response was not valid JSON. Return ONLY valid JSON with no markdown formatting, no backticks, no explanation.' }
          ]
        })
      });

      const retryData = await retryResponse.json();
      let retryStr = retryData.content[0].text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      analysis = JSON.parse(retryStr);
    }

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
    analysis.agent_metrics = {
      ...analysis.agent_metrics,
      processing_time_seconds: parseFloat(processingTime),
      cost_estimate_usd: parseFloat(cost.toFixed(4)),
    };

    analysis.token_usage = {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      actual_cost_usd: parseFloat(cost.toFixed(4))
    };

    // Save to candidates table
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      await supabaseClient.from('candidates').insert({
        candidate_name: analysis.candidate_name || 'Unknown',
        email: analysis.email || null,
        overall_score: analysis.overall_score?.composite_score ?? 0,
        recommendation: analysis.overall_score?.recommendation ?? 'maybe',
        analysis_json: analysis,
        cv_text: cv_text,
        job_description: job_description || null,
        status: 'pending',
      });
    } catch (dbErr) {
      console.error("Failed to save candidate:", dbErr);
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-cv:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred during analysis" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
