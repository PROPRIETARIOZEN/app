-- ============================================================
-- ProprietárioZen — Schema Completo
-- Execute no SQL Editor do Supabase (em ordem)
-- ============================================================


-- ============================================================
-- 0. EXTENSÕES
-- ============================================================
create extension if not exists "uuid-ossp";


-- ============================================================
-- 1. TABELA: profiles
-- ============================================================
create table public.profiles (
  id                 uuid        primary key references auth.users(id) on delete cascade,
  nome               text        not null,
  email              text        not null,
  telefone           text,
  plano              text        not null default 'gratis' check (plano in ('gratis', 'pago')),
  stripe_customer_id text,
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now()
);

comment on table public.profiles is 'Perfil do proprietário, extensão de auth.users';


-- ============================================================
-- 2. TABELA: imoveis
-- ============================================================
create table public.imoveis (
  id                      uuid        primary key default uuid_generate_v4(),
  user_id                 uuid        not null references public.profiles(id) on delete cascade,
  apelido                 text        not null,
  endereco                text        not null,
  tipo                    text        not null check (tipo in ('apartamento', 'casa', 'kitnet', 'comercial', 'terreno', 'outro')),
  valor_aluguel           numeric(10,2) not null check (valor_aluguel > 0),
  dia_vencimento          smallint    not null check (dia_vencimento between 1 and 31),
  data_inicio_contrato    date,
  data_proximo_reajuste   date,
  indice_reajuste         text        not null default 'fixo' check (indice_reajuste in ('igpm', 'ipca', 'fixo')),
  percentual_fixo         numeric(5,2) check (
                            (indice_reajuste = 'fixo' and percentual_fixo is not null)
                            or indice_reajuste != 'fixo'
                          ),
  ativo                   boolean     not null default true,
  observacoes             text,
  criado_em               timestamptz not null default now()
);

comment on table public.imoveis       is 'Imóveis cadastrados pelo proprietário';
comment on column public.imoveis.dia_vencimento is 'Dia do mês em que o aluguel vence';


