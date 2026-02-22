interface TemplateVars {
  candidate_name: string;
  recruiter_name: string;
  role_title?: string;
  improvement_suggestions?: string[];
  recommendation?: string;
}

interface OutreachVars {
  display_name: string;
  recruiter_name: string;
  company_name: string;
  recruiter_email: string;
  role_title: string;
  top_languages: string[];
  standout_signal: string;
  location_city?: string;
}

interface EmailTemplate {
  subject: string;
  body: string;
}

// duplicate removed

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
        subject: `Congratulations - Offer of Employment${roleStr}`,
        body: `Dear ${candidate_name},

We are delighted to inform you that, following a thorough evaluation of your application${roleStr}, we would like to extend an offer of employment.

Your skills, experience, and potential have truly impressed us, and we believe you will be an excellent addition to our team. A formal offer letter with full details will follow shortly.

In the meantime, please do not hesitate to reach out with any questions.

Congratulations once again - we look forward to working with you!

Kind regards,
${recruiter_name}`,
      };

    case "online_assessment":
      return {
        subject: `Next Steps - Online Assessment${roleStr}`,
        body: `Dear ${candidate_name},

Thank you for your application${roleIntro}. We are pleased to inform you that you have been shortlisted to progress to the next stage of our recruitment process - an online assessment.${role_title ? `\n\nThis assessment is specifically designed to evaluate your suitability for the ${role_title} position and will cover areas relevant to the role.` : ""}

You will receive a separate email with the assessment link and instructions shortly. Please complete the assessment within the timeframe specified.

If you have any questions, feel free to reach out.

Best regards,
${recruiter_name}`,
      };

    case "interview":
      return {
        subject: `Interview Invitation - ${role_title || "Open Position"}`,
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

export function getOutreachEmailTemplate(vars: OutreachVars): EmailTemplate {
  const {
    display_name,
    recruiter_name,
    company_name,
    recruiter_email,
    role_title,
    top_languages,
    standout_signal,
    location_city,
  } = vars;

  const locationStr = location_city ? ` based in ${location_city}` : "";
  const langStr = top_languages.slice(0, 3).join(", ");

  return {
    subject: `Opportunity at ${company_name} - ${role_title}`,
    body: `Dear ${display_name},

I hope this message finds you well. My name is ${recruiter_name} and I am part of the recruitment team at ${company_name}.

I came across your GitHub profile while searching for engineers with experience in ${langStr}, and I was genuinely impressed by ${standout_signal}.

We are currently looking for a ${role_title} to join our team${locationStr} and I believe your background could be a strong fit for what we are building.

I would love to share more details about the role and learn more about what you are working on at the moment. Would you be open to a brief conversation at your convenience?

There is absolutely no pressure - I simply wanted to reach out personally given how relevant your work appeared to be.

Please feel free to reply to this email or reach me directly at ${recruiter_email} if you have any questions.

Yours sincerely,
${recruiter_name}
Recruitment Team
${company_name}
${recruiter_email}`,
  };
}
