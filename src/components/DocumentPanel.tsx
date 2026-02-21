import { useState } from "react";
import { FileText, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import FileUploadZone from "./FileUploadZone";

const MOCK_RESUME_TEXT = `JOHN SMITH
Senior Software Engineer | San Francisco, CA
john.smith@email.com | (555) 123-4567 | linkedin.com/in/johnsmith

PROFESSIONAL SUMMARY
Results-driven software engineer with 7+ years of experience building scalable web applications and distributed systems. Passionate about clean architecture, developer experience, and mentoring junior engineers. Led cross-functional teams to deliver products serving 2M+ users.

EXPERIENCE

Senior Software Engineer — TechCorp Inc.
January 2021 – Present
• Architected and deployed a microservices platform handling 50K requests/second, reducing latency by 40%
• Led a team of 5 engineers in rebuilding the customer-facing dashboard using React and TypeScript
• Implemented CI/CD pipelines that reduced deployment time from 2 hours to 15 minutes
• Mentored 3 junior developers through structured code reviews and pair programming sessions

Software Engineer — StartupXYZ
March 2018 – December 2020
• Built a real-time notification system using WebSockets serving 500K concurrent users
• Designed and implemented RESTful APIs consumed by web and mobile clients
• Migrated legacy monolith to microservices architecture, improving system reliability to 99.9% uptime
• Collaborated with product and design teams to ship features on bi-weekly sprint cycles

Junior Software Engineer — DataFlow Systems
June 2016 – February 2018
• Developed data processing pipelines using Python and Apache Spark
• Created internal tools that automated reporting workflows, saving 20 hours/week
• Contributed to open-source projects and maintained technical documentation

EDUCATION

Bachelor of Science in Computer Science
University of California, Berkeley — Class of 2016
GPA: 3.7/4.0 | Dean's List (6 semesters)

TECHNICAL SKILLS
Languages: TypeScript, Python, Go, Java, SQL
Frameworks: React, Node.js, Next.js, FastAPI, Spring Boot
Infrastructure: AWS (EC2, Lambda, S3, RDS), Docker, Kubernetes, Terraform
Databases: PostgreSQL, MongoDB, Redis, Elasticsearch
Tools: Git, GitHub Actions, Jenkins, Datadog, Grafana

CERTIFICATIONS
• AWS Solutions Architect – Associate (2022)
• Google Cloud Professional Cloud Developer (2023)`;

interface DocumentPanelProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  jobDescription: string;
  onJobDescriptionChange: (val: string) => void;
  onAnalyze: (file: File) => void;
  isAnalyzing: boolean;
}

const DocumentPanel = ({ file, onFileChange, jobDescription, onJobDescriptionChange, onAnalyze, isAnalyzing }: DocumentPanelProps) => {
  const [jobModalOpen, setJobModalOpen] = useState(false);

  const wordCount = MOCK_RESUME_TEXT.split(/\s+/).length;

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-lg">
          <FileUploadZone file={null} onFileChange={onFileChange} />
        </div>

        <Dialog open={jobModalOpen} onOpenChange={setJobModalOpen}>
          <DialogTrigger asChild>
            <button className="mt-6 text-sm text-foreground hover:underline">Paste job description for role-specific screening</button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Job Description</DialogTitle></DialogHeader>
            <Textarea
              placeholder="Paste the job listing here so the analysis is tailored to this role…"
              value={jobDescription}
              onChange={(e) => onJobDescriptionChange(e.target.value)}
              rows={8}
              className="resize-none"
            />
            <Button onClick={() => setJobModalOpen(false)} className="w-full">Done</Button>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span className="font-medium text-foreground">{file.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => onAnalyze(file)}
            disabled={isAnalyzing}
            className="gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Analyzing…
              </>
            ) : (
              "Analyze Resume"
            )}
          </Button>
          <Dialog open={jobModalOpen} onOpenChange={setJobModalOpen}>
            <DialogTrigger asChild>
              <button className="text-xs text-foreground hover:underline">Job description</button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Job Description</DialogTitle></DialogHeader>
              <Textarea
                placeholder="Paste the job listing here so the analysis is tailored to this role…"
                value={jobDescription}
                onChange={(e) => onJobDescriptionChange(e.target.value)}
                rows={8}
                className="resize-none"
              />
              <Button onClick={() => setJobModalOpen(false)} className="w-full">Done</Button>
            </DialogContent>
          </Dialog>
          <button
            onClick={() => onFileChange(null)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" /> Replace
          </button>
        </div>
      </div>

      {/* Document Content */}
      <div className="flex-1 overflow-y-auto p-8 md:p-12">
        <div className="max-w-2xl mx-auto bg-card rounded-lg border border-border p-10 md:p-14">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 font-[system-ui] tracking-wide">
            {MOCK_RESUME_TEXT}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-2 border-t border-border flex items-center justify-end text-xs text-muted-foreground">
        {wordCount} words
      </div>
    </div>
  );
};

export default DocumentPanel;