-- ============================================================
-- 3. TABELA: inquilinos
-- ============================================================
create table public.inquilinos (
  id         uuid        primary key default uuid_generate_v4(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  imovel_id  uuid        not null references public.imoveis(id) on delete cascade,
  nome       text        not null,
  telefone   text,
  email      text,
  cpf        text,
  ativo      boolean     not null default true,
  criado_em  timestamptz not null default now()
);

comment on table public.inquilinos is 'Inquilinos vinculados a imóveis';


-- ============================================================
-- 4. TABELA: alugueis
-- ============================================================
create table public.alugueis (
  id              uuid        primary key default uuid_generate_v4(),
  imovel_id       uuid        not null references public.imoveis(id) on delete cascade,
  inquilino_id    uuid        references public.inquilinos(id) on delete set null,
  mes_referencia  date        not null,  -- sempre dia 1: ex. 2025-04-01
  valor           numeric(10,2) not null check (valor > 0),
  data_vencimento date        not null,
  status          text        not null default 'pendente' check (status in ('pendente', 'pago', 'atrasado')),
  data_pagamento  date,
  observacao      text,
  recibo_gerado   boolean     not null default false,
  criado_em       timestamptz not null default now(),

  -- Garante um único registro por imóvel/mês
  unique (imovel_id, mes_referencia)
);

comment on table  public.alugueis                 is 'Registros mensais de aluguel gerados por imóvel';
comment on column public.alugueis.mes_referencia  is 'Sempre o primeiro dia do mês de referência (ex: 2025-04-01)';


-- ============================================================
-- 5. ÍNDICES
-- ============================================================
create index idx_imoveis_user_id          on public.imoveis(user_id);
create index idx_inquilinos_user_id       on public.inquilinos(user_id);
create index idx_inquilinos_imovel_id     on public.inquilinos(imovel_id);
create index idx_alugueis_imovel_id       on public.alugueis(imovel_id);
create index idx_alugueis_inquilino_id    on public.alugueis(inquilino_id);
create index idx_alugueis_status          on public.alugueis(status);
create index idx_alugueis_mes_referencia  on public.alugueis(mes_referencia);


-- ============================================================
-- 6. TRIGGERS
-- ============================================================

-- 6.1 Cria profile automaticamente ao cadastrar usuário no auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 6.2 Atualiza atualizado_em automaticamente em profiles
create or replace function public.set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger trg_profiles_atualizado_em
  before update on public.profiles
  for each row
  execute function public.set_atualizado_em();

-- 6.3 Marca aluguéis vencidos como "atrasado" automaticamente
--     (chamado manualmente ou via pg_cron se disponível)
create or replace function public.atualizar_status_alugueis()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.alugueis
  set status = 'atrasado'
  where status = 'pendente'
    and data_vencimento < current_date;
end;
$$;


-- ============================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.profiles   enable row level security;
alter table public.imoveis    enable row level security;
alter table public.inquilinos enable row level security;
alter table public.alugueis   enable row level security;


-- ============================================================
-- 7.1 POLICIES — profiles
-- ============================================================

-- Cada usuário vê e edita apenas o próprio perfil
create policy "profiles: leitura própria"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: inserção própria"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: atualização própria"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- ============================================================
-- 7.2 POLICIES — imoveis
-- ============================================================

create policy "imoveis: leitura própria"
  on public.imoveis for select
  using (auth.uid() = user_id);

create policy "imoveis: inserção própria"
  on public.imoveis for insert
  with check (auth.uid() = user_id);

create policy "imoveis: atualização própria"
  on public.imoveis for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "imoveis: exclusão própria"
  on public.imoveis for delete
  using (auth.uid() = user_id);


-- ============================================================
-- 7.3 POLICIES — inquilinos
-- ============================================================

create policy "inquilinos: leitura própria"
  on public.inquilinos for select
  using (auth.uid() = user_id);

create policy "inquilinos: inserção própria"
  on public.inquilinos for insert
  with check (auth.uid() = user_id);

create policy "inquilinos: atualização própria"
  on public.inquilinos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "inquilinos: exclusão própria"
  on public.inquilinos for delete
  using (auth.uid() = user_id);


-- ============================================================
-- 7.4 POLICIES — alugueis
-- ============================================================
-- Alugueis não têm user_id direto; o acesso é verificado
-- pelo imovel_id (que pertence ao usuário)

create policy "alugueis: leitura própria"
  on public.alugueis for select
  using (
    exists (
      select 1 from public.imoveis
      where imoveis.id = alugueis.imovel_id
        and imoveis.user_id = auth.uid()
    )
  );

create policy "alugueis: inserção própria"
  on public.alugueis for insert
  with check (
    exists (
      select 1 from public.imoveis
      where imoveis.id = alugueis.imovel_id
        and imoveis.user_id = auth.uid()
    )
  );

create policy "alugueis: atualização própria"
  on public.alugueis for update
  using (
    exists (
      select 1 from public.imoveis
      where imoveis.id = alugueis.imovel_id
        and imoveis.user_id = auth.uid()
    )
  );

create policy "alugueis: exclusão própria"
  on public.alugueis for delete
  using (
    exists (
      select 1 from public.imoveis
      where imoveis.id = alugueis.imovel_id
        and imoveis.user_id = auth.uid()
    )
  );


-- ============================================================
-- 8. VIEWS ÚTEIS (sem RLS — acessadas via service role ou
--    via funções security definer quando necessário)
-- ============================================================

-- Visão geral dos aluguéis com dados do imóvel e inquilino
create or replace view public.v_alugueis_completos as
select
  a.id,
  a.mes_referencia,
  a.valor,
  a.data_vencimento,
  a.data_pagamento,
  a.status,
  a.recibo_gerado,
  a.observacao,
  i.id           as imovel_id,
  i.apelido      as imovel_apelido,
  i.endereco     as imovel_endereco,
  i.user_id,
  iq.id          as inquilino_id,
  iq.nome        as inquilino_nome,
  iq.email       as inquilino_email,
  iq.telefone    as inquilino_telefone
from public.alugueis a
join public.imoveis   i  on i.id  = a.imovel_id
left join public.inquilinos iq on iq.id = a.inquilino_id;

-- Resumo financeiro por usuário (mês atual)
create or replace view public.v_resumo_financeiro as
select
  i.user_id,
  count(*)                                          filter (where a.status = 'pago')      as pagos,
  count(*)                                          filter (where a.status = 'pendente')  as pendentes,
  count(*)                                          filter (where a.status = 'atrasado')  as atrasados,
  coalesce(sum(a.valor) filter (where a.status = 'pago'),     0) as total_recebido,
  coalesce(sum(a.valor) filter (where a.status = 'pendente'), 0) as total_pendente,
  coalesce(sum(a.valor) filter (where a.status = 'atrasado'), 0) as total_atrasado
from public.alugueis a
join public.imoveis i on i.id = a.imovel_id
where a.mes_referencia = date_trunc('month', current_date)::date
group by i.user_id;
