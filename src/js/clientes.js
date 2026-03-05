import {
  getClientes,
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

let clientes = [];
let clienteEditando = null;

document.getElementById('current-month').textContent = `Mês: ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;

async function loadComponents() {
  try {
    const navbarRes = await fetch('../components/navbar.html');
    const sidebarRes = await fetch('../components/sidebar.html');

    document.getElementById('navbar-container').innerHTML = await navbarRes.text();
    document.getElementById('sidebar-container').innerHTML = await sidebarRes.text();

    setActiveMenuItem('clientes');
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

async function loadClientes() {
  try {
    clientes = await getClientes();
    renderClientes();
  } catch (error) {
    console.error('Erro ao carregar clientes:', error);
    showError('Erro ao carregar clientes');
  }
}

function renderClientes() {
  const tbody = document.getElementById('clientes-tbody');
  if (!tbody) return;

  if (clientes.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="10" class="text-center text-gray-500 py-4">Nenhum cliente cadastrado</td></tr>';
    return;
  }

  tbody.innerHTML = clientes
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
          <td>
            <button class="btn btn-secondary btn-sm" onclick="editarCliente('${c.id}')">Editar</button>
          </td>
        </tr>`
    )
    .join('');

  // Make editarCliente available globally
  window.editarCliente = editarCliente;
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
  loadClientes();
});
