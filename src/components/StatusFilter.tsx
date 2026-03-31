"use client";

import { cn } from "@/lib/utils";

const STATUSES = [
  { value: "all", label: "All", emoji: "👀" },
  { value: "new", label: "New", emoji: "🆕" },
  { value: "shortlisted", label: "Shortlisted", emoji: "⭐" },
  { value: "interview_scheduled", label: "Interview", emoji: "📅" },
  { value: "offered", label: "Offered", emoji: "🎉" },
  { value: "rejected", label: "Passed", emoji: "👋" },
];

export default function StatusFilter({
  current,
  onChange,
  counts,
}: {
  current: string;
  onChange: (status: string) => void;
  counts: Record<string, number>;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      {STATUSES.map((s) => {
        const count = s.value === "all"
          ? Object.values(counts).reduce((a, b) => a + b, 0)
          : counts[s.value] || 0;
        return (
          <button
            key={s.value}
            onClick={() => onChange(s.value)}
            className={cn(
              "px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all shrink-0",
              current === s.value
                ? "bg-gray-900 text-white shadow-md shadow-gray-300/50 scale-105"
                : "bg-white/80 text-gray-500 border border-gray-100 hover:bg-white hover:border-gray-200"
            )}
          >
            {s.emoji} {s.label}
            {count > 0 && (
              <span className={cn(
                "ml-1.5 text-xs",
                current === s.value ? "text-gray-300" : "text-gray-300"
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
