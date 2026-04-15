-- ============================================================
-- Migration: adiciona colunas de integração Asaas
-- ============================================================

-- ── profiles (proprietário) ───────────────────────────────────
alter table public.profiles
  add column if not exists asaas_account_id       text,
  add column if not exists asaas_account_status   text,
  add column if not exists asaas_api_key_enc      text,
  add column if not exists asaas_wallet_id        text,
  add column if not exists asaas_customer_id      text;

-- ── imoveis (contrato) ────────────────────────────────────────
alter table public.imoveis
  add column if not exists asaas_subscription_id  text,
  add column if not exists billing_mode           text    not null default 'MANUAL'
                             check (billing_mode in ('MANUAL', 'AUTOMATIC')),
  add column if not exists multa_percentual       numeric(5,2) not null default 2,
  add column if not exists juros_percentual       numeric(5,2) not null default 1,
  add column if not exists desconto_percentual    numeric(5,2) not null default 0;

-- ── inquilinos (tenant) ───────────────────────────────────────
-- asaas_customer_id: ID do inquilino como customer na subconta Asaas do proprietário.
-- Como cada inquilino já pertence a um proprietário (via user_id), um único campo basta.
alter table public.inquilinos
  add column if not exists asaas_customer_id      text;

-- ── alugueis (cobrança) ───────────────────────────────────────
alter table public.alugueis
  add column if not exists asaas_charge_id        text,
  add column if not exists asaas_pix_qrcode       text,
  add column if not exists asaas_pix_copiaecola   text,
  add column if not exists asaas_boleto_url       text,
  add column if not exists asaas_customer_id      text,
  add column if not exists valor_pago             numeric(10,2),
  add column if not exists metodo_pagamento       text;

-- Expandir o check de status para incluir cancelado e estornado
alter table public.alugueis
  drop constraint if exists alugueis_status_check;

alter table public.alugueis
  add constraint alugueis_status_check
    check (status in ('pendente', 'pago', 'atrasado', 'cancelado', 'estornado'));

-- ── Índices ───────────────────────────────────────────────────
create index if not exists idx_alugueis_asaas_charge_id
  on public.alugueis(asaas_charge_id);

create index if not exists idx_imoveis_billing_mode
  on public.imoveis(billing_mode);
