import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const FAMILY_CONTEXT = `
You are evaluating nanny candidates for a family in Muswell Hill, London (N10 3PU).

FAMILY SITUATION:
- Son: Lopo, born 19/04/2022 (nearly 4 years old, active toddler)
- Daughter: Livia, born 16/03/2026 (newborn baby)
- Both parents work full-time
- Live-out nanny needed
- Family has a dog
- Driving is ESSENTIAL (school runs, activities, drop-offs)
- Cooking and light housework are a nice bonus but not required
- English-speaking household

YOUR TASK:
Analyse this nanny candidate's CV (and agency synopsis if provided) and produce a JSON response with the following structure. Be direct, honest, and helpful. Tailor everything to this specific family's needs.
`;

const SCORING_RUBRIC = `
SCORING CRITERIA (each scored 1-10):

1. "tenure_stability" - Length of previous positions. Longer stints (2+ years) score higher. Multiple short stints (<1 year) score low. Weight: HIGHEST.

2. "multi_child_experience" - Experience managing multiple children simultaneously, especially babies/toddlers alongside older children (like a newborn + nearly-4-year-old). Weight: VERY HIGH.

3. "early_years_qualifications" - Formal qualifications: CACHE, NVQ Level 3+, Montessori diploma, NNEB, BA in Early Childhood, etc. Weight: HIGH.

4. "newborn_experience" - Specific experience with babies 0-6 months: feeding routines, sleep training, newborn care. Weight: HIGH.

5. "proximity" - If location is mentioned, how close to Muswell Hill N10. If not mentioned, score 5 (neutral). Weight: MEDIUM.

6. "first_aid" - Current paediatric first aid certification. Weight: MEDIUM.

7. "ofsted_dbs" - Mentions of Ofsted registration or enhanced DBS check. Weight: MEDIUM.

8. "employment_gaps" - Fewer unexplained gaps = higher score. Maternity leave or study are acceptable. Weight: MEDIUM.

9. "activities_enrichment" - Mentions of playgroups, classes, sensory play, developmental activities, outdoor activities. Weight: LOWER.

10. "proactivity" - Evidence of meal planning, milestone tracking, activity scheduling, developmental focus. Weight: LOWER.

RED FLAGS to identify:
- Very short tenures across multiple positions (<6 months)
- No qualifications mentioned at all
- Estimated young age suggesting very early career (higher flight risk - may leave to start own family)
- No experience with babies or newborns
- No driving licence mentioned
- Large unexplained employment gaps

GREEN FLAGS to identify:
- Long tenures (3+ years in a single family)
- Specific newborn experience
- Multiple qualifications
- First aid certified
- Experience with similar age combinations
- Mentions of driving and own car

RESPONSE FORMAT (strict JSON):
{
  "name": "Candidate's full name",
  "estimated_age": "e.g. 28-32 or 'Unknown' if truly impossible to estimate",
  "review": "3-5 sentence personalised review tailored to this family. Highlight how this candidate fits (or doesn't) for Lopo (nearly 4) and Livia (newborn). Be direct and helpful.",
  "scores": {
    "tenure_stability": { "score": 7, "justification": "One line explanation" },
    "multi_child_experience": { "score": 8, "justification": "..." },
    "early_years_qualifications": { "score": 6, "justification": "..." },
    "newborn_experience": { "score": 9, "justification": "..." },
    "proximity": { "score": 5, "justification": "..." },
    "first_aid": { "score": 3, "justification": "..." },
    "ofsted_dbs": { "score": 4, "justification": "..." },
    "employment_gaps": { "score": 8, "justification": "..." },
    "activities_enrichment": { "score": 7, "justification": "..." },
    "proactivity": { "score": 6, "justification": "..." }
  },
  "flags": [
    { "type": "red", "message": "No driving licence mentioned" },
    { "type": "green", "message": "5 years with one family" }
  ]
}

IMPORTANT: Return ONLY valid JSON. No markdown, no code fences, no extra text.
`;

const SCORE_WEIGHTS: Record<string, number> = {
  tenure_stability: 10,
  multi_child_experience: 9,
  early_years_qualifications: 8,
  newborn_experience: 8,
  proximity: 6,
  first_aid: 6,
  ofsted_dbs: 6,
  employment_gaps: 6,
  activities_enrichment: 4,
  proactivity: 4,
};

export function calculateOverallScore(
  scores: Record<string, { score: number; justification: string }>
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [key, { score }] of Object.entries(scores)) {
    const weight = SCORE_WEIGHTS[key] || 5;
    weightedSum += score * weight;
    totalWeight += weight;
  }

  return Math.round((weightedSum / totalWeight) * 10) / 10;
}

export async function analyseCandidate(
  cvText: string,
  agencySynopsis?: string | null,
  referencesText?: string | null
): Promise<{
  name: string;
  estimated_age: string;
  review: string;
  scores: Record<string, { score: number; justification: string }>;
  flags: Array<{ type: "red" | "green"; message: string }>;
}> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro-preview-06-05" });

  let prompt = `${FAMILY_CONTEXT}\n${SCORING_RUBRIC}\n\n--- CV TEXT ---\n${cvText}`;

  if (agencySynopsis) {
    prompt += `\n\n--- AGENCY SYNOPSIS ---\n${agencySynopsis}`;
  }

  if (referencesText) {
    prompt += `\n\n--- REFERENCES ---\n${referencesText}\n\nNote: Factor the references into your review and scoring. Strong, warm, detailed references from long-term employers are a positive signal. Vague or short references may indicate less enthusiasm from previous families.`;
  }

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Strip any markdown code fences if present
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  return JSON.parse(cleaned);
}

export async function extractTextFromFile(
  fileBuffer: Buffer,
  mimeType: string,
  isImage = false
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro-preview-06-05" });

  const prompt = isImage
    ? "This is an image of a reference letter or document. Extract ALL the text you can see in it. Return the complete text exactly as it appears. Do not summarise or interpret — just extract the raw text."
    : "Extract ALL text content from this document. Return the complete text exactly as it appears, preserving structure. Do not summarise or interpret — just extract the raw text.";

  const result = await model.generateContent([
    { inlineData: { mimeType, data: fileBuffer.toString("base64") } },
    prompt,
  ]);

  return result.response.text();
}

// Keep old name as alias for backwards compatibility
export const extractTextFromPDF = extractTextFromFile;

export async function summariseReferences(referencesText: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro-preview-06-05" });

  const prompt = `You are reviewing references for a nanny candidate applying to work with a family in London (a nearly 4-year-old boy and a newborn girl, both parents work full-time).

Here are the reference materials provided:

--- REFERENCES ---
${referencesText}

Write a concise, honest 3-5 sentence summary of what these references say. Cover:
- How long the referee knew the nanny and in what capacity
- What they say about her strengths (especially with young children/babies)
- Any concerns or omissions worth noting
- Overall impression: are these strong, warm references or vague/lukewarm ones?

Be direct and helpful. Do not pad. Return plain text only.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

export const IMAGE_MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};
