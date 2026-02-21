import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert HR analyst and recruitment AI agent.
You analyze CVs/resumes and return structured evaluations
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

    const { cv_text, job_description } = await req.json();

    if (!cv_text || cv_text.length < 20) {
      return new Response(
        JSON.stringify({ error: "No resume text provided or text too short." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userMessage = `Analyze this CV/Resume:\n\n${cv_text}`;
    if (job_description) {
      userMessage = `Evaluate this CV against this role: ${job_description}\n\nCV/Resume:\n\n${cv_text}`;
    }

    const startTime = Date.now();

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!claudeResponse.ok) {
      const errorBody = await claudeResponse.text();
      console.error("Claude API error:", claudeResponse.status, errorBody);
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const claudeData = await claudeResponse.json();
    let analysisText = claudeData.content?.[0]?.text || "";

    // Calculate actual cost from Anthropic token usage
    const inputTokens = claudeData.usage?.input_tokens ?? 0;
    const outputTokens = claudeData.usage?.output_tokens ?? 0;
    const costUsd = (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15;

    // Strip markdown backticks if present
    analysisText = analysisText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    const analysis = JSON.parse(analysisText);

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
    analysis.agent_metrics = {
      ...analysis.agent_metrics,
      processing_time_seconds: parseFloat(processingTime),
      cost_estimate_usd: parseFloat(costUsd.toFixed(4)),
    };

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
