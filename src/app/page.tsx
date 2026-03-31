"use client";

import { useCallback, useEffect, useState } from "react";
import { Candidate } from "@/lib/supabase";
import FileUpload from "@/components/FileUpload";
import CandidateCard from "@/components/CandidateCard";
import StatusFilter from "@/components/StatusFilter";
import SortSelect from "@/components/SortSelect";
import { Plus, X, Baby } from "lucide-react";

export default function Home() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("ai_overall_score:desc");
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCandidates = useCallback(async () => {
    const [sortField, sortOrder] = sort.split(":");
    const params = new URLSearchParams({
      status,
      sort: sortField,
      order: sortOrder,
    });
    const res = await fetch(`/api/candidates?${params}`);
    const data = await res.json();
    setCandidates(data);
    setLoading(false);
  }, [status, sort]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  useEffect(() => {
    const hasProcessing = candidates.some((c) => c.ai_overall_score === null);
    if (!hasProcessing) return;
    const interval = setInterval(fetchCandidates, 5000);
    return () => clearInterval(interval);
  }, [candidates, fetchCandidates]);

  const counts = candidates.reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const filtered =
    status === "all" ? candidates : candidates.filter((c) => c.status === status);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <span className="text-3xl float-animation inline-block">🍼</span>
            Nanny Reviewer
          </h1>
          <p className="text-sm text-gray-500 mt-1 ml-11">
            {candidates.length === 0
              ? "Finding the perfect nanny for Lopo & Livia ✨"
              : `${candidates.length} candidate${candidates.length !== 1 ? "s" : ""} reviewed 📋`}
          </p>
        </div>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <div className="mb-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100 p-5 shadow-lg shadow-purple-100/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              📄 Upload CVs
            </h2>
            <button
              onClick={() => setShowUpload(false)}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
          <FileUpload
            onUploadComplete={() => {
              setShowUpload(false);
              fetchCandidates();
            }}
          />
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3 mb-5">
        <StatusFilter current={status} onChange={setStatus} counts={counts} />
        <div className="flex justify-end">
          <SortSelect value={sort} onChange={setSort} />
        </div>
      </div>

      {/* Candidate list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/60 rounded-2xl border p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full shimmer" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-32 rounded shimmer" />
                  <div className="h-3 w-20 rounded shimmer" />
                </div>
              </div>
              <div className="h-3 w-full rounded shimmer" />
              <div className="h-3 w-3/4 rounded shimmer" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4 float-animation inline-block">
            {candidates.length === 0 ? "👶" : "🔍"}
          </div>
          <p className="text-gray-600 font-semibold text-lg mb-1">
            {candidates.length === 0
              ? "No candidates yet!"
              : "No one matches this filter"}
          </p>
          <p className="text-gray-400 text-sm mb-5">
            {candidates.length === 0
              ? "Upload some CVs to start reviewing nannies"
              : "Try a different status filter"}
          </p>
          {candidates.length === 0 && (
            <button
              onClick={() => setShowUpload(true)}
              className="px-6 py-2.5 fab-gradient text-white rounded-full font-semibold hover:shadow-lg transition-all"
            >
              📄 Upload CVs
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <CandidateCard key={c.id} candidate={c} />
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowUpload(!showUpload)}
        className="fixed bottom-6 right-6 h-14 w-14 fab-gradient text-white rounded-full shadow-lg shadow-purple-300/50 flex items-center justify-center transition-all hover:shadow-xl hover:scale-105 active:scale-95 z-50"
      >
        {showUpload ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  );
}
