import {
  subscribeServicos,
  insertPagamento,
  updateServico,
  getConfigEmpresa,
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
  setTaxaImposto,
  calculateLucro,
  getPaymentStatus,
  calculateDaysOverdue,
  setupNavbarAuth,
} from './utils.js';
import { initApp } from './app-init.js';
import { FUNCTIONS_URL } from './config.js';

let servicos = [];
let servicoSelecionado = null;

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

document.getElementById('btn-exportar-csv-fin')?.addEventListener('click', () => exportarFinanceiroCSV());
document.getElementById('btn-exportar-pdf-fin')?.addEventListener('click', () => exportarFinanceiroPDF());

function getTotalPago(servico) {
  return (servico.pagamentos || []).filter((p) => p.confirmado).reduce((sum, p) => sum + (p.valor || 0), 0);
}

async function handleSavePagamento(e) {
  e.preventDefault();

  if (!servicoSelecionado) return;

  const valorPagamento = parseFloat(document.getElementById('pag-valor').value);
  const totalPagoAntes = getTotalPago(servicoSelecionado);
  const valorTotal = servicoSelecionado.valor_total || 0;
  const novoTotalPago = totalPagoAntes + valorPagamento;

  const dados = {
    servico_id: servicoSelecionado.id,
    valor: valorPagamento,
    data_pagamento: document.getElementById('pag-data').value,
    forma_pagamento: document.getElementById('pag-forma').value,
    observacao: document.getElementById('pag-observacao')?.value?.trim() || null,
    confirmado: true,
  };

  try {
    await insertPagamento(dados);
    const status = novoTotalPago >= valorTotal ? 'recebido' : 'parcialmente_pago';
    await updateServico(servicoSelecionado.id, { status });
    showSuccess(status === 'recebido' ? 'Pagamento registrado! Serviço quitado.' : 'Pagamento parcial registrado.');
    closeModal('modal-pagamento');
    await loadServicos();
  } catch (error) {
    console.error('Erro:', error);
    showError('Erro ao registrar pagamento: ' + error.message);
  }
}

function getContasReceberData() {
  return servicos.filter((s) => {
    const totalPago = getTotalPago(s);
    return totalPago < (s.valor_total || 0);
  });
}

function getRankingData() {
  const currentMonth = new Date();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const servicosMes = servicos.filter((s) => {
    const data = new Date(s.data_servico);
    return data >= firstDay && data <= lastDay;
  });
  const faturamentoClientes = {};
  const lucroClientes = {};
  servicosMes.forEach((s) => {
    const clienteNome = s.clientes?.nome || 'Sem cliente';
    faturamentoClientes[clienteNome] = (faturamentoClientes[clienteNome] || 0) + (s.valor_total || 0);
    const custosChapu = (s.quantidade_chapas || 0) * (s.valor_por_chapa || 0);
    const custosStretch = (s.stretch_quantidade || 0) * (s.stretch_valor || 0);
    const custosMatrin = s.matrin_valor || 0;
    const custosAd = s.custos_servico ? s.custos_servico.reduce((sum, c) => sum + (c.valor || 0), 0) : 0;
    const custosTotal = custosChapu + custosStretch + custosMatrin + custosAd;
    const { lucro } = calculateLucro(s.valor_total || 0, custosTotal);
    lucroClientes[clienteNome] = (lucroClientes[clienteNome] || 0) + lucro;
  });
  const topFatur = Object.entries(faturamentoClientes).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topLucro = Object.entries(lucroClientes).sort((a, b) => b[1] - a[1]).slice(0, 10);
  return { topFatur, topLucro };
}

