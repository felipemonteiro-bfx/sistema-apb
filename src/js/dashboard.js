import { subscribeServicos, getConfigEmpresa, requireAuth } from './firebase.js';
import {
  formatCurrency,
  formatDate,
  getCurrentMonth,
  setActiveMenuItem,
  showError,
  showSuccess,
  setTaxaImposto,
  calculateLucro,
  getStatusBadge,
  setupNavbarAuth,
} from './utils.js';
import { initApp } from './app-init.js';

function getSelectedPeriod() {
  const mes = parseInt(document.getElementById('dashboard-mes')?.value || new Date().getMonth() + 1, 10);
  const ano = parseInt(document.getElementById('dashboard-ano')?.value || new Date().getFullYear(), 10);
  const firstDay = new Date(ano, mes - 1, 1);
  const lastDay = new Date(ano, mes, 0);
  return { firstDay, lastDay, mes, ano };
}

function setupPeriodFilter() {
  const mesEl = document.getElementById('dashboard-mes');
  const anoEl = document.getElementById('dashboard-ano');
  if (!mesEl || !anoEl) return;

  const now = new Date();
  mesEl.value = String(now.getMonth() + 1);
  for (let y = now.getFullYear(); y >= now.getFullYear() - 5; y--) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    anoEl.appendChild(opt);
  }
  anoEl.value = String(now.getFullYear());

  const refresh = () => { if (window._dashboardRefresh) window._dashboardRefresh(_servicosCache); };
  mesEl.addEventListener('change', refresh);
  anoEl.addEventListener('change', refresh);
}

let _servicosCache = [];
let _dashboardDataCache = { faturamento: 0, lucro: 0, servicosMes: [], contasReceber: 0, clientesData: {}, statusData: {} };

