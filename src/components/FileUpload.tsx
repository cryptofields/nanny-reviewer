"use client";

import { useCallback, useState } from "react";
import { Upload, FileText, X, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type UploadedFile = {
  file: File;
  synopsis: string;
};

type UploadResult = {
  fileName: string;
  candidateId?: string;
  success?: boolean;
  error?: string;
};

export default function FileUpload({
  onUploadComplete,
}: {
  onUploadComplete: (results: UploadResult[]) => void;
}) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analysing, setAnalysing] = useState<string[]>([]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      return ext === "pdf" || ext === "docx" || ext === "doc";
    });
    setFiles((prev) => [
      ...prev,
      ...dropped.map((file) => ({ file, synopsis: "" })),
    ]);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selected = Array.from(e.target.files);
        setFiles((prev) => [
          ...prev,
          ...selected.map((file) => ({ file, synopsis: "" })),
        ]);
      }
    },
    []
  );

  const updateSynopsis = (index: number, synopsis: string) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, synopsis } : f))
    );
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadAndAnalyse = async () => {
    if (files.length === 0) return;
    setUploading(true);

    try {
      const formData = new FormData();
      const synopsesMap: Record<string, string> = {};

      files.forEach(({ file, synopsis }) => {
        formData.append("files", file);
        if (synopsis.trim()) {
          synopsesMap[file.name] = synopsis;
        }
      });

      if (Object.keys(synopsesMap).length > 0) {
        formData.append("synopses", JSON.stringify(synopsesMap));
      }

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const { results } = await uploadRes.json();
      setUploading(false);

      const successfulUploads = results.filter(
        (r: UploadResult) => r.success && r.candidateId
      );
      setAnalysing(successfulUploads.map((r: UploadResult) => r.candidateId!));

      await Promise.all(
        successfulUploads.map(async (r: UploadResult) => {
          try {
            await fetch("/api/analyse", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ candidateId: r.candidateId }),
            });
          } catch {
            // handled in UI refresh
          } finally {
            setAnalysing((prev) =>
              prev.filter((id) => id !== r.candidateId)
            );
          }
        })
      );

      setFiles([]);
      onUploadComplete(results);
    } catch {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
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
        <p className="text-sm font-semibold text-gray-700">
          Drop CVs here or tap to browse
        </p>
        <p className="text-xs text-gray-400 mt-1">PDF, DOCX, DOC — go wild! 🎉</p>
        <input
          id="file-input"
          type="file"
          multiple
          accept=".pdf,.docx,.doc"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((f, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 p-4 space-y-2 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">📎</span>
                  <span className="text-sm font-medium truncate text-gray-800">
                    {f.file.name}
                  </span>
                </div>
                <button
                  onClick={() => removeFile(i)}
                  className="p-1 hover:bg-red-50 rounded-full transition-colors"
                >
                  <X className="h-4 w-4 text-gray-300 hover:text-red-400" />
                </button>
              </div>
              <textarea
                placeholder="✍️ Paste agency synopsis here (optional)"
                value={f.synopsis}
                onChange={(e) => updateSynopsis(i, e.target.value)}
                className="w-full text-sm border border-gray-100 rounded-xl p-3 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent bg-gray-50/50 placeholder:text-gray-300"
              />
            </div>
          ))}

          <button
            onClick={handleUploadAndAnalyse}
            disabled={uploading || analysing.length > 0}
            className={cn(
              "w-full py-3.5 rounded-xl font-bold text-white transition-all text-sm",
              uploading || analysing.length > 0
                ? "bg-gray-300 cursor-not-allowed"
                : "fab-gradient hover:shadow-lg hover:shadow-purple-300/30 active:scale-[0.98]"
            )}
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </span>
            ) : analysing.length > 0 ? (
              <span className="flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4 animate-pulse" />
                ✨ AI is analysing {analysing.length} candidate
                {analysing.length > 1 ? "s" : ""}...
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
