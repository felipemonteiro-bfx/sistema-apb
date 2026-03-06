import {
  subscribeClientes,
  insertCliente,
  updateCliente,
  requireAuth,
} from './firebase.js';
import {
  formatCurrency,
  setActiveMenuItem,
  showError,
  showSuccess,
  openModal,
  closeModal,
  setupNavbarAuth,
  setupSyncIndicator,
  initSidebarMobile,
  initTheme,
  initKeyboardShortcuts,
} from './utils.js';
import { loadSearchData, initGlobalSearch } from './search.js';
import { initAssistente } from './assistente.js';

let clientes = [];
let clienteEditando = null;

async function loadComponents() {
  try {
    const navbarRes = await fetch('../components/navbar.html');
    const sidebarRes = await fetch('../components/sidebar.html');

    document.getElementById('navbar-container').innerHTML = await navbarRes.text();
    document.getElementById('sidebar-container').innerHTML = await sidebarRes.text();

    setActiveMenuItem('clientes');
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
document.getElementById('btn-novo-cliente')?.addEventListener('click', () => {
  clienteEditando = null;
  document.getElementById('form-cliente').reset();
  document.getElementById('modal-titulo').textContent = 'Novo Cliente';
  openModal('modal-cliente');
});

document.getElementById('btn-fechar-modal')?.addEventListener('click', () => {
  closeModal('modal-cliente');
});

document.getElementById('btn-cancelar')?.addEventListener('click', () => {
  closeModal('modal-cliente');
});

document.getElementById('form-cliente')?.addEventListener('submit', handleSaveCliente);

document.getElementById('modal-cliente')?.addEventListener('click', (e) => {
  if (e.target.id === 'modal-cliente') {
    closeModal('modal-cliente');
  }
});

async function handleSaveCliente(e) {
  e.preventDefault();

  const dados = {
    nome: document.getElementById('cliente-nome').value.trim(),
    cnpj: document.getElementById('cliente-cnpj').value.trim(),
    telefone: document.getElementById('cliente-telefone').value.trim() || null,
    email: document.getElementById('cliente-email').value.trim() || null,
    endereco: document.getElementById('cliente-endereco').value.trim() || null,
    cidade: document.getElementById('cliente-cidade').value.trim() || null,
    estado: document.getElementById('cliente-estado').value.trim().toUpperCase() || null,
    valor_padrao_chapa: parseFloat(document.getElementById('cliente-valor').value) || 0,
    prazo_pagamento: parseInt(document.getElementById('cliente-prazo').value) || 30,
    precisa_nota: document.getElementById('cliente-precisa-nota').value,
    ativo: true,
  };

  try {
    if (clienteEditando) {
      await updateCliente(clienteEditando.id, dados);
      showSuccess('Cliente atualizado com sucesso!');
    } else {
      await insertCliente(dados);
      showSuccess('Cliente criado com sucesso!');
    }

    closeModal('modal-cliente');
    await loadClientes();
  } catch (error) {
    console.error('Erro:', error);
    showError('Erro ao salvar cliente: ' + error.message);
  }
}

function loadClientes() {
  subscribeClientes((data) => {
    clientes = data;
    renderClientes();
  });
}

function getFilteredClientes() {
  const q = document.getElementById('filter-cliente-nome')?.value?.toLowerCase().trim() || '';
  if (!q) return clientes;
  return clientes.filter((c) => (c.nome || '').toLowerCase().includes(q));
}

let filterClientesBound = false;
function renderClientes() {
  const tbody = document.getElementById('clientes-tbody');
  if (!tbody) return;

  if (!filterClientesBound) {
    document.getElementById('filter-cliente-nome')?.addEventListener('input', () => renderClientes());
    filterClientesBound = true;
  }

  const filtered = getFilteredClientes();
  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="11" class="text-center text-gray-500 py-4">Nenhum cliente cadastrado</td></tr>';
    renderCharts({ notaSim: 0, notaNao: 0 }, []);
    return;
  }

  tbody.innerHTML = filtered
    .map(
      (c) =>
        `<tr>
          <td>${c.nome}</td>
          <td>${c.cnpj}</td>
          <td>${c.telefone || '-'}</td>
          <td>${c.email || '-'}</td>
          <td>${c.endereco || '-'}</td>
          <td>${c.cidade || '-'}</td>
          <td>${c.estado || '-'}</td>
          <td>${formatCurrency(c.valor_padrao_chapa)}</td>
          <td>${c.prazo_pagamento} dias</td>
          <td>${(c.precisa_nota || 'nao') === 'sim' ? '✓ Sim' : '— Não'}</td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="editarCliente('${c.id}')">Editar</button>
          </td>
        </tr>`
    )
    .join('');

  const notaSim = clientes.filter((c) => (c.precisa_nota || 'nao') === 'sim').length;
  const notaNao = clientes.length - notaSim;
  const topValores = clientes
    .sort((a, b) => (b.valor_padrao_chapa || 0) - (a.valor_padrao_chapa || 0))
    .slice(0, 5);
  renderCharts({ notaSim, notaNao }, topValores);

  // Make editarCliente available globally
  window.editarCliente = editarCliente;
}

let chartNotaFiscal = null;
let chartValorChapa = null;

function renderCharts(notaData, topValores) {
  const ctxNota = document.getElementById('chartNotaFiscal')?.getContext('2d');
  if (ctxNota) {
    if (chartNotaFiscal) chartNotaFiscal.destroy();
    chartNotaFiscal = new Chart(ctxNota, {
      type: 'doughnut',
      data: {
        labels: ['Precisa de NF', 'Não precisa de NF'],
        datasets: [
          {
            data: [notaData.notaSim, notaData.notaNao],
            backgroundColor: ['#3b82f6', '#94a3b8'],
            borderColor: ['#2563eb', '#64748b'],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
        },
      },
    });
  }

  const ctxValor = document.getElementById('chartValorChapa')?.getContext('2d');
  if (ctxValor) {
    if (chartValorChapa) chartValorChapa.destroy();
    chartValorChapa = new Chart(ctxValor, {
      type: 'bar',
      data: {
        labels: topValores.map((c) => c.nome?.substring(0, 15) || ''),
        datasets: [
          {
            label: 'Valor por Chapa (R$)',
            data: topValores.map((c) => c.valor_padrao_chapa || 0),
            backgroundColor: 'rgba(30, 58, 95, 0.8)',
            borderColor: '#1e3a5f',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (v) => 'R$ ' + v.toLocaleString('pt-BR') },
          },
        },
      },
    });
  }
}

async function editarCliente(id) {
  const cliente = clientes.find((c) => c.id === id);
  if (!cliente) return;

  clienteEditando = cliente;
  document.getElementById('cliente-nome').value = cliente.nome;
  document.getElementById('cliente-cnpj').value = cliente.cnpj;
  document.getElementById('cliente-telefone').value = cliente.telefone || '';
  document.getElementById('cliente-email').value = cliente.email || '';
  document.getElementById('cliente-valor').value = cliente.valor_padrao_chapa;
  document.getElementById('cliente-prazo').value = cliente.prazo_pagamento;
  document.getElementById('cliente-precisa-nota').value = cliente.precisa_nota || 'nao';
  document.getElementById('cliente-endereco').value = cliente.endereco || '';
  document.getElementById('cliente-cidade').value = cliente.cidade || '';
  document.getElementById('cliente-estado').value = cliente.estado || '';
  document.getElementById('modal-titulo').textContent = 'Editar Cliente';
  
  openModal('modal-cliente');
}

// Proteger rota e inicializar
requireAuth().then(async (user) => {
  await loadComponents();
  await setupNavbarAuth(user);
  const m = document.getElementById('current-month');
  if (m) m.textContent = `Mês: ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;
  loadClientes();
});
