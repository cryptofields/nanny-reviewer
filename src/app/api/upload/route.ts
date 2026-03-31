export const maxDuration = 300; // 5 minutes — Gemini extraction can be slow

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { extractTextFromFile, IMAGE_MIME_TYPES } from "@/lib/gemini";
import mammoth from "mammoth";

async function extractText(buffer: Buffer, fileName: string): Promise<string> {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (IMAGE_MIME_TYPES[ext]) return extractTextFromFile(buffer, IMAGE_MIME_TYPES[ext], true);
  if (ext === "pdf") return extractTextFromFile(buffer, "application/pdf");
  if (ext === "docx") return (await mammoth.extractRawText({ buffer })).value;
  if (ext === "doc") return extractTextFromFile(buffer, "application/msword");
  return "";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    const synopsesMap: Record<string, string> = JSON.parse(
      (formData.get("synopses") as string | null) || "{}"
    );
    const agenciesMap: Record<string, string> = JSON.parse(
      (formData.get("agencies") as string | null) || "{}"
    );
    const referencesTextMap: Record<string, string> = JSON.parse(
      (formData.get("referencesText") as string | null) || "{}"
    );
    // Map of cv filename -> reference file key in formData
    const referencesFileMap: Record<string, string> = JSON.parse(
      (formData.get("referencesFileMap") as string | null) || "{}"
    );

    const results = [];

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileName = file.name;
      const fileExt = fileName.split(".").pop()?.toLowerCase();

      if (!["pdf", "docx", "doc"].includes(fileExt || "")) {
        results.push({ fileName, error: "Unsupported file type" });
        continue;
      }

      // Upload CV to Supabase Storage
      const storagePath = `cvs/${Date.now()}-${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("cv-files")
        .upload(storagePath, buffer, { contentType: file.type });

      if (uploadError) {
        results.push({ fileName, error: uploadError.message });
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("cv-files")
        .getPublicUrl(storagePath);

      // Extract CV text
      const extractedText = await extractText(buffer, fileName);

      // Handle reference file if provided
      let referencesText: string | null = referencesTextMap[fileName] || null;
      let referencesFileUrl: string | null = null;
      let referencesFileName: string | null = null;

      const refFileKeys = referencesFileMap[fileName]
        ? referencesFileMap[fileName].split(",").filter(Boolean)
        : [];

      const refFileNames: string[] = [];
      for (const refKey of refFileKeys) {
        const refFile = formData.get(refKey) as File | null;
        if (!refFile) continue;
        const refBuffer = Buffer.from(await refFile.arrayBuffer());
        const refText = await extractText(refBuffer, refFile.name);
        referencesText = [referencesText, refText].filter(Boolean).join("\n\n---\n\n");

        const refPath = `references/${Date.now()}-${refFile.name}`;
        const { error: refUploadError } = await supabase.storage
          .from("cv-files")
          .upload(refPath, refBuffer, { contentType: refFile.type });

        if (!refUploadError) {
          const { data: { publicUrl: refUrl } } = supabase.storage
            .from("cv-files")
            .getPublicUrl(refPath);
          referencesFileUrl = refUrl; // last one
          refFileNames.push(refFile.name);
        }
      }
      if (refFileNames.length > 0) {
        referencesFileName = refFileNames.join(", ");
      }

      const candidateName =
        fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").replace(/cv|resume|nanny/gi, "").trim() || "Unknown";

      const { data: candidate, error: dbError } = await supabase
        .from("candidates")
        .insert({
          name: candidateName,
          status: "new",
          cv_file_url: publicUrl,
          cv_file_name: fileName,
          cv_extracted_text: extractedText,
          agency_synopsis: synopsesMap[fileName] || null,
          agency: agenciesMap[fileName] || null,
          references_text: referencesText,
          references_file_url: referencesFileUrl,
          references_file_name: referencesFileName,
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
    const message = error instanceof Error ? error.message : String(error);
    console.error("Upload error:", message, error);
    return NextResponse.json({ error: "Upload failed: " + message }, { status: 500 });
  }
}
