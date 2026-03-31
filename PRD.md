# Nanny Reviewer — Product Requirements Document

## Overview

A web application that helps parents evaluate nanny candidates by using AI to analyse CVs and agency synopses, producing tailored reviews and scores based on the family's specific needs and priorities.

## Family Context (Hardcoded)

The AI analysis is personalised to this family's situation:

- **Children:** Lopo (boy, born 19/04/2022 — nearly 4) and Livia (girl, born 16/03/2026 — newborn)
- **Location:** Muswell Hill, London N10 3PU
- **Setup:** Both parents work full-time, live-out nanny needed
- **Pets:** Dog
- **Requirements:** Must be able to drive (school runs, activities, drop-offs)
- **Nice to have:** Cooking, light housework (not required)

## Core User Flow

1. **Upload CVs** — Drag and drop one or more CV files (PDF, DOCX, or mixed)
2. **Add agency synopsis** (optional) — Paste text from agency email for any candidate
3. **AI Analysis** — Gemini processes each CV (and synopsis if provided), extracts key information, and generates a personalised review
4. **Review dashboard** — Browse all candidates with scores, reviews, tags, and filters
5. **Manage candidates** — Tag, add notes, compare, and organise into lists

## Scoring System

### Criteria (ordered by weight)

| # | Criterion | Weight | Description |
|---|-----------|--------|-------------|
| 1 | **Tenure & Stability** | Highest | Length of previous positions. Longer stints = stronger signal. Flag frequent short stints (<1 year). |
| 2 | **Multi-child & Young Child Experience** | Very High | Experience managing multiple children simultaneously, especially with babies/toddlers alongside older children. |
| 3 | **Early Years / Qualifications** | High | Formal early years qualifications (CACHE, NVQ, Montessori, NNEB, etc.). Paediatric first aid. |
| 4 | **Newborn Experience (0-6 months)** | High | Specific experience with newborns — feeding routines, sleep training, etc. |
| 5 | **Proximity** | Medium | If location is known, closeness to N10 3PU. Often not available from CV alone. |
| 6 | **First Aid / Paediatric First Aid** | Medium | Current certification specifically in paediatric first aid. |
| 7 | **Ofsted Registration / DBS** | Medium | Mentions of Ofsted registration or enhanced DBS check signal professionalism. |
| 8 | **Employment Gap Analysis** | Medium | Unexplained gaps in work history are flagged. Maternity leave or study are acceptable. |
| 9 | **Activities & Enrichment** | Lower | Mentions of playgroups, classes, sensory play, developmental activities, outdoor time. |
| 10 | **Proactivity Indicators** | Lower | Evidence of meal planning, milestone tracking, activity scheduling, developmental focus. |

### Scoring Display

- Each criterion gets a **numeric score (1-10)** under the hood
- Displayed to the user as **colour-coded labels**: Green (8-10), Amber (5-7), Red (1-4)
- **Overall score** is a weighted average displayed as both a number (e.g., 7.8/10) and a colour-coded badge
- Scores are accompanied by a **one-line justification** per criterion

### Red Flags (auto-flagged)

- Very short tenures across multiple positions (<6 months)
- No qualifications mentioned
- Estimated age suggesting very early career (potential flight risk)
- No experience with babies or newborns
- No driving licence mentioned
- Large unexplained employment gaps

### AI Review Output

For each candidate, the AI generates:

1. **Summary paragraph** (3-5 sentences) — Tailored to this family's needs. Highlights strengths and concerns relative to Lopo (nearly 4) and Livia (newborn). Written in a direct, helpful tone.
2. **Estimated age range** — If DOB/age not stated, AI estimates from career timeline
3. **Score breakdown** — All criteria with individual scores and one-line justifications
4. **Overall score** — Weighted average with colour badge
5. **Key flags** — Any red or green flags called out explicitly

## Features

### MVP (v1)

#### Upload & Input
- Drag-and-drop zone for CV files (PDF, DOCX)
- Multi-file upload support
- Per-candidate textarea for agency synopsis (paste from email)
- Upload progress indicator
- File validation (type, size limits)

#### AI Analysis
- Gemini API integration (latest model) for document text extraction
- Gemini API for analysis, scoring, and review generation
- Family context injected into every analysis prompt
- Processing status per candidate (queued, analysing, complete, error)
- Retry on failure

