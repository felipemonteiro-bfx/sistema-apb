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
} from './utils.js';
import { initApp } from './app-init.js';

let clientes = [];
let clienteEditando = null;

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

document.getElementById('cliente-cep')?.addEventListener('blur', buscarCep);

async function buscarCep() {
  const cepEl = document.getElementById('cliente-cep');
  const cep = (cepEl?.value || '').replace(/\D/g, '');
  if (cep.length !== 8) return;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json();
    if (data.erro) {
      showError('CEP não encontrado.');
      return;
    }
    const endereco = [data.logradouro, data.bairro].filter(Boolean).join(', ');
    document.getElementById('cliente-endereco').value = endereco || '';
    document.getElementById('cliente-cidade').value = data.localidade || '';
    document.getElementById('cliente-estado').value = (data.uf || '').toUpperCase();
  } catch (err) {
    showError('Erro ao buscar CEP: ' + err.message);
  }
}

document.getElementById('modal-cliente')?.addEventListener('click', (e) => {
  if (e.target.id === 'modal-cliente') {
    closeModal('modal-cliente');
  }
});

document.getElementById('btn-exportar-csv')?.addEventListener('click', () => exportarClientesCSV());
document.getElementById('btn-exportar-pdf')?.addEventListener('click', () => exportarClientesPDF());

function exportarClientesCSV() {
  const filtered = getFilteredClientes ? getFilteredClientes() : clientes;
  if (filtered.length === 0) {
    showError('Nenhum cliente para exportar.');
    return;
  }
  const cols = ['Nome', 'CNPJ', 'Telefone', 'Email', 'CEP', 'Endereço', 'Cidade', 'Estado', 'Valor/Chapa', 'Prazo', 'Precisa NF'];
  const rows = filtered.map((c) => [
    c.nome || '',
    c.cnpj || '',
    c.telefone || '',
    c.email || '',
    c.cep || '',
    c.endereco || '',
    c.cidade || '',
    c.estado || '',
    (c.valor_padrao_chapa || 0).toString().replace('.', ','),
    (c.prazo_pagamento || 30).toString(),
    (c.precisa_nota || 'nao') === 'sim' ? 'Sim' : 'Não',
  ]);
  const csv = [cols.join(';'), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))].join('\n');
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  showSuccess('CSV exportado com sucesso!');
}

function exportarClientesPDF() {
  const filtered = getFilteredClientes ? getFilteredClientes() : clientes;
  if (filtered.length === 0) {
    showError('Nenhum cliente para exportar.');
    return;
  }
  if (typeof html2pdf === 'undefined') {
    showError('Biblioteca PDF não carregada. Recarregue a página.');
    return;
  }
  const rows = filtered
    .map(
      (c) =>
        `<tr>
          <td style="padding:6px;border:1px solid #ddd;">${c.nome || '—'}</td>
          <td style="padding:6px;border:1px solid #ddd;">${c.cnpj || '—'}</td>
          <td style="padding:6px;border:1px solid #ddd;">${c.telefone || '—'}</td>
          <td style="padding:6px;border:1px solid #ddd;">${c.email || '—'}</td>
          <td style="padding:6px;border:1px solid #ddd;">${formatCurrency(c.valor_padrao_chapa || 0)}</td>
          <td style="padding:6px;border:1px solid #ddd;">${(c.precisa_nota || 'nao') === 'sim' ? 'Sim' : 'Não'}</td>
        </tr>`
    )
    .join('');
  const html = `
    <div style="font-family:sans-serif;padding:20px;font-size:11px;">
      <h2 style="margin:0 0 16px 0;">Relatório de Clientes - Sistema APB</h2>
      <p style="color:#666;margin:0 0 16px 0;">Exportado em ${new Date().toLocaleString('pt-BR')} — ${filtered.length} registros</p>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#1e3a5f;color:#fff;">
            <th style="padding:6px;text-align:left;border:1px solid #ddd;">Nome</th>
            <th style="padding:6px;text-align:left;border:1px solid #ddd;">CNPJ</th>
            <th style="padding:6px;text-align:left;border:1px solid #ddd;">Telefone</th>
            <th style="padding:6px;text-align:left;border:1px solid #ddd;">Email</th>
            <th style="padding:6px;text-align:left;border:1px solid #ddd;">Valor/Chapa</th>
            <th style="padding:6px;text-align:left;border:1px solid #ddd;">Precisa NF</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  const div = document.createElement('div');
  div.innerHTML = html;
  div.style.position = 'absolute';
  div.style.left = '-9999px';
  document.body.appendChild(div);
  html2pdf().set({ filename: `clientes-${new Date().toISOString().slice(0, 10)}.pdf`, margin: 10 }).from(div.firstElementChild).save().then(() => {
    document.body.removeChild(div);
    showSuccess('PDF exportado com sucesso!');
  });
}

async function handleSaveCliente(e) {
  e.preventDefault();

  const dados = {
    nome: document.getElementById('cliente-nome').value.trim(),
    cnpj: document.getElementById('cliente-cnpj').value.trim(),
    telefone: document.getElementById('cliente-telefone').value.trim() || null,
    email: document.getElementById('cliente-email').value.trim() || null,
    cep: document.getElementById('cliente-cep').value.trim().replace(/\D/g, '') || null,
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
      '<tr><td colspan="12" class="text-center text-gray-500 py-4">Nenhum cliente cadastrado</td></tr>';
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
          <td>${c.cep ? (String(c.cep).replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2') || '-') : '-'}</td>
          <td>${c.endereco || '-'}</td>
          <td>${c.cidade || '-'}</td>
          <td>${c.estado || '-'}</td>
          <td>${formatCurrency(c.valor_padrao_chapa)}</td>
          <td>${c.prazo_pagamento} dias</td>
          <td>${(c.precisa_nota || 'nao') === 'sim' ? '✓ Sim' : '— Não'}</td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="editarCliente('${c.id}')">Editar</button>
            <button class="btn btn-danger btn-sm ml-1" data-cliente-id="${c.id}" data-cliente-nome="${(c.nome || '').replace(/"/g, '&quot;')}" onclick="desativarCliente(this)">Desativar</button>
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

  window.editarCliente = editarCliente;
  window.desativarCliente = desativarCliente;
}

async function desativarCliente(btn) {
  const id = btn?.getAttribute?.('data-cliente-id');
  const nome = btn?.getAttribute?.('data-cliente-nome') || 'este cliente';
  if (!id) return;
  if (!confirm(`Desativar o cliente "${nome}"? Ele não aparecerá mais nas listas, mas os dados serão mantidos.`)) return;
  try {
    await updateCliente(id, { ativo: false });
    showSuccess('Cliente desativado.');
    await loadClientes();
  } catch (err) {
    showError('Erro ao desativar: ' + err.message);
  }
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
  document.getElementById('cliente-cep').value =
    cliente.cep ? cliente.cep.replace(/(\d{5})(\d{3})/, '$1-$2') : '';
  document.getElementById('cliente-endereco').value = cliente.endereco || '';
  document.getElementById('cliente-cidade').value = cliente.cidade || '';
  document.getElementById('cliente-estado').value = cliente.estado || '';
  document.getElementById('modal-titulo').textContent = 'Editar Cliente';
  
  openModal('modal-cliente');
}

// Proteger rota e inicializar
requireAuth().then(async (user) => {
  await initApp('clientes');
  await setupNavbarAuth(user);
  const m = document.getElementById('current-month');
  if (m) m.textContent = `Mês: ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;
  loadClientes();
});
