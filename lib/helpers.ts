import { StatusImovel, StatusPagamento, TipoImovel } from '@/types'

// Formata valor monetário para BRL
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

// Formata data no padrão brasileiro
export function formatarData(data: string | Date): string {
  // Supabase retorna timestamps completos (ex: "2025-04-11T14:30:00.000000+00:00")
  // Só appenda T00:00:00 para strings de data pura (YYYY-MM-DD)
  const date =
    typeof data === 'string'
      ? new Date(data.includes('T') ? data : data + 'T00:00:00')
      : data
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

// Formata data e hora no padrão brasileiro
export function formatarDataHora(data: string | Date): string {
  const date = typeof data === 'string' ? new Date(data) : data
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

// Formata CPF: 000.000.000-00
export function formatarCPF(cpf: string): string {
  const nums = cpf.replace(/\D/g, '')
  return nums.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

// Formata CEP: 00000-000
export function formatarCEP(cep: string): string {
  const nums = cep.replace(/\D/g, '')
  return nums.replace(/(\d{5})(\d{3})/, '$1-$2')
}

// Formata telefone: (00) 00000-0000
export function formatarTelefone(tel: string): string {
  const nums = tel.replace(/\D/g, '')
  if (nums.length === 11) {
    return nums.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  return nums.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

// Labels para tipo de imóvel
export const labelsTipoImovel: Record<TipoImovel, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  kitnet: 'Kitnet',
  comercial: 'Comercial',
  terreno: 'Terreno',
  outro: 'Outro',
}

// Labels e cores para status de imóvel
export const labelsStatusImovel: Record<StatusImovel, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  disponivel: { label: 'Disponível', variant: 'default' },
  alugado: { label: 'Alugado', variant: 'secondary' },
  manutencao: { label: 'Manutenção', variant: 'destructive' },
}

// Labels e cores para status de pagamento
export const labelsStatusPagamento: Record<StatusPagamento, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pago: { label: 'Pago', variant: 'default' },
  pendente: { label: 'Pendente', variant: 'outline' },
  atrasado: { label: 'Atrasado', variant: 'destructive' },
}

// Retorna o mês de referência formatado
export function formatarMesReferencia(mesRef: string): string {
  const [ano, mes] = mesRef.split('-')
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]
  return `${meses[parseInt(mes) - 1]} de ${ano}`
}

// Gera o mês de referência atual no formato YYYY-MM
export function getMesAtual(): string {
  const hoje = new Date()
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
}

// Valida CPF
export function validarCPF(cpf: string): boolean {
  const nums = cpf.replace(/\D/g, '')
  if (nums.length !== 11) return false
  if (/^(\d)\1{10}$/.test(nums)) return false

  let soma = 0
  for (let i = 0; i < 9; i++) soma += parseInt(nums[i]) * (10 - i)
  let resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(nums[9])) return false

  soma = 0
  for (let i = 0; i < 10; i++) soma += parseInt(nums[i]) * (11 - i)
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  return resto === parseInt(nums[10])
}
