import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getDocument } from "https://esm.sh/pdfjs-serverless@0.6.0";
import mammoth from "npm:mammoth@1.8.0";
import { Buffer } from "node:buffer";

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

function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n /g, "\n")
    .replace(/ \n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractTextFromPdf(data: Uint8Array): Promise<string> {
  const doc = await getDocument(data).promise;
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    parts.push(content.items.map((item: any) => item.str).join(" "));
  }
  return cleanText(parts.join("\n"));
}

async function extractTextFromDocx(data: Uint8Array): Promise<string> {
  const buffer = Buffer.from(data);
  const result = await mammoth.extractRawText({ buffer });
  return cleanText(result.value);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY");
    if (!CLAUDE_API_KEY) {
      throw new Error("CLAUDE_API_KEY is not configured");
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const jobDescription = (formData.get("jobDescription") as string) || "";

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const fileName = file.name.toLowerCase();

    let extractedText = "";
    if (fileName.endsWith(".pdf")) {
      extractedText = await extractTextFromPdf(data);
    } else if (fileName.endsWith(".docx")) {
      extractedText = await extractTextFromDocx(data);
    } else {
      return new Response(
        JSON.stringify({ error: "Unsupported file type. Please upload PDF or DOCX." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!extractedText || extractedText.length < 20) {
      return new Response(
        JSON.stringify({ error: "Could not extract meaningful text from the file. Please ensure the PDF contains selectable text (not scanned images)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userMessage = `Analyze this CV/Resume:\n\n${extractedText}`;
    if (jobDescription.trim()) {
      userMessage = `Evaluate this CV against this role: ${jobDescription.trim()}\n\nCV/Resume:\n\n${extractedText}`;
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

    // Strip markdown backticks if present
    analysisText = analysisText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    const analysis = JSON.parse(analysisText);

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
    analysis.agent_metrics = {
      ...analysis.agent_metrics,
      processing_time_seconds: parseFloat(processingTime),
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
