import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function scoreColor(score: number): string {
  if (score >= 8) return "text-green-score bg-green-50 border-green-200";
  if (score >= 5) return "text-amber-score bg-amber-50 border-amber-200";
  return "text-red-score bg-red-50 border-red-200";
}

export function scoreLabel(score: number): string {
  if (score >= 8) return "High";
  if (score >= 5) return "Medium";
  return "Low";
}

export function scoreBadgeColor(score: number): string {
  if (score >= 8) return "bg-green-500 text-white";
  if (score >= 5) return "bg-amber-500 text-white";
  return "bg-red-500 text-white";
}
