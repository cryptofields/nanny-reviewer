-- Run this in the Supabase SQL Editor to set up the database

-- Create candidates table
create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Unknown',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new', 'shortlisted', 'rejected', 'interview_scheduled', 'offered')),
  cv_file_url text,
  cv_file_name text,
  cv_extracted_text text,
  agency_synopsis text,
  ai_review text,
  ai_full_review text,
  ai_scores jsonb,
  ai_overall_score numeric,
  ai_estimated_age text,
  ai_flags jsonb,
  user_notes text,
  tags text[] default '{}'
);

-- Create index for common queries
create index if not exists idx_candidates_status on candidates (status);
create index if not exists idx_candidates_score on candidates (ai_overall_score desc nulls last);
create index if not exists idx_candidates_created on candidates (created_at desc);

-- Enable RLS but allow all access (no auth)
alter table candidates enable row level security;

create policy "Allow all access" on candidates
  for all
  using (true)
  with check (true);

-- Create storage bucket for CV files
insert into storage.buckets (id, name, public)
values ('cv-files', 'cv-files', true)
on conflict (id) do nothing;

-- Allow public access to CV files (no auth)
create policy "Public CV access" on storage.objects
  for all
  using (bucket_id = 'cv-files')
  with check (bucket_id = 'cv-files');
