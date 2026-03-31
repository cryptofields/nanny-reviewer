"use client";

import { useCallback, useState } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
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

      // Trigger analysis for each successful upload
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
            // Analysis failure handled in UI refresh
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
          "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
          dragOver
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        )}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
        <p className="text-sm font-medium text-gray-700">
          Drop CVs here or tap to browse
        </p>
        <p className="text-xs text-gray-500 mt-1">PDF, DOCX, DOC</p>
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
              className="bg-white rounded-lg border p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {f.file.name}
                  </span>
                </div>
                <button
                  onClick={() => removeFile(i)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              </div>
              <textarea
                placeholder="Paste agency synopsis here (optional)"
                value={f.synopsis}
                onChange={(e) => updateSynopsis(i, e.target.value)}
                className="w-full text-sm border rounded-md p-2 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}

          <button
            onClick={handleUploadAndAnalyse}
            disabled={uploading || analysing.length > 0}
            className={cn(
              "w-full py-3 rounded-lg font-medium text-white transition-colors",
              uploading || analysing.length > 0
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
            )}
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </span>
            ) : analysing.length > 0 ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analysing {analysing.length} candidate
                {analysing.length > 1 ? "s" : ""}...
              </span>
            ) : (
              `Upload & Analyse ${files.length} CV${files.length > 1 ? "s" : ""}`
            )}
          </button>
        </div>
      )}
    </div>
  );
}
