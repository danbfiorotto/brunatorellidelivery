-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Clinics Table
create table if not exists clinics (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  address text,
  email text,
  phone text,
  status text default 'active'
);

-- Patients Table
create table if not exists patients (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  email text,
  phone text,
  last_visit timestamp with time zone,
  user_id uuid references auth.users(id) on delete cascade not null
);

-- Appointments Table
create table if not exists appointments (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  clinic_id uuid references clinics(id),
  patient_id uuid references patients(id) on delete cascade,
  date date not null,
  time time not null,
  procedure text not null,
  value numeric not null,
  status text default 'scheduled', -- scheduled, pending, paid
  notes text
);

-- Add user_id and updated_at to patients if they don't exist
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name='patients' and column_name='user_id') then
    -- Para dados existentes, precisamos de um user_id válido
    -- Se houver dados, você precisará atualizar manualmente ou deletar os registros antigos
    alter table patients add column user_id uuid references auth.users(id) on delete cascade;
    -- Se você tem dados antigos, você precisará atualizar manualmente:
    -- UPDATE patients SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
    -- Depois tornar obrigatório:
    alter table patients alter column user_id set not null;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name='patients' and column_name='updated_at') then
    alter table patients add column updated_at timestamp with time zone default timezone('utc'::text, now()) not null;
  end if;
end $$;

-- Add new columns to appointments if they don't exist
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name='appointments' and column_name='currency') then
    alter table appointments add column currency text default 'BRL';
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name='appointments' and column_name='payment_type') then
    alter table appointments add column payment_type text default '100';
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name='appointments' and column_name='payment_percentage') then
    alter table appointments add column payment_percentage numeric;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name='appointments' and column_name='is_paid') then
    alter table appointments add column is_paid boolean default false;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name='appointments' and column_name='clinical_evolution') then
    alter table appointments add column clinical_evolution text;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name='appointments' and column_name='payment_date') then
    alter table appointments add column payment_date date;
  end if;
end $$;

-- Radiographs Table (for storing patient radiographs)
create table if not exists radiographs (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  patient_id uuid references patients(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete set null,
  file_url text not null,
  file_name text,
  file_size integer,
  description text
);

-- User Profiles Table (for storing user profile information)
create table if not exists user_profiles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid unique not null, -- References auth.users(id)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text,
  phone text,
  language text default 'pt-BR',
  currency text default 'BRL',
  theme text default 'light',
  notifications_push boolean default true,
  notifications_appointments boolean default true,
  notifications_pending boolean default true,
  notifications_clinics boolean default false,
  notifications_plan_expiry boolean default true
);

-- Add theme column to user_profiles if it doesn't exist
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name='user_profiles' and column_name='theme') then
    alter table user_profiles add column theme text default 'light';
  end if;
end $$;

-- Procedures Table (for managing dental procedures)
create table if not exists procedures (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null unique,
  description text,
  category text,
  is_active boolean default true,
  display_order integer default 0
);

-- Row Level Security (RLS)
alter table clinics enable row level security;
alter table patients enable row level security;
alter table appointments enable row level security;
alter table radiographs enable row level security;
alter table user_profiles enable row level security;
alter table procedures enable row level security;

-- Drop existing policies if they exist and recreate
drop policy if exists "Public clinics access" on clinics;
drop policy if exists "Public patients access" on patients;
drop policy if exists "Public appointments access" on appointments;
drop policy if exists "Public radiographs access" on radiographs;
drop policy if exists "Public user_profiles access" on user_profiles;
drop policy if exists "Users can manage own profile" on user_profiles;
drop policy if exists "Public procedures access" on procedures;

-- Policies (Public for demo purposes, should be authenticated in production)
create policy "Public clinics access" on clinics for all using (true);
create policy "Public patients access" on patients for all using (true);
create policy "Public appointments access" on appointments for all using (true);
create policy "Public radiographs access" on radiographs for all using (true);
create policy "Public user_profiles access" on user_profiles for all using (true);
create policy "Users can manage own profile" on user_profiles for all using (true);
create policy "Public procedures access" on procedures for all using (true);

-- Insert default procedures (idempotent)
do $$
begin
  if not exists (select 1 from procedures where name = 'Consulta inicial') then
    insert into procedures (name, display_order, is_active) values
      ('Consulta inicial', 1, true),
      ('Consulta de retorno', 2, true),
      ('Tratamento endodôntico', 3, true),
      ('Retratamento endodôntico', 4, true),
      ('Cirurgia parendodôntica', 5, true),
      ('Instalação de pino de fibra', 6, true),
      ('Coroa metalocerâmica', 7, true),
      ('Coroa de porcelana', 8, true),
      ('Restauração direta em resina', 9, true),
      ('Restauração indireta em resina', 10, true),
      ('Restauração de amálgama', 11, true),
      ('Levantamento de parede proximal em resina para isolamento absoluto', 12, true),
      ('Cirurgia exploratória', 13, true),
      ('Faceta de resina', 14, true),
      ('Faceta de porcelana', 15, true),
      ('Profilaxia dentária', 16, true),
      ('Aumento de coroa clínica', 17, true);
  end if;
