interface TemplateVars {
  candidate_name: string;
  recruiter_name: string;
  role_title?: string;
  improvement_suggestions?: string[];
  recommendation?: string;
}

interface EmailTemplate {
  subject: string;
  body: string;
}

export function getEmailTemplate(
  status: string,
  vars: TemplateVars
): EmailTemplate {
  const { candidate_name, recruiter_name, role_title, improvement_suggestions } = vars;
  const roleStr = role_title ? ` for the ${role_title} position` : "";
  const roleIntro = role_title ? ` for the ${role_title} role` : "";

  switch (status) {
    case "deny": {
      let feedbackSection = "";
      if (improvement_suggestions && improvement_suggestions.length > 0) {
        feedbackSection = `\n\nTo help you in future applications, we wanted to share some constructive feedback based on our review:\n${improvement_suggestions.map((s) => `  • ${s}`).join("\n")}\n\nWe hope this feedback is useful as you continue to develop your career.`;
      }

      return {
        subject: `Application Update${roleStr}`,
        body: `Dear ${candidate_name},

Thank you for your interest in our organisation${roleStr}. After careful consideration of your application, we regret to inform you that we will not be proceeding with your candidacy at this time.${feedbackSection}

We appreciate the time and effort you invested in the application process. We encourage you to apply for future openings that match your skills and experience.

We wish you the very best in your career.

Kind regards,
${recruiter_name}`,
      };
    }

    case "hire":
      return {
        subject: `Congratulations — Offer of Employment${roleStr}`,
        body: `Dear ${candidate_name},

We are delighted to inform you that, following a thorough evaluation of your application${roleStr}, we would like to extend an offer of employment.

Your skills, experience, and potential have truly impressed us, and we believe you will be an excellent addition to our team. A formal offer letter with full details will follow shortly.

In the meantime, please do not hesitate to reach out with any questions.

Congratulations once again — we look forward to working with you!

Kind regards,
${recruiter_name}`,
      };

    case "online_assessment":
      return {
        subject: `Next Steps — Online Assessment${roleStr}`,
        body: `Dear ${candidate_name},

Thank you for your application${roleIntro}. We are pleased to inform you that you have been shortlisted to progress to the next stage of our recruitment process — an online assessment.${role_title ? `\n\nThis assessment is specifically designed to evaluate your suitability for the ${role_title} position and will cover areas relevant to the role.` : ""}

You will receive a separate email with the assessment link and instructions shortly. Please complete the assessment within the timeframe specified.

If you have any questions, feel free to reach out.

Best regards,
${recruiter_name}`,
      };

    case "interview":
      return {
        subject: `Interview Invitation — ${role_title || "Open Position"}`,
        body: `Dear ${candidate_name},

We are pleased to invite you to an interview${roleIntro}. Your application has been reviewed and we would like to learn more about your experience and aspirations${role_title ? ` as they relate to the ${role_title} role` : ""}.${role_title ? `\n\nDuring the interview, we will discuss the ${role_title} position in greater detail and explore how your background aligns with the requirements of the role.` : ""}

Further details regarding the interview date, time, and format will be shared with you shortly.

Please confirm your availability at your earliest convenience.

Best regards,
${recruiter_name}`,
      };

    default:
      return {
        subject: `Application Update${roleStr}`,
        body: `Dear ${candidate_name},

This is to inform you of an update regarding your application${roleStr}. Please do not hesitate to reach out if you have any questions.

Best regards,
${recruiter_name}`,
      };
  }
}
