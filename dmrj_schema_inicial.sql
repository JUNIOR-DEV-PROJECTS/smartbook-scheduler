-- =====================================================================
-- DMRJ Scheduling - schema inicial com isolamento por conta (RLS)
-- Revise antes de aplicar. Nao contem chaves, dados pessoais nem trial.
-- =====================================================================

create extension if not exists btree_gist;

-- ---------- Tipos ----------
do $$ begin
  create type public.plan_tier as enum ('starter', 'professional', 'business');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.billing_interval as enum ('monthly', 'annual');
exception when duplicate_object then null; end $$;

-- 'trial' existe no tipo, mas NUNCA e atribuido automaticamente.
do $$ begin
  create type public.subscription_status as enum
    ('none', 'active', 'pending_payment', 'past_due', 'canceled', 'incomplete', 'trial');
exception when duplicate_object then null; end $$;

-- ---------- Funcao utilitaria: updated_at ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- Perfis ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Negocios (a "conta" / tenant) ----------
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),
  timezone text not null default 'America/Cuiaba',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists businesses_owner_idx on public.businesses(owner_id);

drop trigger if exists businesses_updated_at on public.businesses;
create trigger businesses_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();

-- Funcao central de autorizacao: o usuario logado e dono deste negocio?
create or replace function public.owns_business(_business_id uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.businesses b
    where b.id = _business_id and b.owner_id = auth.uid()
  );
$$;

revoke all on function public.owns_business(uuid) from public, anon;
grant execute on function public.owns_business(uuid) to authenticated;

-- ---------- Clientes ----------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 160),
  email text check (email is null or char_length(email) <= 254),
  phone text check (phone is null or char_length(phone) <= 40),
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now()
);
create index if not exists customers_business_idx on public.customers(business_id);

-- ---------- Funcionarios ----------
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 160),
  email text check (email is null or char_length(email) <= 254),
  phone text check (phone is null or char_length(phone) <= 40),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists staff_business_idx on public.staff(business_id);

-- ---------- Servicos ----------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  duration_minutes integer not null check (duration_minutes between 5 and 1440),
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'BRL' check (currency ~ '^[A-Z]{3}$'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists services_business_idx on public.services(business_id);

-- ---------- Quais funcionarios fazem quais servicos ----------
create table if not exists public.staff_services (
  staff_id uuid not null references public.staff(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (staff_id, service_id)
);

-- ---------- Disponibilidade semanal ----------
create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),  -- 0 = domingo
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);
create index if not exists availability_business_idx on public.availability(business_id);
create index if not exists availability_staff_idx on public.availability(staff_id);

-- ---------- Agendamentos ----------
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  staff_id uuid not null references public.staff(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'canceled', 'no_show')),
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Impede dois agendamentos ativos sobrepostos para o mesmo funcionario
  constraint appointments_no_overlap
    exclude using gist (
      staff_id with =,
      tstzrange(starts_at, ends_at) with &&
    ) where (status = 'scheduled')
);
create index if not exists appointments_business_idx on public.appointments(business_id, starts_at);

-- Garante que cliente, funcionario e servico pertencem ao MESMO negocio do agendamento
create or replace function public.enforce_appointment_same_business()
returns trigger language plpgsql
set search_path = public
as $$
begin
  if not exists (select 1 from public.customers c where c.id = new.customer_id and c.business_id = new.business_id) then
    raise exception 'Cliente nao pertence a este negocio';
  end if;
  if not exists (select 1 from public.staff s where s.id = new.staff_id and s.business_id = new.business_id) then
    raise exception 'Funcionario nao pertence a este negocio';
  end if;
  if not exists (select 1 from public.services v where v.id = new.service_id and v.business_id = new.business_id) then
    raise exception 'Servico nao pertence a este negocio';
  end if;
  return new;
end $$;

drop trigger if exists appointments_same_business on public.appointments;
create trigger appointments_same_business
  before insert or update on public.appointments
  for each row execute function public.enforce_appointment_same_business();

-- ---------- Creditos (somente leitura para o usuario) ----------
create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  delta integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);
create index if not exists credit_ledger_business_idx on public.credit_ledger(business_id);

