-- ==================== FIX: Audit Logs Table and RLS Policies ====================
-- Este arquivo cria a tabela audit_logs (se não existir) e configura as políticas RLS

-- Criar tabela audit_logs se não existir
create table if not exists audit_logs (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text
);

-- Habilitar RLS na tabela audit_logs
alter table audit_logs enable row level security;

-- Remover políticas antigas se existirem
drop policy if exists "Users can insert own audit logs" on audit_logs;
drop policy if exists "Users can view own audit logs" on audit_logs;
drop policy if exists "Users can view all audit logs" on audit_logs;

-- Política para INSERT: Usuários autenticados podem inserir seus próprios logs
create policy "Users can insert own audit logs" on audit_logs
    for insert
    with check (auth.uid() = user_id);

-- Política para SELECT: Usuários autenticados podem ver seus próprios logs
create policy "Users can view own audit logs" on audit_logs
    for select
    using (auth.uid() = user_id);

-- Nota: Não criamos políticas para UPDATE ou DELETE, pois logs de auditoria
-- devem ser imutáveis (append-only). Se necessário, apenas administradores
-- poderiam ter acesso a essas operações através de políticas específicas.
