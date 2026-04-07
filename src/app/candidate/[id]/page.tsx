"use client";

import { useEffect, useState, use } from "react";
import { Candidate } from "@/lib/supabase";
import { scoreColor } from "@/lib/utils";
import {
  ArrowLeft,
  Download,
  Loader2,
  RefreshCw,
  Trash2,
  FileText,
  Save,
} from "lucide-react";
import AgencyPicker from "@/components/AgencyPicker";
import ReferencesInput from "@/components/ReferencesInput";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";

const CRITERIA_LABELS: Record<string, { label: string; emoji: string }> = {
  tenure_stability: { label: "Tenure & Stability", emoji: "📅" },
  multi_child_experience: { label: "Multi-Child Experience", emoji: "👶👦" },
  early_years_qualifications: { label: "Early Years Qualifications", emoji: "🎓" },
  newborn_experience: { label: "Newborn Experience", emoji: "🍼" },
  proximity: { label: "Proximity", emoji: "📍" },
  first_aid: { label: "First Aid", emoji: "🩹" },
  ofsted_dbs: { label: "Ofsted / DBS", emoji: "✅" },
  employment_gaps: { label: "Employment Gaps", emoji: "📊" },
  activities_enrichment: { label: "Activities & Enrichment", emoji: "🎨" },
  proactivity: { label: "Proactivity", emoji: "⚡" },
};

