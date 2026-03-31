"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export const AGENCIES = [
  { value: "Happy Families", emoji: "💛", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  { value: "Hampstead Nannies", emoji: "🏡", color: "bg-blue-50 text-blue-700 border-blue-200" },
];

export function AgencyBadge({ agency }: { agency: string | null }) {
  if (!agency) return null;
  const config = AGENCIES.find((a) => a.value === agency);
  const emoji = config?.emoji ?? "🏢";
  const color = config?.color ?? "bg-gray-50 text-gray-600 border-gray-200";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${color}`}>
      {emoji} {agency}
    </span>
  );
}

export default function AgencyPicker({
  value,
  onChange,
  saving,
}: {
  value: string | null;
  onChange: (agency: string | null) => void;
  saving?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {AGENCIES.map((a) => (
        <button
          key={a.value}
          onClick={() => onChange(value === a.value ? null : a.value)}
          disabled={saving}
          className={cn(
            "px-3.5 py-2 rounded-xl text-sm font-semibold transition-all border",
            value === a.value
              ? `${a.color} scale-105 shadow-sm`
              : "bg-white/80 text-gray-400 border-gray-100 hover:border-gray-200"
          )}
        >
          {a.emoji} {a.value}
        </button>
      ))}
      {value && (
        <button
          onClick={() => onChange(null)}
          className="px-3 py-2 rounded-xl text-xs font-medium text-gray-300 hover:text-gray-400 transition-colors"
        >
          clear
        </button>
      )}
    </div>
  );
}
