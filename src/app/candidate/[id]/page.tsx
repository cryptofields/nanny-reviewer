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

    const scoreColor = (s: number) =>
      s >= 8 ? "#22c55e" : s >= 5 ? "#f59e0b" : "#ef4444";
    const scoreBg = (s: number) =>
      s >= 8 ? "#f0fdf4" : s >= 5 ? "#fffbeb" : "#fef2f2";

    const flagsHtml = (candidate.ai_flags || [])
      .map(
        (f) => `
        <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-radius:12px;font-size:13px;font-weight:500;
          background:${f.type === "red" ? "#fef2f2" : "#f0fdf4"};
          color:${f.type === "red" ? "#dc2626" : "#16a34a"};
          border:1px solid ${f.type === "red" ? "#fecaca" : "#bbf7d0"};">
          <span>${f.type === "red" ? "\ud83d\udea9" : "\ud83d\udc9a"}</span>
          <span>${f.message}</span>
        </div>`
      )
      .join("");

    const scoresHtml = candidate.ai_scores
      ? Object.entries(candidate.ai_scores)
          .sort(([, a], [, b]) => b.score - a.score)
          .map(([key, { score, justification }]) => {
            const config = CRITERIA_LABELS[key] || { label: key, emoji: "\ud83d\udccc" };
            return `
            <div style="margin-bottom:12px;">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                <span style="font-size:13px;">${config.emoji}</span>
                <span style="font-size:13px;font-weight:600;color:#374151;">${config.label}</span>
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="flex:1;height:8px;border-radius:99px;background:#f3f4f6;overflow:hidden;">
                  <div style="height:100%;width:${score * 10}%;border-radius:99px;background:${scoreColor(score)};"></div>
                </div>
                <span style="font-size:12px;font-weight:700;color:#6b7280;width:20px;text-align:right;">${score}</span>
              </div>
              <p style="font-size:11px;color:#9ca3af;margin:2px 0 0 24px;">${justification}</p>
            </div>`;
          })
          .join("")
      : "";

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${candidate.name} - Review</title>
<style>
  @page { margin: 20mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1f2937; line-height: 1.5; padding: 0; }
  .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
  .name { font-size: 26px; font-weight: 800; color: #111827; }
  .age { font-size: 13px; color: #9ca3af; margin-top: 4px; }
  .score-circle { width: 72px; height: 72px; border-radius: 20px; display: flex; align-items: center; justify-content: center; font-weight: 800; color: white; font-size: 22px; flex-shrink: 0; }
  .section { background: white; border: 1px solid #f3f4f6; border-radius: 16px; padding: 20px; margin-bottom: 14px; }
  .section-title { font-weight: 700; font-size: 15px; color: #111827; margin-bottom: 10px; }
  .review-text { font-size: 13px; color: #4b5563; line-height: 1.7; }
  .flags { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>

<div class="header">
  <div>
    <div class="name">${candidate.name}</div>
    ${candidate.ai_estimated_age ? `<div class="age">\ud83d\udc64 Estimated age: ~${candidate.ai_estimated_age}</div>` : ""}
  </div>
  ${candidate.ai_overall_score !== null ? `<div class="score-circle" style="background:${scoreColor(candidate.ai_overall_score)};">${candidate.ai_overall_score.toFixed(1)}</div>` : ""}
</div>

${candidate.ai_review ? `
<div class="section">
  <div class="section-title">\ud83e\udd16 AI Review</div>
  <p class="review-text">${candidate.ai_review}</p>
</div>` : ""}

${flagsHtml ? `<div class="flags">${flagsHtml}</div>` : ""}

${scoresHtml ? `
<div class="section">
  <div class="section-title">\ud83d\udcca Score Breakdown</div>
  ${scoresHtml}
</div>` : ""}

${candidate.agency_synopsis ? `
<div class="section">
  <div class="section-title">\ud83d\udcdd Agency Synopsis</div>
  <p class="review-text">${candidate.agency_synopsis}</p>
</div>` : ""}

${candidate.references_summary ? `
<div class="section">
  <div class="section-title">\ud83d\udccb References Summary</div>
  <p class="review-text">${candidate.references_summary}</p>
</div>` : ""}

${candidate.user_notes ? `
<div class="section">
  <div class="section-title">\u270f\ufe0f Notes</div>
  <p class="review-text">${candidate.user_notes}</p>
</div>` : ""}

</body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 300);
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
