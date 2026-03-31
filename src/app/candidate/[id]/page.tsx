"use client";

import { useEffect, useState, use } from "react";
import { Candidate } from "@/lib/supabase";
import { scoreColor, scoreLabel, scoreBadgeColor } from "@/lib/utils";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  FileText,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

const CRITERIA_LABELS: Record<string, string> = {
  tenure_stability: "Tenure & Stability",
  multi_child_experience: "Multi-Child Experience",
  early_years_qualifications: "Early Years Qualifications",
  newborn_experience: "Newborn Experience",
  proximity: "Proximity",
  first_aid: "First Aid",
  ofsted_dbs: "Ofsted / DBS",
  employment_gaps: "Employment Gaps",
  activities_enrichment: "Activities & Enrichment",
  proactivity: "Proactivity",
};

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interview_scheduled", label: "Interview Scheduled" },
  { value: "offered", label: "Offered" },
  { value: "rejected", label: "Rejected" },
];

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

  useEffect(() => {
    fetch(`/api/candidates?status=all`)
      .then((r) => r.json())
      .then((data: Candidate[]) => {
        const found = data.find((c) => c.id === id);
        if (found) {
          setCandidate(found);
          setNotes(found.user_notes || "");
        }
      });
  }, [id]);

  // Poll while analysis pending
  useEffect(() => {
    if (!candidate || candidate.ai_overall_score !== null) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/candidates?status=all`);
      const data: Candidate[] = await res.json();
      const found = data.find((c) => c.id === id);
      if (found && found.ai_overall_score !== null) {
        setCandidate(found);
        setNotes(found.user_notes || "");
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

  const handleReanalyse = async () => {
    setReanalysing(true);
    await fetch("/api/analyse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId: id }),
    });
    // Refresh
    const res = await fetch(`/api/candidates?status=all`);
    const data: Candidate[] = await res.json();
    const found = data.find((c) => c.id === id);
    if (found) setCandidate(found);
    setReanalysing(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this candidate?")) return;
    await fetch(`/api/candidates/${id}`, { method: "DELETE" });
    router.push("/");
  };

  if (!candidate) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-12">
      {/* Back */}
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {candidate.name}
          </h1>
          {candidate.ai_estimated_age && (
            <p className="text-sm text-gray-500 mt-0.5">
              Estimated age: ~{candidate.ai_estimated_age}
            </p>
          )}
        </div>
        {candidate.ai_overall_score !== null && (
          <div
            className={`${scoreBadgeColor(candidate.ai_overall_score)} h-16 w-16 rounded-full flex items-center justify-center font-bold text-lg`}
          >
            {candidate.ai_overall_score.toFixed(1)}
          </div>
        )}
      </div>

      {/* Status */}
      <div className="mb-6">
        <label className="text-sm font-medium text-gray-700 block mb-2">
          Status
        </label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() =>
                updateCandidate({
                  status: s.value as Candidate["status"],
                })
              }
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                candidate.status === s.value
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 border hover:bg-gray-50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* AI Review */}
      {candidate.ai_review ? (
        <div className="bg-white rounded-xl border p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-900">AI Review</h2>
            <button
              onClick={handleReanalyse}
              disabled={reanalysing}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <RefreshCw
                className={`h-3 w-3 ${reanalysing ? "animate-spin" : ""}`}
              />
              Re-analyse
            </button>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            {candidate.ai_review}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border p-4 mb-4 text-center text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
          <p className="text-sm">Analysing CV...</p>
        </div>
      )}

      {/* Flags */}
      {candidate.ai_flags && candidate.ai_flags.length > 0 && (
        <div className="space-y-2 mb-4">
          {candidate.ai_flags.map((flag, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                flag.type === "red"
                  ? "bg-red-50 text-red-700"
                  : "bg-green-50 text-green-700"
              }`}
            >
              {flag.type === "red" ? (
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              {flag.message}
            </div>
          ))}
        </div>
      )}

      {/* Score Breakdown */}
      {candidate.ai_scores && (
        <div className="bg-white rounded-xl border p-4 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">Score Breakdown</h2>
          <div className="space-y-2">
            {Object.entries(candidate.ai_scores)
              .sort(([, a], [, b]) => b.score - a.score)
              .map(([key, { score, justification }]) => (
                <div key={key} className="flex items-start gap-3">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded border shrink-0 mt-0.5 ${scoreColor(score)}`}
                  >
                    {score}/10
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {CRITERIA_LABELS[key] || key}
                    </p>
                    <p className="text-xs text-gray-500">{justification}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Agency Synopsis */}
      {candidate.agency_synopsis && (
        <div className="bg-white rounded-xl border p-4 mb-4">
          <h2 className="font-semibold text-gray-900 mb-2">
            Agency Synopsis
          </h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {candidate.agency_synopsis}
          </p>
        </div>
      )}

      {/* Notes */}
      <div className="bg-white rounded-xl border p-4 mb-4">
        <h2 className="font-semibold text-gray-900 mb-2">Your Notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add your impressions after meeting, interview notes, etc."
          className="w-full text-sm border rounded-lg p-3 h-28 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => updateCandidate({ user_notes: notes })}
          disabled={saving}
          className="mt-2 px-4 py-1.5 bg-gray-900 text-white text-sm rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Notes"}
        </button>
      </div>

      {/* CV File */}
      {candidate.cv_file_url && (
        <a
          href={candidate.cv_file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-4"
        >
          <FileText className="h-4 w-4" />
          View original CV ({candidate.cv_file_name})
        </a>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          onClick={handleDelete}
          className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>
    </div>
  );
}
