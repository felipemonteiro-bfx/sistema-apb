import {
  subscribeChapas,
  insertChapa,
  updateChapa,
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

let chapas = [];
let chapaEditando = null;

// Event listeners
document.getElementById('btn-nova-chapa')?.addEventListener('click', () => {
  chapaEditando = null;
  document.getElementById('form-chapa').reset();
  document.getElementById('modal-titulo').textContent = 'Nova Chapa';
  openModal('modal-chapa');
});

document.getElementById('btn-fechar-modal')?.addEventListener('click', () => {
  closeModal('modal-chapa');
});

document.getElementById('btn-cancelar')?.addEventListener('click', () => {
  closeModal('modal-chapa');
});

document.getElementById('form-chapa')?.addEventListener('submit', handleSaveChapa);

document.getElementById('modal-chapa')?.addEventListener('click', (e) => {
  if (e.target.id === 'modal-chapa') {
    closeModal('modal-chapa');
  }
});

async function handleSaveChapa(e) {
  e.preventDefault();

  const dados = {
    nome: document.getElementById('chapa-nome').value.trim(),
    cpf: document.getElementById('chapa-cpf').value.trim(),
    telefone: document.getElementById('chapa-telefone').value.trim() || null,
    email: document.getElementById('chapa-email').value.trim() || null,
    valor_diaria: parseFloat(document.getElementById('chapa-valor').value) || 0,
    pix: document.getElementById('chapa-pix').value.trim() || null,
    ativo: true,
  };

  try {
    if (chapaEditando) {
      await updateChapa(chapaEditando.id, dados);
      showSuccess('Chapa atualizada com sucesso!');
    } else {
      await insertChapa(dados);
      showSuccess('Chapa criada com sucesso!');
    }
    closeModal('modal-chapa');
    await loadChapas();
  } catch (error) {
    console.error('Erro:', error);
    showError('Erro ao salvar chapa: ' + error.message);
  }
}

function loadChapas() {
  subscribeChapas((data) => {
    chapas = data;
    renderChapas();
  });
}

function renderChapas() {
  const tbody = document.getElementById('chapas-tbody');
  if (!tbody) return;

  if (chapas.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center text-gray-500 py-4">Nenhuma chapa cadastrada</td></tr>';
    return;
  }

  tbody.innerHTML = chapas
    .map(
      (c) =>
        `<tr>
          <td>${c.nome}</td>
          <td>${c.cpf}</td>
          <td>${c.telefone || '-'}</td>
          <td>${c.email || '-'}</td>
          <td>${formatCurrency(c.valor_diaria)}</td>
          <td>${c.pix || '-'}</td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="editarChapa('${c.id}')">Editar</button>
            <button class="btn btn-danger btn-sm ml-1" data-chapa-id="${c.id}" data-chapa-nome="${(c.nome || '').replace(/"/g, '&quot;')}" onclick="desativarChapa(this)">Desativar</button>
          </td>
        </tr>`
    )
    .join('');

  window.editarChapa = editarChapa;
  window.desativarChapa = desativarChapa;
}

async function desativarChapa(btn) {
  const id = btn?.getAttribute?.('data-chapa-id');
  const nome = btn?.getAttribute?.('data-chapa-nome') || 'esta chapa';
  if (!id) return;
  if (!confirm(`Desativar a chapa "${nome}"? Ela não aparecerá mais nas listas, mas os dados serão mantidos.`)) return;
  try {
    await updateChapa(id, { ativo: false });
    showSuccess('Chapa desativada.');
    await loadChapas();
  } catch (err) {
    showError('Erro ao desativar: ' + err.message);
  }
}

async function editarChapa(id) {
  const chapa = chapas.find((c) => c.id === id);
  if (!chapa) return;

  chapaEditando = chapa;
  document.getElementById('chapa-nome').value = chapa.nome;
  document.getElementById('chapa-cpf').value = chapa.cpf;
  document.getElementById('chapa-telefone').value = chapa.telefone || '';
  document.getElementById('chapa-email').value = chapa.email || '';
  document.getElementById('chapa-valor').value = chapa.valor_diaria;
  document.getElementById('chapa-pix').value = chapa.pix || '';
  document.getElementById('modal-titulo').textContent = 'Editar Chapa';
  openModal('modal-chapa');
}

// Proteger rota e inicializar
requireAuth().then(async (user) => {
  await initApp('chapas');
  await setupNavbarAuth(user);
  const m = document.getElementById('current-month');
  if (m) m.textContent = `Mês: ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;
  loadChapas();
});
