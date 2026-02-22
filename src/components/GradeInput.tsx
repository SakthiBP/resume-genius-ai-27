import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export type GradingSystem =
  | "us_gpa"
  | "uk_classification"
  | "percentage"
  | "ects"
  | "german"
  | "indian_cgpa"
  | "australian";

export interface GradeValue {
  system: GradingSystem;
  value: string;
}

const GRADING_SYSTEMS: { value: GradingSystem; label: string }[] = [
  { value: "us_gpa", label: "US GPA (0.0 – 4.0)" },
  { value: "uk_classification", label: "UK Classification" },
  { value: "percentage", label: "Percentage (0 – 100%)" },
  { value: "ects", label: "European ECTS (A – F)" },
  { value: "german", label: "German Scale (1.0 – 5.0)" },
  { value: "indian_cgpa", label: "Indian CGPA (0.0 – 10.0)" },
  { value: "australian", label: "Australian (HD / D / C / P / F)" },
];

const UK_OPTIONS = [
  { value: "first", label: "First Class" },
  { value: "2:1", label: "Upper Second (2:1)" },
  { value: "2:2", label: "Lower Second (2:2)" },
  { value: "third", label: "Third Class" },
  { value: "pass", label: "Pass" },
];

const ECTS_OPTIONS = [
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "D", label: "D" },
  { value: "E", label: "E" },
  { value: "F", label: "F" },
];

const AU_OPTIONS = [
  { value: "HD", label: "HD (High Distinction)" },
  { value: "D", label: "D (Distinction)" },
  { value: "C", label: "C (Credit)" },
  { value: "P", label: "P (Pass)" },
  { value: "F", label: "F (Fail)" },
];

function getDefaultValue(system: GradingSystem): string {
  switch (system) {
    case "us_gpa": return "3.0";
    case "uk_classification": return "2:1";
    case "percentage": return "60";
    case "ects": return "B";
    case "german": return "2.0";
    case "indian_cgpa": return "7.0";
    case "australian": return "C";
  }
}

interface GradeInputProps {
  grade: GradeValue;
  onChange: (grade: GradeValue) => void;
}

export function getGradeDisplayLabel(grade: GradeValue): string {
  const sys = GRADING_SYSTEMS.find((s) => s.value === grade.system);
  const sysLabel = sys?.label ?? grade.system;

  switch (grade.system) {
    case "uk_classification":
      return UK_OPTIONS.find((o) => o.value === grade.value)?.label ?? grade.value;
    case "ects":
      return `ECTS ${grade.value}`;
    case "australian":
      return AU_OPTIONS.find((o) => o.value === grade.value)?.label ?? grade.value;
    case "us_gpa":
      return `${grade.value} GPA`;
    case "percentage":
      return `${grade.value}%`;
    case "german":
      return `${grade.value} (German)`;
    case "indian_cgpa":
      return `${grade.value} CGPA`;
    default:
      return grade.value;
  }
}

const GradeInput = ({ grade, onChange }: GradeInputProps) => {
  const handleSystemChange = (system: GradingSystem) => {
    onChange({ system, value: getDefaultValue(system) });
  };

  const renderValueInput = () => {
    switch (grade.system) {
      case "uk_classification":
        return (
          <Select value={grade.value} onValueChange={(v) => onChange({ ...grade, value: v })}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UK_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "ects":
        return (
          <Select value={grade.value} onValueChange={(v) => onChange({ ...grade, value: v })}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ECTS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "australian":
        return (
          <Select value={grade.value} onValueChange={(v) => onChange({ ...grade, value: v })}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AU_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "us_gpa":
        return (
          <Input
            type="number" step="0.1" min="0" max="4" placeholder="GPA"
            value={grade.value}
            onChange={(e) => onChange({ ...grade, value: e.target.value })}
            className="w-20"
          />
        );
      case "percentage":
        return (
          <Input
            type="number" step="1" min="0" max="100" placeholder="%"
            value={grade.value}
            onChange={(e) => onChange({ ...grade, value: e.target.value })}
            className="w-20"
          />
        );
      case "german":
        return (
          <Input
            type="number" step="0.1" min="1" max="5" placeholder="Grade"
            value={grade.value}
            onChange={(e) => onChange({ ...grade, value: e.target.value })}
            className="w-20"
          />
        );
      case "indian_cgpa":
        return (
          <Input
            type="number" step="0.1" min="0" max="10" placeholder="CGPA"
            value={grade.value}
            onChange={(e) => onChange({ ...grade, value: e.target.value })}
            className="w-20"
          />
        );
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={grade.system} onValueChange={(v) => handleSystemChange(v as GradingSystem)}>
        <SelectTrigger className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {GRADING_SYSTEMS.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {renderValueInput()}
    </div>
  );
};

export { GradeInput, getDefaultValue, GRADING_SYSTEMS };