const STATUS_OPTIONS = [
  { value: "new", label: "New", emoji: "🆕" },
  { value: "shortlisted", label: "Shortlisted", emoji: "⭐" },
  { value: "interview_scheduled", label: "Interview", emoji: "📅" },
  { value: "offered", label: "Offered", emoji: "🎉" },
  { value: "rejected", label: "Passed", emoji: "👋" },
];

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 8 ? "bg-gradient-to-r from-green-400 to-emerald-500" :
    score >= 5 ? "bg-gradient-to-r from-amber-400 to-orange-500" :
    "bg-gradient-to-r from-red-400 to-rose-500";

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${score * 10}%` }}
        />
      </div>
      <span className="text-xs font-bold text-gray-500 w-6 text-right">{score}</span>
    </div>
  );
}

function BigScore({ score }: { score: number }) {
  const color =
    score >= 8 ? "from-green-400 to-emerald-500" :
    score >= 5 ? "from-amber-400 to-orange-500" :
    "from-red-400 to-rose-500";

  return (
    <div className={`h-20 w-20 rounded-3xl bg-gradient-to-br ${color} flex items-center justify-center font-extrabold text-white text-2xl shadow-lg`}>
      {score.toFixed(1)}
    </div>
  );
}

export default function CandidateDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [reanalysing, setReanalysing] = useState(false);
  const [synopsis, setSynopsis] = useState("");
  const [savingSynopsis, setSavingSynopsis] = useState(false);

  useEffect(() => {
    fetch(`/api/candidates?status=all`)
      .then((r) => r.json())
      .then((data: Candidate[]) => {
        const found = data.find((c) => c.id === id);
        if (found) {
          setCandidate(found);
          setNotes(found.user_notes || "");
          setSynopsis(found.agency_synopsis || "");
        }
      });
  }, [id]);

  useEffect(() => {
    if (!candidate || candidate.ai_overall_score !== null) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/candidates?status=all`);
      const data: Candidate[] = await res.json();
      const found = data.find((c) => c.id === id);
      if (found && found.ai_overall_score !== null) {
        setCandidate(found);
        setNotes(found.user_notes || "");
        setSynopsis(found.agency_synopsis || "");
        clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [candidate, id]);

  const updateCandidate = async (updates: Partial<Candidate>) => {
    setSaving(true);
    await fetch(`/api/candidates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    setCandidate((prev) => (prev ? { ...prev, ...updates } : prev));
    setSaving(false);
  };

  const handleSaveSynopsis = async () => {
    setSavingSynopsis(true);
    await fetch(`/api/candidates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agency_synopsis: synopsis }),
    });
    setCandidate((prev) => (prev ? { ...prev, agency_synopsis: synopsis } : prev));
    setSavingSynopsis(false);
  };

  const handleReanalyse = async () => {
    setReanalysing(true);
    await fetch("/api/analyse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId: id }),
    });
    const res = await fetch(`/api/candidates?status=all`);
    const data: Candidate[] = await res.json();
    const found = data.find((c) => c.id === id);
    if (found) setCandidate(found);
    setReanalysing(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this candidate? 🗑️")) return;
    await fetch(`/api/candidates/${id}`, { method: "DELETE" });
    router.push("/");
  };

  const generatePdf = () => {
    if (!candidate) return;
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const m = 18; // margin
    const cw = pw - m * 2; // content width
    let y = m;

    const hex = (h: string) => {
      const r = parseInt(h.slice(1, 3), 16);
      const g = parseInt(h.slice(3, 5), 16);
      const b = parseInt(h.slice(5, 7), 16);
      return [r, g, b] as [number, number, number];
    };
    const sColor = (s: number): string => s >= 8 ? "#22c55e" : s >= 5 ? "#f59e0b" : "#ef4444";
    const sBg = (s: number): string => s >= 8 ? "#f0fdf4" : s >= 5 ? "#fffbeb" : "#fef2f2";

    const ensureSpace = (needed: number) => {
      if (y + needed > ph - 15) { doc.addPage(); y = m; }
    };

    const wrappedText = (text: string, x: number, maxW: number, size: number, style: string, color: string) => {
      doc.setFontSize(size);
      doc.setFont("helvetica", style);
      doc.setTextColor(...hex(color));
      const lines = doc.splitTextToSize(text, maxW);
      const lineH = size * 0.45;
      for (const line of lines) {
        ensureSpace(lineH + 2);
        doc.text(line, x, y);
        y += lineH;
      }
      return lines.length;
    };

    const drawRoundedRect = (x: number, ry: number, w: number, h: number, r: number, fillColor: string, borderColor?: string) => {
      doc.setFillColor(...hex(fillColor));
      doc.roundedRect(x, ry, w, h, r, r, "F");
      if (borderColor) {
        doc.setDrawColor(...hex(borderColor));
        doc.setLineWidth(0.3);
        doc.roundedRect(x, ry, w, h, r, r, "S");
      }
    };

    const sectionTitle = (title: string) => {
      ensureSpace(14);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...hex("#111827"));
      doc.text(title, m, y);
      y += 7;
    };

    // === HEADER: Name + Score Badge ===
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hex("#111827"));
    doc.text(candidate.name, m, y);

    if (candidate.ai_overall_score !== null) {
      const badgeW = 28;
      const badgeH = 16;
      const badgeX = pw - m - badgeW;
      const badgeY = y - 12;
      drawRoundedRect(badgeX, badgeY, badgeW, badgeH, 4, sColor(candidate.ai_overall_score));
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(candidate.ai_overall_score.toFixed(1), badgeX + badgeW / 2, badgeY + badgeH / 2 + 1.5, { align: "center" });
    }
    y += 4;

    if (candidate.ai_estimated_age) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...hex("#9ca3af"));
      doc.text(`Estimated age: ~${candidate.ai_estimated_age}`, m, y);
      y += 5;
    }

    // Divider
    y += 2;
    doc.setDrawColor(...hex("#e5e7eb"));
    doc.setLineWidth(0.4);
    doc.line(m, y, pw - m, y);
    y += 8;

    // === AI REVIEW ===
    if (candidate.ai_review) {
      sectionTitle("AI Review");
      wrappedText(candidate.ai_review, m, cw, 10, "normal", "#4b5563");
      y += 8;
    }

    // === FLAGS ===
    if (candidate.ai_flags && candidate.ai_flags.length > 0) {
      sectionTitle("Flags");
      for (const flag of candidate.ai_flags) {
        const isRed = flag.type === "red";
        const lines = doc.splitTextToSize((isRed ? ">> " : "++ ") + flag.message, cw - 10);
        const blockH = lines.length * 4.5 + 6;
        ensureSpace(blockH + 2);

        drawRoundedRect(m, y - 3, cw, blockH, 3,
          isRed ? "#fef2f2" : "#f0fdf4",
          isRed ? "#fecaca" : "#bbf7d0"
        );

        doc.setFontSize(9.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...hex(isRed ? "#dc2626" : "#16a34a"));
        doc.text(lines, m + 5, y + 1);
        y += blockH + 2;
      }
      y += 4;
    }

    // === SCORE BREAKDOWN ===
    if (candidate.ai_scores) {
      sectionTitle("Score Breakdown");
      const sorted = Object.entries(candidate.ai_scores).sort(([, a], [, b]) => b.score - a.score);
      for (const [key, { score, justification }] of sorted) {
        const config = CRITERIA_LABELS[key] || { label: key };
        ensureSpace(18);

        // Label + score number
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...hex("#374151"));
        doc.text(config.label, m, y);

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...hex(sColor(score)));
        doc.text(`${score}/10`, pw - m, y, { align: "right" });
        y += 4;

        // Score bar
        const barW = cw;
        const barH = 3;
        drawRoundedRect(m, y, barW, barH, 1.5, "#f3f4f6");
        if (score > 0) {
          drawRoundedRect(m, y, barW * (score / 10), barH, 1.5, sColor(score));
        }
        y += 5;

        // Justification
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(...hex("#9ca3af"));
        const jLines = doc.splitTextToSize(justification, cw - 4);
        for (const jl of jLines) {
          ensureSpace(4);
          doc.text(jl, m + 2, y);
          y += 3.8;
        }
        y += 4;
      }
      y += 2;
    }

    // === AGENCY SYNOPSIS ===
    if (candidate.agency_synopsis) {
      sectionTitle("Agency Synopsis");
      wrappedText(candidate.agency_synopsis, m, cw, 10, "normal", "#4b5563");
      y += 8;
    }

    // === REFERENCES SUMMARY ===
    if (candidate.references_summary) {
      sectionTitle("References Summary");
      wrappedText(candidate.references_summary, m, cw, 10, "normal", "#4b5563");
      y += 8;
    }

    // === NOTES ===
    if (candidate.user_notes) {
      sectionTitle("Notes");
      wrappedText(candidate.user_notes, m, cw, 10, "normal", "#4b5563");
      y += 8;
    }

    doc.save(`${candidate.name.replace(/\s+/g, "_")}_review.pdf`);
  };

  if (!candidate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        <p className="text-sm text-gray-400">Loading candidate...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-12">
      {/* Back + PDF */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all candidates
        </button>
        <button
          onClick={generatePdf}
          className="flex items-center gap-1.5 text-sm text-purple-500 hover:text-purple-600 font-semibold bg-purple-50 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Download className="h-4 w-4" />
          Generate PDF
        </button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            {candidate.name}
          </h1>
          {candidate.ai_estimated_age && (
            <p className="text-sm text-gray-400 mt-1">
              👤 Estimated age: ~{candidate.ai_estimated_age}
            </p>
          )}
        </div>
        {candidate.ai_overall_score !== null && (
          <BigScore score={candidate.ai_overall_score} />
        )}
      </div>

      {/* Agency */}
      <div className="mb-5">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
          Agency
        </label>
        <AgencyPicker
          value={candidate.agency}
          onChange={(agency) => updateCandidate({ agency: agency as Candidate["agency"] })}
          saving={saving}
        />
      </div>

      {/* Status */}
      <div className="mb-6">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
          Status
        </label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() =>
                updateCandidate({ status: s.value as Candidate["status"] })
              }
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                candidate.status === s.value
                  ? "bg-gray-900 text-white shadow-md scale-105"
                  : "bg-white/80 text-gray-500 border border-gray-100 hover:bg-white hover:border-gray-200"
              }`}
            >
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* AI Review */}
      {candidate.ai_review ? (
        <div className="card-shine rounded-2xl border border-gray-100 p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              🤖 AI Review
            </h2>
            <button
              onClick={handleReanalyse}
              disabled={reanalysing}
              className="no-print text-xs text-purple-500 hover:text-purple-600 flex items-center gap-1 font-semibold bg-purple-50 px-2.5 py-1 rounded-lg transition-colors"
            >
              <RefreshCw className={`h-3 w-3 ${reanalysing ? "animate-spin" : ""}`} />
              Re-analyse
            </button>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            {candidate.ai_review}
          </p>
        </div>
      ) : (
        <div className="card-shine rounded-2xl border border-gray-100 p-8 mb-4 text-center">
          <div className="text-4xl mb-3 float-animation inline-block">🔮</div>
          <p className="text-sm text-gray-400 font-medium">AI is analysing this CV...</p>
        </div>
      )}

      {/* Flags */}
      {candidate.ai_flags && candidate.ai_flags.length > 0 && (
        <div className="space-y-2 mb-4">
          {candidate.ai_flags.map((flag, i) => (
            <div
              key={i}
              className={`flex items-start gap-2.5 p-3.5 rounded-xl text-sm font-medium ${
                flag.type === "red"
                  ? "bg-red-50 text-red-600 border border-red-100"
                  : "bg-green-50 text-green-600 border border-green-100"
              }`}
            >
              <span className="shrink-0">{flag.type === "red" ? "🚩" : "💚"}</span>
              {flag.message}
            </div>
          ))}
        </div>
      )}

      {/* Score Breakdown */}
      {candidate.ai_scores && (
        <div className="card-shine rounded-2xl border border-gray-100 p-5 mb-4 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            📊 Score Breakdown
          </h2>
          <div className="space-y-3.5">
            {Object.entries(candidate.ai_scores)
              .sort(([, a], [, b]) => b.score - a.score)
              .map(([key, { score, justification }]) => {
                const config = CRITERIA_LABELS[key] || { label: key, emoji: "📌" };
                return (
                  <div key={key}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{config.emoji}</span>
                      <span className="text-sm font-semibold text-gray-700">
                        {config.label}
                      </span>
                    </div>
                    <ScoreBar score={score} />
                    <p className="text-xs text-gray-400 mt-0.5 ml-6">{justification}</p>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Agency Synopsis */}
      <div className="card-shine rounded-2xl border border-gray-100 p-5 mb-4 shadow-sm">
        <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          📝 Agency Synopsis
        </h2>
        <textarea
          value={synopsis}
          onChange={(e) => setSynopsis(e.target.value)}
          placeholder="Paste the agency's synopsis here..."
          className="w-full text-sm border border-gray-100 rounded-xl p-3 h-28 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent bg-gray-50/50 placeholder:text-gray-300"
        />
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleSaveSynopsis}
            disabled={savingSynopsis}
            className="px-4 py-2 bg-gray-900 text-white text-xs rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            <Save className="h-3 w-3" />
            {savingSynopsis ? "Saving..." : "Save Synopsis"}
          </button>
          {synopsis.trim() && candidate.ai_review && (
            <button
              onClick={handleReanalyse}
              disabled={reanalysing}
              className="px-4 py-2 bg-purple-100 text-purple-600 text-xs rounded-lg font-semibold hover:bg-purple-200 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3 w-3 ${reanalysing ? "animate-spin" : ""}`} />
              Re-analyse with synopsis
            </button>
          )}
        </div>
      </div>

      {/* References */}
      <div className="card-shine rounded-2xl border border-gray-100 p-5 mb-4 shadow-sm">
        <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          📋 References
        </h2>
        <ReferencesInput
          savedText={candidate.references_text}
          savedFileNames={candidate.references_file_name}
          savedSummary={candidate.references_summary}
          onSave={async (text) => {
            await fetch(`/api/candidates/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ references_text: text }),
            });
            setCandidate((prev) => prev ? { ...prev, references_text: text } : prev);
          }}
          onUploadFiles={async (files) => {
            const fd = new FormData();
            files.forEach((f) => fd.append("files", f));
            const res = await fetch(`/api/candidates/${id}/references`, {
              method: "POST",
              body: fd,
            });
            if (res.ok) {
              const data = await res.json();
              setCandidate((prev) => prev ? {
                ...prev,
                references_text: data.combinedText,
                references_file_name: data.allFileNames || prev.references_file_name,
                references_summary: data.referencesSummary ?? prev.references_summary,
              } : prev);
            }
          }}
          onRegenerateSummary={async () => {
            const res = await fetch(`/api/candidates/${id}/summarise-references`, { method: "POST" });
            if (res.ok) {
              const data = await res.json();
              setCandidate((prev) => prev ? { ...prev, references_summary: data.summary } : prev);
            }
          }}
          onReanalyse={handleReanalyse}
          reanalysing={reanalysing}
        />
      </div>

      {/* Notes */}
      <div className="card-shine rounded-2xl border border-gray-100 p-5 mb-4 shadow-sm">
        <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          ✏️ Your Notes
        </h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Jot down your impressions after meeting, interview notes, vibes check... 💭"
          className="w-full text-sm border border-gray-100 rounded-xl p-3 h-28 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent bg-gray-50/50 placeholder:text-gray-300"
        />
        <button
          onClick={() => updateCandidate({ user_notes: notes })}
          disabled={saving}
          className="no-print mt-2 px-4 py-2 bg-gray-900 text-white text-xs rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center gap-1.5"
        >
          <Save className="h-3 w-3" />
          {saving ? "Saving..." : "Save Notes"}
        </button>
      </div>

      {/* CV File */}
      {candidate.cv_file_url && (
        <a
          href={candidate.cv_file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="no-print inline-flex items-center gap-2 text-sm text-purple-500 hover:text-purple-600 font-semibold mb-6 bg-purple-50 px-4 py-2.5 rounded-xl transition-colors"
        >
          <FileText className="h-4 w-4" />
          📄 View original CV ({candidate.cv_file_name})
        </a>
      )}

      {/* Delete */}
      <div className="pt-4 border-t border-gray-100">
        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-500 font-medium transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          Delete candidate
        </button>
      </div>
    </div>
  );
}
