'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { registrarLog } from '@/lib/log'

function calcularVencimento(mesReferencia: string, diaVencimento: number): string {
  const [anoStr, mesStr] = mesReferencia.split('-')
  const ano = parseInt(anoStr)
  const mes = parseInt(mesStr)
  const ultimoDia = new Date(ano, mes, 0).getDate()
  const dia = Math.min(diaVencimento, ultimoDia)
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

// Cria registros mensais para imóveis que ainda não têm aluguel no mês
export async function gerarAlugueisMes(
  mesReferencia: string,
): Promise<{ criados: number; error?: string }> {
  // NUNCA gerar registro para mês futuro.
  // mesReferencia é YYYY-MM-01; mesAtualRef é calculado sem depender de fuso.
  const _hoje = new Date()
  const mesAtualRef = `${_hoje.getFullYear()}-${String(_hoje.getMonth() + 1).padStart(2, '0')}-01`
  if (mesReferencia > mesAtualRef) return { criados: 0 }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { criados: 0, error: 'Não autorizado' }

  const { data: imoveis } = (await supabase
    .from('imoveis')
    .select('id, valor_aluguel, dia_vencimento, data_inicio_contrato, inquilinos(id, ativo)')
    .eq('user_id', user.id)
    .eq('ativo', true)) as unknown as {
    data: {
      id: string
      valor_aluguel: number
      dia_vencimento: number
      data_inicio_contrato: string | null
      inquilinos: { id: string; ativo: boolean }[]
    }[] | null
  }

  if (!imoveis?.length) return { criados: 0 }

  const { data: existentes } = await supabase
    .from('alugueis')
    .select('imovel_id')
    .in('imovel_id', imoveis.map(i => i.id))
    .eq('mes_referencia', mesReferencia)

  const existentesSet = new Set(existentes?.map(a => a.imovel_id) ?? [])

  const novos = imoveis
    .filter(imovel => {
      if (existentesSet.has(imovel.id)) return false
      // Não gerar aluguel antes do início do contrato
      if (imovel.data_inicio_contrato) {
        const inicioMes = imovel.data_inicio_contrato.slice(0, 7) // YYYY-MM
        const refMes = mesReferencia.slice(0, 7)                  // YYYY-MM
        if (refMes < inicioMes) return false
      }
      return true
    })
    .map(imovel => {
      const inquilinoAtivo = imovel.inquilinos?.find(i => i.ativo)
      return {
        imovel_id: imovel.id,
        inquilino_id: inquilinoAtivo?.id ?? null,
        mes_referencia: mesReferencia,
        valor: imovel.valor_aluguel,
        data_vencimento: calcularVencimento(mesReferencia, imovel.dia_vencimento),
        status: 'pendente' as const,
      }
    })

  if (!novos.length) return { criados: 0 }

  const { error } = await supabase.from('alugueis').insert(novos)
  if (error) return { criados: 0, error: error.message }

  revalidatePath('/alugueis')
  return { criados: novos.length }
}

// Gera registros para todos os meses passados do ano (calendário anual)
export async function gerarAlugueisMesesAno(
  ano: number,
): Promise<{ criados: number; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { criados: 0, error: 'Não autorizado' }

  const hoje = new Date()
  const anoAtual = hoje.getFullYear()
  const mesAtual = hoje.getMonth() + 1

  // Gera apenas meses que já ocorreram (não gera o futuro)
  const ultimoMes = ano < anoAtual ? 12 : (ano === anoAtual ? mesAtual : 0)
  if (ultimoMes === 0) return { criados: 0 }

  const mesesRef = Array.from({ length: ultimoMes }, (_, i) =>
    `${ano}-${String(i + 1).padStart(2, '0')}-01`,
  )

  const { data: imoveis } = (await supabase
    .from('imoveis')
    .select('id, valor_aluguel, dia_vencimento, data_inicio_contrato, inquilinos(id, ativo)')
    .eq('user_id', user.id)
    .eq('ativo', true)) as unknown as {
    data: {
      id: string
      valor_aluguel: number
      dia_vencimento: number
      data_inicio_contrato: string | null
      inquilinos: { id: string; ativo: boolean }[]
    }[] | null
  }

  if (!imoveis?.length) return { criados: 0 }

  // Busca todos os aluguéis existentes do ano de uma vez
  const { data: existentes } = await supabase
    .from('alugueis')
    .select('imovel_id, mes_referencia')
    .in('imovel_id', imoveis.map(i => i.id))
    .in('mes_referencia', mesesRef)

  const existentesSet = new Set(existentes?.map(a => `${a.imovel_id}|${a.mes_referencia}`) ?? [])

  const novos: {
    imovel_id: string
    inquilino_id: string | null
    mes_referencia: string
    valor: number
    data_vencimento: string
    status: 'pendente'
  }[] = []

  for (const mesRef of mesesRef) {
    for (const imovel of imoveis) {
      if (existentesSet.has(`${imovel.id}|${mesRef}`)) continue
      if (imovel.data_inicio_contrato) {
        const inicioMes = imovel.data_inicio_contrato.slice(0, 7)
        if (mesRef.slice(0, 7) < inicioMes) continue
      }
      const inquilinoAtivo = imovel.inquilinos?.find(i => i.ativo)
      novos.push({
        imovel_id: imovel.id,
        inquilino_id: inquilinoAtivo?.id ?? null,
        mes_referencia: mesRef,
        valor: imovel.valor_aluguel,
        data_vencimento: calcularVencimento(mesRef, imovel.dia_vencimento),
        status: 'pendente',
      })
    }
  }

  if (!novos.length) return { criados: 0 }

  const { error } = await supabase.from('alugueis').insert(novos)
  if (error) return { criados: 0, error: error.message }

  revalidatePath('/alugueis')
  return { criados: novos.length }
}

// Marca como atrasado os pendentes com vencimento passado
export async function atualizarStatusAtrasados(): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const hoje = new Date().toISOString().split('T')[0]

  const { data: pendentes } = await supabase
    .from('alugueis')
    .select('id, imovel:imoveis!inner(user_id)')
    .eq('imovel.user_id', user.id)
    .eq('status', 'pendente')
    .lt('data_vencimento', hoje)

  if (!pendentes?.length) return

  await supabase
    .from('alugueis')
    .update({ status: 'atrasado' })
    .in('id', pendentes.map(a => a.id))

  revalidatePath('/alugueis')
  revalidatePath('/dashboard')
}

