-- ==================== FIX: Row Level Security (RLS) Policies ====================
-- Este arquivo corrige as políticas RLS para garantir isolamento de dados por usuário

-- Remover políticas antigas que permitem acesso público
drop policy if exists "Public clinics access" on clinics;
drop policy if exists "Public patients access" on patients;
drop policy if exists "Public appointments access" on appointments;
drop policy if exists "Public radiographs access" on radiographs;
drop policy if exists "Public user_profiles access" on user_profiles;
drop policy if exists "Users can manage own profile" on user_profiles;
drop policy if exists "Public procedures access" on procedures;

-- ==================== POLÍTICAS PARA PATIENTS ====================
-- Usuários só podem ver seus próprios patients
create policy "Users can view own patients" on patients
    for select
    using (auth.uid() = user_id);

create policy "Users can insert own patients" on patients
    for insert
    with check (auth.uid() = user_id);

create policy "Users can update own patients" on patients
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete own patients" on patients
    for delete
    using (auth.uid() = user_id);

-- ==================== POLÍTICAS PARA APPOINTMENTS ====================
-- Usuários só podem ver appointments de seus próprios patients
create policy "Users can view own appointments" on appointments
    for select
    using (
        exists (
            select 1 from patients
            where patients.id = appointments.patient_id
            and patients.user_id = auth.uid()
        )
    );

create policy "Users can insert own appointments" on appointments
    for insert
    with check (
        exists (
            select 1 from patients
            where patients.id = appointments.patient_id
            and patients.user_id = auth.uid()
        )
    );

create policy "Users can update own appointments" on appointments
    for update
    using (
        exists (
            select 1 from patients
            where patients.id = appointments.patient_id
            and patients.user_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from patients
            where patients.id = appointments.patient_id
            and patients.user_id = auth.uid()
        )
    );

create policy "Users can delete own appointments" on appointments
    for delete
    using (
        exists (
            select 1 from patients
            where patients.id = appointments.patient_id
            and patients.user_id = auth.uid()
        )
    );

-- ==================== POLÍTICAS PARA RADIOGRAPHS ====================
-- Usuários só podem ver radiographs de seus próprios patients
create policy "Users can view own radiographs" on radiographs
    for select
    using (
        exists (
            select 1 from patients
            where patients.id = radiographs.patient_id
            and patients.user_id = auth.uid()
        )
    );

create policy "Users can insert own radiographs" on radiographs
    for insert
    with check (
        exists (
            select 1 from patients
            where patients.id = radiographs.patient_id
            and patients.user_id = auth.uid()
        )
    );

create policy "Users can update own radiographs" on radiographs
    for update
    using (
        exists (
            select 1 from patients
            where patients.id = radiographs.patient_id
            and patients.user_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from patients
            where patients.id = radiographs.patient_id
            and patients.user_id = auth.uid()
        )
    );

create policy "Users can delete own radiographs" on radiographs
    for delete
    using (
        exists (
            select 1 from patients
            where patients.id = radiographs.patient_id
            and patients.user_id = auth.uid()
        )
    );

-- ==================== POLÍTICAS PARA USER_PROFILES ====================
-- Usuários só podem ver e gerenciar seu próprio perfil
create policy "Users can view own profile" on user_profiles
    for select
    using (auth.uid() = user_id);

create policy "Users can insert own profile" on user_profiles
    for insert
    with check (auth.uid() = user_id);

create policy "Users can update own profile" on user_profiles
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete own profile" on user_profiles
    for delete
    using (auth.uid() = user_id);

-- ==================== POLÍTICAS PARA CLINICS ====================
-- Usuários só podem ver e gerenciar suas próprias clínicas
create policy "Users can view own clinics" on clinics
    for select
    using (auth.uid() = user_id);

create policy "Users can insert own clinics" on clinics
    for insert
    with check (auth.uid() = user_id);

create policy "Users can update own clinics" on clinics
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete own clinics" on clinics
    for delete
    using (auth.uid() = user_id);

-- ==================== POLÍTICAS PARA PROCEDURES ====================
-- Procedures são compartilhadas (catálogo comum)
create policy "Authenticated users can view procedures" on procedures
    for select
    using (auth.role() = 'authenticated');

-- ==================== TRIGGER PARA CRIAR PERFIL AUTOMATICAMENTE ====================
-- Função para criar perfil automaticamente quando um usuário é criado
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.user_profiles (user_id, name, language, currency, theme)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        'pt-BR',
        'BRL',
        'light'
    );
    return new;
end;
$$ language plpgsql security definer;

-- Trigger que executa a função quando um novo usuário é criado
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

