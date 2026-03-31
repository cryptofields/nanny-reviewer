"use client";

import { useRef, useState } from "react";
import { X, FileText, Save, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "none" | "text" | "file";

type Props = {
  // Upload mode (used in FileUpload)
  onTextChange?: (text: string) => void;
  onFileChange?: (file: File | null) => void;
  textValue?: string;
  fileValue?: File | null;
  // Detail page mode
  savedText?: string | null;
  savedFileName?: string | null;
  savedFileUrl?: string | null;
  onSave?: (text: string) => Promise<void>;
  onUploadFile?: (file: File) => Promise<void>;
  onReanalyse?: () => void;
  reanalysing?: boolean;
};

export default function ReferencesInput({
  onTextChange,
  onFileChange,
  textValue,
  fileValue,
  savedText,
  savedFileName,
  savedFileUrl,
  onSave,
  onUploadFile,
  onReanalyse,
  reanalysing,
}: Props) {
  const isDetailMode = !!onSave;
  const [mode, setMode] = useState<Mode>(
    isDetailMode
      ? (savedText || savedFileName ? "text" : "none")
      : "none"
  );
  const [localText, setLocalText] = useState(savedText || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    await onSave(localText);
    setSaving(false);
  };

  const handleFileUpload = async (file: File) => {
    if (!onUploadFile) return;
    setUploading(true);
    await onUploadFile(file);
    setUploading(false);
  };

  // Upload mode UI (compact, inside file card)
  if (!isDetailMode) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">📋 References:</span>
          <button
            type="button"
            onClick={() => { setMode("text"); onTextChange?.(""); onFileChange?.(null); }}
            className={cn(
              "text-xs px-2.5 py-1 rounded-lg font-semibold border transition-all",
              mode === "text"
                ? "bg-purple-50 text-purple-600 border-purple-200"
                : "bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200"
            )}
          >
            ✍️ Paste text
          </button>
          <button
            type="button"
            onClick={() => { setMode("file"); onTextChange?.(""); onFileChange?.(null); }}
            className={cn(
              "text-xs px-2.5 py-1 rounded-lg font-semibold border transition-all",
              mode === "file"
                ? "bg-purple-50 text-purple-600 border-purple-200"
                : "bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200"
            )}
          >
            📎 Upload file
          </button>
          {mode !== "none" && (
            <button
              type="button"
              onClick={() => { setMode("none"); onTextChange?.(""); onFileChange?.(null); }}
              className="text-xs text-gray-300 hover:text-gray-400 ml-auto"
            >
              clear
            </button>
          )}
        </div>

        {mode === "text" && (
          <textarea
            placeholder="Paste reference text, emails, or any notes from previous employers..."
            value={textValue || ""}
            onChange={(e) => onTextChange?.(e.target.value)}
            className="w-full text-sm border border-gray-100 rounded-xl p-3 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 bg-gray-50/50 placeholder:text-gray-300"
          />
        )}

        {mode === "file" && (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={(e) => onFileChange?.(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            {fileValue ? (
              <div className="flex items-center gap-2 bg-purple-50 rounded-xl px-3 py-2">
                <FileText className="h-4 w-4 text-purple-400 shrink-0" />
                <span className="text-xs text-purple-600 font-medium truncate">{fileValue.name}</span>
                <button
                  type="button"
                  onClick={() => onFileChange?.(null)}
                  className="ml-auto"
                >
                  <X className="h-3.5 w-3.5 text-purple-300 hover:text-purple-500" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full text-xs text-purple-500 bg-purple-50 border border-purple-100 rounded-xl py-2.5 font-semibold hover:bg-purple-100 transition-colors"
              >
                📎 Choose reference file (PDF, DOCX)
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Detail page mode (full section)
  return (
    <div className="space-y-3">
      {/* Mode selector */}
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setMode(mode === "text" ? "none" : "text")}
          className={cn(
            "text-sm px-3.5 py-2 rounded-xl font-semibold border transition-all",
            mode === "text"
              ? "bg-purple-50 text-purple-600 border-purple-200 scale-105"
              : "bg-white/80 text-gray-400 border-gray-100 hover:border-gray-200"
          )}
        >
          ✍️ Paste text
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "file" ? "none" : "file")}
          className={cn(
            "text-sm px-3.5 py-2 rounded-xl font-semibold border transition-all",
            mode === "file"
              ? "bg-purple-50 text-purple-600 border-purple-200 scale-105"
              : "bg-white/80 text-gray-400 border-gray-100 hover:border-gray-200"
          )}
        >
          📎 Upload file
        </button>
      </div>

      {/* Existing saved reference file */}
      {savedFileName && savedFileUrl && (
        <a
          href={savedFileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-purple-500 bg-purple-50 px-3 py-2 rounded-xl font-medium hover:bg-purple-100 transition-colors"
        >
          <FileText className="h-4 w-4" />
          {savedFileName}
        </a>
      )}

      {/* Paste text */}
      {mode === "text" && (
        <div className="space-y-2">
          <textarea
            placeholder="Paste reference text, emails, or notes from previous employers..."
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            className="w-full text-sm border border-gray-100 rounded-xl p-3 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 bg-gray-50/50 placeholder:text-gray-300"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-gray-900 text-white text-xs rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Save className="h-3 w-3" />
              {saving ? "Saving..." : "Save References"}
            </button>
            {localText.trim() && onReanalyse && (
              <button
                onClick={onReanalyse}
                disabled={reanalysing}
                className="px-4 py-2 bg-purple-100 text-purple-600 text-xs rounded-lg font-semibold hover:bg-purple-200 disabled:opacity-50 flex items-center gap-1.5"
              >
                <RefreshCw className={`h-3 w-3 ${reanalysing ? "animate-spin" : ""}`} />
                Re-analyse with references
              </button>
            )}
          </div>
        </div>
      )}

      {/* Upload file */}
      {mode === "file" && (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.doc"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await handleFileUpload(file);
            }}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full text-sm text-purple-500 bg-purple-50 border border-purple-100 rounded-xl py-3 font-semibold hover:bg-purple-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Extracting text...</>
            ) : (
              <>📎 Choose reference file (PDF, DOCX)</>
            )}
          </button>
          {onReanalyse && savedText && (
            <button
              onClick={onReanalyse}
              disabled={reanalysing}
              className="mt-2 px-4 py-2 bg-purple-100 text-purple-600 text-xs rounded-lg font-semibold hover:bg-purple-200 disabled:opacity-50 flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3 w-3 ${reanalysing ? "animate-spin" : ""}`} />
              Re-analyse with references
            </button>
          )}
        </div>
      )}

      {/* Show saved text preview if not in edit mode */}
      {mode === "none" && savedText && (
        <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 whitespace-pre-wrap line-clamp-4">
          {savedText}
        </div>
      )}
    </div>
  );
}