function exportarFinanceiroCSV() {
  const contas = getContasReceberData();
  const { topFatur, topLucro } = getRankingData();
  const lines = ['=== Contas a Receber ===', 'Data;Cliente;Valor;Vencimento;Status'];
  contas.forEach((s) => {
    const dueDate = new Date(s.data_servico);
    dueDate.setDate(dueDate.getDate() + (s.clientes?.prazo_pagamento || 30));
    const status = getPaymentStatus(s);
    lines.push(`${s.data_servico};${s.clientes?.nome || ''};${(s.valor_total || 0).toString().replace('.', ',')};${dueDate.toISOString().slice(0, 10)};${status}`);
  });
  lines.push('', '=== Ranking Faturamento (Mês) ===', 'Cliente;Valor');
  topFatur.forEach(([c, v]) => lines.push(`${c};${v.toString().replace('.', ',')}`));
  lines.push('', '=== Ranking Lucro (Mês) ===', 'Cliente;Lucro');
  topLucro.forEach(([c, v]) => lines.push(`${c};${v.toString().replace('.', ',')}`));
  const bom = '\uFEFF';
  const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `financeiro-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  showSuccess('CSV exportado com sucesso!');
}

function exportarFinanceiroPDF() {
  if (typeof html2pdf === 'undefined') {
    showError('Biblioteca PDF não carregada. Recarregue a página.');
    return;
  }
  const contas = getContasReceberData();
  const { topFatur, topLucro } = getRankingData();
  const contasRows = contas
    .map((s) => {
      const dueDate = new Date(s.data_servico);
      dueDate.setDate(dueDate.getDate() + (s.clientes?.prazo_pagamento || 30));
      const status = getPaymentStatus(s);
      return `<tr><td style="padding:6px;border:1px solid #ddd">${formatDate(s.data_servico)}</td><td style="padding:6px;border:1px solid #ddd">${s.clientes?.nome || 'N/A'}</td><td style="padding:6px;border:1px solid #ddd">${formatCurrency(s.valor_total || 0)}</td><td style="padding:6px;border:1px solid #ddd">${formatDate(dueDate.toISOString().slice(0, 10))}</td><td style="padding:6px;border:1px solid #ddd">${status}</td></tr>`;
    })
    .join('');
  const faturRows = topFatur.map(([c, v], i) => `<tr><td style="padding:6px;border:1px solid #ddd">${i + 1}. ${c}</td><td style="padding:6px;border:1px solid #ddd">${formatCurrency(v)}</td></tr>`).join('');
  const lucroRows = topLucro.map(([c, v], i) => `<tr><td style="padding:6px;border:1px solid #ddd">${i + 1}. ${c}</td><td style="padding:6px;border:1px solid #ddd">${formatCurrency(v)}</td></tr>`).join('');
  const html = `
    <div style="font-family:sans-serif;padding:20px;font-size:11px;">
      <h2 style="margin:0 0 16px 0;">Relatório Financeiro - Sistema APB</h2>
      <p style="color:#666;margin:0 0 16px 0;">Exportado em ${new Date().toLocaleString('pt-BR')}</p>
      <h3 style="margin:16px 0 8px 0;">Contas a Receber</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead><tr style="background:#1e3a5f;color:#fff;"><th style="padding:6px;text-align:left;border:1px solid #ddd">Data</th><th style="padding:6px;text-align:left;border:1px solid #ddd">Cliente</th><th style="padding:6px;text-align:left;border:1px solid #ddd">Valor</th><th style="padding:6px;text-align:left;border:1px solid #ddd">Vencimento</th><th style="padding:6px;text-align:left;border:1px solid #ddd">Status</th></tr></thead>
        <tbody>${contasRows || '<tr><td colspan="5" style="padding:8px">Nenhuma conta a receber</td></tr>'}</tbody>
      </table>
      <h3 style="margin:16px 0 8px 0;">Top 10 - Faturamento (Mês)</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead><tr style="background:#1e3a5f;color:#fff;"><th style="padding:6px;text-align:left;border:1px solid #ddd">Cliente</th><th style="padding:6px;text-align:left;border:1px solid #ddd">Valor</th></tr></thead>
        <tbody>${faturRows || '<tr><td colspan="2">Nenhum dado</td></tr>'}</tbody>
      </table>
      <h3 style="margin:16px 0 8px 0;">Top 10 - Lucro (Mês)</h3>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#1e3a5f;color:#fff;"><th style="padding:6px;text-align:left;border:1px solid #ddd">Cliente</th><th style="padding:6px;text-align:left;border:1px solid #ddd">Lucro</th></tr></thead>
        <tbody>${lucroRows || '<tr><td colspan="2">Nenhum dado</td></tr>'}</tbody>
      </table>
    </div>`;
  const div = document.createElement('div');
  div.innerHTML = html;
  div.style.position = 'absolute';
  div.style.left = '-9999px';
  document.body.appendChild(div);
  html2pdf().set({ filename: `financeiro-${new Date().toISOString().slice(0, 10)}.pdf`, margin: 10 }).from(div.firstElementChild).save().then(() => {
    document.body.removeChild(div);
    showSuccess('PDF exportado com sucesso!');
  });
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

  const contasReceber = servicos.filter((s) => {
    const totalPago = getTotalPago(s);
    return totalPago < (s.valor_total || 0);
  });

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
          <span class="badge ${status === 'atrasado' ? 'badge-danger' : status === 'parcialmente_pago' ? 'badge-warning' : 'badge-warning'}">
            ${status === 'atrasado' ? '❌ Atrasado' : status === 'parcialmente_pago' ? '💰 Parcial' : '⏱️ Pendente'}
          </span>
        </td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="gerarBoleto('${s.id}')">Boleto</button>
          <button class="btn btn-success btn-sm ml-1" onclick="abrirPagamento('${s.id}')">Registrar pagamento</button>
        </td>
      </tr>`;
    })
    .join('');

  window.abrirPagamento = abrirPagamento;
  window.gerarBoleto = gerarBoleto;
}

async function gerarBoleto(servicoId) {
  const s = servicos.find((x) => x.id === servicoId);
  if (!s) return;
  const totalPago = getTotalPago(s);
  const valorRestante = (s.valor_total || 0) - totalPago;
  if (valorRestante <= 0) {
    showError('Serviço já quitado.');
    return;
  }
  const dueDate = new Date(s.data_servico);
  dueDate.setDate(dueDate.getDate() + (s.clientes?.prazo_pagamento || 30));
  const vencimento = dueDate.toISOString().split('T')[0];
  try {
    const res = await fetch(`${FUNCTIONS_URL}/gerarBoletoCora`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valor: valorRestante,
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

function abrirPagamento(servicoId) {
  servicoSelecionado = servicos.find((s) => s.id === servicoId);
  if (!servicoSelecionado) return;
  const totalPago = getTotalPago(servicoSelecionado);
  const restante = (servicoSelecionado.valor_total || 0) - totalPago;
  document.getElementById('pag-valor').value = (restante > 0 ? restante : servicoSelecionado.valor_total || 0).toFixed(2);
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
  await initApp('financeiro');
  await setupNavbarAuth(user);
  const cfg = await getConfigEmpresa();
  if (cfg?.taxa_imposto != null) setTaxaImposto(cfg.taxa_imposto);
  const m = document.getElementById('current-month');
  if (m) m.textContent = `Mês: ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;
  loadServicos();
});
