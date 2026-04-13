"use client";

import { Loader2 } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "new", label: "New", emoji: "🆕" },
  { value: "shortlisted", label: "Shortlisted", emoji: "⭐" },
  { value: "interview_scheduled", label: "Interview", emoji: "📅" },
  { value: "offered", label: "Offered", emoji: "🎉" },
  { value: "rejected", label: "Passed", emoji: "👋" },
];

export default function BatchActionBar({
  count,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onBatchStatus,
  updating,
}: {
  count: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBatchStatus: (status: string) => void;
  updating: boolean;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
      <div className="max-w-2xl w-full mx-4 mb-4 bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            {count} selected
          </span>
          <button
            onClick={count === totalCount ? onDeselectAll : onSelectAll}
            className="text-xs font-semibold text-purple-500 hover:text-purple-600 transition-colors"
          >
            {count === totalCount ? "Deselect all" : "Select all"}
          </button>
        </div>

        {updating ? (
          <div className="flex items-center justify-center gap-2 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
            <span className="text-sm text-gray-400">Updating...</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => onBatchStatus(s.value)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-gray-100 text-gray-600 hover:bg-gray-50 hover:border-gray-200 transition-all"
              >
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
