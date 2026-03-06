import {
  getClientes,
  subscribeServicos,
  insertServico,
  updateServico,
  insertCusto,
  deleteCusto,
  deleteCustosByServico,
  getNotasFiscaisByServico,
  insertNotaFiscal,
  getConfigRecibo,
  getConfigNFSe,
  requireAuth,
} from './firebase.js';
import { gerarHtmlRecibo, aplicarPlaceholders } from './recibo-template.js';
import {
  formatCurrency,
  formatDate,
  setActiveMenuItem,
  showError,
  showSuccess,
  openModal,
  closeModal,
  calculateLucro,
  getStatusBadge,
  setupNavbarAuth,
  setupSyncIndicator,
  initSidebarMobile,
  initTheme,
  initKeyboardShortcuts,
} from './utils.js';
import { loadSearchData, initGlobalSearch } from './search.js';
import { initAssistente } from './assistente.js';

let servicos = [];
let clientes = [];
let custosTemp = [];
let notasFiscais = [];
let servicoEditando = null;

async function loadComponents() {
  try {
    const navbarRes = await fetch('../components/navbar.html');
    const sidebarRes = await fetch('../components/sidebar.html');

    document.getElementById('navbar-container').innerHTML = await navbarRes.text();
    document.getElementById('sidebar-container').innerHTML = await sidebarRes.text();

    setActiveMenuItem('servicos');
    initTheme();
    initKeyboardShortcuts();
    setupSyncIndicator();
    initSidebarMobile();
    initAssistente();
    loadSearchData();
    initGlobalSearch();
  } catch (error) {
    console.error('Erro ao carregar componentes:', error);
  }
}

// Event listeners
document.getElementById('btn-novo-servico')?.addEventListener('click', () => {
  servicoEditando = null;
  document.getElementById('btn-exportar-nfse').onclick = () => showError('Salve o serviço antes de exportar.');
  custosTemp = [];
  notasFiscais = [];
  document.getElementById('form-servico').reset();
  document.getElementById('servico-data').valueAsDate = new Date();
  renderCustosTemp();
  document.getElementById('notas-fiscais-section')?.classList.add('hidden');
  openModal('modal-servico');
});

document.getElementById('btn-fechar-modal')?.addEventListener('click', () => {
  closeModal('modal-servico');
});

document.getElementById('btn-cancelar')?.addEventListener('click', () => {
  closeModal('modal-servico');
});

document.getElementById('form-servico')?.addEventListener('submit', handleSaveServico);

document.getElementById('modal-servico')?.addEventListener('click', (e) => {
  if (e.target.id === 'modal-servico') {
    closeModal('modal-servico');
  }
});

document.getElementById('servico-quantidade')?.addEventListener('change', updateTotal);
document.getElementById('servico-valor')?.addEventListener('change', updateTotal);

document.getElementById('btn-add-custo')?.addEventListener('click', () => {
  custosTemp.push({ tipo_custo: 'outros', valor: 0, descricao: '' });
  renderCustosTemp();
});

document.getElementById('btn-add-nf')?.addEventListener('click', addNotaFiscal);

const FUNCTIONS_URL = 'https://us-central1-sistema-apb.cloudfunctions.net';
document.getElementById('btn-enviar-recibo')?.addEventListener('click', abrirModalReciboEmail);
document.getElementById('btn-visualizar-recibo')?.addEventListener('click', visualizarRecibo);
document.getElementById('btn-emitir-nfse')?.addEventListener('click', emitirNFSe);
document.getElementById('btn-fechar-modal-recibo')?.addEventListener('click', () => closeModal('modal-recibo-email'));
document.getElementById('btn-cancelar-recibo')?.addEventListener('click', () => closeModal('modal-recibo-email'));
document.getElementById('modal-recibo-email')?.addEventListener('click', (e) => {
  if (e.target.id === 'modal-recibo-email') closeModal('modal-recibo-email');
});
document.getElementById('btn-confirmar-envio')?.addEventListener('click', enviarReciboEmail);

function updateTotal() {
  const quantidade = parseFloat(document.getElementById('servico-quantidade').value) || 0;
  const valor = parseFloat(document.getElementById('servico-valor').value) || 0;
  const total = quantidade * valor;
  document.getElementById('servico-total').value = total.toFixed(2);
}

