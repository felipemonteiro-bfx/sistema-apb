const TAXA_IMPOSTO = 0.0785; // 7.85%

export const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Intl.DateTimeFormat('pt-BR').format(new Date(dateString));
};

export const formatDateInput = (dateString) => {
  if (!dateString) return '';
  return dateString.split('T')[0];
};

export const getCurrentMonth = () => {
  const now = new Date();
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(now);
};

export const calculateLucro = (valorCobrado, valorCustos) => {
  const custoComImposto = valorCustos * (1 + TAXA_IMPOSTO);
  const lucro = valorCobrado - custoComImposto;
  const margem = valorCobrado > 0 ? (lucro / valorCobrado) * 100 : 0;
  return { lucro, margem };
};

export const getStatusBadge = (status) => {
  const badges = {
    agendado: { class: 'badge-warning', label: '⏱️ Agendado' },
    executado: { class: 'badge-primary', label: '✓ Executado' },
    faturado: { class: 'badge-primary', label: '📄 Faturado' },
    recebido: { class: 'badge-success', label: '✅ Recebido' },
    pendente: { class: 'badge-warning', label: '⏱️ Pendente' },
    atrasado: { class: 'badge-danger', label: '❌ Atrasado' },
  };
  return badges[status] || { class: 'badge-primary', label: status };
};

export const showError = (message) => {
  const container = document.getElementById('messages');
  if (container) {
    const div = document.createElement('div');
    div.className = 'error-message';
    div.textContent = message;
    container.innerHTML = '';
    container.appendChild(div);
    setTimeout(() => container.innerHTML = '', 5000);
  }
};

export const showSuccess = (message) => {
  const container = document.getElementById('messages');
  if (container) {
    const div = document.createElement('div');
    div.className = 'success-message';
    div.textContent = message;
    container.innerHTML = '';
    container.appendChild(div);
    setTimeout(() => container.innerHTML = '', 5000);
  }
};

export const setActiveMenuItem = (page) => {
  document.querySelectorAll('.sidebar-link').forEach((link) => {
    link.classList.remove('active');
    if (link.getAttribute('data-page') === page) {
      link.classList.add('active');
    }
  });
};

export const openModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
  }
};

export const closeModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
};

export const formatCNPJ = (cnpj) => {
  return cnpj
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

export const formatCPF = (cpf) => {
  return cpf
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{2})(\d)/, '$1-$2');
};

export const calculateDaysOverdue = (dueDate) => {
  const due = new Date(dueDate);
  const today = new Date();
  const diff = today - due;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 0;
};

export const getPaymentStatus = (servicoData) => {
  if (!servicoData.pagamentos || servicoData.pagamentos.length === 0) {
    return 'pendente';
  }

  const confirmado = servicoData.pagamentos.some((p) => p.confirmado);
  if (confirmado) return 'recebido';

  const dueDate = new Date(servicoData.data_servico);
  dueDate.setDate(
    dueDate.getDate() + (servicoData.clientes?.prazo_pagamento || 30)
  );

  const today = new Date();
  return today > dueDate ? 'atrasado' : 'pendente';
};

/** Configura user email e botão logout na navbar (chamar após carregar componentes). */
export const setupNavbarAuth = async (user) => {
  const emailEl = document.getElementById('user-email');
  const logoutBtn = document.getElementById('btn-logout');
  if (emailEl) emailEl.textContent = user?.email || '';
  if (logoutBtn) {
    const { logout } = await import('./firebase.js');
    logoutBtn.onclick = async () => {
      await logout();
      window.location.href = '/src/pages/login.html';
    };
  }
};
