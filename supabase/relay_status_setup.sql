-- Secure relay_01 control for the Relay Test website and read-only ESP32 polling.
-- Run this in the Supabase SQL Editor before enabling control on the live site.

alter table public.relay_status
  add column if not exists owner_id uuid references auth.users(id),
  add column if not exists paired_at timestamptz;

alter table public.relay_status enable row level security;

-- Replace every existing policy on this dedicated relay table with the
-- restrictive policies below, so no earlier permissive policy remains.
do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'relay_status'
  loop
    execute format(
      'drop policy if exists %I on public.relay_status',
      existing_policy.policyname
    );
  end loop;
end;
$$;

-- The ESP32 uses the publishable key to read the relay state only.
-- Browser users may read/update only a row assigned to their Supabase Auth user.
revoke all on table public.relay_status from public, anon, authenticated;
grant select (device_id, state, updated_at, paired_at) on table public.relay_status to anon;
grant select on table public.relay_status to authenticated;
grant update (state, updated_at) on table public.relay_status to authenticated;

create policy relay_01_anon_read
  on public.relay_status
  for select
  to anon
  using (device_id = 'relay_01');

create policy relay_01_owner_read
  on public.relay_status
  for select
  to authenticated
  using (device_id = 'relay_01' and owner_id = (select auth.uid()));

create policy relay_01_owner_update
  on public.relay_status
  for update
  to authenticated
  using (device_id = 'relay_01' and owner_id = (select auth.uid()))
  with check (device_id = 'relay_01' and owner_id = (select auth.uid()));

-- Keep pairing hashes in a separate table that browser roles cannot read.
create table if not exists public.relay_pairings (
  device_id text primary key,
  pairing_key_hash text,
  paired_at timestamptz
);
alter table public.relay_pairings enable row level security;
revoke all on table public.relay_pairings from public, anon, authenticated;
grant all on table public.relay_pairings to service_role;

create or replace function public.claim_relay_pairing(
  p_pairing_key_hash text,
  p_owner_id uuid
)
returns table (device_id text, paired_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner_id uuid;
  claimed_at timestamptz := now();
begin
  select status.owner_id
    into current_owner_id
    from public.relay_status as status
    where status.device_id = 'relay_01'
    for update;

  if not found then
    return;
  end if;
  if current_owner_id is not null and current_owner_id <> p_owner_id then
    raise exception 'This relay is already assigned to another account.';
  end if;

  update public.relay_pairings as pairing
    set pairing_key_hash = null,
        paired_at = claimed_at
    where pairing.device_id = 'relay_01'
      and pairing.paired_at is null
      and pairing.pairing_key_hash = p_pairing_key_hash;

  if not found then
    return;
  end if;

  update public.relay_status as status
    set owner_id = p_owner_id,
        paired_at = claimed_at
    where status.device_id = 'relay_01';

  return query select 'relay_01'::text, claimed_at;
end;
$$;

revoke all on function public.claim_relay_pairing(text, uuid) from public, anon, authenticated;
grant execute on function public.claim_relay_pairing(text, uuid) to service_role;

-- Provision a unique, one-time pairing code:
-- 1. Run `node scripts/generate-relay-pairing-key.mjs` on a trusted computer.
-- 2. Put PAIRING_KEY in the ESP32 firmware and give the same code to the device owner.
-- 3. Store only PAIRING_KEY_SHA256 in this database:
--
-- insert into public.relay_pairings (device_id, pairing_key_hash, paired_at)
-- values ('relay_01', 'PASTE_PAIRING_KEY_SHA256_HERE', null)
-- on conflict (device_id) do update
-- set pairing_key_hash = excluded.pairing_key_hash,
--     paired_at = null;
--
-- The Edge Function consumes the hash and marks relay_status as paired.
