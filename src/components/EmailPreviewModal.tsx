import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Mail, RotateCcw, Send, X } from "lucide-react";
import { Loader2 } from "lucide-react";

interface EmailPreviewModalProps {
  open: boolean;
  candidateEmail: string;
  recruiterName: string;
  recruiterEmail: string;
  templateSubject: string;
  templateBody: string;
  onSend: (subject: string, body: string, editedBeforeSend: boolean, editSummary: string | null) => Promise<void>;
  onCancel: () => void;
}

const EmailPreviewModal = ({
  open,
  candidateEmail,
  recruiterName,
  recruiterEmail,
  templateSubject,
  templateBody,
  onSend,
  onCancel,
}: EmailPreviewModalProps) => {
  const [subject, setSubject] = useState(templateSubject);
  const [body, setBody] = useState(templateBody);
  const [sending, setSending] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync state when template changes (new modal open)
  useEffect(() => {
    setSubject(templateSubject);
    setBody(templateBody);
    setShowResetConfirm(false);
    setSending(false);
  }, [templateSubject, templateBody]);

  // Track edits
  const subjectEdited = subject !== templateSubject;
  const bodyEdited = body !== templateBody;

  const getEditSummary = (): string | null => {
    if (subjectEdited && bodyEdited) return "both_edited";
    if (subjectEdited) return "subject_edited";
    if (bodyEdited) return "body_edited";
    return null;
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const edited = subjectEdited || bodyEdited;
      await onSend(subject, body, edited, getEditSummary());
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    setSubject(templateSubject);
    setBody(templateBody);
    setShowResetConfirm(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Review Email Before Sending
          </DialogTitle>
          <DialogDescription>
            Preview and optionally edit the email before it is dispatched.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* To / From — read-only */}
          <div className="grid grid-cols-[60px_1fr] gap-2 text-sm">
            <span className="text-muted-foreground font-medium">To:</span>
            <span className="text-foreground">{candidateEmail}</span>
            <span className="text-muted-foreground font-medium">From:</span>
            <span className="text-foreground">
              {recruiterName} &lt;{recruiterEmail}&gt;
            </span>
          </div>

          {/* Subject — editable */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">
              Subject
            </label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Body — editable */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">
              Email Body
            </label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[250px] text-sm font-mono leading-relaxed"
            />
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 border border-border">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
            <span>
              Edits made here apply to this send only. They will not affect the
              default template.
            </span>
          </div>

          {/* Reset confirmation */}
          {showResetConfirm && (
            <div className="flex items-center gap-2 p-3 bg-muted border border-border text-sm">
              <span>Reset all changes?</span>
              <Button size="sm" variant="destructive" onClick={handleReset}>
                Yes, reset
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowResetConfirm(false)}
              >
                Keep editing
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={sending}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancel &amp; revert status
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                subjectEdited || bodyEdited
                  ? setShowResetConfirm(true)
                  : null
              }
              disabled={sending || (!subjectEdited && !bodyEdited)}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to template
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || !subject.trim() || !body.trim()}
              className="gap-2 ml-auto bg-green-600 hover:bg-green-700 text-white"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {sending ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailPreviewModal;
