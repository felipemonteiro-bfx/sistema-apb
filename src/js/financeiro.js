import {
  subscribeServicos,
  insertPagamento,
  updateServico,
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
  getPaymentStatus,
  calculateDaysOverdue,
  setupNavbarAuth,
  setupSyncIndicator,
  initSidebarMobile,
  initTheme,
  initKeyboardShortcuts,
} from './utils.js';
import { loadSearchData, initGlobalSearch } from './search.js';
import { initAssistente } from './assistente.js';

let servicos = [];
let servicoSelecionado = null;

async function loadComponents() {
  try {
    const navbarRes = await fetch('../components/navbar.html');
    const sidebarRes = await fetch('../components/sidebar.html');

    document.getElementById('navbar-container').innerHTML = await navbarRes.text();
    document.getElementById('sidebar-container').innerHTML = await sidebarRes.text();

    setActiveMenuItem('financeiro');
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

// Event listeners para abas
document.querySelectorAll('.aba-btn')?.forEach((btn) => {
  btn.addEventListener('click', (e) => {
    const aba = e.target.getAttribute('data-aba');
    
    // Remove active de todos
    document.querySelectorAll('.aba-btn').forEach((b) => {
      b.classList.remove('active', 'border-blue-600');
      b.classList.add('border-transparent');
    });
    
    document.querySelectorAll('.aba-content').forEach((c) => {
      c.classList.add('hidden');
    });
    
    // Adiciona active ao clicado
    e.target.classList.add('active', 'border-blue-600');
    e.target.classList.remove('border-transparent');
    document.getElementById(`aba-${aba}`).classList.remove('hidden');
  });
});

// Modal eventos
document.getElementById('btn-fechar-modal')?.addEventListener('click', () => {
  closeModal('modal-pagamento');
});

document.getElementById('btn-cancelar-pag')?.addEventListener('click', () => {
  closeModal('modal-pagamento');
});

document.getElementById('form-pagamento')?.addEventListener('submit', handleSavePagamento);

document.getElementById('modal-pagamento')?.addEventListener('click', (e) => {
  if (e.target.id === 'modal-pagamento') {
    closeModal('modal-pagamento');
  }
});

async function handleSavePagamento(e) {
  e.preventDefault();

  if (!servicoSelecionado) return;

  const dados = {
    servico_id: servicoSelecionado.id,
    valor: parseFloat(document.getElementById('pag-valor').value),
    data_pagamento: document.getElementById('pag-data').value,
    forma_pagamento: document.getElementById('pag-forma').value,
    observacao: document.getElementById('pag-observacao')?.value?.trim() || null,
    confirmado: true,
  };

  try {
    await insertPagamento(dados);
    await updateServico(servicoSelecionado.id, { status: 'recebido' });
    showSuccess('Pagamento registrado com sucesso!');
    closeModal('modal-pagamento');
    await loadServicos();
  } catch (error) {
    console.error('Erro:', error);
    showError('Erro ao registrar pagamento: ' + error.message);
  }
}

function loadServicos() {
  subscribeServicos((data) => {
    servicos = data;
    renderContasReceber();
    renderRanking();
    renderLucroChart();
  });
}

function renderContasReceber() {
  const tbody = document.getElementById('contas-tbody');
  if (!tbody) return;

  const contasReceber = servicos.filter(
    (s) =>
      s.status !== 'recebido' &&
      (!s.pagamentos || s.pagamentos.length === 0 || !s.pagamentos.some((p) => p.confirmado))
  );

  if (contasReceber.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center text-gray-500 py-4">Nenhuma conta a receber</td></tr>';
    return;
  }

  tbody.innerHTML = contasReceber
    .map((s) => {
      const dueDate = new Date(s.data_servico);
      dueDate.setDate(dueDate.getDate() + (s.clientes?.prazo_pagamento || 30));
      const diasVencido = calculateDaysOverdue(dueDate.toISOString().split('T')[0]);
      const status = getPaymentStatus(s);

      return `<tr>
        <td>${formatDate(s.data_servico)}</td>
        <td>${s.clientes?.nome || 'N/A'}</td>
        <td>${formatCurrency(s.valor_total || 0)}</td>
        <td>${formatDate(dueDate.toISOString().split('T')[0])}</td>
        <td class="${diasVencido > 0 ? 'negative' : 'text-green-600'}">
          ${diasVencido > 0 ? `${diasVencido} dias` : 'No prazo'}
        </td>
        <td>
          <span class="badge ${status === 'atrasado' ? 'badge-danger' : 'badge-warning'}">
            ${status === 'atrasado' ? '❌ Atrasado' : '⏱️ Pendente'}
          </span>
        </td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="gerarBoleto('${s.id}')">Boleto</button>
          <button class="btn btn-success btn-sm ml-1" onclick="abrirPagamento('${s.id}', ${s.valor_total})">Recebido</button>
        </td>
      </tr>`;
    })
    .join('');

  window.abrirPagamento = abrirPagamento;
  window.gerarBoleto = gerarBoleto;
}

const FUNCTIONS_URL = 'https://us-central1-sistema-apb.cloudfunctions.net';
async function gerarBoleto(servicoId) {
  const s = servicos.find((x) => x.id === servicoId);
  if (!s) return;
  const dueDate = new Date(s.data_servico);
  dueDate.setDate(dueDate.getDate() + (s.clientes?.prazo_pagamento || 30));
  const vencimento = dueDate.toISOString().split('T')[0];
  try {
    const res = await fetch(`${FUNCTIONS_URL}/gerarBoletoCora`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valor: s.valor_total || 0,
        vencimento,
        clienteNome: s.clientes?.nome || 'Cliente',
        clienteCnpj: (s.clientes?.cnpj || '').replace(/\D/g, ''),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao gerar boleto');
    if (data.digitable_line) {
      await navigator.clipboard.writeText(data.digitable_line);
      showSuccess('Linha do boleto copiada! ' + (data.invoice_url ? 'Link: ' + data.invoice_url : ''));
    } else {
      showSuccess('Boleto gerado. Configure credenciais Cora no Firebase.');
    }
  } catch (err) {
    showError('Erro ao gerar boleto: ' + err.message);
  }
}

function abrirPagamento(servicoId, valor) {
  servicoSelecionado = servicos.find((s) => s.id === servicoId);
  document.getElementById('pag-valor').value = valor.toFixed(2);
  document.getElementById('pag-data').valueAsDate = new Date();
  document.getElementById('pag-observacao').value = '';
  openModal('modal-pagamento');
}

function renderRanking() {
  const currentMonth = new Date();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  const servicosMes = servicos.filter((s) => {
    const data = new Date(s.data_servico);
    return data >= firstDay && data <= lastDay;
  });

  // Faturamento por cliente
  const faturamentoClientes = {};
  const lucroClientes = {};

  servicosMes.forEach((s) => {
    const clienteNome = s.clientes?.nome || 'Sem cliente';
    
    faturamentoClientes[clienteNome] = (faturamentoClientes[clienteNome] || 0) + (s.valor_total || 0);

    const custosChapu = (s.quantidade_chapas || 0) * (s.valor_por_chapa || 0);
    const custosStretch = (s.stretch_quantidade || 0) * (s.stretch_valor || 0);
    const custosMatrin = s.matrin_valor || 0;
    const custosAd = s.custos_servico
      ? s.custos_servico.reduce((sum, c) => sum + (c.valor || 0), 0)
      : 0;
    const custosTotal = custosChapu + custosStretch + custosMatrin + custosAd;
    const { lucro } = calculateLucro(s.valor_total || 0, custosTotal);
    
    lucroClientes[clienteNome] = (lucroClientes[clienteNome] || 0) + lucro;
  });

  // Top 5 Faturamento
  const topFaturamento = Object.entries(faturamentoClientes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const faturDiv = document.getElementById('ranking-faturamento');
  if (faturDiv) {
    faturDiv.innerHTML = topFaturamento
      .map(
        ([cliente, valor], idx) =>
          `<div class="flex justify-between py-2 border-b">
            <span>${idx + 1}. ${cliente}</span>
            <span class="currency">${formatCurrency(valor)}</span>
          </div>`
      )
      .join('');
  }

  // Top 5 Lucro
  const topLucro = Object.entries(lucroClientes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const lucroDiv = document.getElementById('ranking-lucro');
  if (lucroDiv) {
    lucroDiv.innerHTML = topLucro
      .map(
        ([cliente, valor], idx) =>
          `<div class="flex justify-between py-2 border-b ${valor >= 0 ? 'positive' : 'negative'}">
            <span>${idx + 1}. ${cliente}</span>
            <span class="currency">${formatCurrency(valor)}</span>
          </div>`
      )
      .join('');
  }
}

let chartLucroInstance = null;

function renderLucroChart() {
  if (chartLucroInstance) {
    chartLucroInstance.destroy();
    chartLucroInstance = null;
  }

  const currentMonth = new Date();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  const servicosMes = servicos.filter((s) => {
    const data = new Date(s.data_servico);
    return data >= firstDay && data <= lastDay;
  });

  const margemClientes = {};

  servicosMes.forEach((s) => {
    const clienteNome = s.clientes?.nome || 'Sem cliente';
    
    const custosChapu = (s.quantidade_chapas || 0) * (s.valor_por_chapa || 0);
    const custosStretch = (s.stretch_quantidade || 0) * (s.stretch_valor || 0);
    const custosMatrin = s.matrin_valor || 0;
    const custosAd = s.custos_servico
      ? s.custos_servico.reduce((sum, c) => sum + (c.valor || 0), 0)
      : 0;
    const custosTotal = custosChapu + custosStretch + custosMatrin + custosAd;
    const { margem } = calculateLucro(s.valor_total || 0, custosTotal);
    
    if (!margemClientes[clienteNome]) {
      margemClientes[clienteNome] = [];
    }
    margemClientes[clienteNome].push(margem);
  });

  // Média de margem por cliente
  const margemMedia = {};
  for (const [cliente, margens] of Object.entries(margemClientes)) {
    margemMedia[cliente] = margens.reduce((a, b) => a + b, 0) / margens.length;
  }

  const ctx = document.getElementById('chartLucro')?.getContext('2d');
  if (!ctx) return;

  const labels = Object.keys(margemMedia);
  if (labels.length === 0) return;

  chartLucroInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(margemMedia),
      datasets: [
        {
          label: 'Margem de Lucro (%)',
          data: Object.values(margemMedia),
          backgroundColor: Object.values(margemMedia).map((v) =>
            v >= 30 ? '#22c55e' : v >= 20 ? '#3b82f6' : '#ef4444'
          ),
        },
      ],
    },
    options: {
      indexAxis: 'y',
      barThickness: 20,
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          max: 100,
        },
      },
    },
  });
}

// Proteger rota e inicializar
requireAuth().then(async (user) => {
  await loadComponents();
  await setupNavbarAuth(user);
  const m = document.getElementById('current-month');
  if (m) m.textContent = `Mês: ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;
  loadServicos();
});
