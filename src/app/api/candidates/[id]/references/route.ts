import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { extractTextFromFile, IMAGE_MIME_TYPES, summariseReferences } from "@/lib/gemini";
import mammoth from "mammoth";

async function extractFromFile(buffer: Buffer, fileName: string): Promise<string> {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (IMAGE_MIME_TYPES[ext]) {
    return extractTextFromFile(buffer, IMAGE_MIME_TYPES[ext], true);
  }
  if (ext === "pdf") return extractTextFromFile(buffer, "application/pdf");
  if (ext === "docx") return (await mammoth.extractRawText({ buffer })).value;
  if (ext === "doc") return extractTextFromFile(buffer, "application/msword");
  return "";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Fetch existing references_text
    const { data: candidate } = await supabase
      .from("candidates")
      .select("references_text, references_file_name")
      .eq("id", id)
      .single();

    const existingText = candidate?.references_text || "";
    const existingFileNames: string[] = candidate?.references_file_name
      ? candidate.references_file_name.split(", ")
      : [];

    const newTexts: string[] = [];
    const newFileNames: string[] = [];
    const newFileUrls: string[] = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());

      // Extract text
      const extractedText = await extractFromFile(buffer, file.name);
      if (extractedText.trim()) newTexts.push(extractedText);

      // Upload to storage
      const storagePath = `references/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("cv-files")
        .upload(storagePath, buffer, { contentType: file.type });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from("cv-files")
          .getPublicUrl(storagePath);
        newFileUrls.push(publicUrl);
        newFileNames.push(file.name);
      }
    }

    const combinedText = [existingText, ...newTexts].filter(Boolean).join("\n\n---\n\n");
    const allFileNames = [...existingFileNames, ...newFileNames].filter(Boolean).join(", ");
    // Store last uploaded URL for backwards compat; could be extended to array
    const latestFileUrl = newFileUrls[newFileUrls.length - 1] || null;

    // Auto-generate references summary
    let referencesSummary: string | null = null;
    if (combinedText.trim()) {
      try {
        referencesSummary = await summariseReferences(combinedText);
      } catch {
        // non-fatal — summary can be regenerated
      }
    }

    const { error: updateError } = await supabase
      .from("candidates")
      .update({
        references_text: combinedText,
        references_file_url: latestFileUrl,
        references_file_name: allFileNames || null,
        references_summary: referencesSummary,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      addedCount: files.length,
      allFileNames,
      combinedText,
      referencesSummary,
    });
  } catch (error) {
    console.error("References upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