end $$;

-- ==================== STORAGE BUCKET ====================
-- Create storage bucket for radiographs (run this in Supabase Dashboard > Storage)
-- The bucket will be created via the Supabase Dashboard, but here's the SQL for policies:

-- Note: You need to create the bucket manually in Supabase Dashboard:
-- 1. Go to Storage > New Bucket
-- 2. Name: "radiographs"
-- 3. Public: Yes (or No if you want private access)
-- 4. File size limit: 10MB (or as needed)
-- 5. Allowed MIME types: image/*

-- Storage Policies (run after creating the bucket)
-- Drop existing policies if they exist and recreate
drop policy if exists "Public read access" on storage.objects;
drop policy if exists "Authenticated upload" on storage.objects;
drop policy if exists "Authenticated update" on storage.objects;
drop policy if exists "Authenticated delete" on storage.objects;

-- Allow public read access
create policy "Public read access" on storage.objects
for select
using (bucket_id = 'radiographs');

-- Allow authenticated users to upload
create policy "Authenticated upload" on storage.objects
for insert
with check (
    bucket_id = 'radiographs' 
    and auth.role() = 'authenticated'
);

-- Allow authenticated users to update their own files
create policy "Authenticated update" on storage.objects
for update
using (
    bucket_id = 'radiographs' 
    and auth.role() = 'authenticated'
);

-- Allow authenticated users to delete their own files
create policy "Authenticated delete" on storage.objects
for delete
using (
    bucket_id = 'radiographs' 
    and auth.role() = 'authenticated'
);

-- ==================== MIGRATION: Update appointments foreign key ====================
-- This migration updates the patient_id foreign key to include ON DELETE CASCADE
-- This allows deleting patients and automatically deletes their related appointments
do $$
begin
    -- Drop the existing foreign key constraint if it exists
    if exists (
        select 1 
        from information_schema.table_constraints 
        where constraint_name = 'appointments_patient_id_fkey'
        and table_name = 'appointments'
    ) then
        alter table appointments 
        drop constraint appointments_patient_id_fkey;
    end if;
    
    -- Recreate the foreign key with ON DELETE CASCADE
    alter table appointments
    add constraint appointments_patient_id_fkey
    foreign key (patient_id)
    references patients(id)
    on delete cascade;
end $$;

-- ==================== RPC FUNCTION: get_appointment_totals ====================
-- This function calculates appointment totals server-side to avoid fetching
-- thousands of records to the client for calculation
-- Returns: total count, received amount, pending amount, and count by status
create or replace function get_appointment_totals(p_user_id uuid)
returns json
language plpgsql
security definer
as $$
declare
    result json;
    user_patient_ids uuid[];
begin
    -- Get all patient IDs belonging to this user
    select array_agg(id) into user_patient_ids
    from patients
    where user_id = p_user_id;
    
    -- If user has no patients, return zeros
    if user_patient_ids is null or array_length(user_patient_ids, 1) is null then
        return json_build_object(
            'total', 0,
            'received', 0,
            'pending', 0,
            'totalValue', 0,
            'byStatus', json_build_object(
                'scheduled', 0,
                'pending', 0,
                'paid', 0
            )
        );
    end if;
    
    -- Calculate all totals in a single query
    select json_build_object(
        'total', count(*)::int,
        'received', coalesce(sum(
            case 
                when status = 'paid' then
                    case 
                        when payment_type = 'percentage' and payment_percentage is not null 
                        then value * (payment_percentage / 100.0)
                        else value
                    end
                else 0
            end
        ), 0)::numeric,
        'pending', coalesce(sum(
            case 
                when status in ('pending', 'scheduled') then value
                else 0
            end
        ), 0)::numeric,
        'totalValue', coalesce(sum(
            case 
                when status = 'paid' then
                    case 
                        when payment_type = 'percentage' and payment_percentage is not null 
                        then value * (payment_percentage / 100.0)
                        else value
                    end
                when status in ('pending', 'scheduled') then value
                else 0
            end
        ), 0)::numeric,
        'byStatus', json_build_object(
            'scheduled', count(*) filter (where status = 'scheduled')::int,
            'pending', count(*) filter (where status = 'pending')::int,
            'paid', count(*) filter (where status = 'paid')::int
        )
    ) into result
    from appointments
    where patient_id = any(user_patient_ids);
    
    return result;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function get_appointment_totals(uuid) to authenticated;