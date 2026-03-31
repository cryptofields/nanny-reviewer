"use client";

import { useCallback, useState } from "react";
import { X, Loader2, Sparkles, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { AGENCIES } from "@/components/AgencyPicker";
import ReferencesInput from "@/components/ReferencesInput";

type UploadedFile = {
  file: File;
  synopsis: string;
  agency: string;
  referencesText: string;
  referencesFiles: File[];
};

type FileStatus = "pending" | "uploading" | "extracting" | "analysing" | "done" | "error";

type UploadResult = {
  fileName: string;
  candidateId?: string;
  success?: boolean;
  error?: string;
};

const STATUS_MESSAGES: Record<FileStatus, string> = {
  pending: "Waiting...",
  uploading: "Uploading to storage...",
  extracting: "🤖 AI reading CV text...",
  analysing: "🧠 AI scoring & reviewing...",
  done: "Done!",
  error: "Failed",
};

export default function FileUpload({
  onUploadComplete,
}: {
  onUploadComplete: () => void;
}) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [fileStatuses, setFileStatuses] = useState<Record<number, { status: FileStatus; message?: string }>>({});
  const [error, setError] = useState<string | null>(null);

  const setFileStatus = (index: number, status: FileStatus, message?: string) => {
    setFileStatuses((prev) => ({ ...prev, [index]: { status, message } }));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      return ext === "pdf" || ext === "docx" || ext === "doc";
    });
    setFiles((prev) => [
      ...prev,
      ...dropped.map((file) => ({ file, synopsis: "", agency: "", referencesText: "", referencesFiles: [] })),
    ]);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selected = Array.from(e.target.files);
        setFiles((prev) => [
          ...prev,
          ...selected.map((file) => ({ file, synopsis: "", agency: "", referencesText: "", referencesFiles: [] })),
        ]);
      }
    },
    []
  );

  const updateSynopsis = (index: number, synopsis: string) => {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, synopsis } : f)));
  };
  const updateAgency = (index: number, agency: string) => {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, agency } : f)));
  };
  const updateReferencesText = (index: number, referencesText: string) => {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, referencesText } : f)));
  };
  const updateReferencesFiles = (index: number, referencesFiles: File[]) => {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, referencesFiles } : f)));
  };
  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Process one file at a time for clear progress feedback
  const processOneFile = async (f: UploadedFile, index: number): Promise<UploadResult | null> => {
    try {
      // Phase 1: Upload + extract
      setFileStatus(index, "extracting");

      const formData = new FormData();
      formData.append("files", f.file);

      const synopsesMap: Record<string, string> = {};
      const agenciesMap: Record<string, string> = {};
      const referencesTextMap: Record<string, string> = {};
      const referencesFileMap: Record<string, string> = {};

      if (f.synopsis.trim()) synopsesMap[f.file.name] = f.synopsis;
      if (f.agency.trim()) agenciesMap[f.file.name] = f.agency;
      if (f.referencesText.trim()) referencesTextMap[f.file.name] = f.referencesText;
      if (f.referencesFiles.length > 0) {
        f.referencesFiles.forEach((refFile, idx) => {
          const refKey = `ref_${f.file.name}_${idx}`;
          formData.append(refKey, refFile);
          if (!referencesFileMap[f.file.name]) referencesFileMap[f.file.name] = "";
          referencesFileMap[f.file.name] = [referencesFileMap[f.file.name], refKey].filter(Boolean).join(",");
        });
      }

      if (Object.keys(synopsesMap).length > 0) formData.append("synopses", JSON.stringify(synopsesMap));
      if (Object.keys(agenciesMap).length > 0) formData.append("agencies", JSON.stringify(agenciesMap));
      if (Object.keys(referencesTextMap).length > 0) formData.append("referencesText", JSON.stringify(referencesTextMap));
      if (Object.keys(referencesFileMap).length > 0) formData.append("referencesFileMap", JSON.stringify(referencesFileMap));

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.results) {
        setFileStatus(index, "error", uploadData.error || "Upload failed");
        return null;
      }

      const result = uploadData.results[0];
      if (!result?.success || !result?.candidateId) {
        setFileStatus(index, "error", result?.error || "Upload failed");
        return result;
      }

      // Phase 2: Analyse
      setFileStatus(index, "analysing");

      const analyseRes = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: result.candidateId }),
      });

      if (!analyseRes.ok) {
        const err = await analyseRes.json();
        setFileStatus(index, "error", err.error || "Analysis failed");
      } else {
        setFileStatus(index, "done");
      }

      return result;
    } catch (err) {
      setFileStatus(index, "error", err instanceof Error ? err.message : "Unknown error");
      return null;
    }
  };

  const handleUploadAndAnalyse = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setError(null);
    setFileStatuses({});

    // Mark all as pending
    files.forEach((_, i) => setFileStatus(i, "pending"));

    const results: (UploadResult | null)[] = [];

    // Process files one by one for clear progress
    for (let i = 0; i < files.length; i++) {
      const result = await processOneFile(files[i], i);
      results.push(result);
    }

    const errors = Object.entries(fileStatuses).filter(([, s]) => s.status === "error");
    if (errors.length > 0) {
      setError(`${errors.length} file(s) had issues. Check the status icons above.`);
    }

    setProcessing(false);

    // If at least one succeeded, refresh the list
    if (results.some((r) => r?.success)) {
      setTimeout(() => {
        setFiles([]);
        setFileStatuses({});
        onUploadComplete();
      }, 1500); // Brief pause so user sees the "done" states
    }
  };

  const currentlyProcessing = Object.entries(fileStatuses).find(
    ([, s]) => s.status === "extracting" || s.status === "analysing" || s.status === "uploading"
  );

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer",
          dragOver
            ? "border-purple-400 bg-purple-50 scale-[1.02]"
            : "border-gray-200 hover:border-purple-300 hover:bg-purple-50/50"
        )}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <div className="text-4xl mb-3">📂</div>
        <p className="text-sm font-semibold text-gray-700">Drop CVs here or tap to browse</p>
        <p className="text-xs text-gray-400 mt-1">PDF, DOCX, DOC — go wild! 🎉</p>
        <input id="file-input" type="file" multiple accept=".pdf,.docx,.doc" onChange={handleFileInput} className="hidden" />
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((f, i) => {
            const status = fileStatuses[i];
            const isActive = status && !["pending", "done", "error"].includes(status.status);
            const isDone = status?.status === "done";
            const isError = status?.status === "error";

            return (
              <div
                key={i}
                className={cn(
                  "bg-white rounded-xl border p-4 space-y-2 shadow-sm transition-all",
                  isDone && "border-green-200 bg-green-50/30",
                  isError && "border-red-200 bg-red-50/30",
                  isActive && "border-purple-200 bg-purple-50/20",
                  !status && "border-gray-100"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {isDone ? (
                      <Check className="h-5 w-5 text-green-500 shrink-0" />
                    ) : isError ? (
                      <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                    ) : isActive ? (
                      <Loader2 className="h-5 w-5 text-purple-500 animate-spin shrink-0" />
                    ) : (
                      <span className="text-lg">📎</span>
                    )}
                    <span className="text-sm font-medium truncate text-gray-800">{f.file.name}</span>
                  </div>
                  {!processing && (
                    <button onClick={() => removeFile(i)} className="p-1 hover:bg-red-50 rounded-full transition-colors">
                      <X className="h-4 w-4 text-gray-300 hover:text-red-400" />
                    </button>
                  )}
                </div>

                {/* Status message during processing */}
                {status && (
                  <p className={cn(
                    "text-xs font-medium",
                    isDone && "text-green-600",
                    isError && "text-red-500",
                    isActive && "text-purple-500",
                    status.status === "pending" && "text-gray-400"
                  )}>
                    {status.message || STATUS_MESSAGES[status.status]}
                  </p>
                )}

                {/* Only show inputs when not processing */}
                {!processing && (
                  <>
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs text-gray-400 self-center">🏢 Agency:</span>
                      {AGENCIES.map((a) => (
                        <button
                          key={a.value}
                          type="button"
                          onClick={() => updateAgency(i, f.agency === a.value ? "" : a.value)}
                          className={cn(
                            "px-3 py-1 rounded-xl text-xs font-semibold border transition-all",
                            f.agency === a.value
                              ? `${a.color} scale-105 shadow-sm`
                              : "bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200"
                          )}
                        >
                          {a.emoji} {a.value}
                        </button>
                      ))}
                    </div>
                    <textarea
                      placeholder="✍️ Paste agency synopsis here (optional)"
                      value={f.synopsis}
                      onChange={(e) => updateSynopsis(i, e.target.value)}
                      className="w-full text-sm border border-gray-100 rounded-xl p-3 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent bg-gray-50/50 placeholder:text-gray-300"
                    />
                    <ReferencesInput
                      onTextChange={(t) => updateReferencesText(i, t)}
                      onFilesChange={(files) => updateReferencesFiles(i, files)}
                      textValue={f.referencesText}
                      filesValue={f.referencesFiles}
                    />
                  </>
                )}
              </div>
            );
          })}

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl p-3 font-medium">
              🚨 {error}
            </div>
          )}

          {/* Overall progress bar during processing */}
          {processing && (
            <div className="bg-purple-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-purple-600">
                <span>
                  {currentlyProcessing
                    ? `Processing ${files[Number(currentlyProcessing[0])]?.file.name || ""}...`
                    : "Finishing up..."
                  }
                </span>
                <span>
                  {Object.values(fileStatuses).filter((s) => s.status === "done").length}/{files.length}
                </span>
              </div>
              <div className="w-full bg-purple-100 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${(Object.values(fileStatuses).filter((s) => s.status === "done" || s.status === "error").length / files.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleUploadAndAnalyse}
            disabled={processing}
            className={cn(
              "w-full py-3.5 rounded-xl font-bold text-white transition-all text-sm",
              processing
                ? "bg-gray-300 cursor-not-allowed"
                : "fab-gradient hover:shadow-lg hover:shadow-purple-300/30 active:scale-[0.98]"
            )}
          >
            {processing ? (
              <span className="flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4 animate-pulse" />
                ✨ Processing CVs...
              </span>
            ) : (
              `🚀 Upload & Analyse ${files.length} CV${files.length > 1 ? "s" : ""}`
            )}
          </button>
        </div>
      )}
    </div>
  );
}
