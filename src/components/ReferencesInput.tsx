"use client";

import { useCallback, useRef, useState } from "react";
import { X, Save, RefreshCw, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".doc", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic"];
const ACCEPTED_MIME = "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*";

function fileEmoji(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"].includes(ext)) return "🖼️";
  if (ext === "pdf") return "📄";
  return "📝";
}

type Props = {
  // Upload mode (used inside FileUpload per-CV card)
  onFilesChange?: (files: File[]) => void;
  onTextChange?: (text: string) => void;
  filesValue?: File[];
  textValue?: string;
  // Detail page mode
  savedText?: string | null;
  savedFileNames?: string | null;
  savedSummary?: string | null;
  onSave?: (text: string) => Promise<void>;
  onUploadFiles?: (files: File[]) => Promise<void>;
  onRegenerateSummary?: () => Promise<void>;
  onReanalyse?: () => void;
  reanalysing?: boolean;
};

export default function ReferencesInput({
  onFilesChange,
  onTextChange,
  filesValue = [],
  textValue = "",
  savedText,
  savedFileNames,
  savedSummary,
  onSave,
  onUploadFiles,
  onRegenerateSummary,
  onReanalyse,
  reanalysing,
}: Props) {
  const isDetailMode = !!onSave;
  const [dragOver, setDragOver] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [localText, setLocalText] = useState(savedText || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) => {
      const ext = "." + (f.name.split(".").pop()?.toLowerCase() || "");
      return ACCEPTED_EXTENSIONS.includes(ext) || f.type.startsWith("image/");
    });
    if (!dropped.length) return;

    if (isDetailMode) {
      handleDetailUpload(dropped);
    } else {
      onFilesChange?.([...filesValue, ...dropped]);
    }
  }, [filesValue, isDetailMode]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    if (isDetailMode) {
      handleDetailUpload(selected);
    } else {
      onFilesChange?.([...filesValue, ...selected]);
    }
    // reset input so same file can be re-added
    e.target.value = "";
  }, [filesValue, isDetailMode]);

  const handleDetailUpload = async (files: File[]) => {
    if (!onUploadFiles) return;
    setUploading(true);
    await onUploadFiles(files);
    setUploading(false);
  };

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    await onSave(localText);
    setSaving(false);
  };

  const handleRegenerate = async () => {
    if (!onRegenerateSummary) return;
    setRegenerating(true);
    await onRegenerateSummary();
    setRegenerating(false);
  };

  const dropZone = (compact = false) => (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => fileRef.current?.click()}
      className={cn(
        "border-2 border-dashed rounded-xl text-center cursor-pointer transition-all",
        compact ? "py-3 px-4" : "py-5 px-4",
        dragOver
          ? "border-purple-400 bg-purple-50 scale-[1.01]"
          : "border-gray-200 hover:border-purple-300 hover:bg-purple-50/40"
      )}
    >
      {uploading ? (
        <span className="flex items-center justify-center gap-2 text-sm text-purple-500 font-medium">
          <Loader2 className="h-4 w-4 animate-spin" />
          Extracting text from files...
        </span>
      ) : (
        <>
          <p className="text-sm font-semibold text-gray-500">
            🗂️ Drop reference files here or tap to browse
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            PDF, DOCX, JPG, PNG — including screenshots from emails 📧
          </p>
        </>
      )}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept={ACCEPTED_MIME}
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  );

  // ── Upload mode (compact, inside per-CV card) ──────────────────────────────
  if (!isDetailMode) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 font-medium">📋 References:</span>
          <button
            type="button"
            onClick={() => setShowPaste((v) => !v)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-lg font-semibold border transition-all",
              showPaste
                ? "bg-purple-50 text-purple-600 border-purple-200"
                : "bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200"
            )}
          >
            ✍️ Paste text
          </button>
          {(filesValue.length > 0 || showPaste) && (
            <button
              type="button"
              onClick={() => { onFilesChange?.([]); onTextChange?.(""); setShowPaste(false); }}
              className="text-xs text-gray-300 hover:text-gray-400 ml-auto"
            >
              clear all
            </button>
          )}
        </div>

        {dropZone(true)}

        {/* Staged files list */}
        {filesValue.length > 0 && (
          <div className="space-y-1">
            {filesValue.map((f, i) => (
              <div key={i} className="flex items-center gap-2 bg-purple-50 rounded-lg px-3 py-1.5">
                <span className="text-sm">{fileEmoji(f.name)}</span>
                <span className="text-xs text-purple-700 font-medium truncate flex-1">{f.name}</span>
                <button type="button" onClick={() => onFilesChange?.(filesValue.filter((_, j) => j !== i))}>
                  <X className="h-3.5 w-3.5 text-purple-300 hover:text-purple-500" />
                </button>
              </div>
            ))}
          </div>
        )}

        {showPaste && (
          <textarea
            placeholder="Paste reference text or emails from previous employers..."
            value={textValue}
            onChange={(e) => onTextChange?.(e.target.value)}
            className="w-full text-sm border border-gray-100 rounded-xl p-3 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 bg-gray-50/50 placeholder:text-gray-300"
          />
        )}
      </div>
    );
  }

  // ── Detail page mode ────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {dropZone()}

      {/* Saved file names */}
      {savedFileNames && (
        <div className="flex flex-wrap gap-1.5">
          {savedFileNames.split(", ").map((name, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-lg font-medium">
              {fileEmoji(name)} {name}
            </span>
          ))}
        </div>
      )}

      {/* AI-generated references summary */}
      {savedSummary && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">✨ AI References Summary</span>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1 font-semibold"
            >
              <RefreshCw className={`h-3 w-3 ${regenerating ? "animate-spin" : ""}`} />
              Regenerate
            </button>
          </div>
          <p className="text-sm text-amber-800 leading-relaxed">{savedSummary}</p>
        </div>
      )}

      {/* Paste text toggle */}
      <button
        type="button"
        onClick={() => setShowPaste((v) => !v)}
        className={cn(
          "text-sm px-3.5 py-2 rounded-xl font-semibold border transition-all",
          showPaste
            ? "bg-purple-50 text-purple-600 border-purple-200"
            : "bg-white/80 text-gray-400 border-gray-100 hover:border-gray-200"
        )}
      >
        ✍️ {showPaste ? "Hide" : "Paste reference text"}
      </button>

      {showPaste && (
        <div className="space-y-2">
          <textarea
            placeholder="Paste reference letters, emails, or notes from previous employers..."
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            className="w-full text-sm border border-gray-100 rounded-xl p-3 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 bg-gray-50/50 placeholder:text-gray-300"
          />
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-gray-900 text-white text-xs rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Save className="h-3 w-3" />
              {saving ? "Saving..." : "Save text"}
            </button>
            {localText.trim() && onRegenerateSummary && (
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="px-4 py-2 bg-amber-50 text-amber-700 text-xs rounded-lg font-semibold hover:bg-amber-100 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Sparkles className={`h-3 w-3 ${regenerating ? "animate-spin" : ""}`} />
                {regenerating ? "Summarising..." : "Summarise references"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Re-analyse with references */}
      {(savedText || savedFileNames) && onReanalyse && (
        <button
          onClick={onReanalyse}
          disabled={reanalysing}
          className="px-4 py-2 bg-purple-100 text-purple-600 text-xs rounded-xl font-semibold hover:bg-purple-200 disabled:opacity-50 flex items-center gap-1.5 w-full justify-center"
        >
          <RefreshCw className={`h-3 w-3 ${reanalysing ? "animate-spin" : ""}`} />
          {reanalysing ? "Re-analysing..." : "Re-analyse CV with references"}
        </button>
      )}
    </div>
  );
}
