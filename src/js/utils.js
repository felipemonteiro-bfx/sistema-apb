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
  showToast(message, 'error');
  const container = document.getElementById('messages');
  if (container) {
    container.innerHTML = `<div class="error-message">${message}</div>`;
    setTimeout(() => { container.innerHTML = ''; }, 5000);
  }
};

export const showSuccess = (message) => {
  showToast(message, 'success');
  const container = document.getElementById('messages');
  if (container) {
    container.innerHTML = `<div class="success-message">${message}</div>`;
    setTimeout(() => { container.innerHTML = ''; }, 5000);
  }
};

/** Toast flutuante (canto inferior direito) */
export const showToast = (message, type = 'success') => {
  let el = document.getElementById('toast-container');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-container';
    el.className = 'fixed bottom-4 right-4 z-[100] flex flex-col gap-2';
    document.body.appendChild(el);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type} px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300`;
  toast.textContent = message;
  el.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-visible'));
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
};

export const setActiveMenuItem = (page) => {
  document.querySelectorAll('.sidebar-link').forEach((link) => {
    link.classList.remove('active');
    if (link.getAttribute('data-page') === page) {
      link.classList.add('active');
    }
  });
};

/** Inicializa sidebar mobile (drawer). Chamar após loadComponents. */
export const initSidebarMobile = () => {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const toggle = document.getElementById('sidebar-toggle');
  const closeBtn = document.getElementById('sidebar-close');

  const open = () => {
    sidebar?.classList.add('open');
    overlay?.classList.remove('hidden');
    overlay?.classList.add('open');
  };
  const close = () => {
    sidebar?.classList.remove('open');
    overlay?.classList.add('hidden');
    overlay?.classList.remove('open');
  };

  toggle?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  overlay?.addEventListener('click', close);
  document.querySelectorAll('.sidebar-link').forEach((link) => {
    link.addEventListener('click', close);
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

/** Tema claro/escuro. Persiste em localStorage. */
export const initTheme = () => {
  const saved = localStorage.getItem('apb-theme') || 'dark';
  document.documentElement.classList.toggle('theme-light', saved === 'light');
  const btn = document.getElementById('btn-theme');
  if (btn) {
    btn.textContent = saved === 'light' ? '🌙' : '☀️';
    btn.title = saved === 'light' ? 'Modo escuro' : 'Modo claro';
    btn.onclick = () => {
      const next = document.documentElement.classList.contains('theme-light') ? 'dark' : 'light';
      localStorage.setItem('apb-theme', next);
      location.reload();
    };
  }
};

/** Atalhos de teclado globais */
export const initKeyboardShortcuts = () => {
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      const path = window.location.pathname;
      if (path.includes('servicos')) document.getElementById('btn-novo-servico')?.click();
      else if (path.includes('clientes')) document.getElementById('btn-novo-cliente')?.click();
      else if (path.includes('chapas')) document.getElementById('btn-nova-chapa')?.click();
    }
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      if (document.getElementById('modal-assistente')?.classList.contains('active')) {
        document.getElementById('assistente-input')?.focus();
      } else {
        document.getElementById('btn-assistente')?.click();
      }
    }
  });
};

/** Configura indicador de sincronização na navbar. */
export const setupSyncIndicator = async () => {
  const el = document.getElementById('sync-indicator');
  if (!el) return;

  const update = (status) => {
    el.className = 'sync-indicator text-xs px-2 py-0.5 rounded-full';
    if (status === 'offline') {
      el.classList.add('offline');
      el.title = 'Offline - alterações serão sincronizadas quando reconectar';
      el.textContent = 'Offline';
    } else {
      el.title = 'Sincronizado';
      el.textContent = '●';
    }
  };

  const { onSyncStatusChange, getSyncStatus } = await import('./firebase.js');
  update(getSyncStatus());
  onSyncStatusChange(update);
};

/** Configura user info na navbar (acesso direto - sem logout). */
export const setupNavbarAuth = async (user) => {
  const emailEl = document.getElementById('user-email');
  const logoutBtn = document.getElementById('btn-logout');
  if (emailEl) emailEl.textContent = user?.email || 'Acesso direto';
  if (logoutBtn) logoutBtn.style.display = 'none';
};