function renderCustosTemp() {
  const container = document.getElementById('custos-container');
  if (!container) return;

  container.innerHTML = custosTemp
    .map(
      (c, i) =>
        `<div class="grid grid-cols-3 gap-2 mb-2">
          <select class="form-select" onchange="updateCustoTempo(${i}, 'tipo_custo', this.value)">
            <option value="diaria_chapa" ${c.tipo_custo === 'diaria_chapa' ? 'selected' : ''}>Diária Chapa</option>
            <option value="uber" ${c.tipo_custo === 'uber' ? 'selected' : ''}>Uber</option>
            <option value="epi" ${c.tipo_custo === 'epi' ? 'selected' : ''}>EPI</option>
            <option value="stretch" ${c.tipo_custo === 'stretch' ? 'selected' : ''}>Stretch</option>
            <option value="matrin" ${c.tipo_custo === 'matrin' ? 'selected' : ''}>Matrin</option>
            <option value="outros" ${c.tipo_custo === 'outros' ? 'selected' : ''}>Outros</option>
          </select>
          <input type="number" class="form-input" value="${c.valor}" step="0.01" onchange="updateCustoTempo(${i}, 'valor', this.value)" />
          <div class="flex gap-1">
            <input type="text" class="form-input" placeholder="Descrição" value="${c.descricao || ''}" onchange="updateCustoTempo(${i}, 'descricao', this.value)" />
            <button type="button" class="btn btn-danger btn-sm" onclick="removerCustoTempo(${i})">✕</button>
          </div>
        </div>`
    )
    .join('');

  window.updateCustoTempo = updateCustoTempo;
  window.removerCustoTempo = removerCustoTempo;
}

function updateCustoTempo(index, field, value) {
  custosTemp[index][field] = field === 'valor' ? parseFloat(value) : value;
}

function removerCustoTempo(index) {
  custosTemp.splice(index, 1);
  renderCustosTemp();
}

async function handleSaveServico(e) {
  e.preventDefault();

  const clienteId = document.getElementById('servico-cliente').value?.trim();
  const dados = {
    data_servico: document.getElementById('servico-data').value,
    cliente_id: clienteId || null,
    quantidade_chapas: parseInt(document.getElementById('servico-quantidade').value) || 0,
    valor_por_chapa: parseFloat(document.getElementById('servico-valor').value) || 0,
    valor_total: parseFloat(document.getElementById('servico-total').value) || 0,
    status: document.getElementById('servico-status').value,
    local_servico: document.getElementById('servico-local')?.value?.trim() || null,
    observacoes: document.getElementById('servico-obs')?.value?.trim() || null,
    carreta: document.getElementById('servico-carreta')?.value?.trim() || null,
    conteiner: document.getElementById('servico-conteiner')?.value?.trim() || null,
    nfe: document.getElementById('servico-nfe')?.value?.trim() || null,
    cte: document.getElementById('servico-cte')?.value?.trim() || null,
    transportadora: document.getElementById('servico-transportadora')?.value?.trim() || null,
    fornecedor: document.getElementById('servico-fornecedor')?.value?.trim() || null,
    stretch_quantidade: parseFloat(document.getElementById('servico-stretch-quantidade')?.value) || null,
    stretch_valor: parseFloat(document.getElementById('servico-stretch-valor')?.value) || null,
    matrin_valor: parseFloat(document.getElementById('servico-matrin-valor')?.value) || null,
  };

  try {
    let servicoId;

    if (servicoEditando) {
      await updateServico(servicoEditando.id, dados);
      servicoId = servicoEditando.id;
      await deleteCustosByServico(servicoId);
      showSuccess('Serviço atualizado com sucesso!');
    } else {
      const novoServico = await insertServico(dados);
      servicoId = novoServico.id;
      showSuccess('Serviço criado com sucesso!');
    }

    // Salvar custos
    for (const custo of custosTemp) {
      if (custo.valor > 0) {
        await insertCusto({
          servico_id: servicoId,
          tipo_custo: custo.tipo_custo,
          valor: custo.valor,
          descricao: custo.descricao,
        });
      }
    }

    closeModal('modal-servico');
    await loadServicos();
  } catch (error) {
    console.error('Erro:', error);
    showError('Erro ao salvar serviço: ' + error.message);
  }
}

async function loadServicos() {
  clientes = await getClientes();
  const select = document.getElementById('servico-cliente');
  if (select) {
    select.innerHTML =
      '<option value="">— Selecionar —</option>' +
      clientes.map((c) => `<option value="${c.id}">${c.nome}</option>`).join('');
  }

  const filterCliente = document.getElementById('filter-cliente');
  if (filterCliente) {
    filterCliente.innerHTML =
      '<option value="">Todos</option>' +
      clientes.map((c) => `<option value="${c.id}">${c.nome}</option>`).join('');
  }
  ['filter-data-inicio', 'filter-data-fim', 'filter-cliente', 'filter-status'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', () => renderServicos());
  });

  subscribeServicos((data) => {
    servicos = data;
    renderServicos();
  });
}

