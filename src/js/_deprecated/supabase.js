/**
 * @deprecated Este módulo não está em uso. O sistema utiliza Firebase/Firestore.
 * Mantido em _deprecated para referência histórica.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing Supabase environment variables. Copy .env.example to .env.local');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Clientes
export const getClientes = async () => {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('ativo', true)
    .order('nome');
  if (error) throw error;
  return data;
};

export const insertCliente = async (cliente) => {
  const { data, error } = await supabase
    .from('clientes')
    .insert([cliente])
    .select();
  if (error) throw error;
  return data[0];
};

export const updateCliente = async (id, updates) => {
  const { data, error } = await supabase
    .from('clientes')
    .update(updates)
    .eq('id', id)
    .select();
  if (error) throw error;
  return data[0];
};

// Chapas
export const getChapas = async () => {
  const { data, error } = await supabase
    .from('chapas')
    .select('*')
    .eq('ativo', true)
    .order('nome');
  if (error) throw error;
  return data;
};

export const insertChapa = async (chapa) => {
  const { data, error } = await supabase
    .from('chapas')
    .insert([chapa])
    .select();
  if (error) throw error;
  return data[0];
};

// Serviços
export const getServicos = async () => {
  const { data, error } = await supabase
    .from('servicos')
    .select(`
      *,
      clientes(nome, cnpj),
      custos_servico(*),
      pagamentos(*)
    `)
    .order('data_servico', { ascending: false });
  if (error) throw error;
  return data;
};

export const getServicoById = async (id) => {
  const { data, error } = await supabase
    .from('servicos')
    .select(`
      *,
      clientes(*),
      custos_servico(*),
      pagamentos(*)
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
};

export const insertServico = async (servico) => {
  const { data, error } = await supabase
    .from('servicos')
    .insert([servico])
    .select();
  if (error) throw error;
  return data[0];
};

export const updateServico = async (id, updates) => {
  const { data, error } = await supabase
    .from('servicos')
    .update(updates)
    .eq('id', id)
    .select();
  if (error) throw error;
  return data[0];
};

// Custos
export const insertCusto = async (custo) => {
  const { data, error } = await supabase
    .from('custos_servico')
    .insert([custo])
    .select();
  if (error) throw error;
  return data[0];
};

export const deleteCusto = async (id) => {
  const { error } = await supabase
    .from('custos_servico')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// Pagamentos
export const insertPagamento = async (pagamento) => {
  const { data, error } = await supabase
    .from('pagamentos')
    .insert([pagamento])
    .select();
  if (error) throw error;
  return data[0];
};

export const updatePagamento = async (id, updates) => {
  const { data, error } = await supabase
    .from('pagamentos')
    .update(updates)
    .eq('id', id)
    .select();
  if (error) throw error;
  return data[0];
};

// Dashboard queries
export const getDashboardData = async () => {
  const currentMonth = new Date();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  const [servicosData, pagamentosData, clientesData] = await Promise.all([
    supabase
      .from('servicos')
      .select('valor_total, status')
      .gte('data_servico', firstDay.toISOString().split('T')[0])
      .lte('data_servico', lastDay.toISOString().split('T')[0]),
    supabase
      .from('pagamentos')
      .select('valor, confirmado')
      .gte('created_at', firstDay.toISOString())
      .lte('created_at', lastDay.toISOString()),
    supabase.from('clientes').select('id, nome').eq('ativo', true),
  ]);

  return {
    servicos: servicosData.data || [],
    pagamentos: pagamentosData.data || [],
    clientes: clientesData.data || [],
  };
};

// Contas a receber
export const getContasReceber = async () => {
  const { data, error } = await supabase
    .from('servicos')
    .select(`
      id,
      data_servico,
      valor_total,
      status,
      clientes(nome, prazo_pagamento),
      pagamentos(confirmado)
    `)
    .neq('status', 'recebido')
    .order('data_servico', { ascending: true });
  if (error) throw error;
  return data;
};
