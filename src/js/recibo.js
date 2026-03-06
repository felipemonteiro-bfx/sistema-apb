import { getConfigRecibo, saveConfigRecibo, requireAuth } from './firebase.js';
import { gerarHtmlRecibo as gerarHtmlReciboUtil, getValorChave } from './recibo-template.js';
import {
  setActiveMenuItem,
  showError,
  showSuccess,
  setupNavbarAuth,
  setupSyncIndicator,
  initSidebarMobile,
  initTheme,
  initKeyboardShortcuts,
} from './utils.js';
import { loadSearchData, initGlobalSearch } from './search.js';
import { initAssistente } from './assistente.js';

const CHAVES_DISPONIVEIS = [
  { chave: 'cliente', label: 'Nome do cliente' },
  { chave: 'data', label: 'Data do serviço' },
  { chave: 'carreta', label: 'Carreta' },
  { chave: 'conteiner', label: 'Contêiner' },
  { chave: 'transportadora', label: 'Transportadora' },
  { chave: 'local', label: 'Local do serviço' },
  { chave: 'chapas', label: 'Quantidade de chapas' },
  { chave: 'valor_total', label: 'Valor total' },
  { chave: 'observacoes', label: 'Observações' },
  { chave: 'fornecedor', label: 'Fornecedor' },
  { chave: 'nfe', label: 'NFe' },
  { chave: 'cte', label: 'CTE' },
];

let config = null;

async function loadComponents() {
  try {
    const navbarRes = await fetch('../components/navbar.html');
    const sidebarRes = await fetch('../components/sidebar.html');
    document.getElementById('navbar-container').innerHTML = await navbarRes.text();
    document.getElementById('sidebar-container').innerHTML = await sidebarRes.text();

    setActiveMenuItem('recibo');
    initTheme();
    initKeyboardShortcuts();
    setupSyncIndicator();
    initSidebarMobile();
    initAssistente();
    loadSearchData();
    initGlobalSearch();
  } catch (err) {
    console.error('Erro ao carregar componentes:', err);
  }
}

function renderCamposTabela() {
  const container = document.getElementById('campos-tabela-container');
  if (!container) return;

  const campos = config.campos_tabela || [];
  container.innerHTML = campos
    .map(
      (c, i) => `
    <div class="flex flex-wrap gap-2 items-center mb-2 p-2 bg-gray-50 rounded" data-index="${i}">
      <input type="text" class="form-input w-40" placeholder="Rótulo" value="${escapeHtml(c.label || '')}" data-field="label" />
      <select class="form-select w-48" data-field="chave">
        ${CHAVES_DISPONIVEIS.map(
          (k) =>
            `<option value="${k.chave}" ${c.chave === k.chave ? 'selected' : ''}>${k.label}</option>`
        ).join('')}
      </select>
      <button type="button" class="btn btn-danger btn-sm" onclick="removerCampo(${i})">Remover</button>
    </div>`
    )
    .join('');

  container.querySelectorAll('[data-field]').forEach((el) => {
    el.addEventListener('change', () => atualizarPreview());
    el.addEventListener('input', () => atualizarPreview());
  });

  window.removerCampo = removerCampo;
}

function removerCampo(index) {
  config.campos_tabela.splice(index, 1);
  renderCamposTabela();
  atualizarPreview();
}

function escapeHtml(s) {
  if (!s) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function coletarFormulario() {
  const campos = [];
  document.querySelectorAll('#campos-tabela-container [data-index]').forEach((row) => {
    const label = row.querySelector('[data-field="label"]')?.value?.trim() || 'Campo';
    const chave = row.querySelector('[data-field="chave"]')?.value || 'cliente';
    campos.push({ label, chave });
  });
  return {
    titulo: document.getElementById('recibo-titulo')?.value?.trim() || 'Recibo de Serviço',
    nome_empresa: document.getElementById('recibo-nome-empresa')?.value?.trim() || 'Sistema APB',
    cabecalho: document.getElementById('recibo-cabecalho')?.value?.trim() || '',
    rodape: document.getElementById('recibo-rodape')?.value?.trim() || 'Obrigado pela preferência.',
    campos_tabela: campos.length ? campos : config?.campos_tabela || [],
    assunto_email:
      document.getElementById('recibo-assunto-email')?.value?.trim() ||
      'Recibo - {{cliente}} - {{data}}',
    mensagem_email:
      document.getElementById('recibo-mensagem-email')?.value?.trim() ||
      'Prezado(a) {{cliente}},\n\nSegue o recibo do serviço realizado em {{data}}.\n\nValor total: {{valor}}\n\nAtenciosamente.',
  };
}

function preencherFormulario(data) {
  config = { ...data };
  document.getElementById('recibo-titulo').value = data.titulo || '';
  document.getElementById('recibo-nome-empresa').value = data.nome_empresa || '';
  document.getElementById('recibo-cabecalho').value = data.cabecalho || '';
  document.getElementById('recibo-rodape').value = data.rodape || '';
  document.getElementById('recibo-assunto-email').value = data.assunto_email || '';
  document.getElementById('recibo-mensagem-email').value = data.mensagem_email || '';
  renderCamposTabela();
  atualizarPreview();
}

const gerarHtmlRecibo = gerarHtmlReciboUtil;

function atualizarPreview() {
  const container = document.getElementById('recibo-preview');
  if (!container) return;

  const dados = coletarFormulario();
  const servicoExemplo = {
    data_servico: '2025-03-05',
    carreta: 'ABC-1234',
    conteiner: 'MSKU1234567',
    transportadora: 'Transportadora Exemplo',
    local_servico: 'Porto de Santos',
    quantidade_chapas: 100,
    valor_total: 1500.5,
    clientes: { nome: 'Cliente Exemplo Ltda' },
  };

  container.innerHTML = gerarHtmlRecibo(dados, servicoExemplo);
}

async function salvar() {
  const dados = coletarFormulario();
  try {
    await saveConfigRecibo(dados);
    showSuccess('Modelo de recibo salvo!');
  } catch (err) {
    showError('Erro ao salvar: ' + err.message);
  }
}

document.getElementById('btn-salvar-recibo')?.addEventListener('click', salvar);

document.getElementById('btn-add-campo')?.addEventListener('click', () => {
  if (!config) config = { campos_tabela: [] };
  if (!config.campos_tabela) config.campos_tabela = [];
  config.campos_tabela.push({ label: 'Novo campo', chave: 'cliente' });
  renderCamposTabela();
  atualizarPreview();
});

['recibo-titulo', 'recibo-nome-empresa', 'recibo-cabecalho', 'recibo-rodape', 'recibo-assunto-email', 'recibo-mensagem-email'].forEach(
  (id) => {
    document.getElementById(id)?.addEventListener('input', atualizarPreview);
  }
);

requireAuth().then(async (user) => {
  await loadComponents();
  await setupNavbarAuth(user);
  config = await getConfigRecibo();
  preencherFormulario(config);
});
