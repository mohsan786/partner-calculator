-- Supabase SQL Editor mein ye poora script ek dafa chalayen.
-- PEHLE niche 'APNI_EMAIL@example.com' ko apni asli email se badal dein (3 jagah).

create table if not exists public.ledger_state (
  id          text primary key,            -- hamesha 'main' (ek hi shared khata)
  data        jsonb not null,              -- poora khata (partners, employees, history)
  version     integer not null default 1,  -- dono partners ki tabdeeli takrane se bachane ke liye
  updated_at  timestamptz not null default now(),
  updated_by  text
);

alter table public.ledger_state enable row level security;

-- sirf ye 2 email padh/likh sakti hain (baqi koi nahi, chahe account bana le)
create policy "partners can read"
  on public.ledger_state for select to authenticated
  using ((auth.jwt() ->> 'email') in ('APNI_EMAIL@example.com'));

create policy "partners can insert"
  on public.ledger_state for insert to authenticated
  with check ((auth.jwt() ->> 'email') in ('APNI_EMAIL@example.com'));

create policy "partners can update"
  on public.ledger_state for update to authenticated
  using ((auth.jwt() ->> 'email') in ('APNI_EMAIL@example.com'))
  with check ((auth.jwt() ->> 'email') in ('APNI_EMAIL@example.com'));

-- dusre partner ki tabdeeli foran dikhane ke liye (realtime)
alter publication supabase_realtime add table public.ledger_state;
