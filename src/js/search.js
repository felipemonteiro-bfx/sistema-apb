import { getClientes, getChapas, getServicosParaBusca } from './firebase.js';

let clientesCache = [];
let chapasCache = [];
let servicosCache = [];
let searchTimeout = null;
const CACHE_TTL_MS = 5 * 60 * 1000;
let lastLoad = 0;

export async function loadSearchData() {
  const now = Date.now();
  if (now - lastLoad < CACHE_TTL_MS && clientesCache.length + chapasCache.length + servicosCache.length > 0) {
    return;
  }
  const [c, ch, s] = await Promise.all([
    getClientes().catch(() => []),
    getChapas().catch(() => []),
    getServicosParaBusca().catch(() => []),
  ]);
  clientesCache = c;
  chapasCache = ch;
  servicosCache = s;
  lastLoad = now;
}

function search(term) {
  const t = term.toLowerCase().trim();
  if (t.length < 2) return { clientes: [], chapas: [], servicos: [] };

  const clientes = clientesCache.filter(
    (x) =>
      (x.nome || '').toLowerCase().includes(t) ||
      (x.cnpj || '').replace(/\D/g, '').includes(t.replace(/\D/g, ''))
  );
  const chapas = chapasCache.filter(
    (x) =>
      (x.nome || '').toLowerCase().includes(t) ||
      (x.cpf || '').replace(/\D/g, '').includes(t.replace(/\D/g, ''))
  );
  const servicos = servicosCache.filter(
    (x) =>
      (x.clientes?.nome || '').toLowerCase().includes(t) ||
      (x.carreta || '').toLowerCase().includes(t) ||
      (x.conteiner || '').toLowerCase().includes(t) ||
      (x.transportadora || '').toLowerCase().includes(t)
  );

  return { clientes, chapas, servicos };
}

function renderResults(container, results) {
  const { clientes, chapas, servicos } = results;
  const hasAny = clientes.length || chapas.length || servicos.length;

  if (!hasAny) {
    container.innerHTML = '<div class="p-4 text-gray-500 text-sm">Nenhum resultado</div>';
  } else {
    let html = '';
    if (clientes.length) {
      html += '<div class="p-2 border-b"><div class="text-xs font-semibold text-gray-500 uppercase mb-2">Clientes</div>';
      clientes.slice(0, 5).forEach((c) => {
        html += `<a href="/src/pages/clientes.html" class="block px-2 py-1.5 rounded hover:bg-gray-100 text-sm">${c.nome}</a>`;
      });
      html += '</div>';
    }
    if (chapas.length) {
      html += '<div class="p-2 border-b"><div class="text-xs font-semibold text-gray-500 uppercase mb-2">Chapas</div>';
      chapas.slice(0, 5).forEach((ch) => {
        html += `<a href="/src/pages/chapas.html" class="block px-2 py-1.5 rounded hover:bg-gray-100 text-sm">${ch.nome}</a>`;
      });
      html += '</div>';
    }
    if (servicos.length) {
      html += '<div class="p-2"><div class="text-xs font-semibold text-gray-500 uppercase mb-2">Serviços</div>';
      servicos.slice(0, 5).forEach((s) => {
        const label = `${s.clientes?.nome || 'N/A'} - ${s.carreta || s.conteiner || 'Serviço'}`;
        html += `<a href="/src/pages/servicos.html" class="block px-2 py-1.5 rounded hover:bg-gray-100 text-sm">${label}</a>`;
      });
      html += '</div>';
    }
    container.innerHTML = html;
  }
  container.classList.remove('hidden');
}

export function initGlobalSearch() {
  const input = document.getElementById('global-search');
  const results = document.getElementById('search-results');
  if (!input || !results) return;

  input.addEventListener('focus', () => {
    if (input.value.trim().length >= 2) {
      renderResults(results, search(input.value));
    }
  });

  input.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const term = input.value.trim();
    if (term.length < 2) {
      results.classList.add('hidden');
      return;
    }
    searchTimeout = setTimeout(() => {
      renderResults(results, search(term));
    }, 200);
  });

  input.addEventListener('blur', () => {
    setTimeout(() => results.classList.add('hidden'), 200);
  });
}
