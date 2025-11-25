-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Clinics Table
create table clinics (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  address text,
  email text,
  phone text,
  status text default 'active'
);

-- Patients Table
create table patients (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  email text,
  phone text,
  last_visit timestamp with time zone
);

-- Appointments Table
create table appointments (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  clinic_id uuid references clinics(id),
  patient_id uuid references patients(id),
  date date not null,
  time time not null,
  procedure text not null,
  value numeric not null,
  status text default 'scheduled', -- scheduled, pending, paid
  notes text
);

-- Row Level Security (RLS)
alter table clinics enable row level security;
alter table patients enable row level security;
alter table appointments enable row level security;

-- Policies (Public for demo purposes, should be authenticated in production)
create policy "Public clinics access" on clinics for all using (true);
create policy "Public patients access" on patients for all using (true);
create policy "Public appointments access" on appointments for all using (true);