function renderServicos() {
  const tbody = document.getElementById('servicos-tbody');
  if (!tbody) return;

  const filtered = getFilteredServicos ? getFilteredServicos() : servicos;

  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="12" class="text-center text-gray-500 py-4">Nenhum serviço registrado</td></tr>';
    return;
  }

  tbody.innerHTML = filtered
    .map((s) => {
      const custosChapu = (s.quantidade_chapas || 0) * (s.valor_por_chapa || 0);
      const custosStretch = (s.stretch_quantidade || 0) * (s.stretch_valor || 0);
      const custosMatrin = s.matrin_valor || 0;
      const custosAd = s.custos_servico
        ? s.custos_servico.reduce((sum, c) => sum + (c.valor || 0), 0)
        : 0;
      const custosTotal = custosChapu + custosStretch + custosMatrin + custosAd;
      const { lucro } = calculateLucro(s.valor_total || 0, custosTotal);

      return `<tr>
        <td>${formatDate(s.data_servico)}</td>
        <td>${s.clientes?.nome || '—'}</td>
        <td>${s.carreta || '—'}</td>
        <td>${s.conteiner || '—'}</td>
        <td>${s.transportadora || '—'}</td>
        <td>${s.local_servico || '—'}</td>
        <td>${s.quantidade_chapas ?? '—'}</td>
        <td>${formatCurrency(s.valor_total || 0)}</td>
        <td>${formatCurrency(custosTotal)}</td>
        <td class="${lucro >= 0 ? 'positive' : 'negative'}">${formatCurrency(lucro)}</td>
        <td>
          <span class="badge ${getStatusBadge(s.status).class}">
            ${getStatusBadge(s.status).label}
          </span>
        </td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="visualizarServico('${s.id}')">Ver</button>
          <button class="btn btn-secondary btn-sm ml-1" onclick="duplicarServico('${s.id}')">Duplicar</button>
        </td>
      </tr>`;
    })
    .join('');

  window.visualizarServico = visualizarServico;
  window.duplicarServico = duplicarServico;
}

function getFilteredServicos() {
  const dataInicio = document.getElementById('filter-data-inicio')?.value;
  const dataFim = document.getElementById('filter-data-fim')?.value;
  const clienteId = document.getElementById('filter-cliente')?.value;
  const status = document.getElementById('filter-status')?.value;

  return servicos.filter((s) => {
    if (dataInicio && s.data_servico < dataInicio) return false;
    if (dataFim && s.data_servico > dataFim) return false;
    if (clienteId && s.cliente_id !== clienteId) return false;
    if (status && s.status !== status) return false;
    return true;
  });
}

function duplicarServico(id) {
  const servico = servicos.find((s) => s.id === id);
  if (!servico) return;
  servicoEditando = null;
  custosTemp = (servico.custos_servico || []).map((c) => ({ ...c }));
  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById('servico-data').value = hoje;
  document.getElementById('servico-cliente').value = servico.cliente_id || '';
  document.getElementById('servico-quantidade').value = servico.quantidade_chapas ?? '';
  document.getElementById('servico-valor').value = servico.valor_por_chapa ?? '';
  document.getElementById('servico-total').value = servico.valor_total ?? '';
  document.getElementById('servico-status').value = 'agendado';
  document.getElementById('servico-local').value = servico.local_servico || '';
  document.getElementById('servico-obs').value = '';
  document.getElementById('servico-carreta').value = servico.carreta || '';
  document.getElementById('servico-conteiner').value = servico.conteiner || '';
  document.getElementById('servico-nfe').value = servico.nfe || '';
  document.getElementById('servico-cte').value = servico.cte || '';
  document.getElementById('servico-transportadora').value = servico.transportadora || '';
  document.getElementById('servico-fornecedor').value = servico.fornecedor || '';
  document.getElementById('servico-stretch-quantidade').value = servico.stretch_quantidade ?? '';
  document.getElementById('servico-stretch-valor').value = servico.stretch_valor ?? '';
  document.getElementById('servico-matrin-valor').value = servico.matrin_valor ?? '';
  document.getElementById('notas-fiscais-section')?.classList.add('hidden');
  renderCustosTemp();
  openModal('modal-servico');
}

