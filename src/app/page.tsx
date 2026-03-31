"use client";

import { useCallback, useEffect, useState } from "react";
import { Candidate } from "@/lib/supabase";
import FileUpload from "@/components/FileUpload";
import CandidateCard from "@/components/CandidateCard";
import StatusFilter from "@/components/StatusFilter";
import SortSelect from "@/components/SortSelect";
import { Plus, X } from "lucide-react";

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

  // Auto-refresh while any candidate lacks analysis
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

  // Filter candidates on the client when status is set (API also filters, but
  // we want instant UI updates)
  const filtered =
    status === "all" ? candidates : candidates.filter((c) => c.status === status);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nanny Reviewer</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {candidates.length} candidate{candidates.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Upload CVs</h2>
            <button
              onClick={() => setShowUpload(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="h-5 w-5 text-gray-400" />
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
      <div className="space-y-3 mb-4">
        <StatusFilter current={status} onChange={setStatus} counts={counts} />
        <div className="flex justify-end">
          <SortSelect value={sort} onChange={setSort} />
        </div>
      </div>

      {/* Candidate list */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            {candidates.length === 0
              ? "No candidates yet. Upload some CVs to get started."
              : "No candidates with this status."}
          </p>
          {candidates.length === 0 && (
            <button
              onClick={() => setShowUpload(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Upload CVs
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
        className="fixed bottom-6 right-6 h-14 w-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 active:bg-blue-800 transition-colors z-50"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
