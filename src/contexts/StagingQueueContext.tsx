import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface StagedFile {
  id: string;
  fileName: string;
  fileSize: number;
  uploadDate: string;
  status: "uploading" | "pending" | "analysing" | "done" | "failed";
  progress: number; // 0-100 upload progress
  file: File | null; // actual File object for extraction
  extractedText?: string;
}

interface StagingQueueContextValue {
  files: StagedFile[];
  addFiles: (newFiles: File[]) => void;
  removeFiles: (ids: string[]) => void;
  updateFile: (id: string, patch: Partial<StagedFile>) => void;
  getPendingFiles: () => StagedFile[];
}

const StagingQueueContext = createContext<StagingQueueContextValue | null>(null);

let nextId = 1;

export function StagingQueueProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<StagedFile[]>([]);

  const addFiles = useCallback((newFiles: File[]) => {
    const staged: StagedFile[] = newFiles.map((f) => ({
      id: `staged-${nextId++}`,
      fileName: f.name,
      fileSize: f.size,
      uploadDate: new Date().toISOString(),
      status: "uploading" as const,
      progress: 0,
      file: f,
    }));

    setFiles((prev) => [...staged, ...prev]);

    // Simulate upload progress for each file
    staged.forEach((sf) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 25 + 10;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setFiles((prev) =>
            prev.map((f) => (f.id === sf.id ? { ...f, progress: 100, status: "pending" } : f))
          );
        } else {
          setFiles((prev) =>
            prev.map((f) => (f.id === sf.id ? { ...f, progress: Math.min(progress, 99) } : f))
          );
        }
      }, 300 + Math.random() * 400);
    });
  }, []);

  const removeFiles = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setFiles((prev) => prev.filter((f) => !idSet.has(f.id)));
  }, []);

  const updateFile = useCallback((id: string, patch: Partial<StagedFile>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const getPendingFiles = useCallback(() => {
    return files.filter((f) => f.status === "pending");
  }, [files]);

  return (
    <StagingQueueContext.Provider value={{ files, addFiles, removeFiles, updateFile, getPendingFiles }}>
      {children}
    </StagingQueueContext.Provider>
  );
}

export function useStagingQueue() {
  const ctx = useContext(StagingQueueContext);
  if (!ctx) throw new Error("useStagingQueue must be used within StagingQueueProvider");
  return ctx;
}
