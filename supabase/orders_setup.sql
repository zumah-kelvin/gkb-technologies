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
