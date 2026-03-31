"use client";

import { Candidate } from "@/lib/supabase";
import { scoreBadgeColor, scoreColor, scoreLabel } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";

const STATUS_CONFIG: Record<string, { emoji: string; label: string; style: string }> = {
  new: { emoji: "🆕", label: "New", style: "bg-gray-100 text-gray-600" },
  shortlisted: { emoji: "⭐", label: "Shortlisted", style: "bg-amber-50 text-amber-700" },
  rejected: { emoji: "👋", label: "Passed", style: "bg-red-50 text-red-500" },
  interview_scheduled: { emoji: "📅", label: "Interview", style: "bg-blue-50 text-blue-600" },
  offered: { emoji: "🎉", label: "Offered", style: "bg-green-50 text-green-600" },
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 8 ? "from-green-400 to-emerald-500" :
    score >= 5 ? "from-amber-400 to-orange-500" :
    "from-red-400 to-rose-500";

  return (
    <div className={`h-13 w-13 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center font-extrabold text-white text-sm shadow-sm shrink-0`}>
      {score.toFixed(1)}
    </div>
  );
}

export default function CandidateCard({
  candidate,
}: {
  candidate: Candidate;
}) {
  const hasAnalysis = candidate.ai_overall_score !== null;
  const redFlags =
    candidate.ai_flags?.filter((f) => f.type === "red").length || 0;
  const greenFlags =
    candidate.ai_flags?.filter((f) => f.type === "green").length || 0;
  const statusConfig = STATUS_CONFIG[candidate.status] || STATUS_CONFIG.new;

  return (
    <Link href={`/candidate/${candidate.id}`}>
      <div className="card-shine rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {hasAnalysis ? (
              <ScoreBadge score={candidate.ai_overall_score!} />
            ) : (
              <div className="h-13 w-13 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                <Loader2 className="h-5 w-5 text-purple-400 animate-spin" />
              </div>
            )}

            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 truncate">
                {candidate.name}
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusConfig.style}`}
                >
                  {statusConfig.emoji} {statusConfig.label}
                </span>
                {candidate.ai_estimated_age && (
                  <span className="text-xs text-gray-400">
                    👤 ~{candidate.ai_estimated_age}
                  </span>
                )}
              </div>
            </div>
          </div>

          <ChevronRight className="h-5 w-5 text-gray-200 shrink-0 mt-2" />
        </div>

        {/* Review snippet */}
        {candidate.ai_review && (
          <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
            {candidate.ai_review}
          </p>
        )}

        {/* Flags + scores */}
        {hasAnalysis && (
          <div className="flex items-center gap-3 text-xs flex-wrap">
            {redFlags > 0 && (
              <span className="flex items-center gap-1 text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded-full">
                🚩 {redFlags} flag{redFlags > 1 ? "s" : ""}
              </span>
            )}
            {greenFlags > 0 && (
              <span className="flex items-center gap-1 text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                💚 {greenFlags} strength{greenFlags > 1 ? "s" : ""}
              </span>
            )}
            <span className="text-gray-300 ml-auto text-xs">
              {new Date(candidate.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
