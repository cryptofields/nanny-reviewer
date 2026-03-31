import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { extractTextFromPDF } from "@/lib/gemini";
import mammoth from "mammoth";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const synopses = formData.get("synopses") as string | null;
    const synopsesMap: Record<string, string> = synopses
      ? JSON.parse(synopses)
      : {};
    const agencies = formData.get("agencies") as string | null;
    const agenciesMap: Record<string, string> = agencies
      ? JSON.parse(agencies)
      : {};

    const results = [];

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileName = file.name;
      const fileExt = fileName.split(".").pop()?.toLowerCase();

      // Upload to Supabase Storage
      const storagePath = `cvs/${Date.now()}-${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("cv-files")
        .upload(storagePath, buffer, {
          contentType: file.type,
        });

      if (uploadError) {
        results.push({ fileName, error: uploadError.message });
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("cv-files").getPublicUrl(storagePath);

      // Extract text from CV
      let extractedText: string;

      if (fileExt === "pdf") {
        extractedText = await extractTextFromPDF(buffer, "application/pdf");
      } else if (fileExt === "docx") {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
      } else if (fileExt === "doc") {
        extractedText = await extractTextFromPDF(
          buffer,
          "application/msword"
        );
      } else {
        results.push({ fileName, error: "Unsupported file type" });
        continue;
      }

      // Get a candidate name from the filename (will be updated by AI later)
      const candidateName = fileName
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ")
        .replace(/cv|resume|nanny/gi, "")
        .trim() || "Unknown";

      // Get synopsis and agency for this file if provided
      const synopsis = synopsesMap[fileName] || null;
      const agency = agenciesMap[fileName] || null;

      // Create candidate record
      const { data: candidate, error: dbError } = await supabase
        .from("candidates")
        .insert({
          name: candidateName,
          status: "new",
          cv_file_url: publicUrl,
          cv_file_name: fileName,
          cv_extracted_text: extractedText,
          agency_synopsis: synopsis,
          agency,
        })
        .select()
        .single();

      if (dbError) {
        results.push({ fileName, error: dbError.message });
        continue;
      }

      results.push({ fileName, candidateId: candidate.id, success: true });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