// Remove registros pendentes criados indevidamente para meses futuros.
// Deve ser chamada apenas uma vez por sessão (cliente controla via localStorage).
// Loga o SQL equivalente para auditoria manual no Supabase se necessário.
export async function limparRegistrosFuturosIndevidos(): Promise<{ removidos: number; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { removidos: 0, error: 'Não autorizado' }

  const hoje = new Date()
  const mesAtualRef = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`

  // SQL equivalente para auditoria manual no Supabase SQL Editor:
  // SELECT id, mes_referencia, status FROM alugueis
  //   JOIN imoveis ON alugueis.imovel_id = imoveis.id
  //   WHERE imoveis.user_id = '<user_id>'
  //     AND alugueis.mes_referencia > '<mes_atual_ref>'
  //     AND alugueis.status = 'pendente'
  //   ORDER BY mes_referencia;
  //
  // Para deletar:
  // DELETE FROM alugueis
  //   USING imoveis
  //   WHERE alugueis.imovel_id = imoveis.id
  //     AND imoveis.user_id = '<user_id>'
  //     AND alugueis.mes_referencia > '<mes_atual_ref>'
  //     AND alugueis.status = 'pendente';

  const { data: futuros } = await supabase
    .from('alugueis')
    .select('id, mes_referencia, imovel:imoveis!inner(user_id)')
    .eq('imovel.user_id', user.id)
    .eq('status', 'pendente')
    .gt('mes_referencia', mesAtualRef)

  if (!futuros?.length) return { removidos: 0 }

  const ids = futuros.map(a => a.id)
  console.info(`[limpeza] Removendo ${ids.length} registro(s) futuro(s) indevido(s):`,
    futuros.map(a => a.mes_referencia).join(', '))

  const { error } = await supabase.from('alugueis').delete().in('id', ids)
  if (error) return { removidos: 0, error: error.message }

  revalidatePath('/alugueis')
  return { removidos: ids.length }
}

// Registra pagamento
export async function marcarComoPago(
  id: string,
  dataPagamento: string,
  observacao: string | null,
): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error } = await supabase
    .from('alugueis')
    .update({ status: 'pago', data_pagamento: dataPagamento, observacao: observacao || null })
    .eq('id', id)

  if (error) return { error: error.message }
  await registrarLog(user.id, 'ALUGUEL_PAGO', 'aluguel', id, { data_pagamento: dataPagamento })
  revalidatePath('/alugueis')
  revalidatePath('/dashboard')
  return {}
}

// Marca recibo como gerado
// Busca todos os dados necessários para geração do recibo PDF
export async function buscarDetalhesAluguel(id: string): Promise<{
  pagamento?: {
    id: string; valor: number; mes_referencia: string
    data_vencimento: string; data_pagamento: string | null
    status: string; observacao: string | null
    imovel: { apelido: string; endereco: string }
    inquilino: { nome: string; cpf: string | null; email: string | null; telefone: string | null }
  }
  proprietario?: { nome: string; email: string; telefone: string | null }
  error?: string
}> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const [{ data: aluguel }, { data: profile }] = await Promise.all([
    supabase
      .from('alugueis')
      .select(`
        id, valor, mes_referencia, data_vencimento, data_pagamento, status, observacao,
        imovel:imoveis!inner(apelido, endereco, user_id),
        inquilino:inquilinos(nome, cpf, email, telefone)
      `)
      .eq('id', id)
      .eq('imovel.user_id', user.id)
      .single(),
    supabase.from('profiles').select('nome, email, telefone').eq('id', user.id).single(),
  ])

  if (!aluguel) return { error: 'Aluguel não encontrado' }
  if (!profile) return { error: 'Perfil não encontrado' }

  const imovel = Array.isArray(aluguel.imovel) ? aluguel.imovel[0] : aluguel.imovel
  const inquilino = Array.isArray(aluguel.inquilino) ? aluguel.inquilino[0] : aluguel.inquilino

  return {
    pagamento: {
      id: aluguel.id,
      valor: aluguel.valor,
      mes_referencia: aluguel.mes_referencia,
      data_vencimento: aluguel.data_vencimento,
      data_pagamento: aluguel.data_pagamento,
      status: aluguel.status,
      observacao: aluguel.observacao,
      imovel: { apelido: imovel?.apelido ?? '', endereco: imovel?.endereco ?? '' },
      inquilino: inquilino ?? { nome: 'Sem inquilino', cpf: null, email: null, telefone: null },
    },
    proprietario: profile as { nome: string; email: string; telefone: string | null },
  }
}

export async function marcarReciboGerado(id: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error } = await supabase
    .from('alugueis')
    .update({ recibo_gerado: true })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/alugueis')
  return {}
}

// Aplica reajuste no imóvel
export async function aplicarReajuste(
  imovelId: string,
  novoValor: number,
  proximaData: string,
): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error } = await supabase
    .from('imoveis')
    .update({ valor_aluguel: Math.round(novoValor * 100) / 100, data_proximo_reajuste: proximaData })
    .eq('id', imovelId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  revalidatePath('/imoveis')
  revalidatePath('/alugueis')
  return {}
}
