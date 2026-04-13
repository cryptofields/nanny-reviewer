export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { analyseCandidate, calculateOverallScore } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const { candidateId } = await request.json();

    // Fetch candidate
    const { data: candidate, error: fetchError } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", candidateId)
      .single();

    if (fetchError || !candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    if (!candidate.cv_extracted_text) {
      return NextResponse.json(
        { error: "No CV text available for analysis" },
        { status: 400 }
      );
    }

    // Run AI analysis
    const analysis = await analyseCandidate(
      candidate.cv_extracted_text,
      candidate.agency_synopsis,
      candidate.references_text
    );

    const overallScore = calculateOverallScore(analysis.scores);

    // Update candidate with AI results
    // cv_review is the CV-only assessment; full_review includes references
    // For backwards compat, ai_review stores cv_review (or legacy review)
    const { error: updateError } = await supabase
      .from("candidates")
      .update({
        name: analysis.name || candidate.name,
        ai_review: analysis.cv_review || analysis.review,
        ai_full_review: analysis.full_review || null,
        ai_scores: analysis.scores,
        ai_overall_score: overallScore,
        ai_estimated_age: analysis.estimated_age,
        ai_flags: analysis.flags,
        updated_at: new Date().toISOString(),
      })
      .eq("id", candidateId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      name: analysis.name,
      overallScore,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Analysis failed. Please retry." },
      { status: 500 }
    );
  }
}
