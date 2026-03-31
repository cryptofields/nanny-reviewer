import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { extractTextFromPDF } from "@/lib/gemini";
import mammoth from "mammoth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase();

    let extractedText = "";
    if (ext === "pdf") {
      extractedText = await extractTextFromPDF(buffer, "application/pdf");
    } else if (ext === "docx") {
      extractedText = (await mammoth.extractRawText({ buffer })).value;
    } else if (ext === "doc") {
      extractedText = await extractTextFromPDF(buffer, "application/msword");
    }

    // Upload file to storage
    const storagePath = `references/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("cv-files")
      .upload(storagePath, buffer, { contentType: file.type });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from("cv-files")
      .getPublicUrl(storagePath);

    // Fetch existing references_text to append
    const { data: candidate } = await supabase
      .from("candidates")
      .select("references_text")
      .eq("id", id)
      .single();

    const combinedText = [candidate?.references_text, extractedText]
      .filter(Boolean)
      .join("\n\n");

    const { error: updateError } = await supabase
      .from("candidates")
      .update({
        references_text: combinedText,
        references_file_url: publicUrl,
        references_file_name: file.name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, extractedText });
  } catch (error) {
    console.error("References upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
