import {
  getClientes,
  getServicos,
  insertServico,
  updateServico,
  insertCusto,
  deleteCusto,
  deleteCustosByServico,
  getNotasFiscaisByServico,
  insertNotaFiscal,
  requireAuth,
} from './firebase.js';
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
} from './utils.js';

let servicos = [];
let clientes = [];
let custosTemp = [];
let notasFiscais = [];
let servicoEditando = null;

document.getElementById('current-month').textContent = `Mês: ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;

async function loadComponents() {
  try {
    const navbarRes = await fetch('../components/navbar.html');
    const sidebarRes = await fetch('../components/sidebar.html');

    document.getElementById('navbar-container').innerHTML = await navbarRes.text();
    document.getElementById('sidebar-container').innerHTML = await sidebarRes.text();

    setActiveMenuItem('servicos');
  } catch (error) {
    console.error('Erro ao carregar componentes:', error);
  }
}

// Event listeners
document.getElementById('btn-novo-servico')?.addEventListener('click', () => {
  servicoEditando = null;
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

  const dados = {
    data_servico: document.getElementById('servico-data').value,
    cliente_id: document.getElementById('servico-cliente').value,
    quantidade_chapas: parseInt(document.getElementById('servico-quantidade').value) || 0,
    valor_por_chapa: parseFloat(document.getElementById('servico-valor').value) || 0,
    valor_total: parseFloat(document.getElementById('servico-total').value) || 0,
    status: document.getElementById('servico-status').value,
    local_servico: document.getElementById('servico-local')?.value?.trim() || null,
    observacoes: document.getElementById('servico-obs')?.value?.trim() || null,
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
  try {
    servicos = await getServicos();
    clientes = await getClientes();
    
    // Populate cliente select
    const select = document.getElementById('servico-cliente');
    if (select) {
      select.innerHTML = clientes
        .map((c) => `<option value="${c.id}">${c.nome}</option>`)
        .join('');
    }

    renderServicos();
  } catch (error) {
    console.error('Erro ao carregar servicos:', error);
    showError('Erro ao carregar serviços');
  }
}

function renderServicos() {
  const tbody = document.getElementById('servicos-tbody');
  if (!tbody) return;

  if (servicos.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="9" class="text-center text-gray-500 py-4">Nenhum serviço registrado</td></tr>';
    return;
  }

  tbody.innerHTML = servicos
    .map((s) => {
      const custosChapu = (s.quantidade_chapas || 0) * (s.valor_por_chapa || 0);
      const custosAd = s.custos_servico
        ? s.custos_servico.reduce((sum, c) => sum + (c.valor || 0), 0)
        : 0;
      const custosTotal = custosChapu + custosAd;
      const { lucro } = calculateLucro(s.valor_total || 0, custosTotal);

      return `<tr>
        <td>${formatDate(s.data_servico)}</td>
        <td>${s.clientes?.nome || 'N/A'}</td>
        <td>${s.local_servico || '-'}</td>
        <td>${s.quantidade_chapas}</td>
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
        </td>
      </tr>`;
    })
    .join('');

  window.visualizarServico = visualizarServico;
}

async function visualizarServico(id) {
  const servico = servicos.find((s) => s.id === id);
  if (!servico) return;

  servicoEditando = servico;
  custosTemp = servico.custos_servico || [];

  document.getElementById('servico-data').value = servico.data_servico;
  document.getElementById('servico-cliente').value = servico.cliente_id;
  document.getElementById('servico-quantidade').value = servico.quantidade_chapas;
  document.getElementById('servico-valor').value = servico.valor_por_chapa;
  document.getElementById('servico-total').value = servico.valor_total;
  document.getElementById('servico-status').value = servico.status;
  document.getElementById('servico-local').value = servico.local_servico || '';
  document.getElementById('servico-obs').value = servico.observacoes || '';

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

  openModal('modal-servico');
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
  loadServicos();
});