#### Dashboard
- Card-based candidate list (mobile-optimised)
- Each card shows: name, overall score badge, estimated age, key highlights
- Expand card for full review, score breakdown, flags
- Sort by: overall score, date added, name
- Filter by: score range, tags, flags

#### Candidate Management
- **Tags/Status:** Shortlisted, Rejected, Interview Scheduled, Offered, Custom tags
- **Kanban-style views** by status (optional, if time permits)
- **Notes:** Free-text notes field per candidate (post-meeting impressions)
- **List views:** Filter to see only shortlisted, only rejected, etc.

#### Data Persistence
- All candidates, CVs, scores, notes, tags stored in Supabase
- CV files stored in Supabase Storage
- Full history preserved — candidates from previous rounds remain accessible

### v2 (Future)
- Side-by-side candidate comparison
- Re-analyse with updated family context
- Export shortlist as PDF
- Bulk actions (tag multiple, delete multiple)
- Search across all candidates

## Technical Architecture

### Stack
- **Frontend:** Next.js 14+ (App Router), React, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes / Server Actions
- **Database:** Supabase (PostgreSQL)
- **File Storage:** Supabase Storage
- **AI:** Google Gemini API (latest model — gemini-2.5-pro or equivalent)
- **Hosting:** Railway
- **Auth:** None (open access via URL)

### Database Schema (Supabase)

```
candidates
├── id (uuid, PK)
├── name (text)
├── created_at (timestamptz)
├── updated_at (timestamptz)
├── status (text: 'new' | 'shortlisted' | 'rejected' | 'interview_scheduled' | 'offered')
├── cv_file_url (text — Supabase Storage URL)
├── cv_file_name (text)
├── cv_extracted_text (text — raw text from CV)
├── agency_synopsis (text — pasted by user)
├── ai_review (text — generated summary paragraph)
├── ai_scores (jsonb — { criterion: { score: number, justification: string } })
├── ai_overall_score (numeric)
├── ai_estimated_age (text — e.g., "28-32")
├── ai_flags (jsonb — array of { type: 'red' | 'green', message: string })
├── user_notes (text)
└── tags (text[] — custom tags)
```

### API Routes

- `POST /api/upload` — Accept CV files, store in Supabase Storage
- `POST /api/analyse` — Trigger Gemini analysis for a candidate
- `GET /api/candidates` — List all candidates with filters
- `PATCH /api/candidates/[id]` — Update status, tags, notes
- `DELETE /api/candidates/[id]` — Remove candidate

### Gemini Integration

Two-phase approach per candidate:

1. **Extract** — Send CV file to Gemini with instruction to extract structured data (name, work history, qualifications, etc.)
2. **Analyse** — Send extracted data + agency synopsis + family context to Gemini with scoring rubric. Return structured JSON with review, scores, flags.

The family context and scoring rubric are baked into the system prompt.

### File Processing

- PDF: Send directly to Gemini (supports PDF input)
- DOCX: Convert to text server-side (e.g., `mammoth` library) then send to Gemini
- Max file size: 10MB per file
- Supported types: .pdf, .docx, .doc

## UI/UX

### Mobile-First Design
- Card-based layout that stacks vertically on mobile
- Large tap targets for status changes and tags
- Swipe-friendly (consider swipe to shortlist/reject)
- Bottom navigation or sticky header for filters
- Upload zone works with mobile file picker

### Key Screens
1. **Home / Dashboard** — Candidate cards with filters and sort
2. **Upload** — Drag-and-drop zone + synopsis input
3. **Candidate Detail** — Full review, scores, flags, notes, status management
4. **List Views** — Filtered views by status (shortlisted, rejected, etc.)

### Design Language
- Clean, minimal, professional
- Score colours: Green (#22c55e), Amber (#f59e0b), Red (#ef4444)
- shadcn/ui components for consistency
- Dark mode not required for v1

## Non-Functional Requirements

- **Performance:** Analysis should complete within 30 seconds per candidate
- **Reliability:** Failed analyses can be retried
- **Storage:** Supabase free tier should be sufficient for 100+ candidates
- **Cost:** Gemini API costs are acceptable (user has API key)
- **Security:** No auth, but app URL should not be publicly indexed (noindex meta tag)
