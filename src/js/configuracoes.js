import { getConfigEmpresa, saveConfigEmpresa, requireAuth } from './firebase.js';
import {
  setActiveMenuItem,
  showError,
  showSuccess,
  setupNavbarAuth,
} from './utils.js';
import { initApp } from './app-init.js';

function preencherFormulario(cfg) {
  document.getElementById('config-nome-empresa').value = cfg.nome_empresa || '';
  document.getElementById('config-cnpj').value = cfg.cnpj || '';
  document.getElementById('config-endereco').value = cfg.endereco || '';
  document.getElementById('config-cep').value = cfg.cep || '';
  document.getElementById('config-cidade').value = cfg.cidade || '';
  document.getElementById('config-estado').value = cfg.estado || '';
  document.getElementById('config-telefone').value = cfg.telefone || '';
  document.getElementById('config-email').value = cfg.email || '';
  document.getElementById('config-status-padrao').value = cfg.status_padrao_servico || 'agendado';
  document.getElementById('config-prazo-pagamento').value = cfg.prazo_pagamento_default ?? 30;
  document.getElementById('config-taxa-imposto').value =
    cfg.taxa_imposto != null ? (cfg.taxa_imposto * 100).toFixed(2) : '7.85';
}

function coletarFormulario() {
  const taxaStr = document.getElementById('config-taxa-imposto')?.value?.replace(',', '.');
  return {
    nome_empresa: document.getElementById('config-nome-empresa')?.value?.trim() || '',
    cnpj: document.getElementById('config-cnpj')?.value?.trim() || '',
    endereco: document.getElementById('config-endereco')?.value?.trim() || '',
    cep: document.getElementById('config-cep')?.value?.trim() || '',
    cidade: document.getElementById('config-cidade')?.value?.trim() || '',
    estado: document.getElementById('config-estado')?.value?.trim()?.toUpperCase() || '',
    telefone: document.getElementById('config-telefone')?.value?.trim() || '',
    email: document.getElementById('config-email')?.value?.trim() || '',
    status_padrao_servico: document.getElementById('config-status-padrao')?.value || 'agendado',
    prazo_pagamento_default: parseInt(document.getElementById('config-prazo-pagamento')?.value) || 30,
    taxa_imposto: taxaStr ? parseFloat(taxaStr) / 100 : 0.0785,
  };
}

async function salvar() {
  try {
    const dados = coletarFormulario();
    await saveConfigEmpresa(dados);
    showSuccess('Configurações salvas!');
  } catch (err) {
    showError('Erro ao salvar: ' + err.message);
  }
}

document.getElementById('btn-salvar-config')?.addEventListener('click', salvar);

requireAuth().then(async (user) => {
  await initApp('configuracoes');
  await setupNavbarAuth(user);
  const cfg = await getConfigEmpresa();
  preencherFormulario(cfg);
});