async function visualizarServico(id) {
  const servico = servicos.find((s) => s.id === id);
  if (!servico) return;

  servicoEditando = servico;
  custosTemp = servico.custos_servico || [];

  document.getElementById('servico-data').value = servico.data_servico;
  document.getElementById('servico-cliente').value = servico.cliente_id || '';
  document.getElementById('servico-quantidade').value = servico.quantidade_chapas ?? '';
  document.getElementById('servico-valor').value = servico.valor_por_chapa ?? '';
  document.getElementById('servico-total').value = servico.valor_total ?? '';
  document.getElementById('servico-status').value = servico.status;
  document.getElementById('servico-local').value = servico.local_servico || '';
  document.getElementById('servico-obs').value = servico.observacoes || '';
  document.getElementById('servico-carreta').value = servico.carreta || '';
  document.getElementById('servico-conteiner').value = servico.conteiner || '';
  document.getElementById('servico-nfe').value = servico.nfe || '';
  document.getElementById('servico-cte').value = servico.cte || '';
  document.getElementById('servico-transportadora').value = servico.transportadora || '';
  document.getElementById('servico-fornecedor').value = servico.fornecedor || '';
  document.getElementById('servico-stretch-quantidade').value = servico.stretch_quantidade ?? '';
  document.getElementById('servico-stretch-valor').value = servico.stretch_valor ?? '';
  document.getElementById('servico-matrin-valor').value = servico.matrin_valor ?? '';

  renderCustosTemp();

  const nfSection = document.getElementById('notas-fiscais-section');
  if (nfSection) {
    nfSection.classList.remove('hidden');
    notasFiscais = await getNotasFiscaisByServico(servico.id);
    renderNotasFiscais();
    document.getElementById('nf-numero').value = '';
    document.getElementById('nf-valor').value = '';
    document.getElementById('nf-data-emissao').value = '';
    document.getElementById('nf-status').value = 'pendente';
    document.getElementById('nf-link-pdf').value = '';
  }

  document.getElementById('btn-exportar-nfse').onclick = () => exportarDadosNFSe(servicoEditando);
  openModal('modal-servico');
}

async function emitirNFSe() {
  if (!servicoEditando || !servicoEditando.id) {
    showError('Salve o serviço antes de emitir NFS-e.');
    return;
  }
  const cnpj = (servicoEditando.clientes?.cnpj || '').replace(/\D/g, '');
  if (!cnpj || cnpj.length < 11) {
    showError('Cliente precisa ter CNPJ/CPF cadastrado para emissão de NFS-e.');
    return;
  }
  const btn = document.getElementById('btn-emitir-nfse');
  const origText = btn?.textContent;
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Emitindo...';
  }
  try {
    const config_nfse = await getConfigNFSe();
    const res = await fetch(`${FUNCTIONS_URL}/emitirNFSe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        servico: servicoEditando,
        config_nfse: {
          city_service_code: config_nfse.city_service_code,
          iss_rate: config_nfse.iss_rate,
          descricao_padrao: config_nfse.descricao_padrao,
          municipio_ibge: config_nfse.municipio_ibge,
          municipio_nome: config_nfse.municipio_nome,
          estado: config_nfse.estado,
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao emitir NFS-e');
    await insertNotaFiscal({
      servico_id: servicoEditando.id,
      numero_nf: data.numero_nf || data.id || '',
      valor: servicoEditando.valor_total || 0,
      data_emissao: new Date().toISOString().split('T')[0],
      status: data.status === 'Autorizada' ? 'emitida' : 'emitida',
      link_pdf: data.pdf_url || null,
    });
    showSuccess('NFS-e emitida com sucesso!' + (data.pdf_url ? ' PDF disponível.' : ''));
    notasFiscais = await getNotasFiscaisByServico(servicoEditando.id);
    renderNotasFiscais();
    if (data.pdf_url) window.open(data.pdf_url, '_blank');
  } catch (err) {
    showError('Erro ao emitir NFS-e: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = origText || 'Emitir NFS-e';
    }
  }
}

async function visualizarRecibo() {
  if (!servicoEditando || !servicoEditando.id) {
    showError('Salve o serviço antes de visualizar o recibo.');
    return;
  }
  const template = await getConfigRecibo();
  const html = gerarHtmlRecibo(template, servicoEditando);
  const w = window.open('', '_blank', 'width=700,height=800');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Recibo</title></head><body>${html}<script>window.onload=function(){window.print();};<\/script></body></html>`);
  w.document.close();
}

async function abrirModalReciboEmail() {
  if (!servicoEditando || !servicoEditando.id) {
    showError('Salve o serviço antes de enviar o recibo.');
    return;
  }
  const template = await getConfigRecibo();
  document.getElementById('recibo-email').value = servicoEditando.clientes?.email || '';
  document.getElementById('recibo-assunto').value =
    aplicarPlaceholders(template.assunto_email || 'Recibo - {{cliente}} - {{data}}', servicoEditando);
  document.getElementById('recibo-mensagem').value =
    template.mensagem_email || 'Prezado(a) {{cliente}},\n\nSegue o recibo do serviço realizado em {{data}}.\n\nValor total: {{valor}}\n\nAtenciosamente.';
  openModal('modal-recibo-email');
}

