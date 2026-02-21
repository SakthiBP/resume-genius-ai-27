import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, GraduationCap } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface TargetUniversity {
  name: string;
  required_gpa: number;
}

interface Role {
  id: string;
  job_title: string;
  description: string;
  target_universities: TargetUniversity[];
  required_skills: string[];
  created_at: string;
  updated_at: string;
}

const emptyRole = {
  job_title: "",
  description: "",
  target_universities: [] as TargetUniversity[],
  required_skills: [] as string[],
};

const Roles = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form, setForm] = useState(emptyRole);
  const [skillInput, setSkillInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchRoles = async () => {
    const { data, error } = await supabase
      .from("roles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ variant: "destructive", title: "Failed to load roles", description: error.message });
    } else {
      setRoles(
        (data || []).map((r: any) => ({
          ...r,
          target_universities: Array.isArray(r.target_universities) ? r.target_universities : [],
          required_skills: Array.isArray(r.required_skills) ? r.required_skills : [],
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const openEditor = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setForm({
        job_title: role.job_title,
        description: role.description,
        target_universities: [...role.target_universities],
        required_skills: [...role.required_skills],
      });
    } else {
      setEditingRole(null);
      setForm({ ...emptyRole, target_universities: [], required_skills: [] });
    }
    setSkillInput("");
    setEditorOpen(true);
  };

  const addUniversity = () => {
    setForm((f) => ({
      ...f,
      target_universities: [...f.target_universities, { name: "", required_gpa: 3.0 }],
    }));
  };

  const updateUniversity = (idx: number, field: keyof TargetUniversity, value: string | number) => {
    setForm((f) => {
      const unis = [...f.target_universities];
      unis[idx] = { ...unis[idx], [field]: value };
      return { ...f, target_universities: unis };
    });
  };

  const removeUniversity = (idx: number) => {
    setForm((f) => ({
      ...f,
      target_universities: f.target_universities.filter((_, i) => i !== idx),
    }));
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && skillInput.trim()) {
      e.preventDefault();
      const skill = skillInput.trim();
      if (!form.required_skills.includes(skill)) {
        setForm((f) => ({ ...f, required_skills: [...f.required_skills, skill] }));
      }
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setForm((f) => ({ ...f, required_skills: f.required_skills.filter((s) => s !== skill) }));
  };

  const validateGpa = (val: number): boolean => {
    if (val < 0 || val > 4) return false;
    const str = String(val);
    const parts = str.split(".");
    if (parts.length === 2 && parts[1].length > 1) return false;
    return true;
  };

  const saveRole = async () => {
    if (!form.job_title.trim()) {
      toast({ variant: "destructive", title: "Job title is required" });
      return;
    }

    for (const uni of form.target_universities) {
      if (!uni.name.trim()) {
        toast({ variant: "destructive", title: "University name cannot be empty" });
        return;
      }
      if (!validateGpa(uni.required_gpa)) {
        toast({
          variant: "destructive",
          title: "Invalid GPA",
          description: `GPA for "${uni.name}" must be between 0.0 and 4.0 with at most 1 decimal place.`,
        });
        return;
      }
    }

    setSaving(true);
    const payload = {
      job_title: form.job_title.trim(),
      description: form.description.trim(),
      target_universities: form.target_universities as unknown as import("@/integrations/supabase/types").Json,
      required_skills: form.required_skills as unknown as import("@/integrations/supabase/types").Json,
    };

    let error;
    if (editingRole) {
      ({ error } = await supabase.from("roles").update(payload).eq("id", editingRole.id));
    } else {
      ({ error } = await supabase.from("roles").insert([payload]));
    }

    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Failed to save role", description: error.message });
    } else {
      toast({ title: editingRole ? "Role updated" : "Role created" });
      setEditorOpen(false);
      fetchRoles();
    }
  };

  const deleteRole = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("roles").delete().eq("id", deleteId);
    if (error) {
      toast({ variant: "destructive", title: "Failed to delete role", description: error.message });
    } else {
      toast({ title: "Role deleted" });
      fetchRoles();
    }
    setDeleteId(null);
  };

  return (
    <div className="h-screen flex flex-col bg-background transition-colors duration-300">
      <Navbar score={null} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground uppercase">Job Roles</h1>
              <Badge variant="secondary" className="text-xs">
                {roles.length}
              </Badge>
            </div>
            <Button onClick={() => openEditor()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Role
            </Button>
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground">Loading roles…</div>
          ) : roles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No roles yet. Click "Add Role" to create your first job role.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {roles.map((role) => (
                <Card
                  key={role.id}
                  className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors duration-200"
                  onClick={() => openEditor(role)}
                >
                  <CardContent className="py-4 px-5 flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="font-semibold text-foreground">{role.job_title}</div>
                      <div className="text-sm text-muted-foreground truncate mt-0.5">
                        {role.description ? role.description.split("\n")[0] : "No description"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="outline" className="text-xs gap-1">
                        {role.required_skills.length} skills
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditor(role);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(role.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Role Editor Modal */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "Add Role"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Job Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Job Title</label>
              <Input
                placeholder="e.g. Senior Backend Engineer"
                value={form.job_title}
                onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">General Job Description</label>
              <Textarea
                placeholder="Full role description, responsibilities, requirements…"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={6}
                className="resize-none"
              />
            </div>

            {/* Target Universities */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4" />
                Target Universities
              </label>
              {form.target_universities.map((uni, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="University name"
                    value={uni.name}
                    onChange={(e) => updateUniversity(idx, "name", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="4"
                    placeholder="GPA"
                    value={uni.required_gpa}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) updateUniversity(idx, "required_gpa", val);
                    }}
                    className="w-24"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => removeUniversity(idx)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addUniversity} className="gap-1.5 text-xs">
                <Plus className="h-3 w-3" />
                Add University
              </Button>
            </div>

            {/* Required Skills */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Required Skills</label>
              <Input
                placeholder="Type a skill and press Enter"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleSkillKeyDown}
              />
              {form.required_skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {form.required_skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="gap-1 pr-1">
                      {skill}
                      <button
                        onClick={() => removeSkill(skill)}
                        className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveRole} disabled={saving}>
              {saving ? "Saving…" : "Save Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this role? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteRole}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Roles;
