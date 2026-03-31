"use client";

import { cn } from "@/lib/utils";

const STATUSES = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interview_scheduled", label: "Interview" },
  { value: "offered", label: "Offered" },
  { value: "rejected", label: "Rejected" },
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
              "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0",
              current === s.value
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 border hover:bg-gray-50"
            )}
          >
            {s.label}
            {count > 0 && (
              <span className="ml-1.5 text-xs opacity-70">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
