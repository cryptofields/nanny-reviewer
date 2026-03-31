"use client";

import { useCallback, useState } from "react";
import { X, Loader2, Sparkles } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);

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
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, synopsis } : f))
    );
  };

  const updateAgency = (index: number, agency: string) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, agency } : f))
    );
  };

  const updateReferencesText = (index: number, referencesText: string) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, referencesText } : f))
    );
  };

  const updateReferencesFiles = (index: number, referencesFiles: File[]) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, referencesFiles } : f))
    );
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadAndAnalyse = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      const synopsesMap: Record<string, string> = {};
      const agenciesMap: Record<string, string> = {};
      const referencesTextMap: Record<string, string> = {};
      const referencesFileMap: Record<string, string> = {};

      files.forEach(({ file, synopsis, agency, referencesText, referencesFiles }) => {
        formData.append("files", file);
        if (synopsis.trim()) synopsesMap[file.name] = synopsis;
        if (agency.trim()) agenciesMap[file.name] = agency;
        if (referencesText.trim()) referencesTextMap[file.name] = referencesText;
        if (referencesFiles.length > 0) {
          referencesFiles.forEach((refFile, idx) => {
            const refKey = `ref_${file.name}_${idx}`;
            formData.append(refKey, refFile);
            if (!referencesFileMap[file.name]) referencesFileMap[file.name] = "";
            referencesFileMap[file.name] = [referencesFileMap[file.name], refKey].filter(Boolean).join(",");
          });
        }
      });

      if (Object.keys(synopsesMap).length > 0)
        formData.append("synopses", JSON.stringify(synopsesMap));
      if (Object.keys(agenciesMap).length > 0)
        formData.append("agencies", JSON.stringify(agenciesMap));
      if (Object.keys(referencesTextMap).length > 0)
        formData.append("referencesText", JSON.stringify(referencesTextMap));
      if (Object.keys(referencesFileMap).length > 0)
        formData.append("referencesFileMap", JSON.stringify(referencesFileMap));

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.results) {
        setError(uploadData.error || "Upload failed. Please try again.");
        setUploading(false);
        return;
      }

      const results = uploadData.results;
      setUploading(false);

      // Show any per-file errors
      const failedFiles = results.filter((r: UploadResult) => r.error);
      if (failedFiles.length > 0) {
        setError(`Some files failed: ${failedFiles.map((r: UploadResult) => `${r.fileName}: ${r.error}`).join("; ")}`);
      }

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
    } catch (err) {
      console.error("Upload error:", err);
      setError("Upload failed. Check your connection and try again.");
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
              {/* Agency selector */}
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
            </div>
          ))}

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl p-3 font-medium">
              🚨 {error}
            </div>
          )}

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
