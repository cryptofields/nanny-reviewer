"use client";

import { Candidate } from "@/lib/supabase";
import { scoreBadgeColor, scoreColor, scoreLabel } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Loader2,
  Clock,
  User,
} from "lucide-react";
import Link from "next/link";

const STATUS_STYLES: Record<string, string> = {
  new: "bg-gray-100 text-gray-700",
  shortlisted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  interview_scheduled: "bg-blue-100 text-blue-700",
  offered: "bg-purple-100 text-purple-700",
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
  interview_scheduled: "Interview",
  offered: "Offered",
};

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

  return (
    <Link href={`/candidate/${candidate.id}`}>
      <div className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {/* Score badge */}
            {hasAnalysis ? (
              <div
                className={`${scoreBadgeColor(candidate.ai_overall_score!)} h-12 w-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0`}
              >
                {candidate.ai_overall_score!.toFixed(1)}
              </div>
            ) : (
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
              </div>
            )}

            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {candidate.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[candidate.status]}`}
                >
                  {STATUS_LABELS[candidate.status]}
                </span>
                {candidate.ai_estimated_age && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <User className="h-3 w-3" />
                    ~{candidate.ai_estimated_age}
                  </span>
                )}
              </div>
            </div>
          </div>

          <ChevronRight className="h-5 w-5 text-gray-300 shrink-0 mt-1" />
        </div>

        {/* Review snippet */}
        {candidate.ai_review && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {candidate.ai_review}
          </p>
        )}

        {/* Flags + top scores */}
        {hasAnalysis && (
          <div className="flex items-center gap-3 text-xs">
            {redFlags > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <AlertTriangle className="h-3 w-3" />
                {redFlags} flag{redFlags > 1 ? "s" : ""}
              </span>
            )}
            {greenFlags > 0 && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-3 w-3" />
                {greenFlags} strength{greenFlags > 1 ? "s" : ""}
              </span>
            )}
            {candidate.ai_scores && (
              <div className="flex gap-1.5 ml-auto">
                {Object.entries(candidate.ai_scores)
                  .sort(([, a], [, b]) => b.score - a.score)
                  .slice(0, 3)
                  .map(([key, { score }]) => (
                    <span
                      key={key}
                      className={`px-1.5 py-0.5 rounded border text-xs font-medium ${scoreColor(score)}`}
                    >
                      {scoreLabel(score)}
                    </span>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Date */}
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock className="h-3 w-3" />
          {new Date(candidate.created_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })}
        </div>
      </div>
    </Link>
  );
}
