-- RAIZ — Gestão e Continuidade Rural
-- SQL inicial para Supabase. Revise e teste antes de usar dados reais.
-- Execute no SQL Editor do seu projeto Supabase.

create extension if not exists pgcrypto;

create table if not exists public.familias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criado_por uuid not null references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);

create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  papel text not null default 'Familiar'
    check (papel in ('Administrador','Financeiro','Familiar')),
  familia_id uuid references public.familias(id) on delete set null,
  criado_em timestamptz not null default now()
);

create table if not exists public.propriedades (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references public.familias(id) on delete cascade,
  nome text not null,
  tipo text not null default 'Fazenda',
  area_hectares numeric(14,2) default 0,
  valor_estimado numeric(14,2) default 0,
  localizacao text,
  responsavel text,
  observacoes text,
  criado_por uuid not null default auth.uid() references auth.users(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.culturas (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references public.familias(id) on delete cascade,
  propriedade_id uuid references public.propriedades(id) on delete set null,
  nome text not null,
  area_hectares numeric(14,2) not null default 0,
  data_plantio date,
  previsao_colheita date,
  quantidade_produzida numeric(14,2) default 0,
  unidade text,
  custo_producao numeric(14,2) default 0,
  receita_estimada numeric(14,2) default 0,
  observacoes text,
  criado_por uuid not null default auth.uid() references auth.users(id),
  criado_em timestamptz not null default now()
);

create table if not exists public.movimentacoes_financeiras (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references public.familias(id) on delete cascade,
  propriedade_id uuid references public.propriedades(id) on delete set null,
  descricao text not null,
  tipo text not null check (tipo in ('Receita','Despesa')),
  valor numeric(14,2) not null check (valor >= 0),
  data_movimentacao date not null default current_date,
  categoria text not null,
  situacao text not null default 'Pendente',
  forma_pagamento text,
  observacoes text,
  criado_por uuid not null default auth.uid() references auth.users(id),
  criado_em timestamptz not null default now()
);

create table if not exists public.documentos (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references public.familias(id) on delete cascade,
  propriedade_id uuid references public.propriedades(id) on delete set null,
  titulo text not null,
  categoria text not null,
  descricao text,
  data_emissao date,
  data_validade date,
  nome_arquivo text,
  caminho_armazenamento text,
  responsavel text,
  criado_por uuid not null default auth.uid() references auth.users(id),
  criado_em timestamptz not null default now()
);

create table if not exists public.bens_patrimoniais (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references public.familias(id) on delete cascade,
  propriedade_id uuid references public.propriedades(id) on delete set null,
  nome text not null,
  tipo text not null,
  valor_estimado numeric(14,2) default 0,
  responsavel text,
  observacoes text,
  criado_por uuid not null default auth.uid() references auth.users(id),
  criado_em timestamptz not null default now()
);

create table if not exists public.etapas_sucessorias (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references public.familias(id) on delete cascade,
  titulo text not null,
  descricao text,
  responsavel text,
  prazo date,
  status text not null default 'Planejada'
    check (status in ('Planejada','Em andamento','Concluída')),
  observacoes text,
  ordem integer default 0,
  criado_por uuid not null default auth.uid() references auth.users(id),
  criado_em timestamptz not null default now()
);

create table if not exists public.tarefas (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references public.familias(id) on delete cascade,
  titulo text not null,
  tipo text not null default 'Tarefa',
  responsavel text,
  prazo date,
  status text not null default 'Pendente'
    check (status in ('Pendente','Em andamento','Concluída')),
  detalhes text,
  criado_por uuid not null default auth.uid() references auth.users(id),
  criado_em timestamptz not null default now()
);

create table if not exists public.reunioes_familiares (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references public.familias(id) on delete cascade,
  titulo text not null,
  data_reuniao timestamptz,
  participantes text[],
  pauta text,
  decisoes text,
  pendencias text,
  criado_por uuid not null default auth.uid() references auth.users(id),
  criado_em timestamptz not null default now()
);

create table if not exists public.auditoria (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid references public.familias(id) on delete cascade,
  usuario_id uuid references auth.users(id) on delete set null,
  acao text not null,
  tabela_afetada text,
  registro_id uuid,
  detalhes jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists idx_propriedades_familia on public.propriedades(familia_id);
create index if not exists idx_culturas_familia on public.culturas(familia_id);
create index if not exists idx_financeiro_familia_data on public.movimentacoes_financeiras(familia_id, data_movimentacao);
create index if not exists idx_documentos_familia on public.documentos(familia_id);
create index if not exists idx_etapas_familia on public.etapas_sucessorias(familia_id);
create index if not exists idx_tarefas_familia_prazo on public.tarefas(familia_id, prazo);

-- Funções auxiliares de autorização. Administradores e membros financeiros
-- podem editar dados operacionais; familiares têm acesso conforme a política.
create or replace function public.usuario_da_familia(fid uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.perfis p
    where p.id = auth.uid() and p.familia_id = fid
  );
$$;

create or replace function public.papel_do_usuario()
returns text language sql stable security definer set search_path = public
as $$
  select papel from public.perfis where id = auth.uid() limit 1;
$$;

alter table public.familias enable row level security;
alter table public.perfis enable row level security;
alter table public.propriedades enable row level security;
alter table public.culturas enable row level security;
alter table public.movimentacoes_financeiras enable row level security;
alter table public.documentos enable row level security;
alter table public.bens_patrimoniais enable row level security;
alter table public.etapas_sucessorias enable row level security;
alter table public.tarefas enable row level security;
alter table public.reunioes_familiares enable row level security;
alter table public.auditoria enable row level security;

-- Perfis: o próprio usuário pode ler/editar seu perfil; perfis da mesma família podem ser lidos.
create policy "perfis_leitura_mesma_familia" on public.perfis
for select to authenticated using (id = auth.uid() or public.usuario_da_familia(familia_id));
create policy "perfil_proprio_editar" on public.perfis
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Famílias: criador e membros associados.
create policy "familias_leitura_membros" on public.familias
for select to authenticated using (criado_por = auth.uid() or public.usuario_da_familia(id));
create policy "familia_criar_proprio" on public.familias
for insert to authenticated with check (criado_por = auth.uid());

-- Dados operacionais isolados por família.
do $$
declare t text;
begin
  foreach t in array array['propriedades','culturas','movimentacoes_financeiras','documentos','bens_patrimoniais','etapas_sucessorias','tarefas','reunioes_familiares'] loop
    execute format('create policy "%s_select_family" on public.%I for select to authenticated using (public.usuario_da_familia(familia_id))', t, t);
    execute format('create policy "%s_insert_family" on public.%I for insert to authenticated with check (public.usuario_da_familia(familia_id) and criado_por = auth.uid())', t, t);
    execute format('create policy "%s_update_family" on public.%I for update to authenticated using (public.usuario_da_familia(familia_id) and public.papel_do_usuario() in (''Administrador'',''Financeiro'')) with check (public.usuario_da_familia(familia_id))', t, t);
    execute format('create policy "%s_delete_admin" on public.%I for delete to authenticated using (public.usuario_da_familia(familia_id) and public.papel_do_usuario() = ''Administrador'')', t, t);
  end loop;
end $$;

create policy "auditoria_leitura_admin" on public.auditoria
for select to authenticated using (public.usuario_da_familia(familia_id) and public.papel_do_usuario() = 'Administrador');
create policy "auditoria_inserir_membro" on public.auditoria
for insert to authenticated with check (public.usuario_da_familia(familia_id) and usuario_id = auth.uid());

-- IMPORTANTE:
-- 1. O primeiro perfil/família deve ser provisionado por um fluxo de cadastro seguro.
-- 2. Não permita que usuários escolham livremente o papel Administrador durante o cadastro público.
-- 3. Para documentos, crie um bucket privado no Supabase Storage e políticas de acesso por família.
-- 4. Revise as políticas com usuários de teste antes de inserir dados reais.