-- ---------- Assinaturas (somente o backend altera) ----------
create table if not exists public.subscriptions (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  plan public.plan_tier,
  billing_interval public.billing_interval,
  status public.subscription_status not null default 'none',
  provider text,                      -- preenchido so quando um provedor for conectado
  provider_customer_id text,
  provider_subscription_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Cria a linha de assinatura como "none" (sem assinatura) junto com o negocio
create or replace function public.create_default_subscription()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (business_id, status)
  values (new.id, 'none')
  on conflict (business_id) do nothing;
  return new;
end $$;

drop trigger if exists businesses_default_subscription on public.businesses;
create trigger businesses_default_subscription
  after insert on public.businesses
  for each row execute function public.create_default_subscription();

-- =====================================================================
-- SEGURANCA: RLS em todas as tabelas
-- =====================================================================
alter table public.profiles       enable row level security;
alter table public.businesses     enable row level security;
alter table public.customers      enable row level security;
alter table public.staff          enable row level security;
alter table public.services       enable row level security;
alter table public.staff_services enable row level security;
alter table public.availability   enable row level security;
alter table public.appointments   enable row level security;
alter table public.credit_ledger  enable row level security;
alter table public.subscriptions  enable row level security;

-- Visitantes (anon) nao acessam nenhuma tabela diretamente
revoke all on public.profiles, public.businesses, public.customers, public.staff,
  public.services, public.staff_services, public.availability, public.appointments,
  public.credit_ledger, public.subscriptions from anon;

-- profiles: cada um ve e edita so o proprio
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- businesses: so o dono
drop policy if exists businesses_select_own on public.businesses;
create policy businesses_select_own on public.businesses
  for select to authenticated using (owner_id = auth.uid());
drop policy if exists businesses_insert_own on public.businesses;
create policy businesses_insert_own on public.businesses
  for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists businesses_update_own on public.businesses;
create policy businesses_update_own on public.businesses
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists businesses_delete_own on public.businesses;
create policy businesses_delete_own on public.businesses
  for delete to authenticated using (owner_id = auth.uid());

-- Tabelas com business_id: acesso total somente ao dono do negocio
do $$
declare t text;
begin
  foreach t in array array['customers', 'staff', 'services', 'availability', 'appointments']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_owner_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (public.owns_business(business_id))
         with check (public.owns_business(business_id))',
      t || '_owner_all', t);
  end loop;
end $$;

-- staff_services: dono do funcionario E do servico
drop policy if exists staff_services_owner_all on public.staff_services;
create policy staff_services_owner_all on public.staff_services
  for all to authenticated
  using (
    exists (select 1 from public.staff s where s.id = staff_id and public.owns_business(s.business_id))
  )
  with check (
    exists (select 1 from public.staff s where s.id = staff_id and public.owns_business(s.business_id))
    and exists (select 1 from public.services v where v.id = service_id and public.owns_business(v.business_id))
    and (select s.business_id from public.staff s where s.id = staff_id)
      = (select v.business_id from public.services v where v.id = service_id)
  );

-- credit_ledger e subscriptions: usuario so LE. Escrita apenas pelo backend (service role).
drop policy if exists credit_ledger_select_own on public.credit_ledger;
create policy credit_ledger_select_own on public.credit_ledger
  for select to authenticated using (public.owns_business(business_id));

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated using (public.owns_business(business_id));

revoke insert, update, delete on public.credit_ledger from authenticated;
revoke insert, update, delete on public.subscriptions from authenticated;

-- =====================================================================
-- PAGINA PUBLICA /book/[slug]: expor so o minimo, via funcoes
-- =====================================================================
create or replace function public.get_public_business(_slug text)
returns table (id uuid, name text, slug text, timezone text)
language sql stable security definer
set search_path = public
as $$
  select b.id, b.name, b.slug, b.timezone
  from public.businesses b
  where b.slug = _slug;
$$;

create or replace function public.get_public_services(_slug text)
returns table (id uuid, name text, duration_minutes integer, price_cents integer, currency text)
language sql stable security definer
set search_path = public
as $$
  select v.id, v.name, v.duration_minutes, v.price_cents, v.currency
  from public.services v
  join public.businesses b on b.id = v.business_id
  where b.slug = _slug and v.active;
$$;

revoke all on function public.get_public_business(text) from public;
revoke all on function public.get_public_services(text) from public;
grant execute on function public.get_public_business(text) to anon, authenticated;
grant execute on function public.get_public_services(text) to anon, authenticated;

-- NOTA: a criacao de agendamento pelo cliente final (sem login) deve ser feita
-- em uma etapa separada, por uma funcao propria com validacao de horario.
-- Nao libere INSERT direto na tabela appointments para anon.
