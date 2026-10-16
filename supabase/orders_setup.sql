-- Order tracking for the GKB client and admin portals.
-- Run this in the Supabase SQL Editor before using the order workflow.

create table if not exists public.gkb_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin'))
);

alter table public.gkb_user_roles enable row level security;
revoke all on table public.gkb_user_roles from public, anon, authenticated;
grant select on table public.gkb_user_roles to authenticated;

drop policy if exists gkb_user_roles_read_self on public.gkb_user_roles;
create policy gkb_user_roles_read_self
  on public.gkb_user_roles
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.is_gkb_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.gkb_user_roles as roles
    where roles.user_id = (select auth.uid())
      and roles.role = 'admin'
  );
$$;

revoke all on function public.is_gkb_admin() from public, anon;
grant execute on function public.is_gkb_admin() to authenticated;

create table if not exists public.gkb_user_devices (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_key text not null,
  device_name text not null,
  status text not null,
  last_alert text not null default '',
  project text,
  relay_channels smallint check (relay_channels in (4, 6, 8)),
  created_at timestamptz not null default now(),
  primary key (user_id, device_key)
);

alter table public.gkb_user_devices enable row level security;
revoke all on table public.gkb_user_devices from public, anon, authenticated;
grant select, insert, delete on table public.gkb_user_devices to authenticated;
grant update (user_id, device_key, device_name, status, last_alert, project, relay_channels)
  on table public.gkb_user_devices to authenticated;

drop policy if exists gkb_user_devices_read_owner_or_admin on public.gkb_user_devices;
create policy gkb_user_devices_read_owner_or_admin
  on public.gkb_user_devices
  for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_gkb_admin()));

drop policy if exists gkb_user_devices_insert_owner on public.gkb_user_devices;
create policy gkb_user_devices_insert_owner
  on public.gkb_user_devices
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists gkb_user_devices_update_owner on public.gkb_user_devices;
create policy gkb_user_devices_update_owner
  on public.gkb_user_devices
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists gkb_user_devices_delete_owner on public.gkb_user_devices;
create policy gkb_user_devices_delete_owner
  on public.gkb_user_devices
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

create table if not exists public.gkb_complaints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_email text not null,
  complaint text not null check (length(btrim(complaint)) between 1 and 5000),
  solved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.gkb_complaints enable row level security;
revoke all on table public.gkb_complaints from public, anon, authenticated;
grant select, insert on table public.gkb_complaints to authenticated;
grant update (solved) on table public.gkb_complaints to authenticated;

drop policy if exists gkb_complaints_read_owner_or_admin on public.gkb_complaints;
create policy gkb_complaints_read_owner_or_admin
  on public.gkb_complaints
  for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_gkb_admin()));

drop policy if exists gkb_complaints_insert_owner on public.gkb_complaints;
create policy gkb_complaints_insert_owner
  on public.gkb_complaints
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and client_email = (select auth.jwt() ->> 'email')
    and solved = false
  );

drop policy if exists gkb_complaints_update_admin on public.gkb_complaints;
create policy gkb_complaints_update_admin
  on public.gkb_complaints
  for update
  to authenticated
  using ((select public.is_gkb_admin()))
  with check ((select public.is_gkb_admin()));

create table if not exists public.gkb_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_email text not null,
  product_name text not null check (length(btrim(product_name)) between 1 and 200),
  quantity integer not null check (quantity between 1 and 999),
  customer_name text not null check (length(btrim(customer_name)) between 1 and 120),
  customer_phone text not null check (length(btrim(customer_phone)) between 5 and 30),
  fulfillment_method text not null check (fulfillment_method in ('delivery', 'pickup')),
  delivery_address text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'delivered', 'picked_up')),
  created_at timestamptz not null default now(),
  status_updated_at timestamptz not null default now(),
  constraint gkb_orders_delivery_address_required
    check (fulfillment_method = 'pickup' or length(btrim(delivery_address)) > 0),
  constraint gkb_orders_status_matches_fulfillment
    check (
      (status <> 'delivered' or fulfillment_method = 'delivery')
      and (status <> 'picked_up' or fulfillment_method = 'pickup')
    )
);

alter table public.gkb_orders enable row level security;
revoke all on table public.gkb_orders from public, anon, authenticated;
grant select on table public.gkb_orders to authenticated;
grant insert (
  user_id,
  customer_email,
  product_name,
  quantity,
  customer_name,
  customer_phone,
  fulfillment_method,
  delivery_address
) on table public.gkb_orders to authenticated;
grant update (status, status_updated_at) on table public.gkb_orders to authenticated;

drop policy if exists gkb_orders_read_owner_or_admin on public.gkb_orders;
create policy gkb_orders_read_owner_or_admin
  on public.gkb_orders
  for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_gkb_admin()));

drop policy if exists gkb_orders_insert_owner on public.gkb_orders;
create policy gkb_orders_insert_owner
  on public.gkb_orders
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and customer_email = (select auth.jwt() ->> 'email')
    and status = 'pending'
  );

drop policy if exists gkb_orders_update_admin on public.gkb_orders;
create policy gkb_orders_update_admin
  on public.gkb_orders
  for update
  to authenticated
  using ((select public.is_gkb_admin()))
  with check ((select public.is_gkb_admin()));

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'gkb_orders'
  ) then
    alter publication supabase_realtime add table public.gkb_orders;
  end if;
end;
$$;

-- After creating/signing in to the GKB admin account through the portal,
-- promote that exact Supabase Auth account with this privileged SQL statement.
-- Change the email below only if the intended admin account uses another address.
--
-- insert into public.gkb_user_roles (user_id, role)
-- select id, 'admin'
-- from auth.users
-- where email = 'zumkel023@gmail.com'
-- on conflict (user_id) do update set role = excluded.role;
--
-- For a verified phone-only admin Auth account, use its exact phone number instead:
-- where phone = '+233XXXXXXXXX'