function exportarDashboardCSV() {
  const d = _dashboardDataCache;
  const { mes, ano } = getSelectedPeriod();
  const mesNome = new Date(2000, mes - 1, 1).toLocaleString('pt-BR', { month: 'long' });
  const lines = [
    `Relatório Dashboard - ${mesNome}/${ano}`,
    '',
    'Resumo',
    `Faturamento;${formatCurrency(d.faturamento)}`,
    `Lucro;${formatCurrency(d.lucro)}`,
    `Serviços realizados;${d.servicosMes.length}`,
    `Contas a receber;${formatCurrency(d.contasReceber)}`,
    '',
    'Faturamento por Cliente',
    'Cliente;Valor',
    ...Object.entries(d.clientesData || {}).map(([c, v]) => `${c};${v.toString().replace('.', ',')}`),
    '',
    'Serviços do Período',
    'Cliente;Data;Chapas;Valor;Status',
    ...(d.servicosMes || []).map((s) =>
      `${s.clientes?.nome || 'N/A'};${s.data_servico};${s.quantidade_chapas ?? ''};${(s.valor_total || 0).toString().replace('.', ',')};${s.status || ''}`
    ),
  ];
  const bom = '\uFEFF';
  const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `dashboard-${ano}-${String(mes).padStart(2, '0')}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  showSuccess('CSV exportado com sucesso!');
}

function exportarDashboardPDF() {
  if (typeof html2pdf === 'undefined') {
    showError('Biblioteca PDF não carregada. Recarregue a página.');
    return;
  }
  const d = _dashboardDataCache;
  const { mes, ano } = getSelectedPeriod();
  const mesNome = new Date(2000, mes - 1, 1).toLocaleString('pt-BR', { month: 'long' });
  const clientesRows = Object.entries(d.clientesData || {})
    .map(([c, v]) => `<tr><td style="padding:6px;border:1px solid #ddd">${c}</td><td style="padding:6px;border:1px solid #ddd">${formatCurrency(v)}</td></tr>`)
    .join('');
  const servicosRows = (d.servicosMes || [])
    .slice(0, 20)
    .map((s) => `<tr><td style="padding:6px;border:1px solid #ddd">${s.clientes?.nome || 'N/A'}</td><td style="padding:6px;border:1px solid #ddd">${formatDate(s.data_servico)}</td><td style="padding:6px;border:1px solid #ddd">${s.quantidade_chapas ?? ''}</td><td style="padding:6px;border:1px solid #ddd">${formatCurrency(s.valor_total || 0)}</td><td style="padding:6px;border:1px solid #ddd">${s.status || ''}</td></tr>`)
    .join('');
  const html = `
    <div style="font-family:sans-serif;padding:20px;font-size:11px;">
      <h2 style="margin:0 0 8px 0;">Relatório Dashboard - Sistema APB</h2>
      <p style="color:#666;margin:0 0 16px 0;">${mesNome}/${ano} — Exportado em ${new Date().toLocaleString('pt-BR')}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
        <div style="background:#f8fafc;padding:12px;border-radius:8px;"><strong>Faturamento</strong><br/>${formatCurrency(d.faturamento)}</div>
        <div style="background:#f8fafc;padding:12px;border-radius:8px;"><strong>Lucro</strong><br/>${formatCurrency(d.lucro)}</div>
        <div style="background:#f8fafc;padding:12px;border-radius:8px;"><strong>Serviços</strong><br/>${d.servicosMes?.length || 0}</div>
        <div style="background:#f8fafc;padding:12px;border-radius:8px;"><strong>Contas a receber</strong><br/>${formatCurrency(d.contasReceber)}</div>
      </div>
      <h3 style="margin:16px 0 8px 0;">Faturamento por Cliente</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead><tr style="background:#1e3a5f;color:#fff;"><th style="padding:6px;text-align:left;border:1px solid #ddd">Cliente</th><th style="padding:6px;text-align:left;border:1px solid #ddd">Valor</th></tr></thead>
        <tbody>${clientesRows || '<tr><td colspan="2">Nenhum dado</td></tr>'}</tbody>
      </table>
      <h3 style="margin:16px 0 8px 0;">Serviços do Período</h3>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#1e3a5f;color:#fff;"><th style="padding:6px;text-align:left;border:1px solid #ddd">Cliente</th><th style="padding:6px;text-align:left;border:1px solid #ddd">Data</th><th style="padding:6px;text-align:left;border:1px solid #ddd">Chapas</th><th style="padding:6px;text-align:left;border:1px solid #ddd">Valor</th><th style="padding:6px;text-align:left;border:1px solid #ddd">Status</th></tr></thead>
        <tbody>${servicosRows || '<tr><td colspan="5">Nenhum serviço</td></tr>'}</tbody>
      </table>
    </div>`;
  const div = document.createElement('div');
  div.innerHTML = html;
  div.style.position = 'absolute';
  div.style.left = '-9999px';
  document.body.appendChild(div);
  html2pdf().set({ filename: `dashboard-${ano}-${String(mes).padStart(2, '0')}.pdf`, margin: 10 }).from(div.firstElementChild).save().then(() => {
    document.body.removeChild(div);
    showSuccess('PDF exportado com sucesso!');
  });
}

function initDashboard() {
  setupPeriodFilter();

  window._dashboardRefresh = function refreshDashboard(servicos) {
    if (servicos) _servicosCache = servicos;
    servicos = servicos || _servicosCache;
    if (!servicos) return;
    try {
      if (!servicos.length) {
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

      const { firstDay, lastDay } = getSelectedPeriod();

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
      .filter((s) => {
        const pago = (s.pagamentos || []).filter((p) => p.confirmado).reduce((sum, p) => sum + (p.valor || 0), 0);
        return pago < (s.valor_total || 0);
      })
      .reduce((sum, s) => {
        const pago = (s.pagamentos || []).filter((p) => p.confirmado).reduce((s2, p) => s2 + (p.valor || 0), 0);
        return sum + (s.valor_total || 0) - pago;
      }, 0);

    _dashboardDataCache = {
      faturamento,
      lucro,
      servicosMes,
      contasReceber,
      clientesData: {},
      statusData,
    };
    Object.assign(_dashboardDataCache.clientesData, clientesData);

    // Update cards
    document.getElementById('faturamento-valor').textContent = formatCurrency(faturamento);
    document.getElementById('lucro-valor').textContent = formatCurrency(lucro);
    document.getElementById('servicos-valor').textContent = servicosMes.length;
    document.getElementById('receber-valor').textContent = formatCurrency(contasReceber);

    // Prepare chart data
    const clientesData = {};
    const statusData = { agendado: 0, executado: 0, faturado: 0, recebido: 0, parcialmente_pago: 0 };

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
  };

  document.getElementById('btn-exportar-csv-dash')?.addEventListener('click', () => exportarDashboardCSV());
  document.getElementById('btn-exportar-pdf-dash')?.addEventListener('click', () => exportarDashboardPDF());

  subscribeServicos((servicos) => {
    window._dashboardRefresh(servicos);
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
    parcialmente_pago: '#eab308',
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
  await initApp('dashboard');
  await setupNavbarAuth(user);
  const cfg = await getConfigEmpresa();
  if (cfg?.taxa_imposto != null) setTaxaImposto(cfg.taxa_imposto);
  initDashboard();
});
