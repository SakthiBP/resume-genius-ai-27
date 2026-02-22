import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GMAIL_USER = Deno.env.get("GMAIL_USER")?.trim();
    const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD")?.trim();
    const RECRUITER_NAME = (Deno.env.get("RECRUITER_NAME") || "Recruitment Team").trim();

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      throw new Error("Gmail credentials not configured");
    }

    // Validate GMAIL_USER looks like an email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(GMAIL_USER)) {
      throw new Error(`GMAIL_USER secret is not a valid email address: "${GMAIL_USER}"`);
    }

    // Build from address — sanitise recruiter name to avoid SMTP issues
    const sanitisedName = RECRUITER_NAME.replace(/[<>"]/g, "").trim();
    const fromAddress = sanitisedName ? `${sanitisedName} <${GMAIL_USER}>` : GMAIL_USER;

    const body = await req.json();
    const {
      candidate_id,
      candidate_email,
      subject,
      email_body,
      status_attempted,
      previous_status,
      edited_before_send,
      edit_summary,
      action, // "send" | "cancel"
    } = body;

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Handle cancel action — revert status & log
    if (action === "cancel") {
      // Revert candidate status
      if (previous_status) {
        await supabaseClient
          .from("candidates")
          .update({ status: previous_status })
          .eq("id", candidate_id);
      }

      // Log cancellation
      await supabaseClient.from("recruitment_email_log").insert({
        candidate_id,
        candidate_email: candidate_email || "",
        recruiter_email: GMAIL_USER,
        recruiter_name: RECRUITER_NAME,
        status_attempted,
        previous_status,
        subject: subject || "",
        body: email_body || "",
        email_sent: false,
        error: "CANCELLED_AT_PREVIEW",
        preview_shown: true,
        edited_before_send: false,
        edit_summary: null,
      });

      return new Response(
        JSON.stringify({
          email_sent: false,
          status_attempted,
          candidate_email,
          error: "CANCELLED_AT_PREVIEW",
          action_required:
            "Recruiter closed the preview panel without sending. Candidate status has been reverted. No email was sent.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email via Gmail SMTP
    if (!candidate_email) {
      throw new Error("Candidate email is required");
    }

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: GMAIL_USER,
          password: GMAIL_APP_PASSWORD,
        },
      },
    });

    // Convert plain text to HTML for proper email rendering
    const htmlBody = email_body
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>\n");

    await client.send({
      from: fromAddress,
      to: candidate_email,
      subject: subject,
      content: email_body,
      html: `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #222; line-height: 1.6;">${htmlBody}</div>`,
    });

    await client.close();

    // Log successful send
    await supabaseClient.from("recruitment_email_log").insert({
      candidate_id,
      candidate_email,
      recruiter_email: GMAIL_USER,
      recruiter_name: RECRUITER_NAME,
      status_attempted,
      previous_status,
      subject,
      body: email_body,
      email_sent: true,
      error: null,
      preview_shown: true,
      edited_before_send: edited_before_send || false,
      edit_summary: edit_summary || null,
    });

    return new Response(
      JSON.stringify({
        email_sent: true,
        status_attempted,
        candidate_email,
        preview_shown: true,
        edited_before_send: edited_before_send || false,
        edit_summary: edit_summary || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-email:", error);
    return new Response(
      JSON.stringify({
        email_sent: false,
        error: error.message || "Failed to send email",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
