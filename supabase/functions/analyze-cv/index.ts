import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert HR analyst and recruitment AI agent.
You analyse CVs/resumes and return structured evaluations
in JSON format. Return ONLY valid JSON - no markdown, no
explanation, no preamble.

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
  "usefulness_score": {
    "score": 0-100,
    "relevance_to_role": 0-100,
    "notes": "string"
  },
  "skills_extraction": {
    "technical_skills": ["skill1", "skill2"],
    "soft_skills": ["skill1", "skill2"],
    "certifications": ["cert1"],
    "skill_match_percentage": 0-100 or null
  },
  "experience_quality": {
    "score": 0-100,
    "total_years": number,
    "progression": "strong_upward|steady|lateral|unclear",
    "highlights": ["string"],
    "notes": "string"
  },
  "red_flags": {
    "employment_gaps": [
      {"period": "str", "duration_months": num,
       "severity": "low|medium|high"}
    ],
    "inconsistencies": ["string"],
    "vague_descriptions": ["string"],
    "red_flag_count": number
  },
  "overall_score": {
    "composite_score": 0-100,
    "recommendation": "strong_yes|yes|maybe|no|strong_no",
    "improvement_suggestions": ["string"]
  },
  "agent_metrics": {
    "estimated_manual_review_minutes": number,
    "cost_estimate_usd": number
  }
}

IMPORTANT — Perspective:
All suggestions, recommendations, and improvement notes MUST be
written for the HR recruiter reviewing this candidate, NOT for
the candidate themselves. Frame every suggestion as an action
the recruiter should take or a risk they should be aware of.
Examples:
- Instead of "You should quantify your achievements" →
  "Probe the candidate on specific metrics and measurable outcomes during interview"
- Instead of "Consider adding more technical skills" →
  "Candidate may lack depth in technical skills — verify through a technical assessment"
- Instead of "Improve your CV formatting" →
  "CV formatting is below standard which may indicate lack of attention to detail"

Role-Specific Scoring:
- If a job description / role is provided, score "relevance_to_role" and
  "skill_match_percentage" specifically against that role's requirements,
  required skills list, and job description. These must reflect how well
  the candidate matches THAT specific role.
- If NO job description / role is provided, set "relevance_to_role" to 0
  and "skill_match_percentage" to null — do not guess or fabricate scores.

Scoring: 50=average, 70=good, 85+=exceptional.
Deduct for vagueness and unquantified claims.
Reward specific metrics and clear impact statements.`;

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
      originalUserMessage = `Analyse this CV for the following role:\n\n${job_description}\n\n<cv_text>\n${cv_text}\n</cv_text>\n\nEvaluate relevance_to_role and skill_match_percentage specifically against this role's requirements. Return ONLY valid JSON.`;
    } else {
      originalUserMessage = `Analyse this CV as a general professional evaluation (no specific role selected):\n\n<cv_text>\n${cv_text}\n</cv_text>\n\nSince no role is specified, set relevance_to_role to 0 and skill_match_percentage to null. Return ONLY valid JSON.`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('CLAUDE_API_KEY'),
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
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
    const cost = (inputTokens * 3 / 1000000) + (outputTokens * 15 / 1000000);

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
          'x-api-key': Deno.env.get('CLAUDE_API_KEY'),
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
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
