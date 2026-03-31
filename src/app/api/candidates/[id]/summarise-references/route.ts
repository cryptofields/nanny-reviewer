import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { summariseReferences } from "@/lib/gemini";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: candidate } = await supabase
    .from("candidates")
    .select("references_text")
    .eq("id", id)
    .single();

  if (!candidate?.references_text) {
    return NextResponse.json({ error: "No references text to summarise" }, { status: 400 });
  }

  try {
    const summary = await summariseReferences(candidate.references_text);

    await supabase
      .from("candidates")
      .update({ references_summary: summary, updated_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error("Summarise error:", error);
    return NextResponse.json({ error: "Summarisation failed" }, { status: 500 });
  }
}
