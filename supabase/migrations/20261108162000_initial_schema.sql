create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  role text not null default 'admin' check (role in ('admin', 'operator')),
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text not null,
  phone text not null default '',
  email text not null default '',
  customer_address jsonb not null default '{}'::jsonb,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  label text not null default 'Obra',
  address jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default '',
  description text not null default '',
  billing_unit text not null default 'diária',
  billing_mode text not null default 'daily',
  active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.equipment_price_rules (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  min_days integer not null check (min_days > 0),
  max_days integer,
  amount numeric(12,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  check (max_days is null or max_days >= min_days)
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  work_address_id uuid references public.customer_addresses(id),
  number text not null unique,
  start_date date not null,
  start_time time not null,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null default 'Rascunho' check (status in ('Rascunho', 'Aguardando assinatura', 'Assinado', 'Recusado', 'Cancelado')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id),
  quantity integer not null check (quantity > 0),
  days integer not null check (days > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  total numeric(12,2) not null check (total >= 0)
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null unique references public.quotes(id),
  customer_id uuid not null references public.customers(id),
  work_address_id uuid references public.customer_addresses(id),
  number text not null unique,
  start_date date not null,
  due_date date not null,
  total numeric(12,2) not null default 0,
  status text not null default 'Ativo' check (status in ('Aguardando assinatura', 'Ativo', 'Vencendo', 'Vencido', 'Renovado', 'Encerrado', 'Cancelado')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.contract_items (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id),
  quantity integer not null check (quantity > 0),
  days integer not null check (days > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  total numeric(12,2) not null check (total >= 0)
);

create table if not exists public.contract_renewals (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  mode text not null default 'Novo ciclo de locação',
  date timestamptz not null default now(),
  additional_days integer not null check (additional_days > 0),
  additional_value numeric(12,2) not null check (additional_value >= 0),
  new_due_date date not null,
  created_by uuid not null default auth.uid() references auth.users(id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  customer_id uuid not null references public.customers(id),
  description text not null,
  due_amount numeric(12,2) not null check (due_amount >= 0),
  received_amount numeric(12,2) not null default 0 check (received_amount >= 0 and received_amount <= due_amount),
  due_date date not null,
  payment_date date not null default current_date,
  method text not null default 'PIX' check (method in ('PIX', 'Dinheiro', 'Transferência', 'Outros')),
  notes text not null default '',
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.collection_tasks (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  status text not null default 'Pendente' check (status in ('Pendente', 'Realizado', 'Renovação solicitada', 'Cliente não encontrado')),
  updated_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users(id)
);

create table if not exists public.signed_documents (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references public.quotes(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete cascade,
  provider text not null default 'simulation',
  status text not null default 'pending',
  external_id text,
  file_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id),
  contract_id uuid references public.contracts(id),
  channel text not null,
  event text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.customers enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.equipment enable row level security;
alter table public.equipment_price_rules enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_items enable row level security;
alter table public.contract_renewals enable row level security;
alter table public.payments enable row level security;
alter table public.collection_tasks enable row level security;
alter table public.signed_documents enable row level security;
alter table public.notifications enable row level security;
alter table public.system_settings enable row level security;

create policy "authenticated users can access users" on public.users for all to authenticated using (true) with check (true);
create policy "authenticated users can access customers" on public.customers for all to authenticated using (true) with check (true);
create policy "authenticated users can access customer addresses" on public.customer_addresses for all to authenticated using (true) with check (true);
create policy "authenticated users can access equipment" on public.equipment for all to authenticated using (true) with check (true);
create policy "authenticated users can access price rules" on public.equipment_price_rules for all to authenticated using (true) with check (true);
create policy "authenticated users can access quotes" on public.quotes for all to authenticated using (true) with check (true);
create policy "authenticated users can access quote items" on public.quote_items for all to authenticated using (true) with check (true);
create policy "authenticated users can access contracts" on public.contracts for all to authenticated using (true) with check (true);
create policy "authenticated users can access contract items" on public.contract_items for all to authenticated using (true) with check (true);
create policy "authenticated users can access renewals" on public.contract_renewals for all to authenticated using (true) with check (true);
create policy "authenticated users can access payments" on public.payments for all to authenticated using (true) with check (true);
create policy "authenticated users can access collection tasks" on public.collection_tasks for all to authenticated using (true) with check (true);
create policy "authenticated users can access signed documents" on public.signed_documents for all to authenticated using (true) with check (true);
create policy "authenticated users can access notifications" on public.notifications for all to authenticated using (true) with check (true);
create policy "authenticated users can access settings" on public.system_settings for all to authenticated using (true) with check (true);