async function enviarReciboEmail() {
  const to = document.getElementById('recibo-email').value?.trim();
  if (!to) {
    showError('Informe o email do destinatário.');
    return;
  }
  if (!servicoEditando || !servicoEditando.id) {
    showError('Serviço não encontrado.');
    return;
  }
  const subject = document.getElementById('recibo-assunto').value?.trim();
  const mensagem = document.getElementById('recibo-mensagem').value?.trim();

  const btn = document.getElementById('btn-confirmar-envio');
  const origText = btn?.textContent;
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Enviando...';
  }

  try {
    const template = await getConfigRecibo();
    const htmlRecibo = gerarHtmlRecibo(template, servicoEditando);

    const res = await fetch(`${FUNCTIONS_URL}/enviarReciboEmail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        subject: subject || undefined,
        mensagem: mensagem || undefined,
        servico: servicoEditando,
        html: htmlRecibo,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao enviar email');
    showSuccess('Recibo enviado com sucesso!');
    closeModal('modal-recibo-email');
  } catch (err) {
    showError('Erro ao enviar recibo: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = origText || 'Enviar';
    }
  }
}

function exportarDadosNFSe(servico) {
  if (!servico || !servico.id) {
    showError('Salve o serviço antes de exportar para NFS-e.');
    return;
  }
  const tomador = {
    nome: servico.clientes?.nome || '',
    cnpj: servico.clientes?.cnpj || '',
    endereco: servico.clientes?.endereco || '',
    cidade: servico.clientes?.cidade || '',
    estado: servico.clientes?.estado || '',
    email: servico.clientes?.email || '',
  };
  const prestador = { nome: 'Prestador', cnpj: '', endereco: '', cidade: '', estado: '' };
  const servicoNfse = {
    descricao: `Serviço - ${servico.carreta || ''} ${servico.conteiner || ''}`.trim() || 'Prestação de serviço',
    valor: servico.valor_total || 0,
    data: servico.data_servico,
    iss: ((servico.valor_total || 0) * 0.05).toFixed(2),
  };
  const dados = { tomador, prestador, servico: servicoNfse };
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `nfse-servico-${servico.id || 'novo'}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showSuccess('Dados exportados. Preencha os dados do prestador e use no portal da prefeitura.');
}

function renderNotasFiscais() {
  const container = document.getElementById('notas-fiscais-lista');
  if (!container) return;

  if (notasFiscais.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-500">Nenhuma nota fiscal</p>';
    return;
  }

  container.innerHTML = notasFiscais
    .map(
      (nf) =>
        `<div class="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
          <span>NF ${nf.numero_nf || 'N/A'} - ${formatCurrency(nf.valor || 0)} - ${nf.status || 'pendente'}</span>
          ${nf.link_pdf ? `<a href="${nf.link_pdf}" target="_blank" class="text-blue-600">PDF</a>` : ''}
        </div>`
    )
    .join('');
}

async function addNotaFiscal() {
  if (!servicoEditando) return;

  const numero = document.getElementById('nf-numero').value.trim();
  const valor = parseFloat(document.getElementById('nf-valor').value);
  if (!numero || isNaN(valor) || valor <= 0) {
    showError('Preencha número e valor da NF.');
    return;
  }

  try {
    await insertNotaFiscal({
      servico_id: servicoEditando.id,
      numero_nf: numero,
      valor,
      data_emissao: document.getElementById('nf-data-emissao').value || null,
      status: document.getElementById('nf-status').value,
      link_pdf: document.getElementById('nf-link-pdf').value.trim() || null,
    });
    showSuccess('Nota fiscal adicionada!');
    notasFiscais = await getNotasFiscaisByServico(servicoEditando.id);
    renderNotasFiscais();
    document.getElementById('nf-numero').value = '';
    document.getElementById('nf-valor').value = '';
    document.getElementById('nf-data-emissao').value = '';
    document.getElementById('nf-status').value = 'pendente';
    document.getElementById('nf-link-pdf').value = '';
  } catch (err) {
    showError('Erro ao adicionar NF: ' + err.message);
  }
}

// Proteger rota e inicializar
requireAuth().then(async (user) => {
  await loadComponents();
  await setupNavbarAuth(user);
  const m = document.getElementById('current-month');
  if (m) m.textContent = `Mês: ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;
  loadServicos();
});
