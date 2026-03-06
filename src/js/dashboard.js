import { subscribeServicos, requireAuth } from './firebase.js';
import {
  formatCurrency,
  formatDate,
  getCurrentMonth,
  setActiveMenuItem,
  showError,
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

async function loadComponents() {
  try {
    const navbarRes = await fetch('../components/navbar.html');
    const sidebarRes = await fetch('../components/sidebar.html');

    document.getElementById('navbar-container').innerHTML = await navbarRes.text();
    document.getElementById('sidebar-container').innerHTML = await sidebarRes.text();

    setActiveMenuItem('dashboard');
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

function initDashboard() {
  subscribeServicos((servicos) => {
    try {
    
    if (!servicos || servicos.length === 0) {
      document.getElementById('messages').innerHTML =
        '<div class="text-center text-gray-500 py-8">Nenhum serviço registrado ainda.</div>';
      document.getElementById('faturamento-valor').textContent = 'R$ 0,00';
      document.getElementById('lucro-valor').textContent = 'R$ 0,00';
      document.getElementById('servicos-valor').textContent = '0';
      document.getElementById('receber-valor').textContent = 'R$ 0,00';
      document.getElementById('ultimos-servicos').innerHTML = '';
      return;
    }
    document.getElementById('messages').innerHTML = '';

    // Calcular métricas
    const currentMonth = new Date();
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const servicosMes = servicos.filter((s) => {
      const data = new Date(s.data_servico);
      return data >= firstDay && data <= lastDay;
    });

    const faturamento = servicosMes.reduce((sum, s) => sum + (s.valor_total || 0), 0);
    const custos = servicosMes.reduce((sum, s) => {
      const custosChapu = (s.quantidade_chapas || 0) * (s.valor_por_chapa || 0);
      const custosStretch = (s.stretch_quantidade || 0) * (s.stretch_valor || 0);
      const custosMatrin = s.matrin_valor || 0;
      const custosAd = s.custos_servico
        ? s.custos_servico.reduce((cs, c) => cs + (c.valor || 0), 0)
        : 0;
      return sum + custosChapu + custosStretch + custosMatrin + custosAd;
    }, 0);

    const { lucro } = calculateLucro(faturamento, custos);
    const contasReceber = servicosMes
      .filter((s) => s.status !== 'recebido')
      .reduce((sum, s) => sum + (s.valor_total || 0), 0);

    // Update cards
    document.getElementById('faturamento-valor').textContent = formatCurrency(faturamento);
    document.getElementById('lucro-valor').textContent = formatCurrency(lucro);
    document.getElementById('servicos-valor').textContent = servicosMes.length;
    document.getElementById('receber-valor').textContent = formatCurrency(contasReceber);

    // Prepare chart data
    const clientesData = {};
    const statusData = { agendado: 0, executado: 0, faturado: 0, recebido: 0 };

    servicosMes.forEach((s) => {
      const clienteNome = s.clientes?.nome || 'Sem cliente';
      clientesData[clienteNome] = (clientesData[clienteNome] || 0) + (s.valor_total || 0);
      const status = s.status || 'agendado';
      statusData[status] = (statusData[status] || 0) + 1;
    });

    // Charts
    drawClientesChart(clientesData);
    drawStatusChart(statusData);
    drawUltimosServicos(servicosMes.slice(0, 5));
  } catch (error) {
    console.error('Erro ao inicializar dashboard:', error);
    const msg =
      error.code === 'permission-denied'
        ? 'Permissão negada no Firestore. Execute: firebase deploy --only firestore'
        : error.message || 'Erro ao carregar dados do dashboard';
    showError(msg);
  }
  });
}

let chartClientesInstance = null;
let chartStatusInstance = null;

function drawClientesChart(clientesData) {
  const ctx = document.getElementById('chartClientes')?.getContext('2d');
  if (!ctx) return;
  const labels = Object.keys(clientesData);
  if (chartClientesInstance) chartClientesInstance.destroy();
  if (labels.length === 0) return;

  chartClientesInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(clientesData),
      datasets: [
        {
          label: 'Faturamento (R$)',
          data: Object.values(clientesData),
          backgroundColor: '#3b82f6',
          borderColor: '#1e40af',
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => formatCurrency(value),
          },
        },
      },
    },
  });
}

function drawStatusChart(statusData) {
  const ctx = document.getElementById('chartStatus')?.getContext('2d');
  if (!ctx) return;
  if (chartStatusInstance) chartStatusInstance.destroy();

  const colors = {
    agendado: '#f97316',
    executado: '#3b82f6',
    faturado: '#8b5cf6',
    recebido: '#22c55e',
  };

  chartStatusInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(statusData),
      datasets: [
        {
          data: Object.values(statusData),
          backgroundColor: Object.keys(statusData).map((s) => colors[s]),
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
        },
      },
    },
  });
}

function drawUltimosServicos(servicos) {
  const tbody = document.getElementById('ultimos-servicos');
  if (!tbody) return;

  tbody.innerHTML = servicos
    .map(
      (s) =>
        `<tr>
          <td>${s.clientes?.nome || 'N/A'}</td>
          <td>${formatDate(s.data_servico)}</td>
          <td>${s.quantidade_chapas}</td>
          <td>${formatCurrency(s.valor_total || 0)}</td>
          <td>
            <span class="badge ${getStatusBadge(s.status).class}">
              ${getStatusBadge(s.status).label}
            </span>
          </td>
        </tr>`
    )
    .join('');
}

// Proteger rota e inicializar
requireAuth().then(async (user) => {
  await loadComponents();
  await setupNavbarAuth(user);
  const monthEl = document.getElementById('current-month');
  if (monthEl) monthEl.textContent = `Mês: ${getCurrentMonth()}`;
  initDashboard();
});
