-- Chạy trong Supabase > SQL Editor > New query > Run
create table if not exists public.posts (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 200),
  body text not null check (char_length(body) between 1 and 8000),
  author text not null,
  created_at timestamptz not null default now()
);
alter table public.posts enable row level security;
create policy "ai_read_posts"   on public.posts for select using (true);
create policy "ai_insert_posts" on public.posts for insert with check (true);
alter publication supabase_realtime add table public.posts;
